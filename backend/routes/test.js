// routes/test.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const openaiService = require('../services/openaiService');
const youtubeService = require('../services/youtubeService');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @desc    Test OpenAI API health
// @route   GET /api/test/openai-health
// @access  Public (for development)
router.get('/openai-health', async (req, res) => {
    try {
        const health = await openaiService.checkAPIHealth();
        
        res.json({
            success: true,
            data: health
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'OpenAI health check failed',
            error: error.message
        });
    }
});

// @desc    Test YouTube video search
// @route   POST /api/test/youtube-search
// @access  Public (for development)
router.post('/youtube-search', [
    body('topic')
        .isIn(['javascript', 'react', 'typescript', 'nodejs', 'python', 'nextjs', 'mongodb', 'css-tailwind'])
        .withMessage('Invalid topic'),
    body('level')
        .isIn(['Beginner', 'Intermediate', 'Professional'])
        .withMessage('Invalid level'),
    body('maxVideos')
        .optional()
        .isInt({ min: 1, max: 10 })
        .withMessage('Max videos must be between 1 and 10')
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

        const { topic, level, maxVideos = 3 } = req.body;
        const startTime = Date.now();

        const videos = await youtubeService.searchEducationalVideos(topic, level, maxVideos);
        const responseTime = Date.now() - startTime;

        res.json({
            success: true,
            data: {
                topic,
                level,
                totalVideos: videos.length,
                videos: videos.map(video => ({
                    videoId: video.videoId,
                    title: video.title,
                    channelTitle: video.channelTitle,
                    duration: video.durationText,
                    url: video.url,
                    viewCount: video.viewCount.toLocaleString(),
                    educationalScore: video.aiAnalysis?.overallScore || 'N/A',
                    reasoning: video.aiAnalysis?.reasoning || 'No AI analysis'
                }))
            },
            metadata: {
                responseTime: `${responseTime}ms`,
                searchedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('YouTube search test error:', error);
        res.status(500).json({
            success: false,
            message: 'YouTube search failed',
            error: error.message
        });
    }
});

// @desc    Test user-specific video recommendations
// @route   GET /api/test/user-recommendations/:topic
// @access  Private (for development)
router.get('/user-recommendations/:topic', protect, async (req, res) => {
    try {
        const { topic } = req.params;
        
        if (!['javascript', 'react', 'typescript', 'nodejs', 'python', 'nextjs', 'mongodb', 'css-tailwind'].includes(topic)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid topic'
            });
        }

        const startTime = Date.now();
        const recommendations = await youtubeService.getRecommendationsForUser(req.user._id, topic);
        const responseTime = Date.now() - startTime;

        res.json({
            success: true,
            data: recommendations,
            metadata: {
                responseTime: `${responseTime}ms`,
                generatedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('User recommendations test error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user recommendations',
            error: error.message
        });
    }
});

// @desc    Test question generation
// @route   POST /api/test/generate-question
// @access  Public (for development)
router.post('/generate-question', [
    body('topic')
        .isIn(['javascript', 'react', 'typescript', 'nodejs', 'python'])
        .withMessage('Invalid topic'),
    body('difficulty')
        .optional()
        .isIn(['beginner', 'intermediate', 'advanced'])
        .withMessage('Invalid difficulty level')
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

        const { topic, difficulty = 'intermediate' } = req.body;
        const startTime = Date.now();

        const question = await openaiService.generateQuestion(topic, difficulty);
        const responseTime = Date.now() - startTime;

        res.json({
            success: true,
            data: {
                question,
                metadata: {
                    responseTime: `${responseTime}ms`,
                    topic,
                    difficulty,
                    generatedAt: new Date().toISOString()
                }
            }
        });

    } catch (error) {
        console.error('Question generation test error:', error);
        res.status(500).json({
            success: false,
            message: 'Question generation failed',
            error: error.message
        });
    }
});

// @desc    Test answer evaluation
// @route   POST /api/test/evaluate-answer
// @access  Public (for development)
router.post('/evaluate-answer', [
    body('question').isObject().withMessage('Question object is required'),
    body('userAnswer').isIn(['A', 'B', 'C', 'D']).withMessage('User answer must be A, B, C, or D'),
    body('userExplanation').optional().isString()
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

        const { question, userAnswer, userExplanation } = req.body;
        const startTime = Date.now();

        const evaluation = await openaiService.evaluateAnswer(question, userAnswer, userExplanation);
        const responseTime = Date.now() - startTime;

        res.json({
            success: true,
            data: {
                evaluation,
                metadata: {
                    responseTime: `${responseTime}ms`,
                    evaluatedAt: new Date().toISOString()
                }
            }
        });

    } catch (error) {
        console.error('Answer evaluation test error:', error);
        res.status(500).json({
            success: false,
            message: 'Answer evaluation failed',
            error: error.message
        });
    }
});

