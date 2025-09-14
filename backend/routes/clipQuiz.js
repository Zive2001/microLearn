// routes/clipQuiz.js - Clip-based Quiz Routes following CLT-bLM methodology

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { protect } = require('../middleware/auth');
const { QuizPool, QuizSession, UserQuizProgress } = require('../models/Quiz');
const clipBasedQuizGenerator = require('../services/clipBasedQuizGenerator');
const quizSessionService = require('../services/quizSessionService');

const router = express.Router();

// @desc    Generate quiz sessions from micro-video clips
// @route   POST /api/clip-quiz/generate
// @access  Private
router.post('/generate', protect, [
    body('subjectArea')
        .isString()
        .notEmpty()
        .withMessage('Subject area is required'),
    body('totalClips')
        .isInt({ min: 1 })
        .withMessage('Total clips must be at least 1'),
    body('clipMetadata')
        .isArray()
        .withMessage('Clip metadata must be an array'),
    body('keypointsSelected')
        .isArray()
        .withMessage('Selected keypoints must be an array'),
    body('availableTimePerDay')
        .optional()
        .isInt({ min: 5 })
        .withMessage('Available time must be at least 5 minutes')
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

        const {
            subjectArea,
            totalClips,
            clipMetadata,
            keypointsSelected,
            availableTimePerDay = 30,
            transcriptSegments = []
        } = req.body;

        const userLevel = mapExperienceLevel(req.user.profile?.experienceLevel || 'Complete Beginner');
        
        console.log(`🎬 Generating clip-based quiz for user ${req.user._id}`);
        console.log(`📊 ${subjectArea}: ${totalClips} clips, ${keypointsSelected.length} keypoints`);

        // Generate quiz sessions based on clip content
        const quizStructure = await clipBasedQuizGenerator.generateClipBasedQuizSessions({
            subjectArea,
            userLevel,
            totalClips,
            clipMetadata,
            keypointsSelected,
            availableTimePerDay,
            transcriptSegments
        });

        // Create quiz pool in database
        const quizPool = new QuizPool({
            topic: subjectArea.toLowerCase(),
            subject: formatSubjectName(subjectArea),
            userLevel,
            totalClips,
            keypoints: keypointsSelected,
            questions: quizStructure.quizPool,
            coveragePercentage: quizStructure.metadata.coveragePercentage,
            generatedBy: 'clip-based-llm',
            isActive: true,
            metadata: {
                clipMetadata,
                sessions: quizStructure.sessions.map(s => ({
                    name: s.name,
                    type: s.type,
                    clipRange: s.clipRange,
                    questionCount: s.questions.length
                }))
            }
        });

        await quizPool.save();

        // Update user progress
        await UserQuizProgress.findOneAndUpdate(
            { userId: req.user._id, topic: subjectArea.toLowerCase() },
            {
                $set: {
                    totalSessions: quizStructure.sessions.length,
                    completedSessions: 0,
                    lastUpdated: new Date()
                }
            },
            { upsert: true, new: true }
        );

        res.status(201).json({
            success: true,
            message: 'Clip-based quiz sessions generated successfully',
            data: {
                quizPoolId: quizPool._id,
                sessions: quizStructure.sessions,
                metadata: quizStructure.metadata,
                schedule: generateSessionSchedule(quizStructure.sessions, availableTimePerDay)
            }
        });

    } catch (error) {
        console.error('Clip quiz generation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate clip-based quiz',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// @desc    Start a specific quiz session from clip-based generation
// @route   POST /api/clip-quiz/session/start
// @access  Private
router.post('/session/start', protect, [
    body('quizPoolId')
        .isMongoId()
        .withMessage('Valid quiz pool ID is required'),
    body('sessionName')
        .isString()
        .notEmpty()
        .withMessage('Session name is required'),
    body('clipRange')
        .isObject()
        .withMessage('Clip range must be an object')
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

        const { quizPoolId, sessionName, clipRange } = req.body;
        
        // Get quiz pool
        const quizPool = await QuizPool.findById(quizPoolId);
        if (!quizPool) {
            return res.status(404).json({
                success: false,
                message: 'Quiz pool not found'
            });
        }

        // Find the specific session configuration
        const sessionConfig = quizPool.metadata.sessions.find(s => s.name === sessionName);
        if (!sessionConfig) {
            return res.status(404).json({
                success: false,
                message: 'Session configuration not found'
            });
        }

        // Get questions for this session's clip range
        const sessionQuestions = quizPool.questions.filter(q => {
            return q.clipNumber >= clipRange.start && q.clipNumber <= clipRange.end;
        });

        if (sessionQuestions.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No questions found for this clip range'
            });
        }

        // Create quiz session
        const quizSession = new QuizSession({
            userId: req.user._id,
            quizPoolId: quizPool._id,
            sessionType: sessionConfig.type,
            sessionName: sessionName,
            clipRange: clipRange,
            questionsToAsk: sessionQuestions.slice(0, sessionConfig.questionCount),
            currentQuestionIndex: 0,
            status: 'in_progress',
            timeLimit: getTimeLimit(sessionConfig.type),
            hintsEnabled: sessionConfig.type !== 'final'
        });

        await quizSession.save();

        // Get current question
        const currentQuestion = prepareQuestionForResponse(
            sessionQuestions[0], 
            1, 
            sessionConfig.questionCount,
            quizSession.hintsEnabled
        );

        res.status(201).json({
            success: true,
            message: 'Clip-based quiz session started successfully',
            data: {
                session: {
                    _id: quizSession._id,
                    sessionName: sessionName,
                    sessionType: sessionConfig.type,
                    clipRange: clipRange,
                    totalQuestions: sessionConfig.questionCount,
                    timeLimit: quizSession.timeLimit,
                    hintsEnabled: quizSession.hintsEnabled,
                    status: 'in_progress'
                },
                currentQuestion,
                quizPool: {
                    topic: quizPool.topic,
                    subject: quizPool.subject,
                    userLevel: quizPool.userLevel,
                    coveragePercentage: quizPool.coveragePercentage
                }
            }
        });

    } catch (error) {
        console.error('Start clip quiz session error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to start quiz session'
        });
    }
});

