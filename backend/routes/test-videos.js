// routes/test-videos.js - Test routes for video processing without auth
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const videoController = require('../controllers/videoController');
const Video = require('../models/Video');
const MicroVideo = require('../models/MicroVideo');
const User = require('../models/User');
const ttsService = require('../services/ttsService');
const videoGenerationService = require('../services/videoGenerationService');

const router = express.Router();

// Mock user middleware for testing (bypasses real auth)
const mockUser = async (req, res, next) => {
    try {
        // Find any user or create a test user
        let testUser = await User.findOne({ email: 'test@microlearn.com' });

        if (!testUser) {
            testUser = new User({
                email: 'test@microlearn.com',
                password: 'testpassword',
                profile: {
                    firstName: 'Test',
                    lastName: 'User',
                    profession: 'Software Developer',
                    gender: 'Other'
                },
                learningPreferences: {
                    interestedAreas: ['javascript', 'react'],
                    learningGoal: 'Skill Enhancement'
                }
            });
            await testUser.save();
            console.log('✅ Created test user for video processing tests');
        }

        req.user = { _id: testUser._id };
        next();
    } catch (error) {
        console.error('Error setting up test user:', error);
        res.status(500).json({ error: 'Test user setup failed' });
    }
};

// @desc    Test - Process YouTube URL directly
// @route   POST /api/test-videos/process
// @access  Public (for testing)
router.post('/process', mockUser, [
    body('url')
        .notEmpty()
        .withMessage('YouTube URL is required')
        .custom((value) => {
            const youtubeRegexes = [
                /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/,
                /^https?:\/\/youtu\.be\/[\w-]+/,
                /^https?:\/\/(www\.)?youtube\.com\/embed\/[\w-]+/,
                /^https?:\/\/m\.youtube\.com\/watch\?v=[\w-]+/
            ];
            if (youtubeRegexes.some(regex => regex.test(value))) {
                return true;
            }
            throw new Error('Must be a valid YouTube URL');
        }),
    body('title')
        .optional()
        .isLength({ min: 1, max: 200 })
        .withMessage('Title must be between 1 and 200 characters'),
    body('topic')
        .optional()
        .isIn(['javascript', 'react', 'typescript', 'nodejs', 'python', 'nextjs', 'mongodb', 'css-tailwind'])
        .withMessage('Invalid topic')
], async (req, res) => {
    try {
        console.log('🧪 TEST: Processing YouTube URL:', req.body.url);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        await videoController.processYouTubeURL(req, res);
    } catch (error) {
        console.error('❌ TEST ERROR:', error);
        res.status(500).json({
            success: false,
            message: 'Test failed',
            error: error.message
        });
    }
});

// @desc    Test - Get processing status
// @route   GET /api/test-videos/:videoId/status
// @access  Public (for testing)
router.get('/:videoId/status', mockUser, [
    param('videoId').isMongoId().withMessage('Invalid video ID')
], async (req, res) => {
    try {
        console.log('🧪 TEST: Getting status for video:', req.params.videoId);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        await videoController.getVideoStatus(req, res);
    } catch (error) {
        console.error('❌ TEST ERROR:', error);
        res.status(500).json({
            success: false,
            message: 'Test failed',
            error: error.message
        });
    }
});

// @desc    Test - Get micro-videos
// @route   GET /api/test-videos/:videoId/micro-videos
// @access  Public (for testing)
router.get('/:videoId/micro-videos', mockUser, [
    param('videoId').isMongoId().withMessage('Invalid video ID')
], async (req, res) => {
    try {
        console.log('🧪 TEST: Getting micro-videos for:', req.params.videoId);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        await videoController.getMicroVideos(req, res);
    } catch (error) {
        console.error('❌ TEST ERROR:', error);
        res.status(500).json({
            success: false,
            message: 'Test failed',
            error: error.message
        });
    }
});

// @desc    Test - Get all processed videos for test user
// @route   GET /api/test-videos/all
// @access  Public (for testing)
router.get('/all', mockUser, async (req, res) => {
    try {
        console.log('🧪 TEST: Getting all videos for test user');

        const videos = await Video.find({ uploadedBy: req.user._id })
            .sort({ createdAt: -1 })
            .lean();

        // Get micro-video counts for each video
        const videosWithCounts = await Promise.all(
            videos.map(async (video) => {
                const microVideoCount = await MicroVideo.countDocuments({ originalVideoId: video._id });
                return {
                    ...video,
                    microVideoCount,
                    testUrl: `http://localhost:5000/api/test-videos/${video._id}/status`
                };
            })
        );

        res.json({
            success: true,
            message: 'Test user videos retrieved',
            count: videosWithCounts.length,
            data: videosWithCounts
        });

    } catch (error) {
        console.error('❌ TEST ERROR:', error);
        res.status(500).json({
            success: false,
            message: 'Test failed',
            error: error.message
        });
    }
});