// @desc    Test learning recommendations generation
// @route   POST /api/test/generate-recommendations
// @access  Public (for development)
router.post('/generate-recommendations', [
    body('topic').isString().notEmpty(),
    body('score').isNumeric().isFloat({ min: 0, max: 100 }),
    body('level').isIn(['Beginner', 'Intermediate', 'Professional']),
    body('weakAreas').isArray(),
    body('strongAreas').isArray()
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

        const assessmentResults = req.body;
        const startTime = Date.now();

        const recommendations = await openaiService.generateLearningRecommendations(assessmentResults);
        const responseTime = Date.now() - startTime;

        res.json({
            success: true,
            data: {
                recommendations,
                metadata: {
                    responseTime: `${responseTime}ms`,
                    generatedAt: new Date().toISOString()
                }
            }
        });

    } catch (error) {
        console.error('Recommendations generation test error:', error);
        res.status(500).json({
            success: false,
            message: 'Recommendations generation failed',
            error: error.message
        });
    }
});

// @desc    Comprehensive OpenAI service test
// @route   POST /api/test/full-assessment-flow
// @access  Public (for development)
router.post('/full-assessment-flow', [
    body('topic').isIn(['javascript', 'react', 'typescript', 'nodejs', 'python']),
    body('difficulty').optional().isIn(['beginner', 'intermediate', 'advanced'])
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

        const { topic, difficulty = 'intermediate' } = req.body;
        const testFlow = {
            steps: [],
            totalTime: 0,
            success: true
        };

        // Step 1: Generate question
        const step1Start = Date.now();
        try {
            const question = await openaiService.generateQuestion(topic, difficulty);
            testFlow.steps.push({
                step: 1,
                name: 'Generate Question',
                success: true,
                time: Date.now() - step1Start,
                data: question
            });
        } catch (error) {
            testFlow.steps.push({
                step: 1,
                name: 'Generate Question',
                success: false,
                error: error.message,
                time: Date.now() - step1Start
            });
            testFlow.success = false;
        }

        // Step 2: Simulate answer evaluation (if question generation succeeded)
        if (testFlow.steps[0].success) {
            const step2Start = Date.now();
            try {
                const question = testFlow.steps[0].data;
                const simulatedAnswer = 'A'; // Simulate user choosing A
                
                const evaluation = await openaiService.evaluateAnswer(question, simulatedAnswer);
                testFlow.steps.push({
                    step: 2,
                    name: 'Evaluate Answer',
                    success: true,
                    time: Date.now() - step2Start,
                    data: evaluation
                });
            } catch (error) {
                testFlow.steps.push({
                    step: 2,
                    name: 'Evaluate Answer',
                    success: false,
                    error: error.message,
                    time: Date.now() - step2Start
                });
                testFlow.success = false;
            }
        }

        // Step 3: Generate recommendations
        const step3Start = Date.now();
        try {
            const mockAssessmentResults = {
                topic,
                score: 75,
                level: 'Intermediate',
                weakAreas: ['advanced concepts', 'best practices'],
                strongAreas: ['basic syntax', 'fundamental concepts']
            };
            
            const recommendations = await openaiService.generateLearningRecommendations(mockAssessmentResults);
            testFlow.steps.push({
                step: 3,
                name: 'Generate Recommendations',
                success: true,
                time: Date.now() - step3Start,
                data: recommendations
            });
        } catch (error) {
            testFlow.steps.push({
                step: 3,
                name: 'Generate Recommendations',
                success: false,
                error: error.message,
                time: Date.now() - step3Start
            });
            testFlow.success = false;
        }

        testFlow.totalTime = testFlow.steps.reduce((total, step) => total + step.time, 0);

        res.json({
            success: testFlow.success,
            message: testFlow.success ? 'Full assessment flow test completed successfully' : 'Some steps failed',
            data: testFlow
        });

    } catch (error) {
        console.error('Full assessment flow test error:', error);
        res.status(500).json({
            success: false,
            message: 'Full assessment flow test failed',
            error: error.message
        });
    }
});

