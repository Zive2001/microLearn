// services/microContentService.js - Service for generating detailed micro-video content
const openaiService = require('./openaiService');
const MicroVideo = require('../models/MicroVideo');

class MicroContentService {
    /**
     * Generate comprehensive micro-content for all video segments
     * @param {string} videoId - The original video ID
     * @param {Object} videoData - Video metadata (title, topic, description)
     * @param {string} fullTranscript - Complete video transcript
     * @returns {Promise<Object>} Generated content for all segments
     */
    async generateMicroContent(videoId, videoData, fullTranscript) {
        try {
            console.log('🎬 Starting micro-content generation for video:', videoId);

            // Get all micro-video segments for this video
            const microVideos = await MicroVideo.find({ originalVideoId: videoId })
                .sort({ sequence: 1 });

            if (microVideos.length === 0) {
                throw new Error('No micro-video segments found for this video');
            }

            console.log(`📹 Found ${microVideos.length} micro-video segments to enhance`);

            // Generate content for each segment with context
            const enhancedSegments = [];

            for (let i = 0; i < microVideos.length; i++) {
                const segment = microVideos[i];
                console.log(`🔄 Generating content for segment ${i + 1}/${microVideos.length}: "${segment.title}"`);

                const enhancedContent = await this.generateSegmentContent(
                    segment,
                    videoData,
                    fullTranscript,
                    microVideos, // All segments for context
                    i // Current index
                );

                // Update the segment with enhanced content
                await this.updateSegmentContent(segment._id, enhancedContent);
                enhancedSegments.push({
                    segmentId: segment._id,
                    sequence: segment.sequence,
                    title: segment.title,
                    content: enhancedContent
                });
            }

            console.log('✅ Micro-content generation completed successfully');
            return {
                success: true,
                videoId,
                totalSegments: microVideos.length,
                enhancedSegments
            };

        } catch (error) {
            console.error('❌ Error generating micro-content:', error);
            throw error;
        }
    }

    /**
     * Generate detailed content for a single segment
     * @param {Object} segment - The micro-video segment
     * @param {Object} videoData - Original video metadata
     * @param {string} fullTranscript - Complete transcript
     * @param {Array} allSegments - All segments for context
     * @param {number} currentIndex - Current segment index
     * @returns {Promise<Object>} Enhanced content for the segment
     */
    async generateSegmentContent(segment, videoData, fullTranscript, allSegments, currentIndex) {
        const isFirst = currentIndex === 0;
        const isLast = currentIndex === allSegments.length - 1;
        const previousSegment = isFirst ? null : allSegments[currentIndex - 1];
        const nextSegment = isLast ? null : allSegments[currentIndex + 1];

        // Extract relevant transcript portion for this segment
        const segmentTranscript = segment.segmentTranscript ||
            this.extractTranscriptSegment(fullTranscript, segment.timeRange);

        const prompt = this.buildContentGenerationPrompt({
            segment,
            videoData,
            segmentTranscript,
            previousSegment,
            nextSegment,
            isFirst,
            isLast,
            totalSegments: allSegments.length
        });

        console.log(`🧠 Sending content generation request for: "${segment.title}"`);

        try {
            const response = await openaiService.generateResponse(prompt, {
                model: 'gpt-3.5-turbo',
                maxTokens: 2500,
                temperature: 0.7,
                systemMessage: 'You are an expert educational content creator who writes comprehensive, engaging scripts for programming tutorials. Always provide detailed, step-by-step explanations that learners can follow easily. Focus on creating 1000+ word scripts for 7-minute educational videos.'
            });

            // Parse the structured response
            const enhancedContent = this.parseContentResponse(response);

            console.log(`✅ Generated content for: "${segment.title}"`);
            return enhancedContent;

        } catch (error) {
            console.error(`❌ Error generating content for segment "${segment.title}":`, error);
            throw error;
        }
    }

