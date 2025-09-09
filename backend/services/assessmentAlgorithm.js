// services/assessmentAlgorithm.js
const { AssessmentSession, AssessmentResult } = require('../models/Assessment');
const User = require('../models/User');
const openaiService = require('./openaiService');

// Difficulty progression rules
const DIFFICULTY_RULES = {
    // Criteria for increasing difficulty
    INCREASE_DIFFICULTY: {
        consecutiveCorrect: 2,      // 2 correct answers in a row
        accuracyThreshold: 0.75,    // 75% accuracy in current difficulty
        minQuestionsAtLevel: 2      // minimum questions before increasing
    },
    
    // Criteria for decreasing difficulty
    DECREASE_DIFFICULTY: {
        consecutiveWrong: 2,        // 2 wrong answers in a row
        accuracyThreshold: 0.40,    // below 40% accuracy
        minQuestionsAtLevel: 2      // minimum questions before decreasing
    },
    
    // Level determination thresholds
    LEVEL_THRESHOLDS: {
        PROFESSIONAL: {
            minScore: 75,
            advancedQuestions: 3,
            advancedAccuracy: 0.70
        },
        INTERMEDIATE: {
            minScore: 45,
            intermediateQuestions: 2,
            intermediateAccuracy: 0.60
        },
        BEGINNER: {
            maxScore: 44
        }
    }
};

class AssessmentAlgorithm {
    
    /**
     * Start a new assessment session
     * @param {string} userId - User ID
     * @param {string} topic - Topic to assess
     * @param {Object} config - Assessment configuration
     */
    async startAssessment(userId, topic, config = {}) {
        try {
            // Check if user has an active session for this topic
            const existingSession = await AssessmentSession.findActiveSession(userId, topic);
            if (existingSession) {
                throw new Error('User already has an active assessment session for this topic');
            }

            // Create new assessment session
            const session = new AssessmentSession({
                userId,
                topic,
                config: {
                    maxQuestions: config.maxQuestions || 10,
                    initialDifficulty: config.initialDifficulty || 'intermediate',
                    adaptiveThreshold: config.adaptiveThreshold || 0.7
                },
                currentState: {
                    currentDifficulty: config.initialDifficulty || 'intermediate'
                }
            });

            await session.save();

            // Generate first question
            const firstQuestion = await this.generateNextQuestion(session.sessionId);

            return {
                sessionId: session.sessionId,
                topic: session.topic,
                maxQuestions: session.config.maxQuestions,
                currentQuestion: firstQuestion,
                progress: {
                    currentQuestion: 1,
                    totalQuestions: session.config.maxQuestions,
                    percentage: Math.round((1 / session.config.maxQuestions) * 100)
                }
            };

        } catch (error) {
            console.error('Error starting assessment:', error);
            throw error;
        }
    }

    /**
     * Generate next question based on current session state
     * @param {string} sessionId - Assessment session ID
     */
    async generateNextQuestion(sessionId) {
        try {
            const session = await AssessmentSession.findOne({ sessionId, status: 'active' });
            if (!session) {
                throw new Error('Assessment session not found or not active');
            }

            // Check if assessment should be completed
            if (session.currentState.questionIndex >= session.config.maxQuestions) {
                return await this.completeAssessment(sessionId);
            }

            // Adjust difficulty based on recent performance
            const adjustedDifficulty = this.calculateNextDifficulty(session);
            session.currentState.currentDifficulty = adjustedDifficulty;

            // Get previously asked questions to avoid repetition
            const previousQuestions = session.questions.map(q => ({
                question: q.question,
                difficulty: q.difficulty
            }));

            // Generate new question
            const questionData = await openaiService.generateQuestion(
                session.topic,
                adjustedDifficulty,
                previousQuestions
            );

            // Add question to session
            const questionId = session.addQuestion(questionData);
            await session.save();

            return {
                questionId,
                question: questionData.question,
                options: questionData.options,
                difficulty: questionData.difficulty,
                estimatedTime: questionData.estimatedTime || 60,
                questionNumber: session.currentState.questionIndex + 1,
                totalQuestions: session.config.maxQuestions,
                currentDifficulty: adjustedDifficulty
            };

        } catch (error) {
            console.error('Error generating next question:', error);
            throw error;
        }
    }