// @desc    Test - Process via videoId (like recommendation flow)
// @route   POST /api/test-videos/process-videoid
// @access  Public (for testing)
router.post('/process-videoid', mockUser, [
    body('videoId')
        .notEmpty()
        .withMessage('Video ID is required'),
    body('topic')
        .isIn(['javascript', 'react', 'typescript', 'nodejs', 'python', 'nextjs', 'mongodb', 'css-tailwind'])
        .withMessage('Invalid topic'),
    body('title')
        .optional()
        .isString()
        .withMessage('Title must be string')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { videoId, topic, title, description } = req.body;

        console.log(`🧪 TEST: Processing YouTube video ID: ${videoId} for topic: ${topic}`);

        // Construct YouTube URL from videoId
        const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

        // Create mock request
        const mockReq = {
            body: {
                url: youtubeUrl,
                title: title || `Test - ${topic} Learning`,
                description: description || `Test video for ${topic} microlearning`,
                topic: topic
            },
            user: { _id: req.user._id }
        };

        // Call video controller
        await videoController.processYouTubeURL(mockReq, res);

    } catch (error) {
        console.error('❌ TEST ERROR:', error);
        res.status(500).json({
            success: false,
            message: 'Test failed',
            error: error.message
        });
    }
});

// @desc    Test - Clean up test data
// @route   DELETE /api/test-videos/cleanup
// @access  Public (for testing)
router.delete('/cleanup', mockUser, async (req, res) => {
    try {
        console.log('🧪 TEST: Cleaning up test data...');

        // Delete all videos for test user
        const videos = await Video.find({ uploadedBy: req.user._id });
        const videoIds = videos.map(v => v._id);

        // Delete all micro-videos first
        await MicroVideo.deleteMany({ originalVideoId: { $in: videoIds } });

        // Delete all videos
        await Video.deleteMany({ uploadedBy: req.user._id });

        res.json({
            success: true,
            message: `Cleaned up ${videos.length} videos and their micro-videos`,
            deletedVideos: videos.length
        });

    } catch (error) {
        console.error('❌ TEST ERROR:', error);
        res.status(500).json({
            success: false,
            message: 'Cleanup failed',
            error: error.message
        });
    }
});

// @desc    Test - Health check for video processing
// @route   GET /api/test-videos/health
// @access  Public (for testing)
router.get('/health', async (req, res) => {
    try {
        const transcriptService = require('../services/transcriptService');
        const openaiService = require('../services/openaiService');

        // Test transcript service
        const testVideoId = 'dQw4w9WgXcQ'; // Rick Roll - should have transcript
        let transcriptAvailable = false;

        try {
            transcriptAvailable = await transcriptService.isTranscriptAvailable(testVideoId);
        } catch (error) {
            console.log('Transcript service test failed:', error.message);
        }

        // Test OpenAI service
        let openaiHealthy = false;
        try {
            const health = await openaiService.checkAPIHealth();
            openaiHealthy = health.status === 'healthy';
        } catch (error) {
            console.log('OpenAI service test failed:', error.message);
        }

        res.json({
            success: true,
            message: 'Video processing health check',
            services: {
                transcriptService: {
                    available: transcriptAvailable,
                    testVideoId: testVideoId
                },
                openaiService: {
                    healthy: openaiHealthy
                },
                database: {
                    connected: true // We know it's connected if we reach here
                }
            },
            testEndpoints: {
                processUrl: 'POST /api/test-videos/process',
                processVideoId: 'POST /api/test-videos/process-videoid',
                checkStatus: 'GET /api/test-videos/{videoId}/status',
                getMicroVideos: 'GET /api/test-videos/{videoId}/micro-videos',
                getAllVideos: 'GET /api/test-videos/all',
                cleanup: 'DELETE /api/test-videos/cleanup'
            }
        });

    } catch (error) {
        console.error('❌ HEALTH CHECK ERROR:', error);
        res.status(500).json({
            success: false,
            message: 'Health check failed',
            error: error.message
        });
    }
});