// @desc    Test complete system integration (Assessment + YouTube)
// @route   POST /api/test/complete-flow
// @access  Public (for development)
router.post('/complete-flow', [
    body('topic').isIn(['javascript', 'react', 'typescript', 'nodejs', 'python', 'nextjs', 'mongodb', 'css-tailwind']),
    body('userLevel').isIn(['Beginner', 'Intermediate', 'Professional'])
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

        const { topic, userLevel } = req.body;
        const testFlow = {
            steps: [],
            totalTime: 0,
            success: true
        };

        // Step 1: Assessment Question Generation
        const step1Start = Date.now();
        try {
            const question = await openaiService.generateQuestion(topic, userLevel.toLowerCase());
            testFlow.steps.push({
                step: 1,
                name: 'Generate Assessment Question',
                success: true,
                time: Date.now() - step1Start,
                data: { questionGenerated: true, topic, difficulty: userLevel }
            });
        } catch (error) {
            testFlow.steps.push({
                step: 1,
                name: 'Generate Assessment Question',
                success: false,
                error: error.message,
                time: Date.now() - step1Start
            });
            testFlow.success = false;
        }

        // Step 2: YouTube Video Recommendations
        const step2Start = Date.now();
        try {
            const videoRecommendations = await youtubeService.searchEducationalVideos(topic, userLevel, 3);
            testFlow.steps.push({
                step: 2,
                name: 'Get YouTube Recommendations',
                success: true,
                time: Date.now() - step2Start,
                data: {
                    videosFound: videoRecommendations.length,
                    videos: videoRecommendations.map(v => ({
                        title: v.title,
                        duration: v.durationText,
                        score: v.aiAnalysis?.overallScore || 'N/A'
                    }))
                }
            });
        } catch (error) {
            testFlow.steps.push({
                step: 2,
                name: 'Get YouTube Recommendations',
                success: false,
                error: error.message,
                time: Date.now() - step2Start
            });
            testFlow.success = false;
        }

        // Step 3: Learning Path Generation
        const step3Start = Date.now();
        try {
            const mockAssessmentResults = {
                topic,
                score: userLevel === 'Beginner' ? 30 : userLevel === 'Intermediate' ? 65 : 85,
                level: userLevel,
                weakAreas: ['advanced concepts'],
                strongAreas: ['basic syntax']
            };
            
            const recommendations = await openaiService.generateLearningRecommendations(mockAssessmentResults);
            testFlow.steps.push({
                step: 3,
                name: 'Generate Learning Path',
                success: true,
                time: Date.now() - step3Start,
                data: { learningPathGenerated: true, hasRecommendations: !!recommendations }
            });
        } catch (error) {
            testFlow.steps.push({
                step: 3,
                name: 'Generate Learning Path',
                success: false,
                error: error.message,
                time: Date.now() - step3Start
            });
            testFlow.success = false;
        }

        testFlow.totalTime = testFlow.steps.reduce((total, step) => total + step.time, 0);

        res.json({
            success: testFlow.success,
            message: testFlow.success ? 'Complete system integration test passed!' : 'Some components failed',
            data: testFlow,
            summary: {
                topic,
                userLevel,
                assessmentWorking: testFlow.steps[0]?.success || false,
                youtubeWorking: testFlow.steps[1]?.success || false,
                recommendationsWorking: testFlow.steps[2]?.success || false,
                totalTime: `${testFlow.totalTime}ms`
            }
        });

    } catch (error) {
        console.error('Complete flow test error:', error);
        res.status(500).json({
            success: false,
            message: 'Complete system test failed',
            error: error.message
        });
    }
});

module.exports = router;