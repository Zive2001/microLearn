// controllers/videoController.js
const Video = require('../models/Video');
const MicroVideo = require('../models/MicroVideo');
const transcriptService = require('../services/transcriptService');
const openaiService = require('../services/openaiService');

class VideoController {

    /**
     * Process YouTube URL to create micro-learning videos
     * @route POST /api/videos/process-youtube
     */
    async processYouTubeURL(req, res) {
        try {
            const { url, title, description, topic = 'javascript' } = req.body;
            const userId = req.user._id;

            // Validate YouTube URL
            const youtubeVideoId = Video.extractVideoId(url);
            if (!youtubeVideoId) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid YouTube URL. Please provide a valid YouTube video URL.'
                });
            }

            console.log(`🎬 Starting video processing for: ${youtubeVideoId}`);

            // Create initial video record
            const video = new Video({
                title: title || 'Untitled Video',
                description: description || '',
                sourceUrl: url,
                youtubeVideoId,
                uploadedBy: userId,
                topic,
                processingStatus: 'pending'
            });

            await video.save();

            // Start processing in background (non-blocking)
            setImmediate(() => {
                this.processVideoInBackground(video._id).catch(error => {
                    console.error(`❌ Background processing failed for video ${video._id}:`, error);
                });
            });

            // Return immediate response
            res.status(201).json({
                success: true,
                message: 'Video processing started successfully',
                data: {
                    videoId: video._id,
                    youtubeVideoId: video.youtubeVideoId,
                    status: video.processingStatus,
                    title: video.title,
                    topic: video.topic,
                    estimatedProcessingTime: '5-8 minutes'
                }
            });

        } catch (error) {
            console.error('❌ Error in processYouTubeURL:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to start video processing',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    /**
     * Background video processing workflow
     * @param {string} videoId - Video document ID
     */
    async processVideoInBackground(videoId) {
        let video;

        try {
            console.log(`🔄 Starting background processing for video: ${videoId}`);

            // Get video record
            video = await Video.findById(videoId);
            if (!video) {
                throw new Error('Video not found');
            }

            // Update status to processing
            await video.updateProcessingStatus('processing');

            // Step 1: Extract transcript
            console.log(`📝 Step 1: Extracting transcript for ${video.youtubeVideoId}`);
            const transcriptData = await transcriptService.extractTranscript(video.youtubeVideoId);

            // Update video with transcript and duration
            video.transcript = transcriptData.fullText;
            video.originalDuration = transcriptData.estimatedDuration;
            video.formattedDuration = transcriptService.formatDuration(transcriptData.estimatedDuration);
            await video.save();

            console.log(`✅ Transcript extracted: ${transcriptData.wordCount} words, ${transcriptData.estimatedDuration}s duration`);

            // Step 2: Generate basic CLT-bLM analysis and segments
            console.log(`🧠 Step 2: Generating CLT-bLM analysis...`);
            const cltAnalysis = await this.generateBasicCLTAnalysis(
                transcriptData.fullText,
                video.topic,
                transcriptData.estimatedDuration
            );

            console.log(`✅ CLT-bLM analysis complete: ${cltAnalysis.segments.length} segments planned`);

            // Step 3: Create micro-video records
            console.log(`📹 Step 3: Creating micro-video segments...`);
            const microVideos = await this.createMicroVideoSegments(video._id, cltAnalysis, transcriptData);

            console.log(`✅ Created ${microVideos.length} micro-video segments`);

            // Step 4: Mark as completed
            await video.updateProcessingStatus('completed');
            console.log(`🎉 Video processing completed for: ${video.title}`);

        } catch (error) {
            console.error(`❌ Background processing error for video ${videoId}:`, error);

            // Update video with error status
            if (video) {
                await video.updateProcessingStatus('failed', error.message);
            }

            throw error;
        }
    }

    /**
     * Generate enhanced CLT-bLM analysis using OpenAI for educational shorts
     * @param {string} transcript - Full video transcript
     * @param {string} topic - Video topic
     * @param {number} duration - Video duration in seconds
     * @returns {Object} CLT analysis with educational shorts plan
     */
    async generateBasicCLTAnalysis(transcript, topic, duration) {
        const prompt = `You are an expert educational content creator. Transform this YouTube video into engaging educational shorts using CLT-bLM principles.

ORIGINAL TRANSCRIPT:
${transcript.substring(0, 4000)}${transcript.length > 4000 ? '...' : ''}

TOPIC: ${topic}
ORIGINAL DURATION: ${Math.floor(duration/60)} minutes

TASK: Create 3-5 educational micro-learning segments (5-8 minutes each) that:

1. **Cognitive Load Theory (CLT):**
   - ONE main concept per segment
   - Minimize extraneous information
   - Build from simple to complex

2. **Micro-Learning Principles:**
   - Focused learning objectives
   - Standalone segments
   - Practical, actionable content

3. **Educational Shorts Format:**
   - Engaging titles
   - Clear explanations
   - Real-world examples

Generate JSON response:
{
  "overallObjective": "What learners will master after all segments",
  "totalSegments": 4,
  "estimatedTotalDuration": 28,
  "segments": [
    {
      "segmentNumber": 1,
      "title": "Catchy educational title",
      "duration": 420,
      "learningObjective": "Specific skill/knowledge gained",
      "keyPoints": ["3-4 main concepts to cover"],
      "practicalExample": "Real-world use case",
      "cognitiveLoad": 4,
      "difficulty": "Beginner",
      "educationalScript": "Complete script for this segment (200-300 words)",
      "visualCues": ["What visuals/examples to show"]
    }
  ],
  "learningPath": "How segments connect for complete understanding"
}

Create educational shorts that are better than the original - more focused, clearer, and optimized for learning!`;

        try {
            const response = await openaiService.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert educational content designer specializing in Cognitive Load Theory and micro-learning. Always respond with valid JSON only.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 1500,
                temperature: 0.7
            });

            const content = response.choices[0].message.content.trim();
            return JSON.parse(content);

        } catch (error) {
            console.error('Error in CLT analysis:', error);

            // Fallback: Create basic time-based segments
            return this.createBasicTimeSegments(duration, topic);
        }
    }

    /**
     * Create educational segments as fallback with enhanced content
     * @param {number} duration - Video duration in seconds
     * @param {string} topic - Video topic
     * @returns {Object} Enhanced educational segment structure
     */
    createBasicTimeSegments(duration, topic) {
        const segmentDuration = 420; // 7 minutes per segment
        const segments = [];

        // Define topic-specific educational content
        const topicContent = {
            javascript: [
                {
                    title: "JavaScript Fundamentals: Variables & Data Types",
                    learningObjective: "Master JavaScript variables and understand different data types",
                    keyPoints: ["Variable declarations (let, const, var)", "Primitive data types", "Variable scope basics"],
                    practicalExample: "Creating variables for a user profile form",
                    educationalScript: "Welcome to JavaScript Fundamentals! In this segment, we'll master variables - the building blocks of any program. Variables are like labeled containers that store information. JavaScript gives us three ways to create variables: let, const, and var. Let's explore when to use each one and understand the different types of data we can store.",
                    visualCues: ["Code examples", "Variable declaration syntax", "Data type demonstrations"]
                },
                {
                    title: "JavaScript Functions: Building Reusable Code",
                    learningObjective: "Create and use functions to organize your JavaScript code",
                    keyPoints: ["Function declarations vs expressions", "Parameters and return values", "Function scope"],
                    practicalExample: "Building calculator functions",
                    educationalScript: "Functions are the workhorses of JavaScript! Think of functions as mini-programs that perform specific tasks. They help us write cleaner, more organized code by grouping related instructions together. In this segment, we'll learn how to create functions, pass information to them, and get results back.",
                    visualCues: ["Function syntax", "Parameter examples", "Return statement demos"]
                },
                {
                    title: "JavaScript Control Flow: Making Decisions",
                    learningObjective: "Use conditional statements and loops to control program flow",
                    keyPoints: ["If-else statements", "Comparison operators", "Basic loops"],
                    practicalExample: "Creating a grade calculator with conditions",
                    educationalScript: "Programs need to make decisions and repeat actions - that's where control flow comes in! We'll explore if-else statements that let our code choose different paths based on conditions, and loops that repeat actions efficiently. These are essential tools for creating dynamic, interactive programs.",
                    visualCues: ["Flowchart diagrams", "Conditional logic examples", "Loop demonstrations"]
                }
            ],
            react: [
                {
                    title: "React Basics: Components & JSX",
                    learningObjective: "Understand React components and JSX syntax",
                    keyPoints: ["What is a component", "JSX fundamentals", "Component structure"],
                    practicalExample: "Creating a welcome card component",
                    educationalScript: "Welcome to React! React is all about components - think of them as custom LEGO blocks for building user interfaces. In this segment, we'll explore what components are, how JSX makes writing them intuitive, and build our first functional component together.",
                    visualCues: ["Component tree diagrams", "JSX syntax examples", "Live coding demo"]
                },
                {
                    title: "React State: Managing Dynamic Data",
                    learningObjective: "Learn to manage changing data with React state",
                    keyPoints: ["useState hook", "State updates", "Re-rendering concepts"],
                    practicalExample: "Building a counter app with state",
                    educationalScript: "State is what makes React components dynamic and interactive! When data in your app changes, React automatically updates the user interface. We'll learn the useState hook - your key to managing changing data in React components.",
                    visualCues: ["State diagram", "Hook syntax", "Interactive examples"]
                }
            ],
            python: [
                {
                    title: "Python Fundamentals: Variables & Basic Operations",
                    learningObjective: "Master Python variables and basic operations",
                    keyPoints: ["Variable assignment", "Basic data types", "Simple operations"],
                    practicalExample: "Creating a simple calculator",
                    educationalScript: "Python makes programming intuitive and fun! In this segment, we'll start with variables - Python's way of storing and working with data. You'll learn how Python's simple syntax makes it perfect for beginners while remaining powerful for experts.",
                    visualCues: ["Python syntax", "Variable examples", "Operation demonstrations"]
                }
            ]
        };

        const content = topicContent[topic] || topicContent.javascript;

        content.forEach((segmentData, index) => {
            segments.push({
                segmentNumber: index + 1,
                title: segmentData.title,
                duration: segmentDuration,
                learningObjective: segmentData.learningObjective,
                keyPoints: segmentData.keyPoints,
                practicalExample: segmentData.practicalExample,
                cognitiveLoad: 4 + index, // Gradually increase complexity
                difficulty: index === 0 ? "Beginner" : index === 1 ? "Intermediate" : "Intermediate",
                educationalScript: segmentData.educationalScript,
                visualCues: segmentData.visualCues
            });
        });

        return {
            overallObjective: `Master ${topic} fundamentals through focused micro-learning segments`,
            totalSegments: segments.length,
            estimatedTotalDuration: Math.floor((segments.length * segmentDuration) / 60),
            segments: segments,
            learningPath: `Progressive learning from basic concepts to practical applications in ${topic}`
        };
    }

    /**
     * Create MicroVideo database records for educational shorts
     * @param {string} videoId - Parent video ID
     * @param {Object} cltAnalysis - Enhanced CLT analysis results
     * @param {Object} transcriptData - Original transcript data
     * @returns {Array} Created micro-video documents
     */
    async createMicroVideoSegments(videoId, cltAnalysis, transcriptData) {
        const microVideos = [];

        for (let i = 0; i < cltAnalysis.segments.length; i++) {
            const segment = cltAnalysis.segments[i];

            const microVideo = new MicroVideo({
                originalVideoId: videoId,
                title: segment.title,
                sequence: segment.segmentNumber || (i + 1),
                timeRange: {
                    startTime: 0, // Educational shorts don't use original video timing
                    endTime: segment.duration || 420,
                    duration: segment.duration || 420
                },
                cltBlmScript: {
                    learningObjective: segment.learningObjective,
                    keypoints: segment.keyPoints || [],
                    cognitiveLoad: segment.cognitiveLoad || 5,
                    prerequisites: segment.prerequisites || [],
                    // Enhanced fields for educational shorts
                    practicalExample: segment.practicalExample,
                    difficulty: segment.difficulty,
                    educationalScript: segment.educationalScript,
                    visualCues: segment.visualCues || []
                },
                segmentTranscript: segment.educationalScript || 'Generated educational content',
                processingStatus: 'completed'
            });

            await microVideo.save();
            microVideos.push(microVideo);
        }

        return microVideos;
    }

    /**
     * Get processing status for a video
     * @route GET /api/videos/:videoId/status
     */
    async getProcessingStatus(req, res) {
        try {
            const { videoId } = req.params;
            const userId = req.user._id;

            const video = await Video.findOne({ _id: videoId, uploadedBy: userId });
            if (!video) {
                return res.status(404).json({
                    success: false,
                    message: 'Video not found or access denied'
                });
            }

            // Get micro-videos if completed
            let microVideos = [];
            if (video.processingStatus === 'completed') {
                microVideos = await MicroVideo.getByVideoId(videoId);
            }

            res.json({
                success: true,
                data: {
                    videoId: video._id,
                    title: video.title,
                    youtubeVideoId: video.youtubeVideoId,
                    processingStatus: video.processingStatus,
                    processingError: video.processingError,
                    originalDuration: video.originalDuration,
                    formattedDuration: video.formattedDuration,
                    topic: video.topic,
                    microVideosCount: microVideos.length,
                    createdAt: video.createdAt,
                    updatedAt: video.updatedAt
                }
            });

        } catch (error) {
            console.error('Error getting processing status:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get processing status',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    /**
     * Get micro-videos for a processed video
     * @route GET /api/videos/:videoId/micro-videos
     */
    async getMicroVideos(req, res) {
        try {
            const { videoId } = req.params;
            const userId = req.user._id;

            // Verify video belongs to user
            const video = await Video.findOne({ _id: videoId, uploadedBy: userId });
            if (!video) {
                return res.status(404).json({
                    success: false,
                    message: 'Video not found or access denied'
                });
            }

            if (video.processingStatus !== 'completed') {
                return res.status(400).json({
                    success: false,
                    message: 'Video processing not yet completed',
                    currentStatus: video.processingStatus
                });
            }

            // Get all micro-videos
            const microVideos = await MicroVideo.getByVideoId(videoId);

            res.json({
                success: true,
                data: {
                    parentVideo: {
                        id: video._id,
                        title: video.title,
                        duration: video.formattedDuration,
                        topic: video.topic
                    },
                    microVideos: microVideos.map(mv => ({
                        id: mv._id,
                        title: mv.title,
                        sequence: mv.sequence,
                        timeRange: mv.timeRangeFormatted,
                        learningObjective: mv.cltBlmScript.learningObjective,
                        keypoints: mv.cltBlmScript.keypoints,
                        cognitiveLoad: mv.cltBlmScript.cognitiveLoad,
                        youtubeEmbedUrl: `https://www.youtube.com/embed/${video.youtubeVideoId}?start=${mv.timeRange.startTime}&end=${mv.timeRange.endTime}`
                    })),
                    totalSegments: microVideos.length
                }
            });

        } catch (error) {
            console.error('Error getting micro-videos:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get micro-videos',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }
}

module.exports = new VideoController();