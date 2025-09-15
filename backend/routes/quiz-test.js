// routes/quiz-test.js - Test routes for Quiz models and functionality
const express = require('express');
const { QuizSession, QuizPool } = require('../models/Quiz');
const Video = require('../models/Video');
const MicroVideo = require('../models/MicroVideo');
const User = require('../models/User');
const quizGenerationService = require('../services/quizGenerationService');

const router = express.Router();

// Mock user middleware for testing (similar to test-videos)
const mockUser = async (req, res, next) => {
    try {
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
            console.log('✅ Created test user for quiz tests');
        }

        req.user = { _id: testUser._id };
        next();
    } catch (error) {
        console.error('Error setting up test user:', error);
        res.status(500).json({ error: 'Test user setup failed' });
    }
};

// @desc    Test - Calculate adaptive quiz schedule based on actual micro-video count
// @route   GET /api/quiz-test/schedule-adaptive/:videoId
// @access  Public (for testing)
router.get('/schedule-adaptive/:videoId', async (req, res) => {
    try {
        const { videoId } = req.params;

        // Get the actual micro-video count from the processed video
        const microVideos = await MicroVideo.find({ originalVideoId: videoId });

        if (microVideos.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No micro-videos found for this video. Process the video first.',
                videoId: videoId
            });
        }

        const actualMicroVideoCount = microVideos.length;
        const schedule = QuizSession.calculateQuizSchedule(actualMicroVideoCount);

        // Get video details
        const video = await Video.findById(videoId, 'title topic');

        res.json({
            success: true,
            message: `Adaptive quiz schedule calculated for video with ${actualMicroVideoCount} micro-videos`,
            data: {
                videoId: videoId,
                videoTitle: video?.title || 'Unknown',
                videoTopic: video?.topic || 'Unknown',
                actualMicroVideoCount: actualMicroVideoCount,
                totalQuizSessions: schedule.length,
                intermediateQuizzes: schedule.filter(s => s.sessionType === 'intermediate').length,
                finalQuizzes: schedule.filter(s => s.sessionType === 'final').length,
                schedule: schedule,
                microVideoDetails: microVideos.map(mv => ({
                    id: mv._id,
                    sequence: mv.sequence,
                    title: mv.title,
                    learningObjective: mv.cltBlmScript?.learningObjective,
                    keypoints: mv.cltBlmScript?.keypoints,
                    cognitiveLoad: mv.cltBlmScript?.cognitiveLoad
                }))
            },
            adaptiveLogic: {
                rule: actualMicroVideoCount <= 2 ? 'Only final quiz for very short content' :
                      actualMicroVideoCount <= 4 ? 'One intermediate + final for small content' :
                      actualMicroVideoCount <= 6 ? 'Two intermediates + final for medium content' :
                      'Multiple intermediates + final for large content',
                questionsPerMicroVideo: 2,
                basedOnContent: 'CLT-bLM educational scripts and learning objectives'
            }
        });

    } catch (error) {
        console.error('❌ Error calculating adaptive quiz schedule:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to calculate adaptive quiz schedule',
            error: error.message
        });
    }
});

// @desc    Test - Calculate quiz schedule for different video counts (manual testing)
// @route   GET /api/quiz-test/schedule/:videoCount
// @access  Public (for testing)
router.get('/schedule/:videoCount', (req, res) => {
    try {
        const videoCount = parseInt(req.params.videoCount);

        if (isNaN(videoCount) || videoCount < 1) {
            return res.status(400).json({
                success: false,
                message: 'Invalid video count. Must be a positive number.'
            });
        }

        const schedule = QuizSession.calculateQuizSchedule(videoCount);

        res.json({
            success: true,
            data: {
                totalMicroVideos: videoCount,
                totalQuizSessions: schedule.length,
                intermediateQuizzes: schedule.filter(s => s.sessionType === 'intermediate').length,
                finalQuizzes: schedule.filter(s => s.sessionType === 'final').length,
                schedule: schedule
            },
            message: `Quiz schedule calculated for ${videoCount} micro-videos`
        });

    } catch (error) {
        console.error('❌ Error calculating quiz schedule:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to calculate quiz schedule',
            error: error.message
        });
    }
});