// @desc    Test - Generate micro-content for video segments
// @route   POST /api/test-videos/:videoId/generate-content
// @access  Public (for testing)
router.post('/:videoId/generate-content', mockUser, [
    param('videoId').isMongoId().withMessage('Invalid video ID')
], async (req, res) => {
    try {
        console.log('🧪 TEST: Generating micro-content for video:', req.params.videoId);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        await videoController.generateMicroContent(req, res);
    } catch (error) {
        console.error('❌ TEST ERROR:', error);
        res.status(500).json({
            success: false,
            message: 'Test failed',
            error: error.message
        });
    }
});

// @desc    Test - Get enhanced micro-videos with full content
// @route   GET /api/test-videos/:videoId/enhanced-micro-videos
// @access  Public (for testing)
router.get('/:videoId/enhanced-micro-videos', mockUser, [
    param('videoId').isMongoId().withMessage('Invalid video ID')
], async (req, res) => {
    try {
        console.log('🧪 TEST: Getting enhanced micro-videos for:', req.params.videoId);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        await videoController.getEnhancedMicroVideos(req, res);
    } catch (error) {
        console.error('❌ TEST ERROR:', error);
        res.status(500).json({
            success: false,
            message: 'Test failed',
            error: error.message
        });
    }
});

// @desc    Test - Get single micro-video content
// @route   GET /api/test-videos/:videoId/micro-videos/:segmentId/content
// @access  Public (for testing)
router.get('/:videoId/micro-videos/:segmentId/content', mockUser, [
    param('videoId').isMongoId().withMessage('Invalid video ID'),
    param('segmentId').isMongoId().withMessage('Invalid segment ID')
], async (req, res) => {
    try {
        console.log('🧪 TEST: Getting micro-video content for segment:', req.params.segmentId);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        await videoController.getMicroVideoContent(req, res);
    } catch (error) {
        console.error('❌ TEST ERROR:', error);
        res.status(500).json({
            success: false,
            message: 'Test failed',
            error: error.message
        });
    }
});

// @desc    Test - Generate audio for micro-video segment
// @route   POST /api/test-videos/:videoId/micro-videos/:segmentId/generate-audio
// @access  Public (for testing)
router.post('/:videoId/micro-videos/:segmentId/generate-audio', mockUser, [
    param('videoId').isMongoId().withMessage('Invalid video ID'),
    param('segmentId').isMongoId().withMessage('Invalid segment ID'),
    body('voiceName').optional().isString().withMessage('Voice name must be a string'),
    body('speed').optional().isFloat({ min: 0.5, max: 2.0 }).withMessage('Speed must be between 0.5 and 2.0'),
    body('pitch').optional().isFloat({ min: -20, max: 20 }).withMessage('Pitch must be between -20 and 20')
], async (req, res) => {
    try {
        console.log('🧪 TEST: Generating audio for segment:', req.params.segmentId);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { videoId, segmentId } = req.params;
        const { voiceName, speed, pitch } = req.body;

        // Get the micro-video segment
        const microVideo = await MicroVideo.findOne({
            _id: segmentId,
            originalVideoId: videoId
        });

        if (!microVideo) {
            return res.status(404).json({
                success: false,
                message: 'Micro-video segment not found'
            });
        }

        // Get the educational script for TTS
        const scriptText = microVideo.cltBlmScript?.educationalScript;
        if (!scriptText) {
            return res.status(400).json({
                success: false,
                message: 'No educational script found for this segment. Generate micro-content first.'
            });
        }

        // Generate audio
        const audioResult = await ttsService.generateAudio(scriptText, {
            voiceName: voiceName || 'en-US-Standard-D',
            speed: speed || 1.0,
            pitch: pitch || 0.0,
            languageCode: 'en-US'
        });

        // Update micro-video with audio information
        await MicroVideo.findByIdAndUpdate(segmentId, {
            audioUrl: audioResult.filepath,
            audioFilename: audioResult.filename,
            audioDuration: audioResult.duration,
            audioProvider: audioResult.provider
        });

        res.json({
            success: true,
            message: 'Audio generated successfully',
            data: {
                segmentId: segmentId,
                audioFile: audioResult.filename,
                duration: audioResult.duration,
                provider: audioResult.provider,
                voiceUsed: audioResult.voiceUsed,
                textLength: audioResult.textLength
            }
        });

    } catch (error) {
        console.error('❌ TEST ERROR:', error);
        res.status(500).json({
            success: false,
            message: 'Audio generation failed',
            error: error.message
        });
    }
});

