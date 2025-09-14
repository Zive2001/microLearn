// services/dynamicQuizService.js
require('dotenv').config();
const mongoose = require('mongoose');
const openaiService = require('./openaiService');
const { QuizSession, UserQuizProgress } = require('../models/Quiz');
const User = require('../models/User');

class DynamicQuizService {
    constructor() {
        this.bloomLevels = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];
        this.difficultyProgression = {
            'Beginner': ['easy', 'easy', 'medium'],
            'Intermediate': ['medium', 'medium', 'hard'], 
            'Advanced': ['hard', 'hard', 'hard']
        };
    }

    /**
     * Start a dynamic quiz session using AI-generated questions
     */
    async startDynamicQuizSession(userId, topic, sessionType = 'formative', config = {}) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Determine user's level for this topic
            const userLevel = this.determineUserLevel(user, topic);
            console.log('Determined userLevel:', userLevel, 'for user:', user.email);

            // Validate userLevel exists in difficultyProgression
            if (!this.difficultyProgression[userLevel]) {
                console.error('Invalid userLevel:', userLevel, 'Available levels:', Object.keys(this.difficultyProgression));
                throw new Error(`Invalid user level: ${userLevel}. Expected one of: ${Object.keys(this.difficultyProgression).join(', ')}`);
            }

            // Get session configuration
            const sessionConfig = {
                questionsPerSession: config.questionsPerSession || 5,
                timeLimit: config.timeLimit || 10, // minutes
                hintsEnabled: config.hintsEnabled !== false,
                adaptiveDifficulty: config.adaptiveDifficulty !== false,
                bloomProgression: config.bloomProgression !== false
            };

            // Create placeholder questions array for dynamic sessions
            const placeholderQuestions = [];
            for (let i = 0; i < sessionConfig.questionsPerSession; i++) {
                placeholderQuestions.push({
                    questionId: new mongoose.Types.ObjectId(), // Placeholder ID
                    order: i + 1
                });
            }

            // Create quiz session
            const session = new QuizSession({
                userId,
                quizPoolId: null, // Dynamic session doesn't use quiz pools
                sessionType,
                sessionNumber: await this.getNextSessionNumber(userId, topic),
                totalSessions: this.calculateTotalSessions(sessionType),
                questionsToAsk: placeholderQuestions, // Placeholder for proper completion calculation
                timeLimit: sessionConfig.timeLimit,
                hintsEnabled: sessionConfig.hintsEnabled,
                status: 'in_progress',
                startedAt: new Date(),
                sessionMode: 'dynamic_ai', // Mark as AI-powered session
                // Store dynamic config in session
                dynamicConfig: {
                    topic,
                    userLevel,
                    ...sessionConfig,
                    currentBloomLevel: this.bloomLevels[0], // Start with Remember
                    currentDifficulty: this.difficultyProgression[userLevel][0]
                }
            });

            await session.save();

            // Generate first question
            let firstQuestion;
            try {
                console.log('Generating first question for session:', session._id);
                firstQuestion = await this.generateNextQuestion(session);
                console.log('First question generated successfully');
            } catch (error) {
                console.error('Failed to generate first question:', error.message);
                // Delete the session if first question generation fails
                await QuizSession.findByIdAndDelete(session._id);
                throw new Error(`Failed to generate first question: ${error.message}`);
            }
            
            return {
                sessionId: session._id,
                sessionType: session.sessionType,
                sessionNumber: session.sessionNumber,
                totalSessions: session.totalSessions,
                status: session.status,
                config: sessionConfig,
                currentQuestion: firstQuestion,
                topic: topic,
                userLevel: userLevel,
                questionsTotal: sessionConfig.questionsPerSession,
                questionsAnswered: 0,
                timeLimit: sessionConfig.timeLimit,
                hintsEnabled: sessionConfig.hintsEnabled
            };

        } catch (error) {
            console.error('Error starting dynamic quiz session:', error);
            throw new Error(`Failed to start quiz session: ${error.message}`);
        }
    }

    /**
     * Generate next question based on session progress and user performance
     */
    async generateNextQuestion(session) {
        try {
            const { topic, userLevel, currentBloomLevel, currentDifficulty, adaptiveDifficulty, bloomProgression } = session.dynamicConfig;
            
            // Get previous questions to avoid repetition
            const previousQuestions = session.responses.map(response => ({
                question: response.questionText || 'Previous question'
            }));
            
            // Determine difficulty for next question
            let nextDifficulty = currentDifficulty;
            if (adaptiveDifficulty && session.responses.length > 0) {
                nextDifficulty = this.adaptDifficulty(session.responses, currentDifficulty);
            }

            // Determine Bloom level for next question
            let nextBloomLevel = currentBloomLevel;
            if (bloomProgression && session.responses.length > 0) {
                nextBloomLevel = this.progressBloomLevel(session.responses, currentBloomLevel);
            }

            // Generate question using OpenAI
            console.log(`Calling OpenAI for topic: ${topic}, difficulty: ${nextDifficulty}`);
            const questionData = await openaiService.generateQuestion(
                topic, 
                nextDifficulty, 
                previousQuestions
            );
            console.log('OpenAI question generated successfully');

            // Validate the generated question
            if (!questionData || !questionData.question || !questionData.options) {
                throw new Error('Invalid question data received from OpenAI');
            }

            // Convert to our internal format and add metadata
            const question = {
                id: `dynamic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                questionText: questionData.question,
                questionType: 'mcq',
                options: [
                    { text: questionData.options.A, isCorrect: questionData.correctAnswer === 'A' },
                    { text: questionData.options.B, isCorrect: questionData.correctAnswer === 'B' },
                    { text: questionData.options.C, isCorrect: questionData.correctAnswer === 'C' },
                    { text: questionData.options.D, isCorrect: questionData.correctAnswer === 'D' }
                ],
                correctAnswer: questionData.options[questionData.correctAnswer],
                explanation: questionData.explanation,
                difficulty: nextDifficulty,
                bloomLevel: nextBloomLevel,
                topic: topic,
                clipId: `dynamic_${topic}_clip`, // Virtual clip ID for dynamic questions
                hint: this.generateHint(questionData),
                estimatedTime: questionData.estimatedTime || 60,
                generatedAt: new Date(),
                aiGenerated: true
            };

            // Update session with current question info
            session.dynamicConfig.currentDifficulty = nextDifficulty;
            session.dynamicConfig.currentBloomLevel = nextBloomLevel;
            session.dynamicConfig.currentQuestion = question;
            await session.save();

            return question;

        } catch (error) {
            console.error('Error generating next question:', error);
            throw new Error(`Failed to generate question: ${error.message}`);
        }
    }

    /**
     * Submit answer and generate next question if needed
     */
    async submitDynamicAnswer(sessionId, userId, answerData) {
        try {
            const session = await QuizSession.findOne({
                _id: sessionId,
                userId: userId
            });

            if (!session) {
                throw new Error('Quiz session not found or not authorized');
            }

            if (session.status !== 'in_progress') {
                throw new Error('Quiz session is not in progress');
            }

            const currentQuestion = session.dynamicConfig.currentQuestion;
            if (!currentQuestion) {
                throw new Error('No current question found');
            }

            // Evaluate answer - compare option keys (A, B, C, D)
            const userAnswerKey = answerData.answer.toUpperCase();
            const correctAnswerKey = this.findCorrectOptionKey(currentQuestion.options);
            const isCorrect = userAnswerKey === correctAnswerKey;
            
            // Create response record
            const response = {
                questionId: currentQuestion.id,
                questionText: currentQuestion.questionText,
                userAnswer: answerData.answer,
                isCorrect: isCorrect,
                timeSpent: answerData.timeSpent || 0,
                hintUsed: answerData.hintUsed || false,
                attemptHistory: [{
                    answer: answerData.answer,
                    timestamp: new Date(),
                    correct: isCorrect
                }],
                answeredAt: new Date(),
                // Store AI question data
                aiQuestionData: {
                    difficulty: currentQuestion.difficulty,
                    bloomLevel: currentQuestion.bloomLevel,
                    estimatedTime: currentQuestion.estimatedTime,
                    explanation: currentQuestion.explanation
                }
            };

            // Add response to session
            session.responses.push(response);
            session.currentQuestionIndex = session.responses.length;

            // Calculate current score
            const masteryScore = this.calculateDynamicMasteryScore(session.responses);
            session.score.masteryScore = masteryScore;

            // Check if session is complete
            const questionsPerSession = session.dynamicConfig.questionsPerSession;
            const isComplete = session.responses.length >= questionsPerSession;

            // Save session with response before generating next question
            await session.save();

            let nextQuestion = null;
            if (!isComplete) {
                // Generate next question after saving the current response
                try {
                    console.log('Attempting to generate next question...');
                    nextQuestion = await this.generateNextQuestion(session);
                    console.log('Next question generated successfully');
                } catch (error) {
                    console.error('Error generating next question:', error.message);
                    throw new Error(`Failed to generate next question: ${error.message}`);
                }
            } else {
                // Complete the session
                session.status = 'completed';
                session.completedAt = new Date();
                
                // Update user progress
                await this.updateUserProgress(userId, session.dynamicConfig.topic, session);
                
                // Save completed session
                await session.save();
            }

            return {
                isCorrect,
                correctAnswer: correctAnswerKey,
                correctAnswerText: currentQuestion.options.find(opt => opt.isCorrect)?.text || currentQuestion.correctAnswer,
                explanation: currentQuestion.explanation,
                masteryScore: masteryScore,
                sessionProgress: {
                    currentQuestionIndex: session.currentQuestionIndex,
                    totalQuestions: questionsPerSession,
                    completionPercentage: Math.round((session.responses.length / questionsPerSession) * 100)
                },
                nextQuestion: nextQuestion,
                sessionComplete: isComplete,
                sessionId: sessionId,
                aiInsights: {
                    difficulty: currentQuestion.difficulty,
                    bloomLevel: currentQuestion.bloomLevel,
                    adaptiveAdjustment: this.getAdaptiveInsights(session.responses)
                }
            };

        } catch (error) {
            console.error('Error submitting dynamic answer:', error);
            throw new Error(`Failed to submit answer: ${error.message}`);
        }
    }

    /**
     * Get hint for current question using AI
     */
    async getDynamicHint(sessionId, userId) {
        try {
            const session = await QuizSession.findOne({
                _id: sessionId,
                userId: userId
            });

            if (!session || session.status !== 'in_progress') {
                throw new Error('Quiz session not found or not available');
            }

            if (!session.hintsEnabled) {
                throw new Error('Hints are not enabled for this session');
            }

            const currentQuestion = session.dynamicConfig.currentQuestion;
            if (!currentQuestion) {
                throw new Error('No current question found');
            }

            // Return pre-generated hint or create one
            if (currentQuestion.hint) {
                return currentQuestion.hint;
            }

            // Generate hint using AI if not available
            const hint = await this.generateAIHint(currentQuestion);
            
            // Store hint in session for future reference
            session.dynamicConfig.currentQuestion.hint = hint;
            await session.save();

            return hint;

        } catch (error) {
            console.error('Error getting dynamic hint:', error);
            throw new Error(`Failed to get hint: ${error.message}`);
        }
    }

    /**
     * Get available topics for dynamic quiz (no need for pre-seeded pools)
     */
    getAvailableTopics(userLevel) {
        const topics = ['javascript', 'react', 'typescript', 'nodejs', 'python', 'nextjs', 'mongodb', 'css-tailwind'];
        
        return topics.map(topic => ({
            topic,
            available: true,
            dynamicGeneration: true,
            estimatedQuestions: 'Unlimited (AI Generated)',
            userLevel: userLevel || 'All Levels'
        }));
    }

    // Helper methods
    determineUserLevel(user, topic) {
        if (user.knowledgeLevels && user.knowledgeLevels[topic] && user.knowledgeLevels[topic].level) {
            return user.knowledgeLevels[topic].level;
        }

        // Map user experience level to difficulty progression keys
        const experienceLevel = user.profile?.experienceLevel || 'Complete Beginner';
        const levelMap = {
            'Complete Beginner': 'Beginner',
            'Some Experience': 'Beginner',
            'Intermediate': 'Intermediate',
            'Advanced': 'Advanced'
        };

        return levelMap[experienceLevel] || 'Beginner';
    }

    adaptDifficulty(responses, currentDifficulty) {
        const recentResponses = responses.slice(-3); // Last 3 responses
        const correctCount = recentResponses.filter(r => r.isCorrect).length;
        const accuracy = correctCount / recentResponses.length;

        if (accuracy >= 0.8 && currentDifficulty === 'easy') return 'medium';
        if (accuracy >= 0.8 && currentDifficulty === 'medium') return 'hard';
        if (accuracy <= 0.4 && currentDifficulty === 'hard') return 'medium';
        if (accuracy <= 0.4 && currentDifficulty === 'medium') return 'easy';

        return currentDifficulty;
    }

    progressBloomLevel(responses, currentBloomLevel) {
        const recentResponses = responses.slice(-2);
        const allCorrect = recentResponses.every(r => r.isCorrect);
        
        if (allCorrect) {
            const currentIndex = this.bloomLevels.indexOf(currentBloomLevel);
            if (currentIndex < this.bloomLevels.length - 1) {
                return this.bloomLevels[currentIndex + 1];
            }
        }
        
        return currentBloomLevel;
    }

    calculateDynamicMasteryScore(responses) {
        if (responses.length === 0) return 0;
        
        let totalScore = 0;
        responses.forEach(response => {
            if (response.isCorrect) {
                // Bonus for higher difficulties and bloom levels
                const difficultyBonus = response.aiQuestionData?.difficulty === 'hard' ? 1.2 : 
                                       response.aiQuestionData?.difficulty === 'medium' ? 1.1 : 1.0;
                totalScore += 1 * difficultyBonus;
            }
        });
        
        const maxPossibleScore = responses.length * 1.2; // Account for max bonus
        return Math.round((totalScore / maxPossibleScore) * 100);
    }

    generateHint(questionData) {
        // Extract a hint from the explanation
        const explanation = questionData.explanation || '';
        const sentences = explanation.split('.').filter(s => s.trim().length > 0);
        
        if (sentences.length > 0) {
            return `💡 Hint: ${sentences[0].trim()}.`;
        }
        
        return `💡 Think about the key concepts related to ${questionData.topic}.`;
    }

    async generateAIHint(question) {
        try {
            // This could be enhanced to call OpenAI for dynamic hint generation
            return this.generateHint({ explanation: question.explanation, topic: question.topic });
        } catch (error) {
            return `💡 Consider the fundamental concepts of ${question.topic}.`;
        }
    }

    getAdaptiveInsights(responses) {
        const recent = responses.slice(-3);
        const accuracy = recent.length > 0 ? recent.filter(r => r.isCorrect).length / recent.length : 0;
        
        return {
            recentAccuracy: Math.round(accuracy * 100),
            trend: accuracy > 0.7 ? 'improving' : accuracy < 0.4 ? 'struggling' : 'stable',
            recommendation: accuracy > 0.7 ? 'Ready for harder questions' : 
                           accuracy < 0.4 ? 'Consider reviewing fundamentals' : 'Continue current pace'
        };
    }

    async getNextSessionNumber(userId, topic) {
        const lastSession = await QuizSession.findOne({
            userId,
            'dynamicConfig.topic': topic
        }).sort({ createdAt: -1 });

        return lastSession ? lastSession.sessionNumber + 1 : 1;
    }

    calculateTotalSessions(sessionType) {
        const sessionCounts = {
            'formative': 3,
            'final': 1,
            'simplified': 2,
            'remediation': 2
        };
        
        return sessionCounts[sessionType] || 3;
    }

    /**
     * Find the correct option key (A, B, C, D) from options array
     */
    findCorrectOptionKey(options) {
        for (let i = 0; i < options.length; i++) {
            if (options[i].isCorrect) {
                return String.fromCharCode(65 + i); // Convert 0->A, 1->B, 2->C, 3->D
            }
        }
        return 'A'; // Default fallback
    }

    async updateUserProgress(userId, topic, session) {
        try {
            let userProgress = await UserQuizProgress.findOne({ userId });
            
            if (!userProgress) {
                userProgress = new UserQuizProgress({ 
                    userId, 
                    topicProgress: [],
                    overallStats: {
                        totalQuizzesCompleted: 0,
                        averageScore: 0,
                        totalTimeSpent: 0
                    }
                });
            }

            // Find or create topic progress
            let topicProgress = userProgress.topicProgress.find(tp => tp.topic === topic);
            if (!topicProgress) {
                topicProgress = {
                    topic,
                    totalSessions: 0,
                    completedSessions: 0,
                    averageMasteryScore: 0,
                    sessionHistory: []
                };
                userProgress.topicProgress.push(topicProgress);
            }

            // Update topic progress
            topicProgress.completedSessions += 1;
            topicProgress.totalSessions = Math.max(topicProgress.totalSessions, topicProgress.completedSessions);
            
            // Update average mastery score
            const previousTotal = topicProgress.averageMasteryScore * (topicProgress.completedSessions - 1);
            topicProgress.averageMasteryScore = Math.round((previousTotal + session.score.masteryScore) / topicProgress.completedSessions);
            
            // Add to session history
            topicProgress.sessionHistory.push({
                sessionId: session._id,
                sessionType: session.sessionType,
                masteryScore: session.score.masteryScore,
                completedAt: new Date()
            });
            
            topicProgress.lastSessionDate = new Date();

            // Update overall stats
            userProgress.overallStats.totalQuizzesCompleted += 1;
            const totalScore = userProgress.topicProgress.reduce((sum, tp) => sum + tp.averageMasteryScore, 0);
            userProgress.overallStats.averageScore = Math.round(totalScore / userProgress.topicProgress.length);

            await userProgress.save();
            
        } catch (error) {
            console.error('Error updating user progress:', error);
            // Don't throw error here to avoid failing the main session completion
        }
    }
}

module.exports = new DynamicQuizService();