    /**
     * Submit answer and get immediate feedback
     * @param {string} sessionId - Assessment session ID
     * @param {string} questionId - Question ID
     * @param {string} userAnswer - User's answer (A, B, C, D)
     * @param {number} timeSpent - Time spent on question in seconds
     */
    async submitAnswer(sessionId, questionId, userAnswer, timeSpent = 0) {
        try {
            const session = await AssessmentSession.findOne({ sessionId, status: 'active' });
            if (!session) {
                throw new Error('Assessment session not found or not active');
            }

            // Submit answer and get immediate results
            const result = session.submitAnswer(questionId, userAnswer, timeSpent);
            await session.save();

            // Calculate updated performance metrics
            const performanceUpdate = this.calculatePerformanceMetrics(session);
            
            // Check if assessment should be completed
            const shouldComplete = session.currentState.questionIndex >= session.config.maxQuestions;

            let nextQuestion = null;
            let finalResults = null;

            if (shouldComplete) {
                finalResults = await this.completeAssessment(sessionId);
            } else {
                nextQuestion = await this.generateNextQuestion(sessionId);
            }

            return {
                result: {
                    isCorrect: result.isCorrect,
                    correctAnswer: result.correctAnswer,
                    explanation: result.explanation,
                    userAnswer: userAnswer.toUpperCase()
                },
                progress: {
                    currentQuestion: session.currentState.questionIndex,
                    totalQuestions: session.config.maxQuestions,
                    percentage: result.progressPercentage,
                    accuracy: result.currentAccuracy
                },
                performance: performanceUpdate,
                nextQuestion,
                finalResults,
                isCompleted: shouldComplete
            };

        } catch (error) {
            console.error('Error submitting answer:', error);
            throw error;
        }
    }

    /**
     * Calculate next difficulty level based on performance
     * @param {Object} session - Assessment session
     */
    calculateNextDifficulty(session) {
        const currentDifficulty = session.currentState.currentDifficulty;
        const consecutiveCorrect = session.currentState.consecutiveCorrect;
        const consecutiveWrong = session.currentState.consecutiveWrong;
        const currentAccuracy = session.currentAccuracy / 100;

        // Get questions at current difficulty level
        const currentLevelQuestions = session.questions.filter(
            q => q.difficulty === currentDifficulty && q.answeredAt
        );

        // Don't adjust if not enough questions at current level
        if (currentLevelQuestions.length < DIFFICULTY_RULES.INCREASE_DIFFICULTY.minQuestionsAtLevel) {
            return currentDifficulty;
        }

        // Calculate accuracy at current level
        const currentLevelCorrect = currentLevelQuestions.filter(q => q.isCorrect).length;
        const currentLevelAccuracy = currentLevelCorrect / currentLevelQuestions.length;

        // Increase difficulty conditions
        if (
            consecutiveCorrect >= DIFFICULTY_RULES.INCREASE_DIFFICULTY.consecutiveCorrect &&
            currentLevelAccuracy >= DIFFICULTY_RULES.INCREASE_DIFFICULTY.accuracyThreshold
        ) {
            if (currentDifficulty === 'beginner') return 'intermediate';
            if (currentDifficulty === 'intermediate') return 'advanced';
        }

        // Decrease difficulty conditions
        if (
            consecutiveWrong >= DIFFICULTY_RULES.DECREASE_DIFFICULTY.consecutiveWrong ||
            currentLevelAccuracy < DIFFICULTY_RULES.DECREASE_DIFFICULTY.accuracyThreshold
        ) {
            if (currentDifficulty === 'advanced') return 'intermediate';
            if (currentDifficulty === 'intermediate') return 'beginner';
        }

        return currentDifficulty;
    }