// @desc    Test - Generate audio for all segments in a video
// @route   POST /api/test-videos/:videoId/generate-all-audio
// @access  Public (for testing)
router.post('/:videoId/generate-all-audio', mockUser, [
    param('videoId').isMongoId().withMessage('Invalid video ID'),
    body('voiceName').optional().isString().withMessage('Voice name must be a string'),
    body('speed').optional().isFloat({ min: 0.5, max: 2.0 }).withMessage('Speed must be between 0.5 and 2.0')
], async (req, res) => {
    try {
        console.log('🧪 TEST: Generating audio for all segments in video:', req.params.videoId);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { videoId } = req.params;
        const { voiceName, speed } = req.body;

        // Get all micro-video segments
        const microVideos = await MicroVideo.find({ originalVideoId: videoId })
            .sort({ sequence: 1 });

        if (microVideos.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No micro-video segments found for this video'
            });
        }

        // Start audio generation
        res.json({
            success: true,
            message: 'Audio generation started for all segments',
            videoId: videoId,
            totalSegments: microVideos.length,
            estimatedTime: `${microVideos.length * 30} seconds`
        });

        // Generate audio for each segment in background
        generateAllAudioInBackground(videoId, microVideos, {
            voiceName: voiceName || 'en-US-Standard-D',
            speed: speed || 1.0
        });

    } catch (error) {
        console.error('❌ TEST ERROR:', error);
        res.status(500).json({
            success: false,
            message: 'Audio generation failed',
            error: error.message
        });
    }
});

// @desc    Test - Get TTS service health and available voices
// @route   GET /api/test-videos/tts/health
// @access  Public (for testing)
router.get('/tts/health', async (req, res) => {
    try {
        console.log('🧪 TEST: Checking TTS service health');

        const healthCheck = await ttsService.healthCheck();
        const availableVoices = await ttsService.getAvailableVoices();

        res.json({
            success: true,
            data: {
                health: healthCheck,
                availableVoices: availableVoices,
                provider: process.env.TTS_PROVIDER || 'web'
            }
        });

    } catch (error) {
        console.error('❌ TEST ERROR:', error);
        res.status(500).json({
            success: false,
            message: 'TTS health check failed',
            error: error.message
        });
    }
});

// @desc    Test - Generate audio from custom text
// @route   POST /api/test-videos/tts/test
// @access  Public (for testing)
router.post('/tts/test', [
    body('text').notEmpty().withMessage('Text is required'),
    body('voiceName').optional().isString().withMessage('Voice name must be a string'),
    body('speed').optional().isFloat({ min: 0.5, max: 2.0 }).withMessage('Speed must be between 0.5 and 2.0')
], async (req, res) => {
    try {
        console.log('🧪 TEST: Testing TTS with custom text');

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { text, voiceName, speed } = req.body;

        const audioResult = await ttsService.generateAudio(text, {
            voiceName: voiceName || 'en-US-Standard-D',
            speed: speed || 1.0,
            languageCode: 'en-US'
        });

        res.json({
            success: true,
            message: 'Test audio generated successfully',
            data: audioResult
        });

    } catch (error) {
        console.error('❌ TEST ERROR:', error);
        res.status(500).json({
            success: false,
            message: 'Test audio generation failed',
            error: error.message
        });
    }
});

/**
 * Background function to generate audio for all segments
 */
async function generateAllAudioInBackground(videoId, microVideos, options) {
    try {
        console.log(`🔄 Starting background audio generation for ${microVideos.length} segments`);

        for (let i = 0; i < microVideos.length; i++) {
            const segment = microVideos[i];
            console.log(`🎵 Generating audio for segment ${i + 1}/${microVideos.length}: "${segment.title}"`);

            const scriptText = segment.cltBlmScript?.educationalScript;
            if (!scriptText) {
                console.log(`⚠️ Skipping segment ${segment.sequence} - no educational script`);
                continue;
            }

            try {
                const audioResult = await ttsService.generateAudio(scriptText, options);

                // Update segment with audio information
                await MicroVideo.findByIdAndUpdate(segment._id, {
                    audioUrl: audioResult.filepath,
                    audioFilename: audioResult.filename,
                    audioDuration: audioResult.duration,
                    audioProvider: audioResult.provider
                });

                console.log(`✅ Audio generated for segment ${segment.sequence}: ${audioResult.filename}`);

            } catch (error) {
                console.error(`❌ Audio generation failed for segment ${segment.sequence}:`, error);
            }
        }

        console.log('✅ Background audio generation completed');

    } catch (error) {
        console.error('❌ Background audio generation failed:', error);
    }
}