// @desc    Get quiz sessions schedule for a quiz pool
// @route   GET /api/clip-quiz/schedule/:quizPoolId
// @access  Private
router.get('/schedule/:quizPoolId', protect, async (req, res) => {
    try {
        const quizPool = await QuizPool.findById(req.params.quizPoolId);
        if (!quizPool) {
            return res.status(404).json({
                success: false,
                message: 'Quiz pool not found'
            });
        }

        // Get user's completed sessions
        const completedSessions = await QuizSession.find({
            userId: req.user._id,
            quizPoolId: quizPool._id,
            status: 'completed'
        }).select('sessionName completedAt score');

        const schedule = quizPool.metadata.sessions.map(session => {
            const completed = completedSessions.find(c => c.sessionName === session.name);
            
            return {
                name: session.name,
                type: session.type,
                clipRange: session.clipRange,
                questionCount: session.questionCount,
                status: completed ? 'completed' : 'pending',
                completedAt: completed?.completedAt,
                score: completed?.score,
                description: generateSessionDescription(session),
                estimatedTime: estimateSessionTime(session.questionCount, session.type)
            };
        });

        res.json({
            success: true,
            data: {
                quizPoolId: quizPool._id,
                subject: quizPool.subject,
                totalSessions: schedule.length,
                completedSessions: completedSessions.length,
                schedule,
                progress: {
                    completionRate: (completedSessions.length / schedule.length) * 100,
                    nextSession: schedule.find(s => s.status === 'pending')
                }
            }
        });

    } catch (error) {
        console.error('Get quiz schedule error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve quiz schedule'
        });
    }
});

// @desc    Get quiz analytics for clip-based learning
// @route   GET /api/clip-quiz/analytics/:quizPoolId
// @access  Private
router.get('/analytics/:quizPoolId', protect, async (req, res) => {
    try {
        const quizPool = await QuizPool.findById(req.params.quizPoolId);
        if (!quizPool) {
            return res.status(404).json({
                success: false,
                message: 'Quiz pool not found'
            });
        }

        // Get all user's sessions for this quiz pool
        const sessions = await QuizSession.find({
            userId: req.user._id,
            quizPoolId: quizPool._id
        }).sort({ completedAt: 1 });

        const analytics = {
            overview: {
                totalQuestions: quizPool.questions.length,
                totalClips: quizPool.totalClips,
                coveragePercentage: quizPool.coveragePercentage,
                sessionsCompleted: sessions.filter(s => s.status === 'completed').length,
                totalSessions: quizPool.metadata.sessions.length
            },
            performance: calculatePerformanceMetrics(sessions),
            bloomProgress: analyzeBloomProgress(sessions),
            clipMastery: analyzeClipMastery(sessions, quizPool.totalClips),
            learningPath: generateLearningPath(sessions, quizPool.metadata.sessions)
        };

        res.json({
            success: true,
            data: analytics
        });

    } catch (error) {
        console.error('Get quiz analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve quiz analytics'
        });
    }
});

// Helper functions
function mapExperienceLevel(userLevel) {
    const levelMap = {
        'Complete Beginner': 'Beginner',
        'Some Experience': 'Intermediate',
        'Experienced': 'Advanced',
        'Expert': 'Advanced'
    };
    return levelMap[userLevel] || 'Beginner';
}

function formatSubjectName(subjectArea) {
    return subjectArea.charAt(0).toUpperCase() + subjectArea.slice(1).replace(/([A-Z])/g, ' $1');
}

function generateSessionSchedule(sessions, availableTimePerDay) {
    const schedule = [];
    let currentDay = 1;
    let timeUsedToday = 0;

    sessions.forEach((session, index) => {
        const estimatedTime = estimateSessionTime(session.questions?.length || session.questionCount, session.type);
        
        if (timeUsedToday + estimatedTime > availableTimePerDay && index > 0) {
            currentDay++;
            timeUsedToday = 0;
        }

        schedule.push({
            day: currentDay,
            session: session.name,
            estimatedTime,
            clipRange: session.clipRange
        });

        timeUsedToday += estimatedTime;
    });

    return schedule;
}

