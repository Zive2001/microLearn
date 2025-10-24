// routes/test-videos.js - Test routes for video processing without auth
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const videoController = require('../controllers/videoController');
const Video = require('../models/Video');
const MicroVideo = require('../models/MicroVideo');
const User = require('../models/User');

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
        .matches(/^https:\/\/(www\.)?youtube\.com\/watch\?v=.+/)
        .withMessage('Must be a valid YouTube URL'),
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

        await videoController.getProcessingStatus(req, res);
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

module.exports = router;