// services/keypointScriptGenerationService.js
// User-Keypoint-Based Educational Script Generation
// Generates 1000+ word focused scripts based on user-specified keypoints
// Eliminates time-wasting content - delivers only what the user needs to learn

const OpenAI = require('openai');
const azureTtsService = require('./azureTtsService');
// TODO: Re-enable when avatarVideoService is implemented
// const avatarVideoService = require('./avatarVideoService');

class KeypointScriptGenerationService {
    constructor() {
        // Initialize OpenAI
        if (process.env.OPENAI_API_KEY) {
            this.openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY,
            });
        } else {
            throw new Error('OpenAI API key required for script generation');
        }

        // Script generation parameters
        this.MIN_WORDS_PER_SEGMENT = 1000;
        this.MAX_WORDS_PER_SEGMENT = 1500;
        this.MIN_SEGMENTS = 3;
        this.MAX_SEGMENTS = 12;
        this.WORDS_PER_MINUTE = 150; // Speaking rate
    }

    /**
     * Generate educational scripts based on user-provided keypoints and YouTube video
     * @param {Object} params
     * @param {string} params.youtubeUrl - YouTube video URL
     * @param {Array<string>} params.keypoints - User-specified keypoints to cover
     * @param {Object} params.options - Generation options
     * @returns {Promise<Object>} Generated scripts with avatar video metadata
     */
    async generateFromKeypoints(params) {
        const { youtubeUrl, keypoints, options = {} } = params;

        console.log('\n🎯 KEYPOINT-BASED SCRIPT GENERATION STARTED');
        console.log('=' .repeat(60));
        console.log(`📹 YouTube URL: ${youtubeUrl}`);
        console.log(`🔑 Keypoints: ${keypoints.length} items`);
        console.log(`📊 Target: ${this.MIN_WORDS_PER_SEGMENT}-${this.MAX_WORDS_PER_SEGMENT} words per segment`);

        // Validate inputs
        this.validateInputs(keypoints, options);

        // Extract video context (title, description, transcript)
        const videoContext = await this.extractVideoContext(youtubeUrl);

        // Generate educational scripts for each keypoint
        const scripts = await this.generateKeypointScripts(
            keypoints,
            videoContext,
            options
        );

        // Generate avatar videos for each script (optional, controlled by flag)
        let avatarVideos = null;
        if (options.generateAvatarVideos !== false) {
            avatarVideos = await this.generateAvatarVideos(scripts, options);
        }

        console.log('\n🎉 KEYPOINT-BASED GENERATION COMPLETED');
        console.log('=' .repeat(60));

        return {
            success: true,
            videoContext,
            scripts,
            avatarVideos,
            metadata: {
                totalSegments: scripts.length,
                totalWords: scripts.reduce((sum, s) => sum + s.wordCount, 0),
                avgWordsPerSegment: Math.round(scripts.reduce((sum, s) => sum + s.wordCount, 0) / scripts.length),
                estimatedTotalDuration: scripts.reduce((sum, s) => sum + s.estimatedDuration, 0),
                generatedAt: new Date().toISOString()
            }
        };
    }

    /**
     * Validate input parameters
     */
    validateInputs(keypoints, options) {
        if (!Array.isArray(keypoints) || keypoints.length === 0) {
            throw new Error('At least one keypoint is required');
        }

        if (keypoints.length < this.MIN_SEGMENTS) {
            throw new Error(`Minimum ${this.MIN_SEGMENTS} keypoints required`);
        }

        if (keypoints.length > this.MAX_SEGMENTS) {
            throw new Error(`Maximum ${this.MAX_SEGMENTS} keypoints allowed`);
        }

        // Validate each keypoint
        keypoints.forEach((keypoint, index) => {
            if (typeof keypoint !== 'string' || keypoint.trim().length === 0) {
                throw new Error(`Keypoint ${index + 1} is invalid`);
            }
            if (keypoint.length < 5) {
                throw new Error(`Keypoint ${index + 1} is too short (minimum 5 characters)`);
            }
        });

        console.log('✅ Input validation passed');
    }

    /**
     * Extract video context from YouTube URL
     */
    async extractVideoContext(youtubeUrl) {
        console.log('\n📝 Extracting video context...');

        const transcriptService = require('./transcriptService');
        const Video = require('../models/Video');

        // Extract video ID
        const videoId = Video.extractVideoId(youtubeUrl);
        if (!videoId) {
            throw new Error('Invalid YouTube URL');
        }

        // Get transcript
        const transcriptData = await transcriptService.extractTranscript(videoId);

        if (transcriptData.isMock) {
            throw new Error('Could not extract transcript from video. Please try a different video.');
        }

        console.log(`✅ Video context extracted: ${transcriptData.wordCount} words`);

        return {
            youtubeVideoId: videoId,
            youtubeUrl,
            title: transcriptData.title || 'Educational Video',
            transcript: transcriptData.fullText,
            duration: transcriptData.estimatedDuration,
            wordCount: transcriptData.wordCount
        };
    }

    /**
     * Generate educational scripts for each keypoint
     */
    async generateKeypointScripts(keypoints, videoContext, options) {
        console.log('\n✍️ Generating educational scripts...');

        const scripts = [];
        const totalKeypoints = keypoints.length;

        for (let i = 0; i < keypoints.length; i++) {
            const keypoint = keypoints[i];
            const segmentNumber = i + 1;

            console.log(`\n🎯 Segment ${segmentNumber}/${totalKeypoints}: "${keypoint}"`);

            try {
                const script = await this.generateSingleKeypointScript(
                    keypoint,
                    videoContext,
                    segmentNumber,
                    totalKeypoints,
                    options
                );

                scripts.push(script);
                console.log(`✅ Generated: ${script.wordCount} words (~${script.estimatedDuration}s)`);

            } catch (error) {
                console.error(`❌ Failed to generate script for keypoint ${segmentNumber}:`, error.message);
                throw error;
            }
        }

        return scripts;
    }

    /**
     * Generate a single educational script for a keypoint
     */
    async generateSingleKeypointScript(keypoint, videoContext, segmentNumber, totalSegments, options) {
        const prompt = this.buildKeypointPrompt(
            keypoint,
            videoContext,
            segmentNumber,
            totalSegments,
            options
        );

        try {
            const response = await this.openai.chat.completions.create({
                model: options.model || 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: this.getSystemPrompt()
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 3000, // Increased for 1000+ word scripts
                temperature: 0.7,
            });

            const scriptContent = response.choices[0].message.content.trim();

            // Parse and validate script
            const scriptData = await this.parseGeneratedScript(
                scriptContent,
                keypoint,
                segmentNumber,
                options
            );

            // Generate whiteboard timeline based on the educational script
            // Only generate if not disabled in options
            if (options.generateWhiteboardTimeline !== false) {
                const whiteboardData = await this.generateWhiteboardTimeline(scriptData.educationalScript);
                scriptData.whiteboardTimeline = whiteboardData.whiteboardTimeline || [];
            } else {
                scriptData.whiteboardTimeline = [];
            }

            return scriptData;

        } catch (error) {
            console.error('OpenAI API Error:', error.message);
            throw new Error(`Script generation failed: ${error.message}`);
        }
    }

    /**
     * Build prompt for keypoint-based script generation
     */
    buildKeypointPrompt(keypoint, videoContext, segmentNumber, totalSegments, options) {
        const isFirst = segmentNumber === 1;
        const isLast = segmentNumber === totalSegments;

        return `Generate a comprehensive educational script for an AI avatar-delivered microlearning segment.

**CRITICAL REQUIREMENTS:**
- Word Count: EXACTLY ${this.MIN_WORDS_PER_SEGMENT}-${this.MAX_WORDS_PER_SEGMENT} words
- Focus: ONLY cover the specified keypoint - NO time-wasting content
- Style: Direct, efficient teaching - get to the point immediately
- Purpose: Users are learning specific topics to SAVE TIME, not watching full videos

**VIDEO CONTEXT:**
Title: ${videoContext.title}
YouTube ID: ${videoContext.youtubeVideoId}
Full Transcript Available: Yes (${videoContext.wordCount} words)

**USER'S LEARNING GOAL:**
Keypoint to Learn: "${keypoint}"
Segment: ${segmentNumber} of ${totalSegments}
Position: ${isFirst ? 'FIRST - Introduction' : isLast ? 'LAST - Conclusion' : 'Middle - Main Content'}

**SCRIPT GENERATION INSTRUCTIONS:**

1. **IMMEDIATE START** ${isFirst ? '(This is the first segment)' : ''}
   ${isFirst
     ? '- Start with a brief 1-sentence welcome\n   - Immediately state what this segment will teach\n   - NO lengthy introductions or small talk'
     : '- Jump directly into the content\n   - NO recap of previous segments\n   - Assume prior segments were understood'}

2. **FOCUSED CONTENT** (This is the main body - 80% of script)
   - Extract ONLY relevant information from the video transcript about: "${keypoint}"
   - Explain concepts clearly and systematically
   - Include practical examples and code samples (if applicable)
   - Break down complex ideas step-by-step
   - Use analogies ONLY if they save explanation time
   - NO fluff, NO filler words, NO unnecessary elaboration
   - Every sentence must add value to understanding "${keypoint}"

3. **EFFICIENT TEACHING**
   - Use direct language: "This is X", "X works by...", "To do X, you..."
   - Avoid: "I hope you...", "Let's take a moment...", "Before we...", "Now, you might be wondering..."
   - Include 2-3 concrete examples that demonstrate the keypoint
   - Reference the source video ONLY if it adds clarity

4. **STRUCTURAL REQUIREMENTS**
   ${isFirst ? '- Brief welcome (1 sentence)\n   - Learning objective (1 sentence)' : ''}
   - Core explanation (70-80% of content)
   - 2-3 practical examples with specifics
   - Quick summary of key takeaways (2-3 sentences)
   ${isLast ? '- Final conclusion (1-2 sentences)\n   - NO "thank you for watching" or similar fluff' : ''}

5. **AVATAR SPEECH OPTIMIZATION**
   - Write for natural AI voice delivery
   - Sentence length: 12-20 words maximum
   - Use pauses strategically (mark with "...")
   - Speaking rate: ~${this.WORDS_PER_MINUTE} words per minute
   - Total duration: ~${Math.round((this.MIN_WORDS_PER_SEGMENT + this.MAX_WORDS_PER_SEGMENT) / 2 / this.WORDS_PER_MINUTE * 60)} seconds

6. **QUALITY CHECKERS**
   - Does every paragraph directly relate to "${keypoint}"?
   - Can I remove any sentence without losing essential information? (If yes, remove it)
   - Are there any time-wasting phrases? (Remove them)
   - Does the script teach efficiently and completely?

**TRANSCRIPT EXCERPT (Extract relevant parts only):**
${videoContext.transcript.substring(0, 2000)}...

**OUTPUT FORMAT:**
Return ONLY the educational script as natural flowing text. No meta-commentary, no stage directions (except "..."), no JSON formatting.

Generate the ${this.MIN_WORDS_PER_SEGMENT}-${this.MAX_WORDS_PER_SEGMENT} word educational script NOW:`;
    }

    /**
     * System prompt for keypoint-based generation
     */
    getSystemPrompt() {
        return `You are an expert educational script writer specializing in time-efficient microlearning.

YOUR MISSION: Create focused, high-density educational scripts that teach specific concepts quickly and effectively. Users choose this app specifically to AVOID watching full YouTube videos - they want to learn ONLY what they need.

CORE PRINCIPLES:
1. **Zero Waste**: Every word must contribute to learning the keypoint
2. **Direct Teaching**: Get to the point immediately, no fluff
3. **Complete Coverage**: Explain the keypoint thoroughly but efficiently
4. **Practical Focus**: Include real examples, code, or applications
5. **Avatar Optimized**: Natural speech patterns for AI voice delivery

FORBIDDEN PHRASES (NEVER use these time-wasters):
- "I hope you enjoyed..."
- "Let's take a moment to..."
- "Before we move on..."
- "Now, you might be wondering..."
- "It's important to note that..."
- "As you can see..."
- "Feel free to..."
- "Don't forget to..."
- Lengthy personal anecdotes
- Unnecessary repetition

REQUIRED ELEMENTS:
✅ Immediate content delivery
✅ Clear explanations
✅ Concrete examples
✅ Practical applications
✅ Efficient pacing
✅ ${this.MIN_WORDS_PER_SEGMENT}-${this.MAX_WORDS_PER_SEGMENT} words

Your scripts should feel like having an expert friend explain something efficiently - knowledgeable, clear, and respectful of the learner's time.`;
    }

    /**
     * Generate whiteboard display timeline based on educational script
     * Analyzes script and creates timed content for whiteboard display
     */
    async generateWhiteboardTimeline(scriptText) {
        console.log('🎨 Generating whiteboard timeline...');

        const systemPrompt = `You are an AI educational content synchronizer that prepares display data for an AI teaching video system.
Your job is to analyze an already-generated *educational script* and produce a structured timeline of what to show on a whiteboard while the AI avatar speaks.

CRITICAL RULES FOR CODE BLOCKS:
- When you find a code example, ALWAYS extract the COMPLETE code block as ONE SINGLE ITEM
- NEVER split a multi-line code snippet into multiple timeline items
- If the code has 2, 3, 4, or more lines that form a complete example, show ALL lines together
- Preserve ALL line breaks, indentation, and formatting EXACTLY as written
- A complete code block should stay on screen long enough for users to read all lines

Examples of COMPLETE code blocks (keep together):
✅ CORRECT - Single timeline item:
{
  "contentType": "code",
  "contentText": "const greeting = 'Hello';\nconsole.log(greeting);\nconst count = 0;"
}

❌ WRONG - DO NOT split like this:
Item 1: "const greeting = 'Hello';"
Item 2: "console.log(greeting);"
Item 3: "const count = 0;"

GENERAL RULES:
- Each item must include:
  1. timeStart (in seconds) → when to display
  2. timeEnd (in seconds) → when to remove or change
  3. contentType → either "code" or "concept"
  4. contentText → what to show on the whiteboard

- Calculate time based on:
  * Word count of the script
  * Speech rate: 150 words per minute (~2.5 words/sec)
  * For multi-line code: Add extra time so users can read all lines

- Display timing:
  * Show each item 1-2 seconds BEFORE the avatar starts talking about it
  * Keep code blocks visible for at least 5-8 seconds (longer for multi-line code)
  * Adjust duration based on complexity: longer code = more display time

- For non-code explanations:
  * Extract important keywords or concept summaries (≤ 15 words)
  * Summaries should be very short, factual, and free of fluff

- Create 4-8 timeline items total (fewer items = better comprehension)
- Prioritize showing COMPLETE, MEANINGFUL content over many small fragments

- Distribute items throughout the script duration

TIMING FORMULA:
- Single line code: 5-8 seconds minimum
- 2-3 line code: 8-12 seconds minimum
- 4+ line code: 12-18 seconds minimum
- Concepts: 4-7 seconds

Output **only JSON** in this format:

{
  "whiteboardTimeline": [
    {
      "timeStart": 3.0,
      "timeEnd": 10.5,
      "contentType": "concept",
      "contentText": "Variables store reusable values in memory"
    },
    {
      "timeStart": 11.0,
      "timeEnd": 22.0,
      "contentType": "code",
      "contentText": "const name = 'Alice';\nconst age = 25;\nconsole.log(name, age);"
    }
  ]
}

Don't add any explanations outside JSON.`;

        const userPrompt = `The following is the full educational script generated earlier for an AI teaching avatar.
Please analyze it and return the JSON whiteboard timeline as per the system prompt:

${scriptText}`;

        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini', // fast + cost-efficient
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt,
                    },
                    {
                        role: 'user',
                        content: userPrompt,
                    },
                ],
                temperature: 0.2, // Lower temperature for more consistent output
                max_tokens: 2500, // Increased to handle larger code blocks
            });

            const rawContent = response.choices[0].message.content.trim();

            // Extract JSON from the response
            const jsonStart = rawContent.indexOf('{');
            const jsonEnd = rawContent.lastIndexOf('}');

            if (jsonStart === -1 || jsonEnd === -1) {
                console.warn('⚠️ No JSON found in whiteboard timeline response');
                return { whiteboardTimeline: [] };
            }

            const jsonString = rawContent.slice(jsonStart, jsonEnd + 1);
            const parsed = JSON.parse(jsonString);

            // Validate and log timeline items
            const timeline = parsed.whiteboardTimeline;
            console.log(`✅ Whiteboard timeline generated: ${timeline.length} items`);

            // Log details of each item for debugging
            timeline.forEach((item, index) => {
                const lineCount = item.contentText.split('\n').length;
                const displayType = item.contentType === 'code' ? '📝 Code' : '💡 Concept';
                const duration = (item.timeEnd - item.timeStart).toFixed(1);

                if (item.contentType === 'code' && lineCount > 1) {
                    console.log(`  ${index + 1}. ${displayType} (${lineCount} lines, ${duration}s): ${item.contentText.substring(0, 50)}...`);
                } else {
                    console.log(`  ${index + 1}. ${displayType} (${duration}s): ${item.contentText.substring(0, 60)}...`);
                }
            });

            return parsed;

        } catch (error) {
            console.error('❌ Whiteboard timeline generation failed:', error.message);
            return { whiteboardTimeline: [] };
        }
    }

    /**
     * Parse and validate generated script
     */
    parseGeneratedScript(scriptContent, keypoint, segmentNumber, options) {
        // Remove any JSON formatting if present
        let cleanScript = scriptContent;
        if (scriptContent.includes('```') || scriptContent.includes('{')) {
            // Extract text between markers or clean JSON
            cleanScript = scriptContent
                .replace(/```[\w]*\n?/g, '')
                .replace(/^\{[\s\S]*?"script":\s*"/m, '')
                .replace(/"[\s\S]*\}$/m, '')
                .trim();
        }

        // Calculate metrics
        const wordCount = cleanScript.trim().split(/\s+/).length;
        const estimatedDuration = Math.round(wordCount / this.WORDS_PER_MINUTE * 60); // in seconds
        const sentences = cleanScript.split(/[.!?]+/).filter(s => s.trim().length > 0).length;

        // Validate word count
        if (wordCount < this.MIN_WORDS_PER_SEGMENT * 0.9) { // Allow 10% deviation
            console.warn(`⚠️ Script is short: ${wordCount} words (target: ${this.MIN_WORDS_PER_SEGMENT}+)`);
        }

        // Check for time-wasting phrases
        const wasteIndicators = [
            /I hope you/i,
            /let's take a moment/i,
            /before we move on/i,
            /you might be wondering/i,
            /it's important to note/i,
            /as you can see/i,
            /feel free to/i,
            /don't forget to/i
        ];

        const hasWaste = wasteIndicators.some(pattern => pattern.test(cleanScript));
        if (hasWaste) {
            console.warn('⚠️ Script contains time-wasting phrases');
        }

        return {
            segmentNumber,
            keypoint,
            title: `Keypoint ${segmentNumber}: ${keypoint}`,
            educationalScript: cleanScript,

            // Metrics
            wordCount,
            estimatedDuration,
            sentences,
            avgWordsPerSentence: Math.round(wordCount / sentences),

            // Quality flags
            meetsWordCount: wordCount >= this.MIN_WORDS_PER_SEGMENT * 0.9,
            noTimeWaste: !hasWaste,
            readyForAvatar: wordCount <= this.MAX_WORDS_PER_SEGMENT * 1.1,

            // Frame structure for avatar (3-part breakdown)
            frameStructure: this.generateFrameStructure(cleanScript, keypoint),

            // Metadata
            generatedAt: new Date().toISOString(),
            model: options.model || 'gpt-4'
        };
    }

    /**
     * Generate 3-frame structure from script
     */
    generateFrameStructure(script, keypoint) {
        const sentences = script.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const totalSentences = sentences.length;

        // Divide into 3 frames
        const frame1End = Math.floor(totalSentences * 0.30);
        const frame2End = Math.floor(totalSentences * 0.70);

        const frame1Sentences = sentences.slice(0, frame1End);
        const frame2Sentences = sentences.slice(frame1End, frame2End);
        const frame3Sentences = sentences.slice(frame2End);

        return {
            frame1: {
                keypoints: [keypoint + ' - Introduction'],
                audioScript: frame1Sentences.join('. ') + '.',
                estimatedDuration: Math.round(frame1Sentences.length / totalSentences * (script.split(/\s+/).length / this.WORDS_PER_MINUTE * 60))
            },
            frame2: {
                keypoints: [keypoint + ' - Main Content'],
                audioScript: frame2Sentences.join('. ') + '.',
                estimatedDuration: Math.round(frame2Sentences.length / totalSentences * (script.split(/\s+/).length / this.WORDS_PER_MINUTE * 60))
            },
            frame3: {
                keypoints: [keypoint + ' - Summary'],
                audioScript: frame3Sentences.join('. ') + '.',
                estimatedDuration: Math.round(frame3Sentences.length / totalSentences * (script.split(/\s+/).length / this.WORDS_PER_MINUTE * 60))
            }
        };
    }

    /**
     * Generate avatar videos for all scripts
     */
    async generateAvatarVideos(scripts, options) {
        console.log('\n🎭 Generating avatar videos...');

        const teacher = options.teacher || 'Ava';
        const avatarVideos = [];

        for (let i = 0; i < scripts.length; i++) {
            const script = scripts[i];
            console.log(`\n📹 Video ${i + 1}/${scripts.length}: ${script.keypoint}`);

            try {
                // Generate TTS with visemes
                console.log('🔊 Generating TTS with visemes...');
                const ttsResult = await azureTtsService.generateTTSWithVisemes(
                    script.educationalScript,
                    teacher
                );

                console.log(`✅ TTS generated: ${ttsResult.visemes.length} visemes, ${ttsResult.duration}s`);

                // Store avatar video metadata (frontend will use this for real-time rendering)
                const avatarData = {
                    segmentNumber: script.segmentNumber,
                    keypoint: script.keypoint,
                    title: script.title,
                    teacher,
                    audioBase64: ttsResult.audioBase64,
                    visemes: ttsResult.visemes,
                    duration: ttsResult.duration,
                    script: script.educationalScript,
                    wordCount: script.wordCount,
                    estimatedDuration: script.estimatedDuration,
                    whiteboardTimeline: script.whiteboardTimeline || [], // Include whiteboard timeline
                    generatedAt: new Date().toISOString()
                };

                avatarVideos.push(avatarData);
                console.log(`✅ Avatar data prepared for segment ${i + 1}`);

            } catch (error) {
                console.error(`❌ Failed to generate avatar video ${i + 1}:`, error.message);
                avatarVideos.push({
                    segmentNumber: script.segmentNumber,
                    keypoint: script.keypoint,
                    error: error.message,
                    failed: true
                });
            }
        }

        const successful = avatarVideos.filter(v => !v.failed).length;
        console.log(`\n✅ Avatar generation complete: ${successful}/${scripts.length} successful`);

        return avatarVideos;
    }
}

module.exports = new KeypointScriptGenerationService();