    /**
     * Calculate comprehensive performance metrics
     * @param {Object} session - Assessment session
     */
    calculatePerformanceMetrics(session) {
        const answeredQuestions = session.questions.filter(q => q.answeredAt);
        
        if (answeredQuestions.length === 0) {
            return {
                overallAccuracy: 0,
                difficultyBreakdown: {},
                strengthAreas: [],
                weakAreas: []
            };
        }

        // Calculate overall metrics
        const totalCorrect = answeredQuestions.filter(q => q.isCorrect).length;
        const overallAccuracy = Math.round((totalCorrect / answeredQuestions.length) * 100);

        // Calculate weighted score (harder questions worth more)
        const weightedScore = answeredQuestions.reduce((score, q) => {
            const weight = q.difficultyWeight || 1;
            return score + (q.isCorrect ? weight : 0);
        }, 0);

        const maxPossibleScore = answeredQuestions.reduce((max, q) => {
            return max + (q.difficultyWeight || 1);
        }, 0);

        const normalizedWeightedScore = maxPossibleScore > 0 ? 
            Math.round((weightedScore / maxPossibleScore) * 100) : 0;

        // Difficulty breakdown
        const difficultyBreakdown = {};
        ['beginner', 'intermediate', 'advanced'].forEach(difficulty => {
            const questionsAtLevel = answeredQuestions.filter(q => q.difficulty === difficulty);
            if (questionsAtLevel.length > 0) {
                const correctAtLevel = questionsAtLevel.filter(q => q.isCorrect).length;
                difficultyBreakdown[difficulty] = {
                    total: questionsAtLevel.length,
                    correct: correctAtLevel,
                    accuracy: Math.round((correctAtLevel / questionsAtLevel.length) * 100)
                };
            }
        });

        // Identify strengths and weaknesses
        const strengthAreas = [];
        const weakAreas = [];

        Object.entries(difficultyBreakdown).forEach(([difficulty, stats]) => {
            if (stats.accuracy >= 70) {
                strengthAreas.push(difficulty);
            } else if (stats.accuracy < 50) {
                weakAreas.push(difficulty);
            }
        });

        return {
            overallAccuracy,
            weightedScore: normalizedWeightedScore,
            totalQuestions: answeredQuestions.length,
            correctAnswers: totalCorrect,
            difficultyBreakdown,
            strengthAreas,
            weakAreas,
            averageTimePerQuestion: this.calculateAverageTime(answeredQuestions)
        };
    }

    /**
     * Determine final skill level based on performance
     * @param {Object} session - Completed assessment session
     */
    determineSkillLevel(session) {
        const performance = this.calculatePerformanceMetrics(session);
        const { weightedScore, difficultyBreakdown } = performance;

        // Get performance at each difficulty level
        const beginnerPerf = difficultyBreakdown.beginner || { accuracy: 0, total: 0 };
        const intermediatePerf = difficultyBreakdown.intermediate || { accuracy: 0, total: 0 };
        const advancedPerf = difficultyBreakdown.advanced || { accuracy: 0, total: 0 };

        // Professional level criteria
        if (
            weightedScore >= DIFFICULTY_RULES.LEVEL_THRESHOLDS.PROFESSIONAL.minScore &&
            advancedPerf.total >= DIFFICULTY_RULES.LEVEL_THRESHOLDS.PROFESSIONAL.advancedQuestions &&
            advancedPerf.accuracy >= (DIFFICULTY_RULES.LEVEL_THRESHOLDS.PROFESSIONAL.advancedAccuracy * 100)
        ) {
            return {
                level: 'Professional',
                confidence: this.calculateConfidence(session, 'Professional'),
                reasoning: 'Demonstrated strong performance on advanced questions'
            };
        }

        // Intermediate level criteria
        if (
            weightedScore >= DIFFICULTY_RULES.LEVEL_THRESHOLDS.INTERMEDIATE.minScore &&
            intermediatePerf.total >= DIFFICULTY_RULES.LEVEL_THRESHOLDS.INTERMEDIATE.intermediateQuestions &&
            intermediatePerf.accuracy >= (DIFFICULTY_RULES.LEVEL_THRESHOLDS.INTERMEDIATE.intermediateAccuracy * 100)
        ) {
            return {
                level: 'Intermediate',
                confidence: this.calculateConfidence(session, 'Intermediate'),
                reasoning: 'Solid performance on intermediate level questions'
            };
        }

        // Beginner level (default)
        return {
            level: 'Beginner',
            confidence: this.calculateConfidence(session, 'Beginner'),
            reasoning: 'Performance indicates foundational understanding'
        };
    }

