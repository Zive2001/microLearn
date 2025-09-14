// routes/quiz.js
const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { protect } = require('../middleware/auth');
const { QuizPool, QuizSession, UserQuizProgress } = require('../models/Quiz');
const quizSessionService = require('../services/quizSessionService');
const dynamicQuizService = require('../services/dynamicQuizService');
const openaiService = require('../services/openaiService');

const router = express.Router();

// @desc    Get available quiz topics for user (AI-Powered Dynamic Generation)
// @route   GET /api/quiz/topics
// @access  Private
router.get('/topics', protect, async (req, res) => {
    try {
        const userLevel = req.user.profile?.experienceLevel || 'Complete Beginner';
        const mappedLevel = mapExperienceLevel(userLevel);
        
        // Get dynamic topics (no need for pre-seeded pools)
        const availableTopics = dynamicQuizService.getAvailableTopics(mappedLevel);
        const topicNames = availableTopics.map(t => t.topic);
        
        res.json({
            success: true,
            message: 'Available quiz topics retrieved (AI-Generated Questions)',
            data: {
                topics: topicNames,
                userLevel: mappedLevel,
                totalTopics: topicNames.length,
                dynamicGeneration: true,
                aiPowered: true,
                details: availableTopics
            }
        });
        
    } catch (error) {
        console.error('Get quiz topics error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching quiz topics'
        });
    }
});

// @desc    Start a new AI-powered dynamic quiz session
// @route   POST /api/quiz/start
// @access  Private
router.post('/start', protect, [
    body('topic')
        .isIn(['javascript', 'react', 'typescript', 'nodejs', 'python', 'nextjs', 'mongodb', 'css-tailwind'])
        .withMessage('Invalid topic'),
    body('sessionType')
        .optional()
        .isIn(['formative', 'final', 'simplified', 'remediation'])
        .withMessage('Invalid session type'),
    body('config.questionsPerSession')
        .optional()
        .isInt({ min: 3, max: 15 })
        .withMessage('Questions per session must be between 3 and 15'),
    body('config.timeLimit')
        .optional()
        .isInt({ min: 5, max: 30 })
        .withMessage('Time limit must be between 5 and 30 minutes'),
    body('config.adaptiveDifficulty')
        .optional()
        .isBoolean()
        .withMessage('Adaptive difficulty must be boolean'),
    body('config.bloomProgression')
        .optional()
        .isBoolean()
        .withMessage('Bloom progression must be boolean')
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

        const { topic, sessionType = 'formative', config = {} } = req.body;
        const userId = req.user._id;
        
        // Start dynamic AI-powered quiz session
        const sessionData = await dynamicQuizService.startDynamicQuizSession(userId, topic, sessionType, config);
        
        res.status(201).json({
            success: true,
            message: 'AI-Powered Quiz session started successfully',
            data: {
                ...sessionData,
                aiGenerated: true,
                features: {
                    dynamicQuestions: true,
                    adaptiveDifficulty: config.adaptiveDifficulty !== false,
                    bloomProgression: config.bloomProgression !== false,
                    realTimeGeneration: true
                }
            }
        });
        
    } catch (error) {
        console.error('Start dynamic quiz session error:', error);
        
        if (error.message.includes('User not found')) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
                error: error.message
            });
        }
        
        if (error.message.includes('Failed to generate question')) {
            return res.status(503).json({
                success: false,
                message: 'AI service temporarily unavailable. Please try again.',
                error: 'Question generation failed'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Server error starting AI quiz session',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// @desc    Get current quiz session
// @route   GET /api/quiz/session/:sessionId
// @access  Private
router.get('/session/:sessionId', protect, [
    param('sessionId').isMongoId().withMessage('Invalid session ID')
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
        const userId = req.user._id;
        
        const session = await QuizSession.findOne({
            _id: sessionId,
            userId: userId
        }).populate('quizPoolId', 'topic subject userLevel');
        
        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Quiz session not found'
            });
        }
        
        // Get current question if session is in progress
        let currentQuestion = null;
        if (session.status === 'in_progress') {
            if (session.sessionMode === 'dynamic_ai') {
                // For dynamic AI sessions, get current question from dynamicConfig
                currentQuestion = session.dynamicConfig?.currentQuestion || null;
            } else {
                // For static sessions, use the traditional method
                if (session.currentQuestionIndex < session.questionsToAsk.length) {
                    currentQuestion = await quizSessionService.getCurrentQuestion(sessionId);
                }
            }
        }
        
        // Calculate proper total questions for dynamic sessions
        const totalQuestions = session.sessionMode === 'dynamic_ai' 
            ? session.dynamicConfig?.questionsPerSession || session.questionsToAsk.length
            : session.questionsToAsk.length;

        res.json({
            success: true,
            data: {
                session: {
                    _id: session._id,
                    sessionType: session.sessionType,
                    sessionNumber: session.sessionNumber,
                    totalSessions: session.totalSessions,
                    status: session.status,
                    currentQuestionIndex: session.currentQuestionIndex,
                    totalQuestions: totalQuestions,
                    completionPercentage: Math.round((session.responses?.length || 0) / totalQuestions * 100),
                    timeLimit: session.timeLimit,
                    hintsEnabled: session.hintsEnabled,
                    startedAt: session.startedAt,
                    score: session.score,
                    sessionMode: session.sessionMode,
                    aiPowered: session.sessionMode === 'dynamic_ai'
                },
                currentQuestion: currentQuestion,
                quizPool: session.quizPoolId
            }
        });
        
    } catch (error) {
        console.error('Get quiz session error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching quiz session'
        });
    }
});

