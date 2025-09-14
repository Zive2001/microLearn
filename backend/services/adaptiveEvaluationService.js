// services/adaptiveEvaluationService.js
const { QuizSession, UserQuizProgress } = require('../models/Quiz');
const scoringService = require('./scoringService');
const hintService = require('./hintService');
const bloomTaxonomyService = require('./bloomTaxonomyService');

class AdaptiveEvaluationService {
    
    /**
     * Evaluation thresholds and criteria
     */
    evaluationCriteria = {
        mastery: {
            formative: 60,      // Pass threshold for formative assessments
            final: 75,          // Pass threshold for final assessments  
            simplified: 50,     // Pass threshold for simplified assessments
            remediation: 65     // Pass threshold for remediation
        },
        bloom: {
            // Minimum performance required per Bloom level
            Remember: 70,
            Understand: 65,
            Apply: 60,
            Analyze: 55,
            Evaluate: 50,
            Create: 50
        },
        progression: {
            sessionImprovement: 10,    // Minimum improvement between sessions
            consistencyThreshold: 60,  // Minimum consistency score
            timeEfficiencyTarget: 90   // Target time per question (seconds)
        }
    };
    
    /**
     * Adaptive pathways based on performance
     */
    adaptivePathways = {
        high_performer: {
            description: "Consistently high performance across all areas",
            nextAction: "advance_to_challenge",
            characteristics: ["score >= 85", "consistent_performance", "efficient_time"],
            recommendations: ["Try advanced topics", "Mentor others", "Challenge questions"]
        },
        steady_learner: {
            description: "Good progress with room for improvement",
            nextAction: "continue_current_path",
            characteristics: ["score 65-84", "steady_improvement", "moderate_time"],
            recommendations: ["Continue practice", "Focus on weak areas", "Regular sessions"]
        },
        struggling_learner: {
            description: "Needs additional support and remediation",
            nextAction: "provide_remediation",
            characteristics: ["score < 65", "inconsistent_performance", "slow_progress"],
            recommendations: ["Simplified questions", "Extra practice", "Review fundamentals"]
        },
        hint_dependent: {
            description: "Relies heavily on hints to answer questions",
            nextAction: "reduce_hint_dependency",
            characteristics: ["high_hint_usage", "correct_after_hints", "low_confidence"],
            recommendations: ["Confidence building", "Gradual hint reduction", "Concept review"]
        },
        time_pressured: {
            description: "Struggles with time management during quizzes",
            nextAction: "improve_time_efficiency",
            characteristics: ["slow_response_time", "good_accuracy", "time_anxiety"],
            recommendations: ["Timed practice", "Strategy training", "Confidence building"]
        }
    };
    
    /**
     * Evaluate user performance and determine adaptive pathway
     * @param {ObjectId} userId - User ID
     * @param {ObjectId} sessionId - Current session ID
     * @returns {Object} Evaluation result with adaptive recommendations
     */
    async evaluatePerformance(userId, sessionId) {
        try {
            console.log(`🧮 Evaluating performance for user ${userId}, session ${sessionId}`);
            
            // Get current session data
            const currentSession = await QuizSession.findOne({ _id: sessionId, userId })
                .populate('quizPoolId', 'questions topic subject userLevel');
            
            if (!currentSession) {
                throw new Error('Session not found or unauthorized');
            }
            
            // Get user's historical data
            const userProgress = await UserQuizProgress.findOne({ userId });
            const recentSessions = await QuizSession.find({ 
                userId, 
                status: 'completed',
                createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
            }).sort({ createdAt: -1 }).limit(10);
            
            // Calculate comprehensive performance metrics
            const performanceMetrics = await this.calculatePerformanceMetrics(
                currentSession, 
                recentSessions, 
                userProgress
            );
            
            // Determine user's adaptive pathway
            const adaptivePathway = this.determineAdaptivePathway(performanceMetrics);
            
            // Generate specific recommendations
            const recommendations = await this.generateAdaptiveRecommendations(
                performanceMetrics,
                adaptivePathway,
                currentSession
            );
            
            // Determine next session type
            const nextSessionType = this.determineNextSessionType(
                performanceMetrics,
                adaptivePathway,
                currentSession
            );
            
            return {
                userId,
                sessionId,
                evaluatedAt: new Date(),
                performanceMetrics,
                adaptivePathway,
                recommendations,
                nextSessionType,
                passed: performanceMetrics.currentScore >= this.evaluationCriteria.mastery[currentSession.sessionType],
                readyForAdvancement: this.assessAdvancementReadiness(performanceMetrics, adaptivePathway),
                needsRemediation: this.assessRemediationNeed(performanceMetrics, adaptivePathway),
                metadata: {
                    sessionType: currentSession.sessionType,
                    topic: currentSession.quizPoolId?.topic,
                    evaluationVersion: '1.0'
                }
            };
            
        } catch (error) {
            console.error('Error evaluating performance:', error);
            throw error;
        }
    }
    