// @desc    Test - Batch create quiz pools for all micro-videos of a video
// @route   POST /api/quiz-test/create-pools-batch/:videoId
// @access  Public (for testing)
router.post('/create-pools-batch/:videoId', mockUser, async (req, res) => {
    try {
        const { videoId } = req.params;

        // Find the video and all its micro-videos
        const video = await Video.findById(videoId);
        if (!video) {
            return res.status(404).json({
                success: false,
                message: 'Video not found'
            });
        }

        const microVideos = await MicroVideo.find({ originalVideoId: videoId })
            .sort({ sequence: 1 });

        if (microVideos.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No micro-videos found for this video'
            });
        }

        console.log(`🔄 Batch generating quiz pools for ${microVideos.length} micro-videos`);

        // Check for existing pools
        const existingPools = await QuizPool.find({
            microVideoId: { $in: microVideos.map(mv => mv._id) }
        });

        if (existingPools.length > 0) {
            return res.status(400).json({
                success: false,
                message: `${existingPools.length} quiz pools already exist. Use cleanup endpoint first.`,
                existingPools: existingPools.map(p => p.microVideoId)
            });
        }

        // Generate questions for all micro-videos using batch service
        const questionsByMicroVideo = await quizGenerationService.batchGenerateQuestions(
            microVideos,
            3 // 3 questions per micro-video
        );

        // Create quiz pools
        const createdPools = [];
        const failedPools = [];

        for (const microVideo of microVideos) {
            try {
                const questions = questionsByMicroVideo[microVideo._id.toString()];

                if (!questions || questions.length === 0) {
                    failedPools.push({
                        microVideoId: microVideo._id,
                        title: microVideo.title,
                        reason: 'No questions generated'
                    });
                    continue;
                }

                const quizPool = new QuizPool({
                    originalVideoId: microVideo.originalVideoId,
                    microVideoId: microVideo._id,
                    microVideoTitle: microVideo.title,
                    difficulty: microVideo.cltBlmScript.difficulty || 'Intermediate',
                    keyPoints: microVideo.cltBlmScript.keypoints || ['General concepts'],
                    learningObjective: microVideo.cltBlmScript.learningObjective || 'Learn key concepts',
                    questions: questions,
                    totalQuestions: questions.length,
                    questionQuality: quizGenerationService.calculateQualityScore(questions),
                    generatedBy: 'openai-gpt-batch',
                    generationVersion: '1.1'
                });

                await quizPool.save();

                createdPools.push({
                    poolId: quizPool._id,
                    microVideoId: microVideo._id,
                    title: microVideo.title,
                    questionsGenerated: questions.length,
                    quality: quizPool.questionQuality
                });

            } catch (error) {
                console.error(`Error creating pool for micro-video ${microVideo._id}:`, error);
                failedPools.push({
                    microVideoId: microVideo._id,
                    title: microVideo.title,
                    reason: error.message
                });
            }
        }

        const overallStats = {
            totalMicroVideos: microVideos.length,
            successfulPools: createdPools.length,
            failedPools: failedPools.length,
            totalQuestionsGenerated: createdPools.reduce((sum, pool) => sum + pool.questionsGenerated, 0)
        };

        res.status(201).json({
            success: true,
            message: `Batch quiz pool creation completed: ${createdPools.length}/${microVideos.length} successful`,
            data: {
                videoId: videoId,
                videoTitle: video.title,
                overallStats: overallStats,
                createdPools: createdPools,
                failedPools: failedPools
            },
            aiGeneration: {
                model: 'gpt-3.5-turbo',
                batchProcessing: true,
                questionsPerMicroVideo: 3
            }
        });

    } catch (error) {
        console.error('❌ Error in batch quiz pool creation:', error);
        res.status(500).json({
            success: false,
            message: 'Batch quiz pool creation failed',
            error: error.message
        });
    }
});