    /**
     * Calculate confidence score for level determination
     * @param {Object} session - Assessment session
     * @param {string} level - Determined level
     */
    calculateConfidence(session, level) {
        const answeredQuestions = session.questions.filter(q => q.answeredAt);
        const totalQuestions = answeredQuestions.length;
        
        // Base confidence on number of questions and consistency
        let confidence = Math.min(totalQuestions / 10, 1.0); // Max confidence with 10+ questions
        
        // Adjust based on performance consistency
        const performance = this.calculatePerformanceMetrics(session);
        const { overallAccuracy } = performance;
        
        if (level === 'Professional' && overallAccuracy >= 80) confidence += 0.1;
        if (level === 'Intermediate' && overallAccuracy >= 60 && overallAccuracy < 85) confidence += 0.1;
        if (level === 'Beginner' && overallAccuracy < 60) confidence += 0.1;
        
        return Math.min(confidence, 1.0);
    }

    /**
     * Complete assessment and generate final results
     * @param {string} sessionId - Assessment session ID
     */
    async completeAssessment(sessionId) {
        try {
            const session = await AssessmentSession.findOne({ sessionId });
            if (!session) {
                throw new Error('Assessment session not found');
            }

            // Calculate final performance metrics
            const performance = this.calculatePerformanceMetrics(session);
            
            // Determine skill level
            const levelDetermination = this.determineSkillLevel(session);
            
            // Generate learning recommendations
            const recommendations = await openaiService.generateLearningRecommendations({
                topic: session.topic,
                score: performance.weightedScore,
                level: levelDetermination.level,
                weakAreas: performance.weakAreas,
                strongAreas: performance.strengthAreas
            });

            // Update session with final results
            session.status = 'completed';
            session.completedAt = new Date();
            session.finalResults = {
                level: levelDetermination.level,
                score: performance.weightedScore,
                confidence: levelDetermination.confidence,
                strengths: performance.strengthAreas,
                weaknesses: performance.weakAreas,
                recommendations: JSON.stringify(recommendations)
            };

            // Update overall performance
            session.performance.overallScore = performance.overallAccuracy;
            session.performance.weightedScore = performance.weightedScore;

            await session.save();

            // Create permanent assessment result record
            const assessmentResult = new AssessmentResult({
                userId: session.userId,
                sessionId: session.sessionId,
                topic: session.topic,
                level: levelDetermination.level,
                score: performance.weightedScore,
                confidence: levelDetermination.confidence,
                performance: {
                    totalQuestions: performance.totalQuestions,
                    correctAnswers: performance.correctAnswers,
                    accuracy: performance.overallAccuracy,
                    timeSpent: this.calculateTotalTime(session.questions),
                    averageTimePerQuestion: performance.averageTimePerQuestion,
                    beginnerPerformance: this.mapDifficultyPerformance(performance.difficultyBreakdown.beginner),
                    intermediatePerformance: this.mapDifficultyPerformance(performance.difficultyBreakdown.intermediate),
                    advancedPerformance: this.mapDifficultyPerformance(performance.difficultyBreakdown.advanced)
                },
                analysis: {
                    strengths: performance.strengthAreas,
                    weaknesses: performance.weakAreas,
                    skillGaps: this.identifySkillGaps(performance),
                    nextSteps: recommendations.nextSteps || []
                },
                recommendations: {
                    suggestedPath: recommendations.studyPlan ? JSON.stringify(recommendations.studyPlan) : '',
                    focusAreas: recommendations.practiceAreas || [],
                    estimatedStudyTime: this.estimateStudyTime(levelDetermination.level),
                    nextAssessment: this.calculateNextAssessmentDate(levelDetermination.level)
                },
                questionsUsed: session.questions.map(q => ({
                    questionId: q.questionId,
                    difficulty: q.difficulty,
                    correct: q.isCorrect
                }))
            });

            await assessmentResult.save();

            // Update user's knowledge level for this topic
            await this.updateUserKnowledgeLevel(session.userId, session.topic, levelDetermination, performance.weightedScore);

            return {
                level: levelDetermination.level,
                score: performance.weightedScore,
                confidence: levelDetermination.confidence,
                performance: performance,
                recommendations: recommendations,
                sessionSummary: {
                    totalQuestions: performance.totalQuestions,
                    timeSpent: this.calculateTotalTime(session.questions),
                    topicAssessed: session.topic
                }
            };

        } catch (error) {
            console.error('Error completing assessment:', error);
            throw error;
        }
    }