// @desc    Submit answer to current AI-generated question
// @route   POST /api/quiz/session/:sessionId/answer
// @access  Private
router.post('/session/:sessionId/answer', protect, [
    param('sessionId').isMongoId().withMessage('Invalid session ID'),
    body('answer').notEmpty().withMessage('Answer is required'),
    body('hintUsed').optional().isBoolean().withMessage('Hint used must be boolean'),
    body('timeSpent').optional().isInt({ min: 0 }).withMessage('Time spent must be non-negative')
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
        const { answer, hintUsed = false, timeSpent = 0 } = req.body;
        const userId = req.user._id;
        
        // Check if this is a dynamic AI session
        const session = await QuizSession.findOne({ _id: sessionId, userId });
        
        let result;
        if (session && session.sessionMode === 'dynamic_ai') {
            // Use dynamic quiz service for AI-generated questions
            result = await dynamicQuizService.submitDynamicAnswer(sessionId, userId, {
                answer,
                hintUsed,
                timeSpent
            });
        } else {
            // Fallback to traditional quiz service
            result = await quizSessionService.submitAnswer(sessionId, userId, {
                answer,
                hintUsed,
                timeSpent
            });
        }
        
        res.json({
            success: true,
            message: result.isCorrect ? '✅ Correct answer!' : '❌ Incorrect answer',
            data: {
                ...result,
                aiPowered: session && session.sessionMode === 'dynamic_ai' ? true : false
            }
        });
        
    } catch (error) {
        console.error('Submit answer error:', error);
        
        if (error.message.includes('not found') || error.message.includes('not authorized')) {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }
        
        if (error.message.includes('already completed') || error.message.includes('not in progress')) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
        
        if (error.message.includes('Failed to generate question')) {
            return res.status(503).json({
                success: false,
                message: 'AI service temporarily unavailable for next question generation'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Server error submitting answer'
        });
    }
});

// @desc    Get AI-powered hint for current question
// @route   GET /api/quiz/session/:sessionId/hint
// @access  Private
router.get('/session/:sessionId/hint', protect, [
    param('sessionId').isMongoId().withMessage('Invalid session ID')
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
        const userId = req.user._id;
        
        // Check if this is a dynamic AI session
        const session = await QuizSession.findOne({ _id: sessionId, userId });
        
        let hint;
        if (session && session.sessionMode === 'dynamic_ai') {
            // Use dynamic quiz service for AI-generated hints
            hint = await dynamicQuizService.getDynamicHint(sessionId, userId);
        } else {
            // Fallback to traditional quiz service
            hint = await quizSessionService.getHint(sessionId, userId);
        }
        
        res.json({
            success: true,
            message: 'Hint retrieved successfully',
            data: { 
                hint,
                aiGenerated: session && session.sessionMode === 'dynamic_ai' ? true : false
            }
        });
        
    } catch (error) {
        console.error('Get hint error:', error);
        
        if (error.message.includes('not available') || error.message.includes('not enabled')) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Server error getting hint'
        });
    }
});