// ==================== VIDEO GENERATION ENDPOINTS ====================

// @desc    Test - Video generation health check
// @route   GET /api/test-videos/video/health
// @access  Public (for testing)
router.get('/video/health', async (req, res) => {
    try {
        console.log('🧪 TEST: Checking video generation service health');

        const healthCheck = await videoGenerationService.healthCheck();

        res.json({
            success: true,
            message: 'Video generation service health check',
            data: healthCheck
        });

    } catch (error) {
        console.error('❌ TEST ERROR:', error);
        res.status(500).json({
            success: false,
            message: 'Video health check failed',
            error: error.message
        });
    }
});

// @desc    Test - Generate video for single micro-video segment
// @route   POST /api/test-videos/:videoId/micro-videos/:segmentId/generate-video
// @access  Public (for testing)
router.post('/:videoId/micro-videos/:segmentId/generate-video', mockUser, [
    param('videoId').isMongoId().withMessage('Invalid video ID'),
    param('segmentId').isMongoId().withMessage('Invalid segment ID'),
    body('width').optional().isInt({ min: 480, max: 1920 }).withMessage('Width must be between 480 and 1920'),
    body('height').optional().isInt({ min: 360, max: 1080 }).withMessage('Height must be between 360 and 1080'),
    body('fps').optional().isInt({ min: 24, max: 60 }).withMessage('FPS must be between 24 and 60'),
    body('quality').optional().isIn(['high', 'medium', 'low']).withMessage('Quality must be high, medium, or low'),
    body('format').optional().isIn(['mp4', 'webm', 'avi']).withMessage('Format must be mp4, webm, or avi')
], async (req, res) => {
    try {
        console.log('🧪 TEST: Generating video for segment:', req.params.segmentId);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { videoId, segmentId } = req.params;
        const { width, height, fps, quality, format } = req.body;

        // Get the micro-video segment
        const microVideo = await MicroVideo.findOne({
            _id: segmentId,
            originalVideoId: videoId
        });

        if (!microVideo) {
            return res.status(404).json({
                success: false,
                message: 'Micro-video segment not found'
            });
        }

        // Check if educational script exists
        if (!microVideo.cltBlmScript?.educationalScript) {
            return res.status(400).json({
                success: false,
                message: 'No educational script found. Generate micro-content first.'
            });
        }

        // Generate video
        const videoResult = await videoGenerationService.generateVideo(microVideo, {
            width: width || 1280,
            height: height || 720,
            fps: fps || 30,
            quality: quality || 'high',
            format: format || 'mp4'
        });

        // Update micro-video with video information
        if (videoResult.success) {
            const updateData = {};

            if (videoResult.filepath) {
                // Full video file generated (with FFmpeg)
                updateData.videoUrl = videoResult.filepath;
            } else if (videoResult.slideDir) {
                // Slides generated (without FFmpeg)
                updateData.videoUrl = videoResult.slideDir;
            }

            updateData.thumbnailUrl = null; // Will be generated later

            await MicroVideo.findByIdAndUpdate(segmentId, updateData);
        }

        res.json({
            success: true,
            message: 'Video generation completed',
            data: {
                segmentId: segmentId,
                videoResult: videoResult
            }
        });

    } catch (error) {
        console.error('❌ TEST ERROR:', error);
        res.status(500).json({
            success: false,
            message: 'Video generation failed',
            error: error.message
        });
    }
});