    /**
     * Calculate comprehensive performance metrics
     */
    async calculatePerformanceMetrics(currentSession, recentSessions, userProgress) {
        try {
            const questions = currentSession.quizPoolId?.questions || [];
            const responses = currentSession.responses || [];
            
            // Current session metrics
            const currentScore = currentSession.score?.masteryScore || 0;
            const bloomScores = currentSession.score?.bloomLevelScores || {};
            
            // Performance trends from recent sessions
            const recentScores = recentSessions.map(s => s.score?.masteryScore || 0);
            const averageRecentScore = recentScores.length > 0 ? 
                recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length : 0;
            
            // Improvement trend
            const improvementTrend = this.calculateImprovementTrend(recentScores);
            
            // Consistency metrics
            const consistency = this.calculateConsistency(recentScores);
            
            // Time efficiency metrics
            const timeMetrics = this.calculateTimeMetrics(responses);
            
            // Hint usage patterns
            const hintMetrics = this.calculateHintMetrics(responses);
            
            // Bloom level performance analysis
            const bloomAnalysis = this.analyzeBloomPerformance(bloomScores, questions);
            
            // Learning velocity (improvement rate)
            const learningVelocity = this.calculateLearningVelocity(recentSessions);
            
            // Difficulty progression
            const difficultyProgression = this.analyzeDifficultyProgression(recentSessions);
            
            return {
                currentScore,
                averageRecentScore: Math.round(averageRecentScore),
                improvementTrend,
                consistency,
                timeMetrics,
                hintMetrics,
                bloomAnalysis,
                learningVelocity,
                difficultyProgression,
                sessionCount: recentSessions.length + 1,
                overallProgress: userProgress?.overallStats || {}
            };
            
        } catch (error) {
            console.error('Error calculating performance metrics:', error);
            throw error;
        }
    }
    
    /**
     * Determine user's adaptive pathway based on performance
     */
    determineAdaptivePathway(metrics) {
        try {
            const {
                currentScore,
                consistency,
                hintMetrics,
                timeMetrics,
                improvementTrend
            } = metrics;
            
            // High performer pathway
            if (currentScore >= 85 && consistency >= 80 && timeMetrics.efficiency >= 80) {
                return {
                    pathway: 'high_performer',
                    confidence: 0.9,
                    ...this.adaptivePathways.high_performer
                };
            }
            
            // Hint dependent pathway
            if (hintMetrics.usageRate >= 0.7 && currentScore >= 65) {
                return {
                    pathway: 'hint_dependent',
                    confidence: 0.8,
                    ...this.adaptivePathways.hint_dependent
                };
            }
            
            // Time pressured pathway
            if (timeMetrics.averageTime > 120 && currentScore >= 70) {
                return {
                    pathway: 'time_pressured',
                    confidence: 0.7,
                    ...this.adaptivePathways.time_pressured
                };
            }
            
            // Struggling learner pathway
            if (currentScore < 65 || consistency < 40 || improvementTrend < -10) {
                return {
                    pathway: 'struggling_learner',
                    confidence: 0.8,
                    ...this.adaptivePathways.struggling_learner
                };
            }
            
            // Default: steady learner
            return {
                pathway: 'steady_learner',
                confidence: 0.6,
                ...this.adaptivePathways.steady_learner
            };
            
        } catch (error) {
            console.error('Error determining adaptive pathway:', error);
            return {
                pathway: 'steady_learner',
                confidence: 0.3,
                ...this.adaptivePathways.steady_learner
            };
        }
    }
    