    /**
     * Helper methods
     */
    calculateAverageTime(questions) {
        if (questions.length === 0) return 0;
        const totalTime = questions.reduce((sum, q) => sum + (q.timeSpent || 0), 0);
        return Math.round(totalTime / questions.length);
    }

    calculateTotalTime(questions) {
        return questions.reduce((sum, q) => sum + (q.timeSpent || 0), 0);
    }

    mapDifficultyPerformance(difficultyStats) {
        if (!difficultyStats) return { questions: 0, correct: 0, percentage: 0 };
        return {
            questions: difficultyStats.total,
            correct: difficultyStats.correct,
            percentage: difficultyStats.accuracy
        };
    }

    identifySkillGaps(performance) {
        const gaps = [];
        Object.entries(performance.difficultyBreakdown).forEach(([difficulty, stats]) => {
            if (stats.accuracy < 50) {
                gaps.push(`${difficulty} level concepts`);
            }
        });
        return gaps;
    }

    estimateStudyTime(level) {
        const studyTimeMap = {
            'Beginner': '4-6 weeks of consistent study',
            'Intermediate': '2-4 weeks to advance',
            'Professional': '1-2 weeks for mastery'
        };
        return studyTimeMap[level] || '2-4 weeks';
    }

    calculateNextAssessmentDate(level) {
        const weeksToAdd = {
            'Beginner': 6,
            'Intermediate': 4,
            'Professional': 8
        };
        
        const weeks = weeksToAdd[level] || 4;
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + (weeks * 7));
        return nextDate;
    }

    async updateUserKnowledgeLevel(userId, topic, levelDetermination, score) {
        try {
            const updateData = {};
            updateData[`knowledgeLevels.${topic}.level`] = levelDetermination.level;
            updateData[`knowledgeLevels.${topic}.score`] = score;
            updateData[`knowledgeLevels.${topic}.assessedAt`] = new Date();

            await User.findByIdAndUpdate(userId, updateData);
        } catch (error) {
            console.error('Error updating user knowledge level:', error);
            throw error;
        }
    }

    /**
     * Get session progress
     * @param {string} sessionId - Assessment session ID
     */
    async getSessionProgress(sessionId) {
        try {
            const session = await AssessmentSession.findOne({ sessionId });
            if (!session) {
                throw new Error('Assessment session not found');
            }

            const performance = this.calculatePerformanceMetrics(session);

            return {
                sessionId: session.sessionId,
                topic: session.topic,
                status: session.status,
                progress: {
                    currentQuestion: session.currentState.questionIndex,
                    totalQuestions: session.config.maxQuestions,
                    percentage: session.progressPercentage,
                    accuracy: session.currentAccuracy
                },
                performance,
                currentDifficulty: session.currentState.currentDifficulty,
                startedAt: session.startedAt,
                estimatedTimeRemaining: this.estimateTimeRemaining(session)
            };
        } catch (error) {
            console.error('Error getting session progress:', error);
            throw error;
        }
    }

    estimateTimeRemaining(session) {
        const answeredQuestions = session.questions.filter(q => q.answeredAt);
        if (answeredQuestions.length === 0) {
            return session.config.maxQuestions * 1.5; // 1.5 minutes per question estimate
        }

        const averageTime = this.calculateAverageTime(answeredQuestions) / 60; // Convert to minutes
        const remainingQuestions = session.config.maxQuestions - session.currentState.questionIndex;
        return Math.round(remainingQuestions * averageTime);
    }

    /**
     * Pause assessment session
     * @param {string} sessionId - Assessment session ID
     */
    async pauseAssessment(sessionId) {
        try {
            const session = await AssessmentSession.findOneAndUpdate(
                { sessionId, status: 'active' },
                { status: 'paused' },
                { new: true }
            );

            if (!session) {
                throw new Error('Active assessment session not found');
            }

            return {
                sessionId: session.sessionId,
                status: session.status,
                pausedAt: new Date(),
                progress: session.progressPercentage
            };
        } catch (error) {
            console.error('Error pausing assessment:', error);
            throw error;
        }
    }

    /**
     * Resume paused assessment session
     * @param {string} sessionId - Assessment session ID
     */
    async resumeAssessment(sessionId) {
        try {
            const session = await AssessmentSession.findOneAndUpdate(
                { sessionId, status: 'paused' },
                { status: 'active' },
                { new: true }
            );

            if (!session) {
                throw new Error('Paused assessment session not found');
            }

            // Generate next question if needed
            let nextQuestion = null;
            if (session.currentState.questionIndex < session.config.maxQuestions) {
                nextQuestion = await this.generateNextQuestion(sessionId);
            }

            return {
                sessionId: session.sessionId,
                status: session.status,
                resumedAt: new Date(),
                nextQuestion,
                progress: {
                    currentQuestion: session.currentState.questionIndex + 1,
                    totalQuestions: session.config.maxQuestions,
                    percentage: session.progressPercentage
                }
            };
        } catch (error) {
            console.error('Error resuming assessment:', error);
            throw error;
        }
    }

    /**
     * Abandon assessment session
     * @param {string} sessionId - Assessment session ID
     */
    async abandonAssessment(sessionId) {
        try {
            const session = await AssessmentSession.findOneAndUpdate(
                { sessionId, status: { $in: ['active', 'paused'] } },
                { 
                    status: 'abandoned',
                    completedAt: new Date()
                },
                { new: true }
            );

            if (!session) {
                throw new Error('Assessment session not found');
            }

            return {
                sessionId: session.sessionId,
                status: session.status,
                abandonedAt: session.completedAt,
                questionsCompleted: session.currentState.questionIndex
            };
        } catch (error) {
            console.error('Error abandoning assessment:', error);
            throw error;
        }
    }

    /**
     * Get user's assessment history
     * @param {string} userId - User ID
     * @param {number} limit - Number of results to return
     */
    async getUserAssessmentHistory(userId, limit = 10) {
        try {
            const results = await AssessmentResult.getUserHistory(userId, limit);
            return results;
        } catch (error) {
            console.error('Error getting user assessment history:', error);
            throw error;
        }
    }

    /**
     * Get assessment analytics for admin/analytics purposes
     * @param {string} topic - Optional topic filter
     */
    async getAssessmentAnalytics(topic = null) {
        try {
            const matchStage = topic ? { topic } : {};
            
            const analytics = await AssessmentResult.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: '$topic',
                        totalAssessments: { $sum: 1 },
                        averageScore: { $avg: '$score' },
                        levelDistribution: {
                            $push: '$level'
                        },
                        averageTimeSpent: { $avg: '$performance.timeSpent' },
                        averageQuestions: { $avg: '$performance.totalQuestions' }
                    }
                },
                {
                    $addFields: {
                        beginnerCount: {
                            $size: {
                                $filter: {
                                    input: '$levelDistribution',
                                    cond: { $eq: ['$this', 'Beginner'] }
                                }
                            }
                        },
                        intermediateCount: {
                            $size: {
                                $filter: {
                                    input: '$levelDistribution',
                                    cond: { $eq: ['$this', 'Intermediate'] }
                                }
                            }
                        },
                        professionalCount: {
                            $size: {
                                $filter: {
                                    input: '$levelDistribution',
                                    cond: { $eq: ['$this', 'Professional'] }
                                }
                            }
                        }
                    }
                },
                {
                    $project: {
                        topic: '$_id',
                        totalAssessments: 1,
                        averageScore: { $round: ['$averageScore', 2] },
                        averageTimeSpent: { $round: ['$averageTimeSpent', 0] },
                        averageQuestions: { $round: ['$averageQuestions', 1] },
                        levelDistribution: {
                            beginner: '$beginnerCount',
                            intermediate: '$intermediateCount',
                            professional: '$professionalCount'
                        }
                    }
                }
            ]);

            return analytics;
        } catch (error) {
            console.error('Error getting assessment analytics:', error);
            throw error;
        }
    }
}

module.exports = new AssessmentAlgorithm();