    /**
     * Build the prompt for content generation
     */
    buildContentGenerationPrompt({ segment, videoData, segmentTranscript, previousSegment, nextSegment, isFirst, isLast, totalSegments }) {
        return `You are an expert technical instructor. Create a focused 1000+ word educational script for a 7-minute micro-learning video.

**SEGMENT REQUIREMENTS:**
- Topic: ${videoData.topic}
- Title: "${segment.title}"
- Learning Objective: ${segment.cltBlmScript.learningObjective}
- MUST COVER ALL KEY POINTS: ${segment.cltBlmScript.keypoints.join(', ')}

**ORIGINAL TRANSCRIPT CONTENT:**
${segmentTranscript}

**CRITICAL INSTRUCTIONS:**
1. Focus ONLY on technical education - NO motivational content, life advice, or general encouragement
2. Cover EVERY single keypoint listed above in detail with technical explanations
3. Extract specific technical concepts, code examples, and procedures from the transcript
4. Provide step-by-step technical instructions where applicable
5. Include practical coding examples and technical demonstrations
6. Target exactly 1000+ words for 7-minute narration
7. Use technical terminology appropriate for ${segment.cltBlmScript.difficulty || 'beginner'} level

**CONTENT STRUCTURE:**
- Start immediately with technical content (no introductions)
- Dedicate significant sections to each keypoint
- Include code examples from the transcript
- Explain technical concepts in depth
- Provide implementation details and best practices

Write ONLY the pure educational technical script. No JSON, no metadata, no motivational content. Start directly with technical instruction:`;
    }

    /**
     * Parse the LLM response into structured content
     */
    parseContentResponse(response) {
        try {
            console.log(`📄 Raw LLM response length: ${response.length} characters`);
            console.log(`📄 Response preview: ${response.substring(0, 200)}...`);

            // Handle different response formats from LLM
            let educationalScript = response.trim();

            // Check if response is in markdown code block format
            if (educationalScript.startsWith('```')) {
                const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
                const match = educationalScript.match(codeBlockRegex);
                if (match) {
                    // Try to parse as JSON first
                    try {
                        const parsed = JSON.parse(match[1]);
                        if (parsed.educationalScript) {
                            educationalScript = parsed.educationalScript;
                            console.log(`📄 Extracted educational script from JSON code block`);
                        } else {
                            // If no educationalScript field, use the whole content
                            educationalScript = match[1];
                            console.log(`📄 Using content from code block as-is`);
                        }
                    } catch (parseError) {
                        // If JSON parsing fails, use the content inside code block as plain text
                        educationalScript = match[1];
                        console.log(`📄 Using code block content as plain text (JSON parse failed)`);
                    }
                } else {
                    console.log(`📄 Code block format detected but couldn't extract content`);
                }
            }

            // If still looks like JSON without code blocks, try parsing
            if (educationalScript.startsWith('{') && educationalScript.endsWith('}')) {
                try {
                    const parsed = JSON.parse(educationalScript);
                    if (parsed.educationalScript) {
                        educationalScript = parsed.educationalScript;
                        console.log(`📄 Extracted educational script from direct JSON`);
                    }
                } catch (parseError) {
                    console.log(`📄 Direct JSON parsing failed, using response as-is`);
                }
            }

            console.log(`✅ Using processed response as educational script`);
            console.log(`📊 Educational script length: ${educationalScript.length} characters`);
            console.log(`📊 Estimated word count: ${educationalScript.split(' ').length} words`);
            console.log(`📊 Estimated duration: ${Math.ceil(educationalScript.split(' ').length / 150)} minutes`);

            return {
                educationalScript: educationalScript,
                practicalExample: "Practical application of the concepts covered in this video segment based on the original content",
                visualCues: ["Code examples from the video", "Visual demonstrations", "Step-by-step walkthroughs", "Conceptual diagrams", "Installation screenshots"],
                engagementHooks: {
                    opening: "Welcome to this comprehensive learning segment",
                    closing: "Excellent work! Let's continue to the next topic"
                },
                interactiveElements: ["Pause and practice what you've learned", "Think about real-world applications", "Try the examples yourself"],
                cognitiveLoadTips: "Take your time to understand each concept before moving forward",
                transitionFlow: {
                    fromPrevious: "Building on what we've learned",
                    toNext: "This prepares us for the next important topic"
                }
            };

        } catch (error) {
            console.error('❌ Error parsing content response:', error);
            console.log(`📄 Using response as-is (${response.length} characters)`);

            return {
                educationalScript: response.trim(),
                practicalExample: "Practical application of the concepts covered in this video segment",
                visualCues: ["Code examples from the video", "Visual demonstrations", "Conceptual diagrams"],
                engagementHooks: {
                    opening: "Welcome to this comprehensive learning segment",
                    closing: "Excellent work! Let's continue to the next topic"
                },
                interactiveElements: ["Pause and think about the concepts", "Try implementing what you've learned"],
                cognitiveLoadTips: "Take your time to understand each concept before moving forward",
                transitionFlow: {
                    fromPrevious: "Building on what we've learned",
                    toNext: "This prepares us for the next important topic"
                }
            };
        }
    }