// @desc    Test - Create quiz pool for an existing micro-video
// @route   POST /api/quiz-test/create-pool/:microVideoId
// @access  Public (for testing)
router.post('/create-pool/:microVideoId', mockUser, async (req, res) => {
    try {
        const { microVideoId } = req.params;

        // Find the micro-video
        const microVideo = await MicroVideo.findById(microVideoId).populate('originalVideoId');

        if (!microVideo) {
            return res.status(404).json({
                success: false,
                message: 'Micro-video not found'
            });
        }

        // Check if quiz pool already exists
        const existingPool = await QuizPool.findOne({ microVideoId });
        if (existingPool) {
            return res.status(400).json({
                success: false,
                message: 'Quiz pool already exists for this micro-video',
                poolId: existingPool._id
            });
        }

        // Generate real questions using OpenAI based on CLT-bLM script
        console.log('🤖 Generating quiz questions using OpenAI for:', microVideo.title);

        const generatedQuestions = await quizGenerationService.generateQuestionsFromCLTScript(
            microVideo,
            3 // Generate 3 questions per micro-video
        );

        if (generatedQuestions.length === 0) {
            return res.status(500).json({
                success: false,
                message: 'Failed to generate quiz questions using OpenAI',
                details: 'The AI service could not create questions from the CLT-bLM script'
            });
        }

        // Create quiz pool with AI-generated questions
        const quizPool = new QuizPool({
            originalVideoId: microVideo.originalVideoId._id,
            microVideoId: microVideo._id,
            microVideoTitle: microVideo.title,
            difficulty: microVideo.cltBlmScript.difficulty || 'Intermediate',
            keyPoints: microVideo.cltBlmScript.keypoints || ['General concepts'],
            learningObjective: microVideo.cltBlmScript.learningObjective || 'Learn key concepts',
            questions: generatedQuestions,
            totalQuestions: generatedQuestions.length,
            questionQuality: quizGenerationService.calculateQualityScore(generatedQuestions),
            generatedBy: 'openai-gpt',
            generationVersion: '1.1'
        });

        await quizPool.save();

        // Get question statistics
        const questionStats = quizGenerationService.getQuestionStats(generatedQuestions);

        res.status(201).json({
            success: true,
            message: `Quiz pool created successfully using OpenAI - Generated ${generatedQuestions.length} questions`,
            data: {
                poolId: quizPool._id,
                microVideoId: microVideo._id,
                microVideoTitle: microVideo.title,
                totalQuestions: quizPool.totalQuestions,
                difficulty: quizPool.difficulty,
                keyPoints: quizPool.keyPoints,
                learningObjective: quizPool.learningObjective,
                questionQuality: quizPool.questionQuality,
                generatedBy: quizPool.generatedBy,
                questionStats: questionStats,
                questions: quizPool.questions.map(q => ({
                    questionId: q.questionId,
                    question: q.question,
                    options: q.options,
                    correctAnswer: q.correctAnswer, // Show for testing purposes
                    explanation: q.explanation,
                    hint: q.hint,
                    difficulty: q.difficulty,
                    keyPoint: q.keyPoint,
                    questionType: q.questionType,
                    cognitiveLoad: q.cognitiveLoad
                }))
            },
            aiGeneration: {
                model: 'gpt-3.5-turbo',
                promptType: 'CLT-bLM based quiz generation',
                basedOn: {
                    educationalScript: microVideo.cltBlmScript.educationalScript ? 'Available' : 'Missing',
                    keyPoints: microVideo.cltBlmScript.keypoints?.length || 0,
                    learningObjective: microVideo.cltBlmScript.learningObjective ? 'Available' : 'Missing',
                    cognitiveLoad: microVideo.cltBlmScript.cognitiveLoad
                }
            }
        });

    } catch (error) {
        console.error('❌ Error creating quiz pool:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create quiz pool',
            error: error.message
        });
    }
});

// @desc    Test - Create quiz session for a video
// @route   POST /api/quiz-test/create-session/:videoId
// @access  Public (for testing)
router.post('/create-session/:videoId', mockUser, async (req, res) => {
    try {
        const { videoId } = req.params;
        const { sessionType = 'intermediate', microVideoIds } = req.body;

        // Find the video and its micro-videos
        const video = await Video.findById(videoId);
        if (!video) {
            return res.status(404).json({
                success: false,
                message: 'Video not found'
            });
        }

        let targetMicroVideoIds = microVideoIds;
        if (!targetMicroVideoIds) {
            // Get all micro-videos for this video
            const allMicroVideos = await MicroVideo.find({ originalVideoId: videoId }).limit(3);
            targetMicroVideoIds = allMicroVideos.map(mv => mv._id);
        }

        if (targetMicroVideoIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No micro-videos found for quiz creation'
            });
        }

        // Get quiz pools for these micro-videos
        const quizPools = await QuizPool.find({ microVideoId: { $in: targetMicroVideoIds } });

        if (quizPools.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No quiz pools found. Create quiz pools first using POST /quiz-test/create-pool/:microVideoId'
            });
        }

        // Collect questions from pools
        const allQuestions = [];
        quizPools.forEach(pool => {
            allQuestions.push(...pool.questions.slice(0, 2)); // Take max 2 questions per micro-video
        });

        // Determine session number
        const existingSessions = await QuizSession.countDocuments({
            userId: req.user._id,
            originalVideoId: videoId
        });

        // Create quiz session
        const quizSession = new QuizSession({
            userId: req.user._id,
            originalVideoId: videoId,
            sessionType: sessionType,
            sessionNumber: existingSessions + 1,
            microVideoIds: targetMicroVideoIds,
            totalQuestions: allQuestions.length,
            questionsPerMicroVideo: Math.ceil(allQuestions.length / targetMicroVideoIds.length),
            questions: allQuestions
        });

        await quizSession.save();

        res.status(201).json({
            success: true,
            message: 'Quiz session created successfully',
            data: {
                sessionId: quizSession.sessionId,
                sessionType: quizSession.sessionType,
                sessionNumber: quizSession.sessionNumber,
                totalQuestions: quizSession.totalQuestions,
                microVideoIds: quizSession.microVideoIds,
                status: quizSession.status,
                progressPercentage: quizSession.progressPercentage,
                currentQuestionIndex: quizSession.currentQuestionIndex,
                questions: quizSession.questions.map(q => ({
                    questionId: q.questionId,
                    question: q.question,
                    options: q.options,
                    difficulty: q.difficulty,
                    keyPoint: q.keyPoint
                    // Note: correctAnswer is hidden from client
                }))
            }
        });

    } catch (error) {
        console.error('❌ Error creating quiz session:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create quiz session',
            error: error.message
        });
    }
});

