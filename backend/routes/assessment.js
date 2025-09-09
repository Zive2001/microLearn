// routes/assessment.js
const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const assessmentAlgorithm = require('../services/assessmentAlgorithm');
const assessmentUtils = require('../utils/assessmentUtils');
const { AssessmentSession, AssessmentResult } = require('../models/Assessment');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @desc    Start new assessment
// @route   POST /api/assessment/start
// @access  Private
router.post('/start', protect, [
    body('topic')
        .isIn(['javascript', 'react', 'typescript', 'nodejs', 'python', 'nextjs', 'mongodb', 'css-tailwind'])
        .withMessage('Invalid topic'),
    body('config.maxQuestions')
        .optional()
        .isInt({ min: 5, max: 20 })
        .withMessage('Max questions must be between 5 and 20'),
    body('config.initialDifficulty')
        .optional()
        .isIn(['beginner', 'intermediate', 'advanced'])
        .withMessage('Initial difficulty must be beginner, intermediate, or advanced')
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

        const { topic, config = {} } = req.body;
        const userId = req.user._id;

        // Validate assessment configuration
        const configValidation = assessmentUtils.validateAssessmentConfig(config);
        if (!configValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid assessment configuration',
                errors: configValidation.errors
            });
        }

        // Check if user can start assessment
        const eligibility = await assessmentUtils.canStartAssessment(userId, topic);
        if (!eligibility.canStart) {
            return res.status(400).json({
                success: false,
                message: eligibility.reason,
                data: {
                    existingSessionId: eligibility.existingSessionId,
                    cooldownHours: eligibility.cooldownHours
                }
            });
        }

        // Start assessment
        const startTime = Date.now();
        const assessmentData = await assessmentAlgorithm.startAssessment(userId, topic, config);
        const responseTime = Date.now() - startTime;

        res.status(201).json({
            success: true,
            message: 'Assessment started successfully',
            data: assessmentData,
            metadata: {
                responseTime: `${responseTime}ms`,
                startedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Error starting assessment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to start assessment',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// @desc    Get next question for assessment
// @route   GET /api/assessment/:sessionId/next
// @access  Private
router.get('/:sessionId/next', protect, [
    param('sessionId').notEmpty().withMessage('Session ID is required')
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

        const { sessionId } = req.params;

        // Verify session belongs to user
        const session = await AssessmentSession.findOne({ 
            sessionId, 
            userId: req.user._id,
            status: 'active'
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Assessment session not found or not active'
            });
        }

        const startTime = Date.now();
        const nextQuestion = await assessmentAlgorithm.generateNextQuestion(sessionId);
        const responseTime = Date.now() - startTime;

        res.json({
            success: true,
            data: nextQuestion,
            metadata: {
                responseTime: `${responseTime}ms`,
                generatedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Error getting next question:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get next question',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// @desc    Submit answer for assessment question
// @route   POST /api/assessment/:sessionId/answer
// @access  Private
router.post('/:sessionId/answer', protect, [
    param('sessionId').notEmpty().withMessage('Session ID is required'),
    body('questionId').notEmpty().withMessage('Question ID is required'),
    body('userAnswer').isIn(['A', 'B', 'C', 'D']).withMessage('Answer must be A, B, C, or D'),
    body('timeSpent').optional().isNumeric().withMessage('Time spent must be a number')
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

        const { sessionId } = req.params;
        const { questionId, userAnswer, timeSpent = 0 } = req.body;

        // Verify session belongs to user
        const session = await AssessmentSession.findOne({ 
            sessionId, 
            userId: req.user._id,
            status: 'active'
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Assessment session not found or not active'
            });
        }

        const startTime = Date.now();
        const result = await assessmentAlgorithm.submitAnswer(sessionId, questionId, userAnswer, timeSpent);
        const responseTime = Date.now() - startTime;

        res.json({
            success: true,
            message: result.isCompleted ? 'Assessment completed' : 'Answer submitted successfully',
            data: result,
            metadata: {
                responseTime: `${responseTime}ms`,
                submittedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Error submitting answer:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit answer',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// @desc    Get assessment session progress
// @route   GET /api/assessment/:sessionId/progress
// @access  Private
router.get('/:sessionId/progress', protect, [
    param('sessionId').notEmpty().withMessage('Session ID is required')
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

        const { sessionId } = req.params;

        // Verify session belongs to user
        const session = await AssessmentSession.findOne({ 
            sessionId, 
            userId: req.user._id
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Assessment session not found'
            });
        }

        const progress = await assessmentAlgorithm.getSessionProgress(sessionId);

        res.json({
            success: true,
            data: progress
        });

    } catch (error) {
        console.error('Error getting session progress:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get session progress',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// @desc    Complete assessment manually
// @route   POST /api/assessment/:sessionId/complete
// @access  Private
router.post('/:sessionId/complete', protect, [
    param('sessionId').notEmpty().withMessage('Session ID is required')
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

        const { sessionId } = req.params;

        // Verify session belongs to user
        const session = await AssessmentSession.findOne({ 
            sessionId, 
            userId: req.user._id,
            status: { $in: ['active', 'paused'] }
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Assessment session not found or already completed'
            });
        }

        const startTime = Date.now();
        const finalResults = await assessmentAlgorithm.completeAssessment(sessionId);
        const responseTime = Date.now() - startTime;

        res.json({
            success: true,
            message: 'Assessment completed successfully',
            data: finalResults,
            metadata: {
                responseTime: `${responseTime}ms`,
                completedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Error completing assessment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to complete assessment',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// @desc    Pause assessment session
// @route   POST /api/assessment/:sessionId/pause
// @access  Private
router.post('/:sessionId/pause', protect, [
    param('sessionId').notEmpty().withMessage('Session ID is required')
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

        const { sessionId } = req.params;

        // Verify session belongs to user
        const session = await AssessmentSession.findOne({ 
            sessionId, 
            userId: req.user._id,
            status: 'active'
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Active assessment session not found'
            });
        }

        const result = await assessmentAlgorithm.pauseAssessment(sessionId);

        res.json({
            success: true,
            message: 'Assessment paused successfully',
            data: result
        });

    } catch (error) {
        console.error('Error pausing assessment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to pause assessment',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// @desc    Resume paused assessment session
// @route   POST /api/assessment/:sessionId/resume
// @access  Private
router.post('/:sessionId/resume', protect, [
    param('sessionId').notEmpty().withMessage('Session ID is required')
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

        const { sessionId } = req.params;

        // Verify session belongs to user
        const session = await AssessmentSession.findOne({ 
            sessionId, 
            userId: req.user._id,
            status: 'paused'
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Paused assessment session not found'
            });
        }

        const result = await assessmentAlgorithm.resumeAssessment(sessionId);

        res.json({
            success: true,
            message: 'Assessment resumed successfully',
            data: result
        });

    } catch (error) {
        console.error('Error resuming assessment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to resume assessment',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// @desc    Abandon assessment session
// @route   POST /api/assessment/:sessionId/abandon
// @access  Private
router.post('/:sessionId/abandon', protect, [
    param('sessionId').notEmpty().withMessage('Session ID is required')
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

        const { sessionId } = req.params;

        // Verify session belongs to user
        const session = await AssessmentSession.findOne({ 
            sessionId, 
            userId: req.user._id,
            status: { $in: ['active', 'paused'] }
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Assessment session not found'
            });
        }

        const result = await assessmentAlgorithm.abandonAssessment(sessionId);

        res.json({
            success: true,
            message: 'Assessment abandoned successfully',
            data: result
        });

    } catch (error) {
        console.error('Error abandoning assessment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to abandon assessment',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// @desc    Get user's assessment history
// @route   GET /api/assessment/history
// @access  Private
router.get('/history', protect, [
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
    query('topic').optional().isIn(['javascript', 'react', 'typescript', 'nodejs', 'python', 'nextjs', 'mongodb', 'css-tailwind'])
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

        const limit = parseInt(req.query.limit) || 10;
        const topic = req.query.topic;

        let query = { userId: req.user._id };
        if (topic) {
            query.topic = topic;
        }

        const history = await AssessmentResult.find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        const formattedHistory = history.map(result => 
            assessmentUtils.formatAssessmentResult(result)
        );

        res.json({
            success: true,
            count: formattedHistory.length,
            data: formattedHistory
        });

    } catch (error) {
        console.error('Error getting assessment history:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get assessment history',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// @desc    Get specific assessment result
// @route   GET /api/assessment/results/:resultId
// @access  Private
router.get('/results/:resultId', protect, [
    param('resultId').isMongoId().withMessage('Invalid result ID')
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

        const { resultId } = req.params;

        const result = await AssessmentResult.findOne({
            _id: resultId,
            userId: req.user._id
        }).lean();

        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Assessment result not found'
            });
        }

        const formattedResult = assessmentUtils.formatAssessmentResult(result);

        res.json({
            success: true,
            data: formattedResult
        });

    } catch (error) {
        console.error('Error getting assessment result:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get assessment result',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// @desc    Get user's progress summary across all topics
// @route   GET /api/assessment/progress-summary
// @access  Private
router.get('/progress-summary', protect, async (req, res) => {
    try {
        const progressSummary = await assessmentUtils.getUserProgressSummary(req.user._id);

        res.json({
            success: true,
            data: progressSummary
        });

    } catch (error) {
        console.error('Error getting progress summary:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get progress summary',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// @desc    Get assessment recommendations for user
// @route   GET /api/assessment/recommendations
// @access  Private
router.get('/recommendations', protect, async (req, res) => {
    try {
        const recommendations = await assessmentUtils.getAssessmentRecommendations(req.user._id);

        res.json({
            success: true,
            data: recommendations
        });

    } catch (error) {
        console.error('Error getting assessment recommendations:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get assessment recommendations',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// @desc    Get active assessment sessions for user
// @route   GET /api/assessment/active-sessions
// @access  Private
router.get('/active-sessions', protect, async (req, res) => {
    try {
        const activeSessions = await AssessmentSession.find({
            userId: req.user._id,
            status: { $in: ['active', 'paused'] }
        }).lean();

        const formattedSessions = activeSessions.map(session => 
            assessmentUtils.formatSessionSummary(session)
        );

        res.json({
            success: true,
            count: formattedSessions.length,
            data: formattedSessions
        });

    } catch (error) {
        console.error('Error getting active sessions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get active sessions',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

module.exports = router;