// routes/videos.js
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const videoController = require('../controllers/videoController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @desc    Process YouTube URL to create micro-learning videos
// @route   POST /api/videos/process-youtube
// @access  Private
router.post('/process-youtube', protect, [
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
    body('description')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Description cannot exceed 1000 characters'),
    body('topic')
        .optional()
        .isIn(['javascript', 'react', 'typescript', 'nodejs', 'python', 'nextjs', 'mongodb', 'css-tailwind'])
        .withMessage('Invalid topic')
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

        await videoController.processYouTubeURL(req, res);
    } catch (error) {
        console.error('Route error in process-youtube:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// @desc    Get processing status for a video
// @route   GET /api/videos/:videoId/status
// @access  Private
router.get('/:videoId/status', protect, [
    param('videoId').isMongoId().withMessage('Invalid video ID')
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

        await videoController.getVideoStatus(req, res);
    } catch (error) {
        console.error('Route error in get processing status:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// @desc    Get micro-videos for a processed video
// @route   GET /api/videos/:videoId/micro-videos
// @access  Private
router.get('/:videoId/micro-videos', protect, [
    param('videoId').isMongoId().withMessage('Invalid video ID')
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

        await videoController.getMicroVideos(req, res);
    } catch (error) {
        console.error('Route error in get micro-videos:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// @desc    Get all user's processed videos
// @route   GET /api/videos/my-videos
// @access  Private
router.get('/my-videos', protect, async (req, res) => {
    try {
        const Video = require('../models/Video');
        const MicroVideo = require('../models/MicroVideo');

        const videos = await Video.find({ uploadedBy: req.user._id })
            .sort({ createdAt: -1 })
            .lean();

        // Get micro-video counts for each video
        const videosWithCounts = await Promise.all(
            videos.map(async (video) => {
                const microVideoCount = await MicroVideo.countDocuments({ originalVideoId: video._id });
                return {
                    ...video,
                    microVideoCount
                };
            })
        );

        res.json({
            success: true,
            count: videosWithCounts.length,
            data: videosWithCounts
        });

    } catch (error) {
        console.error('Error getting user videos:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get videos',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// @desc    Delete a processed video and its micro-videos
// @route   DELETE /api/videos/:videoId
// @access  Private
router.delete('/:videoId', protect, [
    param('videoId').isMongoId().withMessage('Invalid video ID')
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

        const { videoId } = req.params;
        const userId = req.user._id;

        const Video = require('../models/Video');
        const MicroVideo = require('../models/MicroVideo');

        // Check if video exists and belongs to user
        const video = await Video.findOne({ _id: videoId, uploadedBy: userId });
        if (!video) {
            return res.status(404).json({
                success: false,
                message: 'Video not found or access denied'
            });
        }

        // Delete all associated micro-videos first
        await MicroVideo.deleteMany({ originalVideoId: videoId });

        // Delete the main video
        await Video.findByIdAndDelete(videoId);

        res.json({
            success: true,
            message: 'Video and all associated micro-videos deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting video:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete video',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

module.exports = router;