    /**
     * Generate adaptive recommendations based on pathway and performance
     */
    async generateAdaptiveRecommendations(metrics, pathway, session) {
        try {
            const recommendations = [...pathway.recommendations];
            
            // Add specific recommendations based on metrics
            if (metrics.bloomAnalysis.weakestLevel) {
                recommendations.push(
                    `Focus on ${metrics.bloomAnalysis.weakestLevel} level questions - current score: ${metrics.bloomAnalysis.scores[metrics.bloomAnalysis.weakestLevel] || 0}%`
                );
            }
            
            if (metrics.hintMetrics.usageRate > 0.6) {
                recommendations.push(
                    `Try to answer questions without hints first - current hint usage: ${Math.round(metrics.hintMetrics.usageRate * 100)}%`
                );
            }
            
            if (metrics.timeMetrics.averageTime > 120) {
                recommendations.push(
                    `Work on answering more quickly - average time: ${metrics.timeMetrics.averageTime}s per question`
                );
            }
            
            if (metrics.consistency < 50) {
                recommendations.push(
                    `Focus on consistent study habits to improve score stability - consistency score: ${metrics.consistency}%`
                );
            }
            
            // Add session-specific recommendations
            if (session.sessionType === 'formative' && metrics.currentScore < 60) {
                recommendations.push("Review the fundamental concepts before attempting more questions");
            }
            
            if (session.sessionType === 'final' && metrics.currentScore < 75) {
                recommendations.push("Consider additional practice sessions before retaking the final quiz");
            }
            
            return recommendations.slice(0, 5); // Limit to 5 most important recommendations
            
        } catch (error) {
            console.error('Error generating adaptive recommendations:', error);
            return ['Continue practicing and reviewing the material'];
        }
    }
    
    /**
     * Determine the next session type based on performance
     */
    determineNextSessionType(metrics, pathway, currentSession) {
        try {
            const { currentScore, improvementTrend, consistency } = metrics;
            const currentType = currentSession.sessionType;
            
            // If current session was formative
            if (currentType === 'formative') {
                if (currentScore >= 75 && consistency >= 60) {
                    return 'final'; // Ready for final assessment
                } else if (currentScore < 50 || pathway.pathway === 'struggling_learner') {
                    return 'simplified'; // Needs simplified questions
                } else {
                    return 'formative'; // Continue with formative sessions
                }
            }
            
            // If current session was final
            if (currentType === 'final') {
                if (currentScore >= 75) {
                    return 'advancement'; // Ready to advance to next topic
                } else if (currentScore < 60) {
                    return 'remediation'; // Needs remediation
                } else {
                    return 'formative'; // Go back to practice
                }
            }
            
            // If current session was simplified
            if (currentType === 'simplified') {
                if (currentScore >= 60 && improvementTrend >= 0) {
                    return 'formative'; // Ready for regular questions
                } else {
                    return 'remediation'; // Still needs support
                }
            }
            
            // If current session was remediation
            if (currentType === 'remediation') {
                if (currentScore >= 65) {
                    return 'formative'; // Back to regular practice
                } else {
                    return 'simplified'; // Still struggling
                }
            }
            
            return 'formative'; // Default fallback
            
        } catch (error) {
            console.error('Error determining next session type:', error);
            return 'formative';
        }
    }
    
