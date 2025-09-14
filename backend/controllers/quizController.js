// controllers/quizController.js
const { QuizSession, QuizPool } = require('../models/Quiz');
const Video = require('../models/Video');
const MicroVideo = require('../models/MicroVideo');
const quizGenerationService = require('../services/quizGenerationService');

class QuizController {

    /**
     * Start a new quiz session (intermediate or final)
     * @route POST /api/quiz/start/:videoId
     * @access Private
     */
    async startQuizSession(req, res) {
        try {
            const { videoId } = req.params;
            const { sessionType = 'intermediate' } = req.body;
            const userId = req.user._id;

            console.log(`🎯 Starting ${sessionType} quiz session for video: ${videoId}`);

            // Validate session type
            if (!['intermediate', 'final'].includes(sessionType)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid session type. Must be "intermediate" or "final".'
                });
            }

            // Check if user already has an active session for this video
            const existingSession = await QuizSession.findActiveSession(userId, videoId);
            if (existingSession) {
                return res.status(400).json({
                    success: false,
                    message: 'You already have an active quiz session for this video.',
                    data: {
                        sessionId: existingSession.sessionId,
                        sessionType: existingSession.sessionType,
                        progress: existingSession.progressPercentage
                    }
                });
            }

            // Get video and its micro-videos
            const video = await Video.findById(videoId);
            if (!video) {
                return res.status(404).json({
                    success: false,
                    message: 'Video not found.'
                });
            }

            const microVideos = await MicroVideo.find({ originalVideoId: videoId })
                .sort({ sequence: 1 });

