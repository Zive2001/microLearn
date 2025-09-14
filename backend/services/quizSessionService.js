// services/quizSessionService.js
const mongoose = require('mongoose');
const { QuizPool, QuizSession, UserQuizProgress } = require('../models/Quiz');

class QuizSessionService {
    
    /**
     * Start a new quiz session for a user
     * @param {ObjectId} userId - User ID
     * @param {string} topic - Topic name
     * @param {string} sessionType - Type of session (formative, final, simplified, remediation)
     * @param {Object} config - Session configuration
     * @returns {Object} Session data with first question
     */
    async startQuizSession(userId, topic, sessionType = 'formative', config = {}) {
        try {
            // Get user's experience level
            const User = require('../models/User');
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }
            
            const userLevel = this.mapExperienceLevel(user.profile?.experienceLevel || 'Complete Beginner');
            
            // Find appropriate quiz pool
            const quizPool = await QuizPool.findActivePool(topic, userLevel);
            if (!quizPool) {
                throw new Error(`Quiz pool not found for topic: ${topic}, level: ${userLevel}`);
            }
            
            // Calculate session parameters
            const totalClips = config.totalClips || quizPool.totalClips || 9;
            const questionsPerSession = config.questionsPerSession || 5;
            const totalSessions = Math.ceil(totalClips / 3); // Every 3 clips = 1 session
            
            // Get or create user progress
            let userProgress = await UserQuizProgress.findOne({ userId });
            if (!userProgress) {
                userProgress = new UserQuizProgress({ userId });
                await userProgress.save();
            }
            
            // Find current topic progress
            let topicProgress = userProgress.topicProgress.find(tp => tp.topic === topic);
            if (!topicProgress) {
                topicProgress = {
                    topic,
                    totalSessions,
                    completedSessions: 0,
                    averageMasteryScore: 0,
                    finalQuizCompleted: false,
                    finalMasteryScore: 0,
                    needsRemediation: false,
                    sessionHistory: []
                };
                userProgress.topicProgress.push(topicProgress);
                await userProgress.save();
            }
            
            // Determine session number
            let sessionNumber;
            if (sessionType === 'final') {
                sessionNumber = totalSessions + 1;
            } else if (sessionType === 'simplified' || sessionType === 'remediation') {
                sessionNumber = topicProgress.completedSessions + 1;
            } else {
                sessionNumber = topicProgress.completedSessions + 1;
            }
            
            // Select questions for this session
            const selectedQuestions = await this.selectQuestionsForSession(
                quizPool, 
                sessionType, 
                sessionNumber, 
                questionsPerSession,
                topicProgress
            );
            
            // Create quiz session
            const quizSession = new QuizSession({
                userId,
                quizPoolId: quizPool._id,
                sessionType,
                sessionNumber,
                totalSessions,
                questionsToAsk: selectedQuestions.map((q, index) => ({
                    questionId: q._id,
                    order: index + 1
                })),
                timeLimit: config.timeLimit || (sessionType === 'final' ? 15 : 10),
                hintsEnabled: sessionType !== 'final',
                status: 'in_progress',
                startedAt: new Date(),
                currentQuestionIndex: 0
            });
            
            await quizSession.save();
            
            // Get first question
            const firstQuestion = await this.getCurrentQuestion(quizSession._id);
            
            return {
                session: {
                    _id: quizSession._id,
                    sessionType: quizSession.sessionType,
                    sessionNumber: quizSession.sessionNumber,
                    totalSessions: quizSession.totalSessions,
                    totalQuestions: quizSession.questionsToAsk.length,
                    timeLimit: quizSession.timeLimit,
                    hintsEnabled: quizSession.hintsEnabled,
                    status: quizSession.status
                },
                currentQuestion: firstQuestion,
                quizPool: {
                    topic: quizPool.topic,
                    subject: quizPool.subject,
                    userLevel: quizPool.userLevel,
                    coveragePercentage: quizPool.coveragePercentage
                }
            };
            
        } catch (error) {
            console.error('Error starting quiz session:', error);
            throw error;
        }
    }
    
    /**
     * Get the current question for a quiz session
     * @param {ObjectId} sessionId - Session ID
     * @returns {Object} Current question data
     */
    async getCurrentQuestion(sessionId) {
        try {
            const session = await QuizSession.findById(sessionId).populate('quizPoolId');
            if (!session) {
                throw new Error('Quiz session not found');
            }
            
            if (session.status !== 'in_progress') {
                throw new Error('Quiz session is not in progress');
            }
            
            if (session.currentQuestionIndex >= session.questionsToAsk.length) {
                throw new Error('No more questions in session');
            }
            
            const currentQuestionRef = session.questionsToAsk[session.currentQuestionIndex];
            const question = session.quizPoolId.questions.id(currentQuestionRef.questionId);
            
            if (!question) {
                throw new Error('Question not found in quiz pool');
            }
            
            // Return question without showing correct answer
            return {
                _id: question._id,
                questionText: question.questionText,
                questionType: question.questionType,
                options: question.options.map(opt => ({
                    text: opt.text,
                    _id: opt._id
                })),
                bloomLevel: question.bloomLevel,
                difficulty: question.difficulty,
                keypoints: question.keypoints,
                clipId: question.clipId,
                timeRelevance: question.timeRelevance,
                questionNumber: session.currentQuestionIndex + 1,
                totalQuestions: session.questionsToAsk.length,
                hintsEnabled: session.hintsEnabled && question.hint
            };
            
        } catch (error) {
            console.error('Error getting current question:', error);
            throw error;
        }
    }
    
    /**
     * Submit an answer for the current question
     * @param {ObjectId} sessionId - Session ID
     * @param {ObjectId} userId - User ID
     * @param {Object} answerData - Answer submission data
     * @returns {Object} Answer result
     */
    async submitAnswer(sessionId, userId, answerData) {
        try {
            const { answer, hintUsed = false, timeSpent = 0 } = answerData;
            
            const session = await QuizSession.findOne({ _id: sessionId, userId }).populate('quizPoolId');
            if (!session) {
                throw new Error('Quiz session not found or not authorized');
            }
            
            if (session.status !== 'in_progress') {
                throw new Error('Quiz session is not in progress');
            }
            
            if (session.currentQuestionIndex >= session.questionsToAsk.length) {
                throw new Error('No more questions in session');
            }
            
            // Get current question
            const currentQuestionRef = session.questionsToAsk[session.currentQuestionIndex];
            const question = session.quizPoolId.questions.id(currentQuestionRef.questionId);
            
            // Check if answer is correct
            let isCorrect = false;
            if (question.questionType === 'mcq' || question.questionType === 'true_false') {
                const selectedOption = question.options.find(opt => opt.text === answer);
                isCorrect = selectedOption ? selectedOption.isCorrect : false;
            } else if (question.questionType === 'short_answer') {
                isCorrect = this.compareShortAnswer(answer, question.correctAnswer);
            }
            
            // Check if this question was already answered
            let existingResponse = session.responses.find(r => 
                r.questionId.toString() === question._id.toString()
            );
            
            if (existingResponse) {
                // Add to attempt history
                existingResponse.attemptHistory.push({
                    answer,
                    timestamp: new Date(),
                    correct: isCorrect
                });
                existingResponse.userAnswer = answer;
                existingResponse.isCorrect = isCorrect;
                existingResponse.timeSpent += timeSpent;
                existingResponse.hintUsed = existingResponse.hintUsed || hintUsed;
                existingResponse.answeredAt = new Date();
            } else {
                // Create new response
                const response = {
                    questionId: question._id,
                    userAnswer: answer,
                    isCorrect,
                    timeSpent,
                    hintUsed,
                    attemptHistory: [{
                        answer,
                        timestamp: new Date(),
                        correct: isCorrect
                    }],
                    answeredAt: new Date()
                };
                session.responses.push(response);
            }
            
            // Move to next question
            session.currentQuestionIndex += 1;
            
            // Check if session is complete
            if (session.currentQuestionIndex >= session.questionsToAsk.length) {
                session.status = 'completed';
                session.completedAt = new Date();
                session.calculateMasteryScore();
                
                // Update user progress
                await this.updateUserProgress(userId, session);
            }
            
            await session.save();
            
            // Get next question if available
            let nextQuestion = null;
            if (session.currentQuestionIndex < session.questionsToAsk.length) {
                nextQuestion = await this.getCurrentQuestion(sessionId);
            }
            
            return {
                isCorrect,
                correctAnswer: question.questionType !== 'short_answer' ? 
                    question.options.find(opt => opt.isCorrect)?.text : question.correctAnswer,
                explanation: question.explanation,
                sessionComplete: session.status === 'completed',
                masteryScore: session.status === 'completed' ? session.score.masteryScore : null,
                nextQuestion,
                progress: {
                    currentQuestion: session.currentQuestionIndex,
                    totalQuestions: session.questionsToAsk.length,
                    completionPercentage: session.completionPercentage
                }
            };
            
        } catch (error) {
            console.error('Error submitting answer:', error);
            throw error;
        }
    }
    
    /**
     * Get hint for current question
     * @param {ObjectId} sessionId - Session ID
     * @param {ObjectId} userId - User ID
     * @returns {string} Hint text
     */
    async getHint(sessionId, userId) {
        try {
            const session = await QuizSession.findOne({ _id: sessionId, userId }).populate('quizPoolId');
            if (!session) {
                throw new Error('Quiz session not found or not authorized');
            }
            
            if (!session.hintsEnabled) {
                throw new Error('Hints not available for this session type');
            }
            
            if (session.status !== 'in_progress') {
                throw new Error('Session is not in progress');
            }
            
            const currentQuestionRef = session.questionsToAsk[session.currentQuestionIndex];
            const question = session.quizPoolId.questions.id(currentQuestionRef.questionId);
            
            if (!question.hint) {
                throw new Error('No hint available for this question');
            }
            
            return question.hint;
            
        } catch (error) {
            console.error('Error getting hint:', error);
            throw error;
        }
    }
    
    /**
     * Complete a quiz session manually
     * @param {ObjectId} sessionId - Session ID
     * @param {ObjectId} userId - User ID
     * @returns {Object} Completion result
     */
    async completeSession(sessionId, userId) {
        try {
            const session = await QuizSession.findOne({ _id: sessionId, userId });
            if (!session) {
                throw new Error('Quiz session not found or not authorized');
            }
            
            if (session.status === 'completed') {
                throw new Error('Session already completed');
            }
            
            session.status = 'completed';
            session.completedAt = new Date();
            session.calculateMasteryScore();
            
            await session.save();
            
            // Update user progress
            await this.updateUserProgress(userId, session);
            
            return {
                sessionId: session._id,
                masteryScore: session.score.masteryScore,
                passed: session.hasPassed(),
                completedQuestions: session.responses.length,
                totalQuestions: session.questionsToAsk.length,
                completedAt: session.completedAt
            };
            
        } catch (error) {
            console.error('Error completing session:', error);
            throw error;
        }
    }
    
    /**
     * Select questions for a quiz session based on type and user performance
     * @param {Object} quizPool - Quiz pool document
     * @param {string} sessionType - Session type
     * @param {number} sessionNumber - Session number
     * @param {number} questionsPerSession - Questions per session
     * @param {Object} topicProgress - User's progress in topic
     * @returns {Array} Selected questions
     */
    async selectQuestionsForSession(quizPool, sessionType, sessionNumber, questionsPerSession, topicProgress) {
        try {
            let selectedQuestions = [];
            
            if (sessionType === 'final') {
                // Final quiz: Mix of questions, prioritize previously incorrect
                const allQuestions = [...quizPool.questions];
                
                // TODO: Implement logic to prioritize previously incorrect questions
                // For now, select a mix across all Bloom levels
                const bloomLevels = ['Remember', 'Understand', 'Apply', 'Analyze'];
                const questionsPerLevel = Math.ceil(10 / bloomLevels.length);
                
                bloomLevels.forEach(level => {
                    const levelQuestions = allQuestions.filter(q => q.bloomLevel === level);
                    const selected = levelQuestions.slice(0, questionsPerLevel);
                    selectedQuestions.push(...selected);
                });
                
                selectedQuestions = selectedQuestions.slice(0, 10);
                
            } else if (sessionType === 'simplified') {
                // Simplified quiz: Easier questions with better hints
                selectedQuestions = quizPool.questions
                    .filter(q => q.difficulty === 'easy' && q.hint)
                    .slice(0, questionsPerSession);
                    
            } else if (sessionType === 'remediation') {
                // Remediation: Focus on weak areas
                // TODO: Implement logic based on user's weak Bloom levels
                selectedQuestions = quizPool.questions
                    .filter(q => q.bloomLevel === 'Remember' || q.bloomLevel === 'Understand')
                    .slice(0, questionsPerSession);
                    
            } else {
                // Formative quiz: Progressive difficulty based on session number
                const clipStart = (sessionNumber - 1) * 3;
                const clipEnd = Math.min(clipStart + 3, quizPool.totalClips);
                
                // Get questions from relevant clips
                const relevantQuestions = quizPool.questions.filter(q => {
                    const clipNum = parseInt(q.clipId.replace('clip_', ''));
                    return clipNum >= clipStart + 1 && clipNum <= clipEnd;
                });
                
                // Select mix of questions with appropriate Bloom level progression
                const sessionBloomFocus = this.getBloomLevelForSession(sessionNumber);
                selectedQuestions = relevantQuestions
                    .filter(q => sessionBloomFocus.includes(q.bloomLevel))
                    .slice(0, questionsPerSession);
                
                // Fill remaining slots if needed
                if (selectedQuestions.length < questionsPerSession) {
                    const remaining = quizPool.questions
                        .filter(q => !selectedQuestions.includes(q))
                        .slice(0, questionsPerSession - selectedQuestions.length);
                    selectedQuestions.push(...remaining);
                }
            }
            
            return selectedQuestions;
            
        } catch (error) {
            console.error('Error selecting questions for session:', error);
            throw error;
        }
    }
    
    /**
     * Update user progress after completing a session
     * @param {ObjectId} userId - User ID
     * @param {Object} session - Completed session
     */
    async updateUserProgress(userId, session) {
        try {
            const quizPool = await QuizPool.findById(session.quizPoolId);
            const topic = quizPool.topic;
            
            const userProgress = await UserQuizProgress.findOne({ userId });
            const topicProgress = userProgress.topicProgress.find(tp => tp.topic === topic);
            
            if (topicProgress) {
                topicProgress.completedSessions += 1;
                topicProgress.lastSessionDate = new Date();
                
                // Add to session history
                topicProgress.sessionHistory.push({
                    sessionId: session._id,
                    sessionType: session.sessionType,
                    masteryScore: session.score.masteryScore,
                    completedAt: session.completedAt
                });
                
                // Update average mastery score
                const scores = topicProgress.sessionHistory.map(s => s.masteryScore);
                topicProgress.averageMasteryScore = Math.round(
                    scores.reduce((sum, score) => sum + score, 0) / scores.length
                );
                
                // Check if final quiz
                if (session.sessionType === 'final') {
                    topicProgress.finalQuizCompleted = true;
                    topicProgress.finalMasteryScore = session.score.masteryScore;
                    topicProgress.needsRemediation = !session.hasPassed();
                } else {
                    // Check if user needs remediation
                    topicProgress.needsRemediation = session.score.masteryScore < 75;
                }
            }
            
            // Update overall stats
            userProgress.overallStats.totalQuizzesCompleted += 1;
            const allScores = [];
            userProgress.topicProgress.forEach(tp => {
                allScores.push(...tp.sessionHistory.map(s => s.masteryScore));
            });
            
            if (allScores.length > 0) {
                userProgress.overallStats.averageScore = Math.round(
                    allScores.reduce((sum, score) => sum + score, 0) / allScores.length
                );
            }
            
            await userProgress.save();
            
        } catch (error) {
            console.error('Error updating user progress:', error);
            throw error;
        }
    }
    
    /**
     * Map experience level to quiz difficulty
     */
    mapExperienceLevel(experienceLevel) {
        const mapping = {
            'Complete Beginner': 'Beginner',
            'Some Experience': 'Beginner',
            'Intermediate': 'Intermediate',
            'Advanced': 'Advanced'
        };
        return mapping[experienceLevel] || 'Beginner';
    }
    
    /**
     * Compare short answer with correct answer (basic implementation)
     */
    compareShortAnswer(userAnswer, correctAnswer) {
        const normalize = (str) => str.toLowerCase().trim().replace(/[^\w\s]/g, '');
        return normalize(userAnswer) === normalize(correctAnswer);
    }
    
    /**
     * Get appropriate Bloom levels for a session number
     */
    getBloomLevelForSession(sessionNumber) {
        if (sessionNumber <= 1) return ['Remember', 'Understand'];
        if (sessionNumber <= 2) return ['Understand', 'Apply'];
        return ['Apply', 'Analyze'];
    }
}

module.exports = new QuizSessionService();