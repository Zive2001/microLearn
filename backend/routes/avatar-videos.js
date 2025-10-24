// routes/avatar-videos.js
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const avatarVideoController = require('../controllers/avatarVideoController');
const avatarController = require('../controllers/avatarController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @desc    Generate avatar video for a micro-video
// @route   POST /api/avatar-videos/generate
// @access  Private
router.post('/generate', protect, [
    body('microVideoId')
        .notEmpty()
        .withMessage('MicroVideo ID is required')
        .isMongoId()
        .withMessage('Invalid MicroVideo ID'),
    body('teacher')
        .optional()
        .isIn(['Ava', 'Andrew'])
        .withMessage('Teacher must be either Ava or Andrew')
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

        await avatarVideoController.generateAvatarVideo(req, res);
    } catch (error) {
        console.error('Route error in generate avatar video:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// @desc    Generate avatar videos for all micro-videos of a parent video
// @route   POST /api/avatar-videos/generate-batch
// @access  Private
router.post('/generate-batch', protect, [
    body('videoId')
        .notEmpty()
        .withMessage('Video ID is required')
        .isMongoId()
        .withMessage('Invalid Video ID'),
    body('teacher')
        .optional()
        .isIn(['Ava', 'Andrew'])
        .withMessage('Teacher must be either Ava or Andrew')
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

        await avatarVideoController.generateBatchAvatarVideos(req, res);
    } catch (error) {
        console.error('Route error in batch generate avatar videos:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// @desc    Get avatar video file
// @route   GET /api/avatar-videos/:filename
// @access  Public (for serving video files)
router.get('/:filename', [
    param('filename')
        .notEmpty()
        .withMessage('Filename is required')
        .matches(/^[\w\-. ]+\.mp4$/)
        .withMessage('Invalid filename format')
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

        await avatarVideoController.getAvatarVideo(req, res);
    } catch (error) {
        console.error('Route error in get avatar video:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// @desc    List all generated avatar videos
// @route   GET /api/avatar-videos/list
// @access  Private
router.get('/list', protect, async (req, res) => {
    try {
        await avatarVideoController.listAvatarVideos(req, res);
    } catch (error) {
        console.error('Route error in list avatar videos:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// @desc    Delete avatar video file
// @route   DELETE /api/avatar-videos/:filename
// @access  Private
router.delete('/:filename', protect, [
    param('filename')
        .notEmpty()
        .withMessage('Filename is required')
        .matches(/^[\w\-. ]+\.mp4$/)
        .withMessage('Invalid filename format')
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

        await avatarVideoController.deleteAvatarVideo(req, res);
    } catch (error) {
        console.error('Route error in delete avatar video:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// @desc    Generate TTS with visemes for real-time avatar (SoloScholar approach)
// @route   POST /api/avatar-videos/generate-tts
// @access  Public (for frontend to access easily)
router.post('/generate-tts', [
    body('text')
        .notEmpty()
        .withMessage('Text is required')
        .isLength({ min: 1, max: 10000 })
        .withMessage('Text must be between 1 and 10000 characters'),
    body('teacher')
        .optional()
        .isIn(['Ava', 'Andrew'])
        .withMessage('Teacher must be either Ava or Andrew')
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

        await avatarVideoController.generateTTS(req, res);
    } catch (error) {
        console.error('Route error in generate TTS:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Enhanced Avatar Routes with SoloScholar lip sync functionality

// @desc    Generate avatar video with lip sync for educational script
// @route   POST /api/avatar-videos/generate-with-lipsync
// @access  Public
router.post('/generate-with-lipsync', [
    body('text')
        .notEmpty()
        .withMessage('Text is required')
        .isLength({ min: 1, max: 10000 })
        .withMessage('Text must be between 1 and 10000 characters'),
    body('teacher')
        .optional()
        .isIn(['Ava', 'Andrew', 'Emma', 'Brian', 'Jenny'])
        .withMessage('Invalid teacher selection')
], avatarController.generateAvatarVideo);

// @desc    Generate avatar video for specific micro-video
// @route   POST /api/avatar-videos/micro-video/:microVideoId
// @access  Private
router.post('/micro-video/:microVideoId', protect, [
    param('microVideoId')
        .isMongoId()
        .withMessage('Invalid micro-video ID'),
    body('teacher')
        .optional()
        .isIn(['Ava', 'Andrew', 'Emma', 'Brian', 'Jenny'])
        .withMessage('Invalid teacher selection')
], avatarController.generateAvatarVideoForMicroVideo);

// @desc    Generate avatar videos for all micro-videos in batch
// @route   POST /api/avatar-videos/batch/:videoId
// @access  Private
router.post('/batch/:videoId', protect, [
    param('videoId')
        .isMongoId()
        .withMessage('Invalid video ID'),
    body('teacher')
        .optional()
        .isIn(['Ava', 'Andrew', 'Emma', 'Brian', 'Jenny'])
        .withMessage('Invalid teacher selection')
], avatarController.generateAvatarVideosForVideo);

// @desc    Get avatar generation status for micro-video
// @route   GET /api/avatar-videos/status/:microVideoId
// @access  Private
router.get('/status/:microVideoId', protect, [
    param('microVideoId')
        .isMongoId()
        .withMessage('Invalid micro-video ID')
], avatarController.getAvatarVideoStatus);

// @desc    Get available avatars
// @route   GET /api/avatar-videos/avatars
// @access  Public
router.get('/avatars', avatarController.getAvailableAvatars);

// @desc    Test avatar generation
// @route   POST /api/avatar-videos/test
// @access  Public
router.post('/test', [
    body('teacher')
        .optional()
        .isIn(['Ava', 'Andrew', 'Emma', 'Brian', 'Jenny'])
        .withMessage('Invalid teacher selection')
], avatarController.testAvatarGeneration);

// @desc    Generate demo video of avatar system
// @route   POST /api/avatar-videos/generate-demo
// @access  Public
router.post('/generate-demo', [
    body('teacher')
        .optional()
        .isIn(['Ava', 'Andrew'])
        .withMessage('Teacher must be either Ava or Andrew'),
    body('script')
        .optional()
        .isLength({ min: 1, max: 1000 })
        .withMessage('Script must be between 1 and 1000 characters'),
    body('duration')
        .optional()
        .isInt({ min: 5, max: 60 })
        .withMessage('Duration must be between 5 and 60 seconds'),
    body('quality')
        .optional()
        .isIn(['low', 'medium', 'high', 'ultra'])
        .withMessage('Quality must be low, medium, high, or ultra')
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

        await avatarVideoController.generateDemo(req, res);
    } catch (error) {
        console.error('Route error in generate demo:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// @desc    Generate complete demo suite
// @route   POST /api/avatar-videos/generate-suite
// @access  Public
router.post('/generate-suite', async (req, res) => {
    try {
        await avatarVideoController.generateDemoSuite(req, res);
    } catch (error) {
        console.error('Route error in generate demo suite:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// @desc    Download generated demo video
// @route   GET /api/avatar-videos/download/:filename
// @access  Public
router.get('/download/:filename', [
    param('filename')
        .notEmpty()
        .withMessage('Filename is required')
        .matches(/^[a-zA-Z0-9._-]+\.(webm|mp4)$/)
        .withMessage('Invalid filename format')
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

        await avatarVideoController.downloadVideo(req, res);
    } catch (error) {
        console.error('Route error in download video:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router;