// @desc    Test - Get all quiz sessions for test user
// @route   GET /api/quiz-test/sessions
// @access  Public (for testing)
router.get('/sessions', mockUser, async (req, res) => {
    try {
        const sessions = await QuizSession.find({ userId: req.user._id })
            .populate('originalVideoId', 'title topic')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: sessions.length,
            data: sessions.map(session => ({
                sessionId: session.sessionId,
                sessionType: session.sessionType,
                sessionNumber: session.sessionNumber,
                status: session.status,
                originalVideo: session.originalVideoId,
                totalQuestions: session.totalQuestions,
                performance: session.performance,
                progressPercentage: session.progressPercentage,
                createdAt: session.createdAt,
                completedAt: session.completedAt
            }))
        });

    } catch (error) {
        console.error('❌ Error getting quiz sessions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get quiz sessions',
            error: error.message
        });
    }
});

// @desc    Test - Get all quiz pools
// @route   GET /api/quiz-test/pools
// @access  Public (for testing)
router.get('/pools', async (req, res) => {
    try {
        const pools = await QuizPool.find({})
            .populate('originalVideoId', 'title topic')
            .populate('microVideoId', 'title sequence')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: pools.length,
            data: pools.map(pool => ({
                poolId: pool._id,
                originalVideo: pool.originalVideoId,
                microVideo: pool.microVideoId,
                difficulty: pool.difficulty,
                totalQuestions: pool.totalQuestions,
                keyPoints: pool.keyPoints,
                learningObjective: pool.learningObjective,
                generatedAt: pool.generatedAt
            }))
        });

    } catch (error) {
        console.error('❌ Error getting quiz pools:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get quiz pools',
            error: error.message
        });
    }
});

// @desc    Test - Cleanup test quiz data
// @route   DELETE /api/quiz-test/cleanup
// @access  Public (for testing)
router.delete('/cleanup', mockUser, async (req, res) => {
    try {
        const deletedSessions = await QuizSession.deleteMany({ userId: req.user._id });
        const deletedPools = await QuizPool.deleteMany({});

        res.json({
            success: true,
            message: 'Quiz test data cleaned up successfully',
            deleted: {
                sessions: deletedSessions.deletedCount,
                pools: deletedPools.deletedCount
            }
        });

    } catch (error) {
        console.error('❌ Error cleaning up quiz data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cleanup quiz data',
            error: error.message
        });
    }
});

