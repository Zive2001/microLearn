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
        return `You are an expert technical instructor who designs micro-learning scripts using the Cognitive Load Theory-based Lecture Model (CLT-bLM). 
    
    Your goal is to create instruction that **reduces extraneous cognitive load**, **manages intrinsic load**, and **stimulates germane cognitive processing**—focusing only on essential information that directly supports schema construction and learner understanding.
    
    **CLT-bLM PRINCIPLES TO APPLY:**
    - **Prepare phase:** Activate prior knowledge and introduce the topic clearly. Segment the information logically and avoid cognitive overload.
    - **Initiate phase:** Use attention-capturing cues (questions, analogies, relatable examples). Guide learners to focus on core learning objectives.
    - **Deliver phase:** Present content with visual-verbal balance (modality effect), avoid redundant or split attention materials, and provide clear worked examples.
    - **End phase:** Reinforce schema construction through summarization, application, and reflection. Provide closure that links new knowledge to prior concepts.
    
    Each frame should *minimize unnecessary information*, *optimize clarity*, and *enhance learner engagement* using CLT principles.
    
    **SEGMENT DETAILS:**
    - Topic: ${videoData.topic}
    - Title: "${segment.title}"
    - Learning Objective: ${segment.cltBlmScript.learningObjective}
    - MUST COVER ALL KEY POINTS: ${segment.cltBlmScript.keypoints.join(', ')}
    
    **ORIGINAL TRANSCRIPT CONTENT:**
    ${segmentTranscript}
    
    **FRAME STRUCTURE REQUIREMENTS:**
    Create content for exactly 3 frames that will be combined into one micro-learning video:
    
    **FRAME 1 (Prepare & Initiate - 25% of content):**
    - Introduce and connect prior knowledge
    - State learning objectives clearly
    - Present essential context only (no overload)
    - Stimulate attention using a question, analogy, or real-world relevance
    
    **FRAME 2 (Deliver - 50% of content):**
    - Explain technical concepts step-by-step
    - Provide clear examples and guided reasoning
    - Avoid redundant words or visuals; use integrated explanations
    - Include cognitive aids (signaling, sequencing, voice clarity)
    
    **FRAME 3 (End - 25% of content):**
    - Summarize core concepts and link back to the learning objective
    - Provide a simple real-world example or practical takeaway
    - Reinforce schema through short reflection or application
    - Maintain closure with low extraneous load
    
    **OUTPUT FORMAT:**
    Return a JSON object with this exact structure:
    
    {
      "frame1": {
        "keypoints": ["2-3 main bullet points for slide display"],
        "audioScript": "Detailed narration for frame 1 (300+ words)",
        "estimatedDuration": 140
      },
      "frame2": {
        "keypoints": ["3-4 main bullet points for slide display"],
        "audioScript": "Detailed narration for frame 2 (600+ words)",
        "estimatedDuration": 280
      },
      "frame3": {
        "keypoints": ["2-3 main bullet points for slide display"],
        "audioScript": "Detailed narration for frame 3 (300+ words)",
        "estimatedDuration": 140
      }
    }
    
    **CRITICAL RULES:**
    1. All content must follow CLT-bLM — reduce extraneous load, manage intrinsic load, stimulate germane load.
    2. Focus on concept clarity, not motivation or filler.
    3. Each audioScript should be detailed, logically sequenced, and visually mappable.
    4. Keypoints must be concise and slide-friendly.
    5. Use examples and explanations appropriate to the learner’s level (${segment.cltBlmScript.difficulty || 'beginner'}).
    6. Total estimated duration ≈ 560 seconds (7 minutes).
    
    Return ONLY the JSON object, no other text.`;
    }
    

    /**
     * Parse the LLM response into structured content
     */
    parseContentResponse(response) {
        try {
            console.log(`📄 Raw LLM response length: ${response.length} characters`);
            console.log(`📄 Response preview: ${response.substring(0, 200)}...`);

            let frameData = null;
            let responseText = response.trim();

            // Handle markdown code block format
            if (responseText.startsWith('```')) {
                const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
                const match = responseText.match(codeBlockRegex);
                if (match) {
                    responseText = match[1].trim();
                    console.log(`📄 Extracted content from code block`);
                }
            }

            // Try to parse as JSON frame structure
            if (responseText.startsWith('{') && responseText.endsWith('}')) {
                try {
                    const parsed = JSON.parse(responseText);

                    // Check if it's our new frame structure
                    if (parsed.frame1 && parsed.frame2 && parsed.frame3) {
                        frameData = parsed;
                        console.log(`🎬 Successfully parsed frame-based structure`);
                        console.log(`📊 Frame 1: ${frameData.frame1.audioScript.length} chars, ${frameData.frame1.keypoints.length} keypoints`);
                        console.log(`📊 Frame 2: ${frameData.frame2.audioScript.length} chars, ${frameData.frame2.keypoints.length} keypoints`);
                        console.log(`📊 Frame 3: ${frameData.frame3.audioScript.length} chars, ${frameData.frame3.keypoints.length} keypoints`);

                        // Calculate total stats
                        const totalScript = frameData.frame1.audioScript + ' ' + frameData.frame2.audioScript + ' ' + frameData.frame3.audioScript;
                        const totalDuration = frameData.frame1.estimatedDuration + frameData.frame2.estimatedDuration + frameData.frame3.estimatedDuration;

                        console.log(`📊 Total script length: ${totalScript.length} characters`);
                        console.log(`📊 Total estimated duration: ${totalDuration} seconds (${Math.round(totalDuration/60)} minutes)`);
                        console.log(`📊 Estimated word count: ${totalScript.split(' ').length} words`);

                    } else if (parsed.educationalScript) {
                        // Legacy format - convert to frame structure
                        console.log(`📄 Legacy format detected, using as single educational script`);
                        responseText = parsed.educationalScript;
                    }
                } catch (parseError) {
                    console.log(`📄 JSON parsing failed, treating as plain text: ${parseError.message}`);
                }
            }

            // If we have frame data, use it; otherwise create legacy structure
            if (frameData) {
                return {
                    educationalScript: frameData.frame1.audioScript + ' ' + frameData.frame2.audioScript + ' ' + frameData.frame3.audioScript,
                    frameStructure: frameData,
                    practicalExample: "Frame-based micro-learning with synchronized slides and narration",
                    visualCues: [
                        ...frameData.frame1.keypoints,
                        ...frameData.frame2.keypoints,
                        ...frameData.frame3.keypoints
                    ],
                    engagementHooks: {
                        opening: "Let's dive into this technical concept",
                        closing: "You've mastered the key concepts"
                    },
                    interactiveElements: ["Frame-based learning", "Progressive concept building", "Slide synchronization"],
                    cognitiveLoadTips: "Content is structured in digestible frames for optimal learning",
                    transitionFlow: {
                        fromPrevious: "Building on previous concepts",
                        toNext: "Ready for the next learning segment"
                    }
                };
            } else {
                // Legacy fallback
                console.log(`✅ Using response as legacy educational script`);
                console.log(`📊 Educational script length: ${responseText.length} characters`);
                console.log(`📊 Estimated word count: ${responseText.split(' ').length} words`);

                return {
                    educationalScript: responseText,
                    practicalExample: "Practical application of the concepts covered in this video segment",
                    visualCues: ["Code examples", "Visual demonstrations", "Step-by-step walkthroughs"],
                    engagementHooks: {
                        opening: "Welcome to this learning segment",
                        closing: "Great work! Continue to the next topic"
                    },
                    interactiveElements: ["Practice what you've learned", "Think about applications"],
                    cognitiveLoadTips: "Take your time to understand each concept",
                    transitionFlow: {
                        fromPrevious: "Building on what we've learned",
                        toNext: "This prepares us for the next topic"
                    }
                };
            }

        } catch (error) {
            console.error('❌ Error parsing content response:', error);
            console.log(`📄 Using response as-is (${response.length} characters)`);

            return {
                educationalScript: response.trim(),
                practicalExample: "Practical application of the concepts covered in this video segment",
                visualCues: ["Code examples", "Visual demonstrations"],
                engagementHooks: {
                    opening: "Welcome to this learning segment",
                    closing: "Continue to the next topic"
                },
                interactiveElements: ["Practice the concepts"],
                cognitiveLoadTips: "Take your time to understand",
                transitionFlow: {
                    fromPrevious: "Building on previous knowledge",
                    toNext: "Preparing for next steps"
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

            // Add frame structure if available
            if (enhancedContent.frameStructure) {
                updateData['cltBlmScript.frameStructure'] = enhancedContent.frameStructure;
                console.log(`💡 Saving frame structure with ${Object.keys(enhancedContent.frameStructure).length} frames`);
            }

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