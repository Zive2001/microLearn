// utils/assessmentUtils.js
const { AssessmentSession, AssessmentResult } = require('../models/Assessment');
const User = require('../models/User');

class AssessmentUtils {
    
    /**
     * Validate assessment configuration
     * @param {Object} config - Assessment configuration
     */
    validateAssessmentConfig(config) {
        const errors = [];
        
        if (config.maxQuestions && (config.maxQuestions < 5 || config.maxQuestions > 20)) {
            errors.push('Maximum questions must be between 5 and 20');
        }
        
        if (config.initialDifficulty && !['beginner', 'intermediate', 'advanced'].includes(config.initialDifficulty)) {
            errors.push('Initial difficulty must be beginner, intermediate, or advanced');
        }
        
        if (config.adaptiveThreshold && (config.adaptiveThreshold < 0.3 || config.adaptiveThreshold > 1.0)) {
            errors.push('Adaptive threshold must be between 0.3 and 1.0');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Check if user can start assessment for topic
     * @param {string} userId - User ID
     * @param {string} topic - Topic to assess
     */
    async canStartAssessment(userId, topic) {
        try {
            // Check if user exists
            const user = await User.findById(userId);
            if (!user) {
                return { canStart: false, reason: 'User not found' };
            }

            // Check if user has selected this topic
            const hasSelectedTopic = user.learningProgress.selectedTopics.some(
                st => st.topic === topic
            );
            
            if (!hasSelectedTopic) {
                return { 
                    canStart: false, 
                    reason: 'User has not selected this topic for learning'
                };
            }

            // Check for active sessions
            const activeSession = await AssessmentSession.findActiveSession(userId, topic);
            if (activeSession) {
                return {
                    canStart: false,
                    reason: 'User already has an active assessment session for this topic',
                    existingSessionId: activeSession.sessionId
                };
            }

            // Check recent assessments (cooldown period)
            const recentAssessment = await AssessmentResult.findOne({
                userId,
                topic,
                createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // 24 hours
            });

            if (recentAssessment) {
                const hoursRemaining = Math.ceil(
                    (recentAssessment.createdAt.getTime() + 24 * 60 * 60 * 1000 - Date.now()) / (60 * 60 * 1000)
                );
                return {
                    canStart: false,
                    reason: `Assessment cooldown active. Try again in ${hoursRemaining} hours`,
                    cooldownHours: hoursRemaining
                };
            }

            return { canStart: true };

        } catch (error) {
            console.error('Error checking assessment eligibility:', error);
            return { canStart: false, reason: 'Error checking eligibility' };
        }
    }

    /**
     * Get user's progress across all topics
     * @param {string} userId - User ID
     */
    async getUserProgressSummary(userId) {
        try {
            const user = await User.findById(userId).select('learningProgress knowledgeLevels');
            if (!user) {
                throw new Error('User not found');
            }

            // Get assessment results for all topics
            const assessmentResults = await AssessmentResult.find({ userId })
                .sort({ createdAt: -1 });

            // Get active sessions
            const activeSessions = await AssessmentSession.find({
                userId,
                status: 'active'
            });

            // Compile progress for each selected topic
            const topicProgress = user.learningProgress.selectedTopics.map(selectedTopic => {
                const topic = selectedTopic.topic;
                const knowledgeLevel = user.knowledgeLevels[topic];
                const latestAssessment = assessmentResults.find(ar => ar.topic === topic);
                const activeSession = activeSessions.find(as => as.topic === topic);

                return {
                    topic,
                    selectedAt: selectedTopic.selectedAt,
                    currentLevel: knowledgeLevel?.level || 'Not Assessed',
                    currentScore: knowledgeLevel?.score || null,
                    lastAssessedAt: knowledgeLevel?.assessedAt || null,
                    hasActiveSession: !!activeSession,
                    activeSessionId: activeSession?.sessionId || null,
                    totalAssessments: assessmentResults.filter(ar => ar.topic === topic).length,
                    latestAssessment: latestAssessment ? {
                        score: latestAssessment.score,
                        level: latestAssessment.level,
                        completedAt: latestAssessment.createdAt
                    } : null
                };
            });

            return {
                totalSelectedTopics: user.learningProgress.selectedTopics.length,
                assessedTopics: topicProgress.filter(tp => tp.currentLevel !== 'Not Assessed').length,
                activeAssessments: activeSessions.length,
                totalAssessmentsTaken: assessmentResults.length,
                topicProgress,
                overallStats: this.calculateOverallStats(topicProgress)
            };

        } catch (error) {
            console.error('Error getting user progress summary:', error);
            throw error;
        }
    }

    /**
     * Calculate overall learning statistics
     * @param {Array} topicProgress - Topic progress array
     */
    calculateOverallStats(topicProgress) {
        const assessedTopics = topicProgress.filter(tp => tp.currentLevel !== 'Not Assessed');
        
        if (assessedTopics.length === 0) {
            return {
                averageScore: 0,
                levelDistribution: { Beginner: 0, Intermediate: 0, Professional: 0 },
                strongestTopic: null,
                weakestTopic: null
            };
        }

        // Calculate average score
        const totalScore = assessedTopics.reduce((sum, tp) => sum + (tp.currentScore || 0), 0);
        const averageScore = Math.round(totalScore / assessedTopics.length);

        // Calculate level distribution
        const levelDistribution = assessedTopics.reduce((dist, tp) => {
            dist[tp.currentLevel] = (dist[tp.currentLevel] || 0) + 1;
            return dist;
        }, { Beginner: 0, Intermediate: 0, Professional: 0 });

        // Find strongest and weakest topics
        const sortedByScore = assessedTopics.sort((a, b) => (b.currentScore || 0) - (a.currentScore || 0));
        const strongestTopic = sortedByScore[0];
        const weakestTopic = sortedByScore[sortedByScore.length - 1];

        return {
            averageScore,
            levelDistribution,
            strongestTopic: strongestTopic ? {
                topic: strongestTopic.topic,
                level: strongestTopic.currentLevel,
                score: strongestTopic.currentScore
            } : null,
            weakestTopic: weakestTopic ? {
                topic: weakestTopic.topic,
                level: weakestTopic.currentLevel,
                score: weakestTopic.currentScore
            } : null
        };
    }

    /**
     * Get assessment recommendations for user
     * @param {string} userId - User ID
     */
    async getAssessmentRecommendations(userId) {
        try {
            const progressSummary = await this.getUserProgressSummary(userId);
            const recommendations = [];

            // Recommend assessment for unassessed topics
            const unassessedTopics = progressSummary.topicProgress.filter(
                tp => tp.currentLevel === 'Not Assessed'
            );

            if (unassessedTopics.length > 0) {
                recommendations.push({
                    type: 'initial_assessment',
                    priority: 'high',
                    title: 'Complete Initial Assessments',
                    description: `You have ${unassessedTopics.length} topics that need initial assessment`,
                    topics: unassessedTopics.map(tp => tp.topic),
                    action: 'Start assessment for these topics to get personalized learning paths'
                });
            }

            // Recommend reassessment for old assessments
            const staleAssessments = progressSummary.topicProgress.filter(tp => {
                if (!tp.lastAssessedAt) return false;
                const daysSinceAssessment = (Date.now() - new Date(tp.lastAssessedAt).getTime()) / (24 * 60 * 60 * 1000);
                return daysSinceAssessment > 30; // Suggest reassessment after 30 days
            });

            if (staleAssessments.length > 0) {
                recommendations.push({
                    type: 'reassessment',
                    priority: 'medium',
                    title: 'Update Your Skill Levels',
                    description: 'Some of your assessments are over 30 days old',
                    topics: staleAssessments.map(tp => tp.topic),
                    action: 'Retake assessments to reflect your current skill level'
                });
            }

            // Recommend progression assessment for beginners
            const beginnerTopics = progressSummary.topicProgress.filter(
                tp => tp.currentLevel === 'Beginner' && tp.lastAssessedAt &&
                (Date.now() - new Date(tp.lastAssessedAt).getTime()) / (24 * 60 * 60 * 1000) > 14
            );

            if (beginnerTopics.length > 0) {
                recommendations.push({
                    type: 'progression_check',
                    priority: 'medium',
                    title: 'Check Your Progress',
                    description: 'See if you\'ve advanced from beginner level in these topics',
                    topics: beginnerTopics.map(tp => tp.topic),
                    action: 'Retake assessment to see your improvement'
                });
            }

            return {
                totalRecommendations: recommendations.length,
                recommendations,
                nextSuggestedAction: recommendations.length > 0 ? recommendations[0] : null
            };

        } catch (error) {
            console.error('Error getting assessment recommendations:', error);
            throw error;
        }
    }

    /**
     * Clean up abandoned sessions (utility for maintenance)
     * @param {number} hoursOld - Hours old to consider abandoned
     */
    async cleanupAbandonedSessions(hoursOld = 24) {
        try {
            const cutoffTime = new Date(Date.now() - hoursOld * 60 * 60 * 1000);
            
            const result = await AssessmentSession.updateMany(
                {
                    status: 'active',
                    startedAt: { $lt: cutoffTime }
                },
                {
                    status: 'abandoned',
                    completedAt: new Date()
                }
            );

            return {
                sessionsAbandoned: result.modifiedCount,
                cutoffTime
            };

        } catch (error) {
            console.error('Error cleaning up abandoned sessions:', error);
            throw error;
        }
    }

    /**
     * Get system-wide assessment statistics
     */
    async getSystemStats() {
        try {
            const [
                totalSessions,
                completedSessions,
                activeSessions,
                totalResults,
                topicStats
            ] = await Promise.all([
                AssessmentSession.countDocuments(),
                AssessmentSession.countDocuments({ status: 'completed' }),
                AssessmentSession.countDocuments({ status: 'active' }),
                AssessmentResult.countDocuments(),
                AssessmentResult.aggregate([
                    {
                        $group: {
                            _id: '$topic',
                            count: { $sum: 1 },
                            avgScore: { $avg: '$score' }
                        }
                    },
                    { $sort: { count: -1 } }
                ])
            ]);

            return {
                sessions: {
                    total: totalSessions,
                    completed: completedSessions,
                    active: activeSessions,
                    completionRate: totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0
                },
                results: {
                    total: totalResults
                },
                topicPopularity: topicStats.map(stat => ({
                    topic: stat._id,
                    assessments: stat.count,
                    averageScore: Math.round(stat.avgScore * 100) / 100
                }))
            };

        } catch (error) {
            console.error('Error getting system stats:', error);
            throw error;
        }
    }

    /**
     * Format assessment result for display
     * @param {Object} result - Assessment result object
     */
    formatAssessmentResult(result) {
        return {
            id: result._id,
            topic: result.topic,
            level: result.level,
            score: result.score,
            confidence: Math.round(result.confidence * 100),
            completedAt: result.createdAt,
            performance: {
                totalQuestions: result.performance.totalQuestions,
                correctAnswers: result.performance.correctAnswers,
                accuracy: result.performance.accuracy,
                timeSpent: this.formatDuration(result.performance.timeSpent)
            },
            strengths: result.analysis.strengths,
            weaknesses: result.analysis.weaknesses,
            nextSteps: result.analysis.nextSteps,
            estimatedStudyTime: result.recommendations.estimatedStudyTime
        };
    }

    /**
     * Format duration in seconds to readable string
     * @param {number} seconds - Duration in seconds
     */
    formatDuration(seconds) {
        if (seconds < 60) return `${seconds} seconds`;
        if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
        return `${Math.round(seconds / 3600)} hours`;
    }

    /**
     * Generate session summary for display
     * @param {Object} session - Assessment session object
     */
    formatSessionSummary(session) {
        const duration = session.completedAt ? 
            (session.completedAt - session.startedAt) / 1000 : 
            (Date.now() - session.startedAt) / 1000;

        return {
            sessionId: session.sessionId,
            topic: session.topic,
            status: session.status,
            progress: {
                questionsCompleted: session.currentState.questionIndex,
                totalQuestions: session.config.maxQuestions,
                percentage: session.progressPercentage
            },
            performance: {
                currentAccuracy: session.currentAccuracy,
                currentDifficulty: session.currentState.currentDifficulty
            },
            timing: {
                startedAt: session.startedAt,
                duration: this.formatDuration(Math.round(duration)),
                estimatedTimeRemaining: session.estimatedTimeRemaining
            },
            finalResults: session.finalResults
        };
    }
}

module.exports = new AssessmentUtils();