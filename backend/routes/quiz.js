// routes/quiz.js - Production Quiz API Endpoints
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const quizController = require('../controllers/quizController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all quiz routes
router.use(protect);

// @desc    Start a new quiz session for a video
// @route   POST /api/quiz/start/:videoId
// @access  Private
router.post('/start/:videoId', [
    param('videoId')
        .isMongoId()
        .withMessage('Invalid video ID'),
    body('sessionType')
        .optional()
        .isIn(['intermediate', 'final'])
        .withMessage('Session type must be "intermediate" or "final"')
], async (req, res) => {
    try {
        // Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        await quizController.startQuizSession(req, res);
    } catch (error) {
        console.error('Route error in quiz start:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// @desc    Get quiz session information
// @route   GET /api/quiz/session/:sessionId
// @access  Private
router.get('/session/:sessionId', [
    param('sessionId')
        .notEmpty()
        .withMessage('Session ID is required')
        .matches(/^quiz_\d+_[a-zA-Z0-9]+$/)
        .withMessage('Invalid session ID format')
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

        await quizController.getQuizSession(req, res);
    } catch (error) {
        console.error('Route error in get quiz session:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// @desc    Get current question for active quiz session
// @route   GET /api/quiz/session/:sessionId/current-question
// @access  Private
router.get('/session/:sessionId/current-question', [
    param('sessionId')
        .notEmpty()
        .withMessage('Session ID is required')
        .matches(/^quiz_\d+_[a-zA-Z0-9]+$/)
        .withMessage('Invalid session ID format')
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

        await quizController.getCurrentQuestion(req, res);
    } catch (error) {
        console.error('Route error in get current question:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// @desc    Submit answer to quiz question with retry logic
// @route   POST /api/quiz/session/:sessionId/answer
// @access  Private
router.post('/session/:sessionId/answer', [
    param('sessionId')
        .notEmpty()
        .withMessage('Session ID is required')
        .matches(/^quiz_\d+_[a-zA-Z0-9]+$/)
        .withMessage('Invalid session ID format'),
    body('questionId')
        .notEmpty()
        .withMessage('Question ID is required'),
    body('answer')
        .isIn(['A', 'B', 'C', 'D'])
        .withMessage('Answer must be A, B, C, or D'),
    body('timeSpent')
        .optional()
        .isInt({ min: 0, max: 600 })
        .withMessage('Time spent must be between 0 and 600 seconds')
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

        await quizController.submitAnswer(req, res);
    } catch (error) {
        console.error('Route error in submit answer:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// @desc    Get quiz session results
// @route   GET /api/quiz/session/:sessionId/results
// @access  Private
router.get('/session/:sessionId/results', [
    param('sessionId')
        .notEmpty()
        .withMessage('Session ID is required')
        .matches(/^quiz_\d+_[a-zA-Z0-9]+$/)
        .withMessage('Invalid session ID format')
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

        // TODO: Implement detailed results in Task 5.1 (Progress Tracking)
        res.status(501).json({
            success: false,
            message: 'Detailed results not yet implemented',
            note: 'Basic results available in GET /api/quiz/session/:sessionId'
        });
    } catch (error) {
        console.error('Route error in get results:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// @desc    Get user's quiz sessions for a video
// @route   GET /api/quiz/video/:videoId/sessions
// @access  Private
router.get('/video/:videoId/sessions', [
    param('videoId')
        .isMongoId()
        .withMessage('Invalid video ID')
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

        const { QuizSession } = require('../models/Quiz');
        const sessions = await QuizSession.find({
            userId,
            originalVideoId: videoId
        }).sort({ createdAt: -1 });

        res.json({
            success: true,
            message: `Found ${sessions.length} quiz sessions for this video`,
            data: {
                videoId,
                totalSessions: sessions.length,
                sessions: sessions.map(session => ({
                    sessionId: session.sessionId,
                    sessionType: session.sessionType,
                    sessionNumber: session.sessionNumber,
                    status: session.status,
                    progressPercentage: session.progressPercentage,
                    accuracy: session.currentAccuracy,
                    totalQuestions: session.totalQuestions,
                    performance: session.performance,
                    startedAt: session.startedAt,
                    completedAt: session.completedAt
                }))
            }
        });

    } catch (error) {
        console.error('Route error in get video sessions:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// @desc    Get user's recent quiz sessions (across all videos)
// @route   GET /api/quiz/sessions/recent
// @access  Private
router.get('/sessions/recent', async (req, res) => {
    try {
        const userId = req.user._id;
        const limit = parseInt(req.query.limit) || 10;

        const { QuizSession } = require('../models/Quiz');
        const recentSessions = await QuizSession.find({ userId })
            .populate('originalVideoId', 'title topic')
            .sort({ createdAt: -1 })
            .limit(limit);

        res.json({
            success: true,
            message: `Found ${recentSessions.length} recent quiz sessions`,
            data: {
                totalSessions: recentSessions.length,
                sessions: recentSessions.map(session => ({
                    sessionId: session.sessionId,
                    sessionType: session.sessionType,
                    status: session.status,
                    accuracy: session.currentAccuracy,
                    video: {
                        id: session.originalVideoId._id,
                        title: session.originalVideoId.title,
                        topic: session.originalVideoId.topic
                    },
                    startedAt: session.startedAt,
                    completedAt: session.completedAt
                }))
            }
        });

    } catch (error) {
        console.error('Route error in get recent sessions:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

module.exports = router;