    /**
     * Calculate improvement trend from recent scores
     */
    calculateImprovementTrend(scores) {
        if (scores.length < 2) return 0;
        
        const firstHalf = scores.slice(0, Math.ceil(scores.length / 2));
        const secondHalf = scores.slice(Math.floor(scores.length / 2));
        
        const firstAvg = firstHalf.reduce((sum, score) => sum + score, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, score) => sum + score, 0) / secondHalf.length;
        
        return Math.round(secondAvg - firstAvg);
    }
    
    /**
     * Calculate consistency score (lower standard deviation = higher consistency)
     */
    calculateConsistency(scores) {
        if (scores.length < 2) return 100;
        
        const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
        const stdDev = Math.sqrt(variance);
        
        return Math.max(0, Math.round(100 - stdDev));
    }
    
    /**
     * Calculate time-related metrics
     */
    calculateTimeMetrics(responses) {
        if (!responses.length) return { averageTime: 0, efficiency: 0 };
        
        const totalTime = responses.reduce((sum, r) => sum + (r.timeSpent || 0), 0);
        const averageTime = Math.round(totalTime / responses.length);
        const correctResponses = responses.filter(r => r.isCorrect);
        const averageCorrectTime = correctResponses.length > 0 ?
            correctResponses.reduce((sum, r) => sum + (r.timeSpent || 0), 0) / correctResponses.length : 0;
        
        // Efficiency: balance of speed and accuracy
        const efficiency = averageTime > 0 ? 
            Math.min(100, Math.round((correctResponses.length / responses.length) * 100 * (90 / Math.max(averageTime, 30)))) : 0;
        
        return {
            averageTime,
            averageCorrectTime: Math.round(averageCorrectTime),
            efficiency
        };
    }
    
    /**
     * Calculate hint usage metrics
     */
    calculateHintMetrics(responses) {
        if (!responses.length) return { usageRate: 0, effectiveness: 0 };
        
        const hintsUsed = responses.filter(r => r.hintUsed).length;
        const usageRate = hintsUsed / responses.length;
        
        // Effectiveness: percentage of hint-used questions that were answered correctly
        const hintedCorrect = responses.filter(r => r.hintUsed && r.isCorrect).length;
        const effectiveness = hintsUsed > 0 ? hintedCorrect / hintsUsed : 0;
        
        return {
            usageRate,
            effectiveness,
            totalHintsUsed: hintsUsed
        };
    }
    
    /**
     * Analyze Bloom level performance
     */
    analyzeBloomPerformance(bloomScores, questions) {
        const analysis = {
            scores: bloomScores,
            strongestLevel: null,
            weakestLevel: null,
            balance: 0
        };
        
        if (Object.keys(bloomScores).length === 0) return analysis;
        
        // Find strongest and weakest levels
        let maxScore = -1, minScore = 101;
        Object.entries(bloomScores).forEach(([level, score]) => {
            if (score > maxScore) {
                maxScore = score;
                analysis.strongestLevel = level;
            }
            if (score < minScore && score > 0) {
                minScore = score;
                analysis.weakestLevel = level;
            }
        });
        
        // Calculate balance (how evenly distributed the performance is)
        const scores = Object.values(bloomScores).filter(s => s > 0);
        if (scores.length > 1) {
            const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
            const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
            analysis.balance = Math.max(0, 100 - Math.sqrt(variance));
        }
        
        return analysis;
    }
    
    /**
     * Calculate learning velocity (rate of improvement)
     */
    calculateLearningVelocity(sessions) {
        if (sessions.length < 3) return 0;
        
        const scores = sessions.map(s => s.score?.masteryScore || 0);
        let totalImprovement = 0;
        let measurements = 0;
        
        for (let i = 1; i < scores.length; i++) {
            totalImprovement += scores[i] - scores[i - 1];
            measurements++;
        }
        
        return measurements > 0 ? Math.round(totalImprovement / measurements) : 0;
    }
    
    /**
     * Analyze difficulty progression
     */
    analyzeDifficultyProgression(sessions) {
        // This would analyze how well the user handles increasingly difficult questions
        // For now, returning a simple metric based on session types
        const finalSessions = sessions.filter(s => s.sessionType === 'final').length;
        const totalSessions = sessions.length;
        
        return {
            advancedSessionRatio: totalSessions > 0 ? finalSessions / totalSessions : 0,
            readyForAdvancement: finalSessions > 0 && sessions[0]?.score?.masteryScore >= 75
        };
    }
    
    /**
     * Assess if user is ready for advancement
     */
    assessAdvancementReadiness(metrics, pathway) {
        return (
            metrics.currentScore >= 85 &&
            metrics.consistency >= 70 &&
            pathway.pathway === 'high_performer' &&
            metrics.improvementTrend >= 0
        );
    }
    
    /**
     * Assess if user needs remediation
     */
    assessRemediationNeed(metrics, pathway) {
        return (
            metrics.currentScore < 60 ||
            metrics.consistency < 40 ||
            pathway.pathway === 'struggling_learner' ||
            metrics.improvementTrend < -15
        );
    }
    
    /**
     * Generate performance report for analytics
     */
    async generatePerformanceReport(userId, timeframe = 30) {
        try {
            const startDate = new Date(Date.now() - timeframe * 24 * 60 * 60 * 1000);
            
            const sessions = await QuizSession.find({
                userId,
                status: 'completed',
                completedAt: { $gte: startDate }
            }).populate('quizPoolId', 'topic subject userLevel').sort({ completedAt: 1 });
            
            if (sessions.length === 0) {
                return {
                    userId,
                    timeframe,
                    noData: true,
                    message: 'No completed sessions found in the specified timeframe'
                };
            }
            
            // Calculate aggregate metrics
            const scores = sessions.map(s => s.score?.masteryScore || 0);
            const averageScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
            const improvementTrend = this.calculateImprovementTrend(scores);
            const consistency = this.calculateConsistency(scores);
            
            // Topic-wise performance
            const topicPerformance = {};
            sessions.forEach(session => {
                const topic = session.quizPoolId?.topic;
                if (topic) {
                    if (!topicPerformance[topic]) {
                        topicPerformance[topic] = { scores: [], sessions: 0 };
                    }
                    topicPerformance[topic].scores.push(session.score?.masteryScore || 0);
                    topicPerformance[topic].sessions++;
                }
            });
            
            // Calculate topic averages
            Object.keys(topicPerformance).forEach(topic => {
                const data = topicPerformance[topic];
                data.average = Math.round(data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length);
            });
            
            return {
                userId,
                timeframe,
                reportGeneratedAt: new Date(),
                summary: {
                    totalSessions: sessions.length,
                    averageScore,
                    improvementTrend,
                    consistency,
                    highestScore: Math.max(...scores),
                    lowestScore: Math.min(...scores)
                },
                topicPerformance,
                recentTrend: scores.slice(-5), // Last 5 scores
                recommendations: this.generateReportRecommendations({
                    averageScore,
                    improvementTrend,
                    consistency,
                    topicPerformance
                })
            };
            
        } catch (error) {
            console.error('Error generating performance report:', error);
            throw error;
        }
    }
    
    /**
     * Generate recommendations for performance report
     */
    generateReportRecommendations(reportData) {
        const recommendations = [];
        const { averageScore, improvementTrend, consistency } = reportData;
        
        if (averageScore >= 80) {
            recommendations.push("Excellent performance! Consider advancing to more challenging topics.");
        } else if (averageScore >= 60) {
            recommendations.push("Good progress! Focus on consistency and challenging areas.");
        } else {
            recommendations.push("Consider reviewing fundamental concepts and taking more practice sessions.");
        }
        
        if (improvementTrend > 10) {
            recommendations.push("Great improvement trend! Keep up the momentum.");
        } else if (improvementTrend < -10) {
            recommendations.push("Scores are declining. Take a break and review recent topics.");
        }
        
        if (consistency < 50) {
            recommendations.push("Work on consistent study habits to stabilize your performance.");
        }
        
        return recommendations;
    }
}

module.exports = new AdaptiveEvaluationService();