    /**
     * Extract a section from text response
     */
    extractSection(text, sectionName) {
        const regex = new RegExp(`"${sectionName}"\\s*:\\s*"([^"]*)"`, 'i');
        const match = text.match(regex);
        return match ? match[1] : `Content for ${sectionName}`;
    }

    /**
     * Extract array from text response
     */
    extractArray(text, arrayName) {
        const regex = new RegExp(`"${arrayName}"\\s*:\\s*\\[(.*?)\\]`, 'i');
        const match = text.match(regex);
        if (match) {
            return match[1].split(',').map(item => item.trim().replace(/"/g, ''));
        }
        return [`${arrayName} item 1`, `${arrayName} item 2`, `${arrayName} item 3`];
    }

    /**
     * Extract transcript segment for specific time range
     */
    extractTranscriptSegment(fullTranscript, timeRange) {
        // This is a simplified extraction - in a real implementation,
        // you'd parse the transcript with timestamps
        const totalLength = fullTranscript.length;
        const startRatio = timeRange.startTime / 5683; // Assuming 5683s total duration
        const endRatio = timeRange.endTime / 5683;

        const startIndex = Math.floor(totalLength * startRatio);
        const endIndex = Math.floor(totalLength * endRatio);

        return fullTranscript.substring(startIndex, endIndex);
    }

    /**
     * Update segment with enhanced content
     */
    async updateSegmentContent(segmentId, enhancedContent) {
        try {
            const updateData = {
                'cltBlmScript.educationalScript': enhancedContent.educationalScript,
                'cltBlmScript.practicalExample': enhancedContent.practicalExample,
                'cltBlmScript.visualCues': enhancedContent.visualCues,
                processingStatus: 'completed' // Mark as completed after content generation
            };

            await MicroVideo.findByIdAndUpdate(segmentId, updateData);
            console.log(`✅ Updated segment ${segmentId} with enhanced content`);

        } catch (error) {
            console.error(`❌ Error updating segment ${segmentId}:`, error);
            throw error;
        }
    }

    /**
     * Get enhanced micro-videos with full content
     */
    async getEnhancedMicroVideos(videoId) {
        try {
            const microVideos = await MicroVideo.find({ originalVideoId: videoId })
                .sort({ sequence: 1 })
                .lean();

            return microVideos.map(video => ({
                ...video,
                hasEnhancedContent: !!(video.cltBlmScript?.educationalScript),
                contentLength: video.cltBlmScript?.educationalScript?.length || 0,
                transcriptLength: video.segmentTranscript?.length || 0,
                isComplete: video.processingStatus === 'completed'
            }));

        } catch (error) {
            console.error('Error fetching enhanced micro-videos:', error);
            throw error;
        }
    }
}

module.exports = new MicroContentService();