            if (microVideos.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No micro-videos found for this video. The video may not be fully processed.'
                });
            }

            // Calculate adaptive schedule to determine which micro-videos to include
            const schedule = QuizSession.calculateQuizSchedule(microVideos.length);

            // Find the appropriate session configuration
            let sessionConfig;
            if (sessionType === 'intermediate') {
                sessionConfig = schedule.find(s => s.sessionType === 'intermediate');
                if (!sessionConfig) {
                    return res.status(400).json({
                        success: false,
                        message: 'No intermediate quiz scheduled for this video length.'
                    });
                }
            } else {
                sessionConfig = schedule.find(s => s.sessionType === 'final');
            }

            // Determine which micro-videos to include based on session type and schedule
            let includedMicroVideos;
            if (sessionType === 'intermediate') {
                // For intermediate, include micro-videos up to the scheduled point
                includedMicroVideos = microVideos.slice(0, sessionConfig.afterMicroVideo);
            } else {
                // For final, include all micro-videos
                includedMicroVideos = microVideos;
            }

            // Check if quiz pools exist for these micro-videos
            const microVideoIds = includedMicroVideos.map(mv => mv._id);
            const quizPools = await QuizPool.find({ microVideoId: { $in: microVideoIds } });

            if (quizPools.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No quiz pools found for this video. Generate quiz pools first.',
                    recommendedAction: 'Use the batch quiz pool creation endpoint to generate questions.'
                });
            }

            // Collect questions from quiz pools
            const allQuestions = [];
            quizPools.forEach(pool => {
                // Take up to 2 questions per micro-video to avoid overwhelming
                const questionsToTake = Math.min(pool.questions.length, 2);
                allQuestions.push(...pool.questions.slice(0, questionsToTake));
            });

            if (allQuestions.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No questions available in quiz pools.'
                });
            }

            // Limit total questions based on session type
            const maxQuestions = sessionType === 'intermediate' ?
                Math.min(allQuestions.length, sessionConfig.questionsCount) :
                Math.min(allQuestions.length, 10);

            const selectedQuestions = allQuestions.slice(0, maxQuestions);

            // Determine session number
            const existingSessionsCount = await QuizSession.countDocuments({
                userId,
                originalVideoId: videoId
            });

            // Create new quiz session
            const quizSession = new QuizSession({
                userId,
                originalVideoId: videoId,
                sessionType,
                sessionNumber: existingSessionsCount + 1,
                microVideoIds: microVideoIds,
                totalQuestions: selectedQuestions.length,
                questionsPerMicroVideo: Math.ceil(selectedQuestions.length / includedMicroVideos.length),
                questions: selectedQuestions,
                status: 'active'
            });

            await quizSession.save();

            console.log(`✅ Created ${sessionType} quiz session: ${quizSession.sessionId}`);

            res.status(201).json({
                success: true,
                message: `${sessionType.charAt(0).toUpperCase() + sessionType.slice(1)} quiz session started successfully`,
                data: {
                    sessionId: quizSession.sessionId,
                    sessionType: quizSession.sessionType,
                    sessionNumber: quizSession.sessionNumber,
                    totalQuestions: quizSession.totalQuestions,
                    coveredMicroVideos: includedMicroVideos.length,
                    estimatedTime: `${Math.ceil(selectedQuestions.length * 1.5)}-${selectedQuestions.length * 2} minutes`,
                    microVideos: includedMicroVideos.map(mv => ({
                        id: mv._id,
                        title: mv.title,
                        sequence: mv.sequence
                    })),
                    schedule: {
                        currentSession: sessionConfig,
                        totalScheduledSessions: schedule.length
                    }
                }
            });

        } catch (error) {
            console.error('❌ Error starting quiz session:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to start quiz session',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    /**
     * Get current quiz session information
     * @route GET /api/quiz/session/:sessionId
     * @access Private
     */
    async getQuizSession(req, res) {
        try {
            const { sessionId } = req.params;
            const userId = req.user._id;

            console.log(`📋 Getting quiz session: ${sessionId}`);

            const quizSession = await QuizSession.findOne({
                sessionId,
                userId
            }).populate('originalVideoId', 'title topic');

            if (!quizSession) {
                return res.status(404).json({
                    success: false,
                    message: 'Quiz session not found or access denied.'
                });
            }

            // Prepare response data without revealing correct answers
            const responseData = {
                sessionId: quizSession.sessionId,
                sessionType: quizSession.sessionType,
                sessionNumber: quizSession.sessionNumber,
                status: quizSession.status,
                totalQuestions: quizSession.totalQuestions,
                currentQuestionIndex: quizSession.currentQuestionIndex,
                progressPercentage: quizSession.progressPercentage,
                currentAccuracy: quizSession.currentAccuracy,
                performance: quizSession.performance,
                video: {
                    id: quizSession.originalVideoId._id,
                    title: quizSession.originalVideoId.title,
                    topic: quizSession.originalVideoId.topic
                },
                startedAt: quizSession.startedAt,
                completedAt: quizSession.completedAt
            };

            // If session is active, include current question
            if (quizSession.status === 'active' && quizSession.currentQuestionIndex < quizSession.totalQuestions) {
                const currentQuestion = quizSession.questions[quizSession.currentQuestionIndex];
                const userAnswer = quizSession.userAnswers.find(a => a.questionId === currentQuestion.questionId);

                responseData.currentQuestion = {
                    questionId: currentQuestion.questionId,
                    question: currentQuestion.question,
                    options: currentQuestion.options,
                    difficulty: currentQuestion.difficulty,
                    keyPoint: currentQuestion.keyPoint,
                    attempts: userAnswer ? userAnswer.retryAttempts + 1 : 0,
                    maxAttempts: 2, // Original attempt + 1 retry
                    canRetry: userAnswer ? (userAnswer.retryAttempts < 1 && !userAnswer.isCorrect) : true,
                    questionNumber: quizSession.currentQuestionIndex + 1
                };
            }

            // If session is completed, include results summary
            if (quizSession.status === 'completed') {
                responseData.results = {
                    finalScore: Math.round((quizSession.performance.correctAnswers / quizSession.performance.totalAnswers) * 100),
                    accuracy: quizSession.performance.accuracy,
                    totalTime: quizSession.performance.totalTimeSpent,
                    hintsUsed: quizSession.performance.hintsUsed,
                    retryAttempts: quizSession.performance.retryAttempts,
                    masteryScore: quizSession.masteryScore?.totalScore || 0
                };
            }

            res.json({
                success: true,
                data: responseData
            });

        } catch (error) {
            console.error('❌ Error getting quiz session:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get quiz session',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    /**
     * Get current question for active quiz session
     * @route GET /api/quiz/session/:sessionId/current-question
     * @access Private
     */
    async getCurrentQuestion(req, res) {
        try {
            const { sessionId } = req.params;
            const userId = req.user._id;

            console.log(`❓ Getting current question for session: ${sessionId}`);

            const quizSession = await QuizSession.findOne({ sessionId, userId });

            if (!quizSession) {
                return res.status(404).json({
                    success: false,
                    message: 'Quiz session not found or access denied.'
                });
            }

            if (quizSession.status !== 'active') {
                return res.status(400).json({
                    success: false,
                    message: 'Quiz session is not active.',
                    sessionStatus: quizSession.status
                });
            }

            if (quizSession.currentQuestionIndex >= quizSession.totalQuestions) {
                return res.status(400).json({
                    success: false,
                    message: 'No more questions available. Quiz session should be completed.'
                });
            }

            const currentQuestion = quizSession.questions[quizSession.currentQuestionIndex];
            const userAnswer = quizSession.userAnswers.find(a => a.questionId === currentQuestion.questionId);

            res.json({
                success: true,
                data: {
                    questionId: currentQuestion.questionId,
                    question: currentQuestion.question,
                    options: currentQuestion.options,
                    difficulty: currentQuestion.difficulty,
                    keyPoint: currentQuestion.keyPoint,
                    questionType: currentQuestion.questionType,
                    cognitiveLoad: currentQuestion.cognitiveLoad,
                    questionNumber: quizSession.currentQuestionIndex + 1,
                    totalQuestions: quizSession.totalQuestions,
                    attempts: userAnswer ? userAnswer.retryAttempts + 1 : 0,
                    maxAttempts: 2,
                    canRetry: userAnswer ? (userAnswer.retryAttempts < 1 && !userAnswer.isCorrect) : true,
                    timeEstimate: '60-90 seconds',
                    sessionInfo: {
                        sessionType: quizSession.sessionType,
                        progressPercentage: quizSession.progressPercentage,
                        currentAccuracy: quizSession.currentAccuracy
                    }
                }
            });

        } catch (error) {
            console.error('❌ Error getting current question:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get current question',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    /**
     * Submit answer to current quiz question with retry logic
     * @route POST /api/quiz/session/:sessionId/answer
     * @access Private
     */
    async submitAnswer(req, res) {
        try {
            const { sessionId } = req.params;
            const { questionId, answer, timeSpent = 0 } = req.body;
            const userId = req.user._id;

            console.log(`📝 Submitting answer for session: ${sessionId}, question: ${questionId}`);

            // Find the quiz session
            const quizSession = await QuizSession.findOne({ sessionId, userId });

            if (!quizSession) {
                return res.status(404).json({
                    success: false,
                    message: 'Quiz session not found or access denied.'
                });
            }

            if (quizSession.status !== 'active') {
                return res.status(400).json({
                    success: false,
                    message: 'Quiz session is not active.',
                    sessionStatus: quizSession.status
                });
            }

            // Get current question
            if (quizSession.currentQuestionIndex >= quizSession.totalQuestions) {
                return res.status(400).json({
                    success: false,
                    message: 'No more questions available. Quiz session should be completed.'
                });
            }

            const currentQuestion = quizSession.questions[quizSession.currentQuestionIndex];

            // Validate question ID matches current question
            if (currentQuestion.questionId !== questionId) {
                return res.status(400).json({
                    success: false,
                    message: 'Question ID does not match current question.'
                });
            }

            // Check if user has already answered this question
            let existingAnswer = quizSession.userAnswers.find(a => a.questionId === questionId);

            // If answer exists and user has already used their retry, reject
            if (existingAnswer && existingAnswer.retryAttempts >= 1) {
                return res.status(400).json({
                    success: false,
                    message: 'You have already used your retry attempt for this question.'
                });
            }

            // Check if answer is correct
            const isCorrect = currentQuestion.correctAnswer === answer;
            const attemptNumber = existingAnswer ? existingAnswer.retryAttempts + 2 : 1;

            // Create or update user answer
            if (!existingAnswer) {
                // First attempt
                quizSession.userAnswers.push({
                    questionId: questionId,
                    selectedAnswer: answer,
                    isCorrect: isCorrect,
                    retryAttempts: 0,
                    timeSpent: timeSpent,
                    submittedAt: new Date()
                });
            } else {
                // Retry attempt
                existingAnswer.selectedAnswer = answer;
                existingAnswer.isCorrect = isCorrect;
                existingAnswer.retryAttempts = 1;
                existingAnswer.timeSpent += timeSpent;
                existingAnswer.submittedAt = new Date();
            }

            // Update session performance metrics
            quizSession.performance.totalAnswers = Math.max(quizSession.performance.totalAnswers, quizSession.userAnswers.length);
            quizSession.performance.correctAnswers = quizSession.userAnswers.filter(a => a.isCorrect).length;
            quizSession.performance.totalTimeSpent += timeSpent;

            // Calculate accuracy
            quizSession.currentAccuracy = Math.round((quizSession.performance.correctAnswers / quizSession.performance.totalAnswers) * 100);

            // Prepare response data
            let responseData = {
                correct: isCorrect,
                attemptNumber: attemptNumber,
                maxAttempts: 2,
                canRetry: !isCorrect && attemptNumber < 2,
                questionId: questionId,
                submittedAnswer: answer,
                correctAnswer: currentQuestion.correctAnswer,
                explanation: currentQuestion.explanation || this._generateExplanation(currentQuestion, isCorrect),
                currentAccuracy: quizSession.currentAccuracy,
                performance: {
                    correctAnswers: quizSession.performance.correctAnswers,
                    totalAnswers: quizSession.performance.totalAnswers,
                    accuracy: quizSession.currentAccuracy
                }
            };

            // Add hint for wrong answers (first attempt only)
            if (!isCorrect && attemptNumber === 1) {
                responseData.hint = this._generateHint(currentQuestion);
                quizSession.performance.hintsUsed += 1;
            }

            // If this is the final attempt or correct answer, move to next question
            let moveToNextQuestion = isCorrect || attemptNumber >= 2;

            if (moveToNextQuestion) {
                // Move to next question
                quizSession.currentQuestionIndex += 1;
                quizSession.progressPercentage = Math.round((quizSession.currentQuestionIndex / quizSession.totalQuestions) * 100);

                responseData.moveToNext = true;
                responseData.progress = {
                    currentQuestion: quizSession.currentQuestionIndex + 1,
                    totalQuestions: quizSession.totalQuestions,
                    progressPercentage: quizSession.progressPercentage
                };

                // Check if quiz is complete
                if (quizSession.currentQuestionIndex >= quizSession.totalQuestions) {
                    quizSession.status = 'completed';
                    quizSession.completedAt = new Date();

                    // Calculate final performance metrics
                    quizSession.performance.accuracy = quizSession.currentAccuracy;
                    quizSession.performance.retryAttempts = quizSession.userAnswers.reduce((total, answer) => total + answer.retryAttempts, 0);

                    responseData.sessionComplete = true;
                    responseData.finalResults = {
                        finalScore: quizSession.currentAccuracy,
                        totalQuestions: quizSession.totalQuestions,
                        correctAnswers: quizSession.performance.correctAnswers,
                        totalTime: Math.round(quizSession.performance.totalTimeSpent / 60), // in minutes
                        hintsUsed: quizSession.performance.hintsUsed,
                        retryAttempts: quizSession.performance.retryAttempts
                    };
                }
            }

            // Update retry attempts tracking
            if (!isCorrect && attemptNumber > 1) {
                quizSession.performance.retryAttempts += 1;
            }

            // Save the updated session
            await quizSession.save();

            console.log(`✅ Answer submitted: ${isCorrect ? 'Correct' : 'Incorrect'} (Attempt ${attemptNumber}/2)`);

            res.json({
                success: true,
                message: `Answer ${isCorrect ? 'correct' : 'incorrect'}. ${moveToNextQuestion ? 'Moving to next question.' : 'You can retry once.'}`,
                data: responseData
            });

        } catch (error) {
            console.error('❌ Error submitting answer:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to submit answer',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    /**
     * Generate helpful hint for wrong answers
     * @private
     */
    _generateHint(question) {
        // Generate contextual hints based on question content and key points
        const keyPoint = question.keyPoint?.toLowerCase() || '';
        const questionText = question.question.toLowerCase();

        // Common programming concept hints
        if (keyPoint.includes('variable') || questionText.includes('variable')) {
            return 'Think about how variables are declared and their scope. Consider the differences between let, const, and var.';
        }
        if (keyPoint.includes('function') || questionText.includes('function')) {
            return 'Consider the function syntax and how parameters are passed. Think about return values and function scope.';
        }
        if (keyPoint.includes('loop') || questionText.includes('loop')) {
            return 'Think about the loop structure and conditions. Consider what happens in each iteration.';
        }
        if (keyPoint.includes('array') || questionText.includes('array')) {
            return 'Consider array methods and indexing. Think about how data is accessed and modified in arrays.';
        }
        if (keyPoint.includes('object') || questionText.includes('object')) {
            return 'Think about object properties and methods. Consider dot notation vs bracket notation.';
        }

        // Generic hint based on question difficulty
        if (question.difficulty === 'Advanced') {
            return 'This is an advanced concept. Think about the underlying principles and edge cases.';
        }

        // Default hint
        return 'Review the key concept mentioned in the question. Consider the specific context and requirements.';
    }

    /**
     * Generate explanation for answer
     * @private
     */
    _generateExplanation(question, isCorrect) {
        if (question.explanation) {
            return question.explanation;
        }

        // Generate basic explanation
        const correctOption = question.options[question.correctAnswer];

        if (isCorrect) {
            return `Correct! ${correctOption} is the right answer because it directly relates to ${question.keyPoint}.`;
        } else {
            return `The correct answer is ${question.correctAnswer}: "${correctOption}". This is because ${question.keyPoint} is a fundamental concept that requires understanding of the underlying principles.`;
        }
    }
}

module.exports = new QuizController();