// @desc    Complete quiz session
// @route   POST /api/quiz/session/:sessionId/complete
// @access  Private
router.post('/session/:sessionId/complete', protect, [
    param('sessionId').isMongoId().withMessage('Invalid session ID')
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
        const userId = req.user._id;
        
        const completionResult = await quizSessionService.completeSession(sessionId, userId);
        
        res.json({
            success: true,
            message: 'Quiz session completed successfully',
            data: completionResult
        });
        
    } catch (error) {
        console.error('Complete session error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error completing quiz session'
        });
    }
});

// @desc    Get user's quiz progress for a topic
// @route   GET /api/quiz/progress/:topic
// @access  Private
router.get('/progress/:topic', protect, [
    param('topic').isIn(['javascript', 'react', 'typescript', 'nodejs', 'python', 'nextjs', 'mongodb', 'css-tailwind'])
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
        
        const { topic } = req.params;
        const userId = req.user._id;
        
        let userProgress = await UserQuizProgress.findOne({ userId });
        
        if (!userProgress) {
            userProgress = new UserQuizProgress({ userId, topicProgress: [] });
            await userProgress.save();
        }
        
        const topicData = userProgress.topicProgress.find(tp => tp.topic === topic);
        
        // Get recent quiz sessions for this topic
        const recentSessions = await QuizSession.find({
            userId: userId,
            'quizPoolId.topic': topic
        }).populate('quizPoolId', 'topic subject').sort({ createdAt: -1 }).limit(5);
        
        res.json({
            success: true,
            data: {
                topic,
                progress: topicData || {
                    topic,
                    totalSessions: 0,
                    completedSessions: 0,
                    averageMasteryScore: 0,
                    finalQuizCompleted: false,
                    needsRemediation: false
                },
                recentSessions,
                overallStats: userProgress.overallStats
            }
        });
        
    } catch (error) {
        console.error('Get progress error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching quiz progress'
        });
    }
});

// @desc    Get user's overall quiz statistics
// @route   GET /api/quiz/stats
// @access  Private
router.get('/stats', protect, async (req, res) => {
    try {
        const userId = req.user._id;
        
        const userProgress = await UserQuizProgress.findOne({ userId });
        const totalSessions = await QuizSession.countDocuments({ userId });
        const completedSessions = await QuizSession.countDocuments({ 
            userId, 
            status: 'completed' 
        });
        
        const stats = {
            totalSessions,
            completedSessions,
            completionRate: totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0,
            overallStats: userProgress?.overallStats || {
                totalQuizzesCompleted: 0,
                averageScore: 0,
                strongestBloomLevel: null,
                weakestBloomLevel: null,
                totalTimeSpent: 0
            },
            topicProgress: userProgress?.topicProgress || []
        };
        
        res.json({
            success: true,
            data: stats
        });
        
    } catch (error) {
        console.error('Get quiz stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching quiz statistics'
        });
    }
});

// @desc    Reset user's progress for a topic (development only)
// @route   DELETE /api/quiz/progress/:topic
// @access  Private
router.delete('/progress/:topic', protect, [
    param('topic').isIn(['javascript', 'react', 'typescript', 'nodejs', 'python', 'nextjs', 'mongodb', 'css-tailwind'])
        .withMessage('Invalid topic')
], async (req, res) => {
    try {
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({
                success: false,
                message: 'Progress reset not allowed in production'
            });
        }
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }
        
        const { topic } = req.params;
        const userId = req.user._id;
        
        // Delete quiz sessions for this topic
        await QuizSession.deleteMany({ 
            userId,
            // Need to populate and filter by topic - simplified for now
        });
        
        // Remove topic progress
        await UserQuizProgress.updateOne(
            { userId },
            { $pull: { topicProgress: { topic } } }
        );
        
        res.json({
            success: true,
            message: `Progress reset for topic: ${topic}`
        });
        
    } catch (error) {
        console.error('Reset progress error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error resetting progress'
        });
    }
});

// Helper function to map experience levels
const mapExperienceLevel = (experienceLevel) => {
    const mapping = {
        'Complete Beginner': 'Beginner',
        'Some Experience': 'Beginner',
        'Intermediate': 'Intermediate',
        'Advanced': 'Advanced'
    };
    return mapping[experienceLevel] || 'Beginner';
};

module.exports = router;