// @desc    Test - Generate videos for all segments in a video
// @route   POST /api/test-videos/:videoId/generate-all-videos
// @access  Public (for testing)
router.post('/:videoId/generate-all-videos', mockUser, [
    param('videoId').isMongoId().withMessage('Invalid video ID'),
    body('width').optional().isInt({ min: 480, max: 1920 }).withMessage('Width must be between 480 and 1920'),
    body('height').optional().isInt({ min: 360, max: 1080 }).withMessage('Height must be between 360 and 1080'),
    body('fps').optional().isInt({ min: 24, max: 60 }).withMessage('FPS must be between 24 and 60'),
    body('quality').optional().isIn(['high', 'medium', 'low']).withMessage('Quality must be high, medium, or low')
], async (req, res) => {
    try {
        console.log('🧪 TEST: Generating videos for all segments in video:', req.params.videoId);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { videoId } = req.params;
        const { width, height, fps, quality } = req.body;

        // Get all micro-video segments
        const microVideos = await MicroVideo.find({ originalVideoId: videoId })
            .sort({ sequence: 1 });

        if (microVideos.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No micro-video segments found for this video'
            });
        }

        // Check if educational scripts exist
        const segmentsWithoutScript = microVideos.filter(mv => !mv.cltBlmScript?.educationalScript);
        if (segmentsWithoutScript.length > 0) {
            return res.status(400).json({
                success: false,
                message: `${segmentsWithoutScript.length} segments missing educational scripts. Generate micro-content first.`,
                missingSegments: segmentsWithoutScript.map(mv => mv._id)
            });
        }

        // Start video generation
        res.json({
            success: true,
            message: 'Video generation started for all segments',
            videoId: videoId,
            totalSegments: microVideos.length,
            estimatedTime: `${microVideos.length * 2} minutes`
        });

        // Generate videos for each segment in background
        generateAllVideosInBackground(videoId, microVideos, {
            width: width || 1280,
            height: height || 720,
            fps: fps || 30,
            quality: quality || 'high'
        });

    } catch (error) {
        console.error('❌ TEST ERROR:', error);
        res.status(500).json({
            success: false,
            message: 'Video generation failed',
            error: error.message
        });
    }
});

// @desc    Test - Get video generation status
// @route   GET /api/test-videos/:videoId/video-status
// @access  Public (for testing)
router.get('/:videoId/video-status', mockUser, [
    param('videoId').isMongoId().withMessage('Invalid video ID')
], async (req, res) => {
    try {
        console.log('🧪 TEST: Getting video generation status for:', req.params.videoId);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { videoId } = req.params;

        // Get all micro-video segments with video info
        const microVideos = await MicroVideo.find({ originalVideoId: videoId })
            .sort({ sequence: 1 })
            .select('title sequence videoUrl audioUrl cltBlmScript processingStatus')
            .lean();

        const videoStatus = microVideos.map(mv => ({
            segmentId: mv._id,
            title: mv.title,
            sequence: mv.sequence,
            hasScript: !!(mv.cltBlmScript?.educationalScript),
            hasAudio: !!mv.audioUrl,
            hasVideo: !!mv.videoUrl,
            processingStatus: mv.processingStatus,
            readyForVideo: !!(mv.cltBlmScript?.educationalScript && mv.audioUrl)
        }));

        const summary = {
            totalSegments: videoStatus.length,
            withScript: videoStatus.filter(v => v.hasScript).length,
            withAudio: videoStatus.filter(v => v.hasAudio).length,
            withVideo: videoStatus.filter(v => v.hasVideo).length,
            readyForVideo: videoStatus.filter(v => v.readyForVideo).length
        };

        res.json({
            success: true,
            data: {
                videoId: videoId,
                summary: summary,
                segments: videoStatus
            }
        });

    } catch (error) {
        console.error('❌ TEST ERROR:', error);
        res.status(500).json({
            success: false,
            message: 'Video status check failed',
            error: error.message
        });
    }
});

/**
 * Background function to generate videos for all segments
 */
async function generateAllVideosInBackground(videoId, microVideos, options) {
    try {
        console.log(`🔄 Starting background video generation for ${microVideos.length} segments`);

        for (let i = 0; i < microVideos.length; i++) {
            const segment = microVideos[i];
            console.log(`🎬 Generating video for segment ${i + 1}/${microVideos.length}: "${segment.title}"`);

            const scriptText = segment.cltBlmScript?.educationalScript;
            if (!scriptText) {
                console.log(`⚠️ Skipping segment ${segment.sequence} - no educational script`);
                continue;
            }

            try {
                // Generate video
                const videoResult = await videoGenerationService.generateVideo(segment, options);

                // Update segment with video information
                if (videoResult.success) {
                    const updateData = {};

                    if (videoResult.filepath) {
                        // Full video file generated (with FFmpeg)
                        updateData.videoUrl = videoResult.filepath;
                    } else if (videoResult.slideDir) {
                        // Slides generated (without FFmpeg)
                        updateData.videoUrl = videoResult.slideDir;
                    }

                    updateData.thumbnailUrl = null; // Will be generated later

                    await MicroVideo.findByIdAndUpdate(segment._id, updateData);
                }

                console.log(`✅ Video generated for segment ${segment.sequence}: ${videoResult.filename || 'slides created'}`);

            } catch (error) {
                console.error(`❌ Video generation failed for segment ${segment.sequence}:`, error);
            }
        }

        console.log('✅ Background video generation completed');

    } catch (error) {
        console.error('❌ Background video generation failed:', error);
    }
}

module.exports = router;