// @desc    Test - Debug quiz pool availability for session creation
// @route   GET /api/quiz-test/debug-pools/:videoId
// @access  Public (for testing)
router.get('/debug-pools/:videoId', async (req, res) => {
    try {
        const { videoId } = req.params;

        console.log(`🔍 Debugging quiz pools for video: ${videoId}`);

        // Check if video exists
        const video = await Video.findById(videoId);
        console.log('Video found:', !!video);

        // Check micro-videos for this video
        const microVideos = await MicroVideo.find({ originalVideoId: videoId });
        console.log('Micro-videos found:', microVideos.length);

        // Check quiz pools for these micro-videos
        const microVideoIds = microVideos.map(mv => mv._id);
        const quizPools = await QuizPool.find({ microVideoId: { $in: microVideoIds } });
        console.log('Quiz pools found:', quizPools.length);

        // Detailed breakdown
        const debugInfo = {
            video: {
                id: videoId,
                exists: !!video,
                title: video?.title,
                topic: video?.topic
            },
            microVideos: microVideos.map(mv => ({
                id: mv._id,
                sequence: mv.sequence,
                title: mv.title,
                hasQuizPool: quizPools.some(pool => pool.microVideoId.toString() === mv._id.toString())
            })),
            quizPools: quizPools.map(pool => ({
                id: pool._id,
                microVideoId: pool.microVideoId,
                microVideoTitle: pool.microVideoTitle,
                totalQuestions: pool.totalQuestions,
                generatedBy: pool.generatedBy
            }))
        };

        res.json({
            success: true,
            message: `Debug info for video ${videoId}`,
            data: {
                summary: {
                    videoExists: !!video,
                    microVideosCount: microVideos.length,
                    quizPoolsCount: quizPools.length,
                    canCreateSession: video && microVideos.length > 0 && quizPools.length > 0
                },
                details: debugInfo
            }
        });

    } catch (error) {
        console.error('❌ Error debugging quiz pools:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to debug quiz pools',
            error: error.message
        });
    }
});

// @desc    Test - Check OpenAI service directly
// @route   GET /api/quiz-test/openai-test
// @access  Public (for testing)
router.get('/openai-test', async (req, res) => {
    try {
        const openaiService = require('../services/openaiService');

        console.log('Testing OpenAI service...');
        console.log('OpenAI client exists:', !!openaiService.openai);
        console.log('API key configured:', !!process.env.OPENAI_API_KEY);
        console.log('API key starts with:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 7) : 'NOT_SET');

        // Test simple OpenAI call
        const response = await openaiService.openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'user',
                    content: 'Generate a simple JSON object with a test question: {"question": "What is 2+2?", "answer": "4"}'
                }
            ],
            max_tokens: 100,
            temperature: 0.3
        });

        res.json({
            success: true,
            message: 'OpenAI service is working correctly',
            data: {
                openaiClientExists: !!openaiService.openai,
                apiKeyConfigured: !!process.env.OPENAI_API_KEY,
                testResponse: response.choices[0].message.content,
                usage: response.usage
            }
        });

    } catch (error) {
        console.error('❌ OpenAI service test failed:', error);
        res.status(500).json({
            success: false,
            message: 'OpenAI service test failed',
            error: error.message,
            details: {
                openaiClientExists: !!(require('../services/openaiService').openai),
                apiKeyConfigured: !!process.env.OPENAI_API_KEY,
                apiKeyPrefix: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 7) : 'NOT_SET'
            }
        });
    }
});

// @desc    Test - Health check for quiz system
// @route   GET /api/quiz-test/health
// @access  Public (for testing)
router.get('/health', async (req, res) => {
    try {
        // Test database connection
        const sessionCount = await QuizSession.countDocuments({});
        const poolCount = await QuizPool.countDocuments({});

        res.json({
            success: true,
            message: 'Quiz system health check',
            data: {
                database: {
                    connected: true,
                    collections: {
                        quizSessions: sessionCount,
                        quizPools: poolCount
                    }
                },
                models: {
                    QuizSession: 'Available',
                    QuizPool: 'Available'
                },
                testEndpoints: {
                    openaiTest: 'GET /api/quiz-test/openai-test',
                    calculateScheduleAdaptive: 'GET /api/quiz-test/schedule-adaptive/:videoId',
                    calculateSchedule: 'GET /api/quiz-test/schedule/:videoCount',
                    createPool: 'POST /api/quiz-test/create-pool/:microVideoId',
                    createPoolsBatch: 'POST /api/quiz-test/create-pools-batch/:videoId',
                    createSession: 'POST /api/quiz-test/create-session/:videoId',
                    getSessions: 'GET /api/quiz-test/sessions',
                    getPools: 'GET /api/quiz-test/pools',
                    cleanup: 'DELETE /api/quiz-test/cleanup'
                },
                aiIntegration: {
                    openaiService: 'Integrated',
                    quizGenerationService: 'Available',
                    questionGeneration: 'LLM-powered (no hardcoded questions)',
                    batchProcessing: 'Supported'
                }
            }
        });

    } catch (error) {
        console.error('❌ Quiz system health check failed:', error);
        res.status(500).json({
            success: false,
            message: 'Quiz system health check failed',
            error: error.message
        });
    }
});

module.exports = router;