function getTimeLimit(sessionType) {
    const timeLimits = {
        'formative': 10, // 10 minutes
        'final': 15,     // 15 minutes
        'remediation': 15 // 15 minutes
    };
    return timeLimits[sessionType] || 10;
}

function prepareQuestionForResponse(question, questionNumber, totalQuestions, hintsEnabled) {
    return {
        _id: question._id || question.id,
        questionText: question.questionText,
        questionType: question.questionType,
        options: question.options || [],
        bloomLevel: question.bloomLevel,
        difficulty: question.difficulty,
        keypoints: question.keypoint ? [question.keypoint] : [],
        clipId: question.clipId,
        clipTitle: question.clipTitle,
        questionNumber,
        totalQuestions,
        hintsEnabled
    };
}

function generateSessionDescription(session) {
    const clipText = session.clipRange.start === session.clipRange.end 
        ? `clip ${session.clipRange.start}`
        : `clips ${session.clipRange.start}-${session.clipRange.end}`;
    
    const typeDescriptions = {
        'formative': 'Practice quiz with hints',
        'final': 'Comprehensive assessment',
        'remediation': 'Focused review'
    };

    return `${typeDescriptions[session.type]} covering ${clipText}`;
}

function estimateSessionTime(questionCount, sessionType) {
    const baseTimePerQuestion = {
        'formative': 2,    // 2 minutes per question
        'final': 1.5,      // 1.5 minutes per question  
        'remediation': 2.5 // 2.5 minutes per question
    };
    
    return Math.round(questionCount * (baseTimePerQuestion[sessionType] || 2));
}

function calculatePerformanceMetrics(sessions) {
    const completed = sessions.filter(s => s.status === 'completed');
    if (completed.length === 0) return { averageScore: 0, trend: 'neutral' };

    const scores = completed.map(s => s.score?.masteryScore || 0);
    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    // Calculate trend
    let trend = 'neutral';
    if (scores.length >= 2) {
        const recent = scores.slice(-3);
        const earlier = scores.slice(0, -3);
        if (recent.length > 0 && earlier.length > 0) {
            const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
            const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
            trend = recentAvg > earlierAvg ? 'improving' : 'declining';
        }
    }

    return {
        averageScore: Math.round(averageScore),
        totalSessions: completed.length,
        passingRate: (completed.filter(s => s.score?.passed).length / completed.length) * 100,
        trend
    };
}

function analyzeBloomProgress(sessions) {
    const bloomStats = {
        Remember: { correct: 0, total: 0 },
        Understand: { correct: 0, total: 0 },
        Apply: { correct: 0, total: 0 },
        Analyze: { correct: 0, total: 0 }
    };

    sessions.forEach(session => {
        if (session.responses) {
            session.responses.forEach(response => {
                const question = session.questionsToAsk.find(q => q._id.toString() === response.questionId.toString());
                if (question && bloomStats[question.bloomLevel]) {
                    bloomStats[question.bloomLevel].total++;
                    if (response.isCorrect) {
                        bloomStats[question.bloomLevel].correct++;
                    }
                }
            });
        }
    });

    // Convert to percentages
    Object.keys(bloomStats).forEach(level => {
        const stat = bloomStats[level];
        stat.percentage = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
    });

    return bloomStats;
}

function analyzeClipMastery(sessions, totalClips) {
    const clipStats = {};
    
    // Initialize clip stats
    for (let i = 1; i <= totalClips; i++) {
        clipStats[i] = { correct: 0, total: 0, mastery: 0 };
    }

    sessions.forEach(session => {
        if (session.responses && session.questionsToAsk) {
            session.responses.forEach(response => {
                const question = session.questionsToAsk.find(q => q._id.toString() === response.questionId.toString());
                if (question && question.clipNumber && clipStats[question.clipNumber]) {
                    clipStats[question.clipNumber].total++;
                    if (response.isCorrect) {
                        clipStats[question.clipNumber].correct++;
                    }
                }
            });
        }
    });

    // Calculate mastery percentages
    Object.keys(clipStats).forEach(clipNum => {
        const stat = clipStats[clipNum];
        stat.mastery = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
    });

    return clipStats;
}

function generateLearningPath(sessions, sessionConfigs) {
    return sessionConfigs.map(config => {
        const completed = sessions.find(s => s.sessionName === config.name && s.status === 'completed');
        
        return {
            name: config.name,
            type: config.type,
            status: completed ? 'completed' : 'pending',
            score: completed?.score?.masteryScore || null,
            clipRange: config.clipRange,
            recommendation: generateRecommendation(completed, config)
        };
    });
}

function generateRecommendation(completedSession, config) {
    if (!completedSession) return 'Start this session when ready';
    
    const score = completedSession.score?.masteryScore || 0;
    if (score >= 75) return 'Well done! Move to next session';
    if (score >= 60) return 'Good progress, consider reviewing weak areas';
    return 'Recommend reviewing clip content before retrying';
}

module.exports = router;