// services/progressTrackingService.js
const { QuizSession, UserQuizProgress } = require('../models/Quiz');
const scoringService = require('./scoringService');
const adaptiveEvaluationService = require('./adaptiveEvaluationService');

class ProgressTrackingService {
    
    /**
     * Progress milestones and badges
     */
    progressMilestones = {
        sessions: {
            first_session: { threshold: 1, badge: "Getting Started", points: 10 },
            regular_learner: { threshold: 5, badge: "Regular Learner", points: 25 },
            dedicated_student: { threshold: 10, badge: "Dedicated Student", points: 50 },
            learning_champion: { threshold: 25, badge: "Learning Champion", points: 100 },
            master_learner: { threshold: 50, badge: "Master Learner", points: 200 }
        },
        scores: {
            first_pass: { threshold: 75, badge: "First Success", points: 20 },
            consistent_performer: { threshold: 80, badge: "Consistent Performer", points: 40 },
            excellence: { threshold: 90, badge: "Excellence Achieved", points: 75 },
            perfection: { threshold: 100, badge: "Perfect Score", points: 100 }
        },
        streaks: {
            hot_streak: { threshold: 3, badge: "Hot Streak", points: 15 },
            on_fire: { threshold: 5, badge: "On Fire", points: 30 },
            unstoppable: { threshold: 10, badge: "Unstoppable", points: 75 }
        },
        bloom: {
            bloom_explorer: { threshold: 3, badge: "Bloom Explorer", points: 25 }, // 3 different levels
            bloom_master: { threshold: 5, badge: "Bloom Master", points: 50 },    // All 5 main levels
            cognitive_champion: { threshold: 6, badge: "Cognitive Champion", points: 100 } // All 6 levels
        }
    };
    
    /**
     * Track user progress after completing a quiz session
     * @param {ObjectId} userId - User ID
     * @param {ObjectId} sessionId - Completed session ID
     * @returns {Object} Progress update result
     */
    async trackSessionProgress(userId, sessionId) {
        try {
            console.log(`📊 Tracking progress for user ${userId}, session ${sessionId}`);
            
            // Get session data
            const session = await QuizSession.findOne({ _id: sessionId, userId })
                .populate('quizPoolId', 'topic subject userLevel');
            
            if (!session || session.status !== 'completed') {
                throw new Error('Session not found or not completed');
            }
            
            // Get or create user progress
            let userProgress = await UserQuizProgress.findOne({ userId });
            if (!userProgress) {
                userProgress = new UserQuizProgress({ userId });
            }
            
            // Update topic-specific progress
            const topicUpdate = await this.updateTopicProgress(
                userProgress, 
                session
            );
            
            // Update overall progress statistics
            const overallUpdate = await this.updateOverallProgress(
                userProgress, 
                session
            );
            
            // Check for new achievements
            const achievements = await this.checkAchievements(
                userProgress, 
                session
            );
            
            // Calculate learning insights
            const insights = await this.generateLearningInsights(
                userProgress,
                session
            );
            
            // Save updated progress
            await userProgress.save();
            
            return {
                userId,
                sessionId,
                topicUpdate,
                overallUpdate,
                achievements,
                insights,
                progressSummary: this.generateProgressSummary(userProgress),
                updatedAt: new Date()
            };
            
        } catch (error) {
            console.error('Error tracking session progress:', error);
            throw error;
        }
    }
    
    /**
     * Update topic-specific progress
     */
    async updateTopicProgress(userProgress, session) {
        try {
            const topic = session.quizPoolId?.topic;
            if (!topic) throw new Error('Topic not found in session');
            
            // Find or create topic progress
            let topicProgress = userProgress.topicProgress.find(tp => tp.topic === topic);
            if (!topicProgress) {
                topicProgress = {
                    topic,
                    totalSessions: 0,
                    completedSessions: 0,
                    averageMasteryScore: 0,
                    finalQuizCompleted: false,
                    finalMasteryScore: 0,
                    needsRemediation: false,
                    sessionHistory: []
                };
                userProgress.topicProgress.push(topicProgress);
            }
            
            // Update session counts
            topicProgress.completedSessions += 1;
            topicProgress.lastSessionDate = new Date();
            
            // Add to session history
            const sessionRecord = {
                sessionId: session._id,
                sessionType: session.sessionType,
                masteryScore: session.score?.masteryScore || 0,
                completedAt: session.completedAt,
                bloomScores: session.score?.bloomLevelScores || {},
                timeSpent: session.responses?.reduce((sum, r) => sum + (r.timeSpent || 0), 0) || 0,
                hintsUsed: session.responses?.filter(r => r.hintUsed).length || 0
            };
            
            topicProgress.sessionHistory.push(sessionRecord);
            
            // Keep only last 20 sessions in history
            if (topicProgress.sessionHistory.length > 20) {
                topicProgress.sessionHistory = topicProgress.sessionHistory.slice(-20);
            }
            
            // Update average mastery score
            const allScores = topicProgress.sessionHistory.map(s => s.masteryScore);
            topicProgress.averageMasteryScore = Math.round(
                allScores.reduce((sum, score) => sum + score, 0) / allScores.length
            );
            
            // Update final quiz status
            if (session.sessionType === 'final') {
                topicProgress.finalQuizCompleted = true;
                topicProgress.finalMasteryScore = session.score?.masteryScore || 0;
                topicProgress.needsRemediation = (session.score?.masteryScore || 0) < 75;
            } else {
                // Check if needs remediation based on recent performance
                const recentScores = allScores.slice(-3);
                const recentAverage = recentScores.length > 0 ?
                    recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length : 0;
                topicProgress.needsRemediation = recentAverage < 60;
            }
            
            return {
                topic,
                sessionCount: topicProgress.completedSessions,
                averageScore: topicProgress.averageMasteryScore,
                improvement: this.calculateTopicImprovement(topicProgress.sessionHistory),
                status: this.determineTopicStatus(topicProgress)
            };
            
        } catch (error) {
            console.error('Error updating topic progress:', error);
            throw error;
        }
    }
    
    /**
     * Update overall progress statistics
     */
    async updateOverallProgress(userProgress, session) {
        try {
            const stats = userProgress.overallStats;
            
            // Update session count
            stats.totalQuizzesCompleted += 1;
            
            // Update average score
            const allScores = [];
            userProgress.topicProgress.forEach(tp => {
                allScores.push(...tp.sessionHistory.map(s => s.masteryScore));
            });
            
            if (allScores.length > 0) {
                stats.averageScore = Math.round(
                    allScores.reduce((sum, score) => sum + score, 0) / allScores.length
                );
            }
            
            // Update Bloom level performance
            const bloomPerformance = this.analyzeOverallBloomPerformance(userProgress.topicProgress);
            stats.strongestBloomLevel = bloomPerformance.strongest;
            stats.weakestBloomLevel = bloomPerformance.weakest;
            
            // Update total time spent
            const sessionTime = session.responses?.reduce((sum, r) => sum + (r.timeSpent || 0), 0) || 0;
            stats.totalTimeSpent += Math.round(sessionTime / 60); // Convert to minutes
            
            // Calculate streak information
            const streakInfo = this.calculateStreaks(userProgress.topicProgress);
            stats.currentStreak = streakInfo.current;
            stats.bestStreak = Math.max(stats.bestStreak || 0, streakInfo.best);
            
            return {
                totalSessions: stats.totalQuizzesCompleted,
                averageScore: stats.averageScore,
                totalTimeSpent: stats.totalTimeSpent,
                currentStreak: stats.currentStreak,
                bestStreak: stats.bestStreak,
                bloomStrengths: stats.strongestBloomLevel,
                bloomWeaknesses: stats.weakestBloomLevel
            };
            
        } catch (error) {
            console.error('Error updating overall progress:', error);
            throw error;
        }
    }
    
    /**
     * Check for new achievements and badges
     */
    async checkAchievements(userProgress, session) {
        try {
            const newAchievements = [];
            const stats = userProgress.overallStats;
            const sessionScore = session.score?.masteryScore || 0;
            
            // Check session-based achievements
            const sessionAchievements = this.checkSessionAchievements(stats.totalQuizzesCompleted);
            newAchievements.push(...sessionAchievements);
            
            // Check score-based achievements
            const scoreAchievements = this.checkScoreAchievements(sessionScore, stats.averageScore);
            newAchievements.push(...scoreAchievements);
            
            // Check streak-based achievements
            const streakAchievements = this.checkStreakAchievements(stats.currentStreak);
            newAchievements.push(...streakAchievements);
            
            // Check Bloom level achievements
            const bloomAchievements = this.checkBloomAchievements(userProgress.topicProgress);
            newAchievements.push(...bloomAchievements);
            
            // Add achievements to user progress (avoid duplicates)
            const existingBadges = (userProgress.achievements || []).map(a => a.badge);
            const uniqueAchievements = newAchievements.filter(a => !existingBadges.includes(a.badge));
            
            if (!userProgress.achievements) userProgress.achievements = [];
            uniqueAchievements.forEach(achievement => {
                userProgress.achievements.push({
                    ...achievement,
                    earnedAt: new Date(),
                    sessionId: session._id
                });
            });
            
            // Update total points
            const newPoints = uniqueAchievements.reduce((sum, a) => sum + a.points, 0);
            stats.totalPoints = (stats.totalPoints || 0) + newPoints;
            
            return {
                newAchievements: uniqueAchievements,
                totalAchievements: userProgress.achievements.length,
                newPoints,
                totalPoints: stats.totalPoints
            };
            
        } catch (error) {
            console.error('Error checking achievements:', error);
            return { newAchievements: [], totalAchievements: 0, newPoints: 0, totalPoints: 0 };
        }
    }
    
    /**
     * Generate learning insights based on progress data
     */
    async generateLearningInsights(userProgress, session) {
        try {
            const insights = {
                learningVelocity: 0,
                consistencyTrend: 'stable',
                bloomDevelopment: {},
                timeEfficiency: 'average',
                recommendations: [],
                strengthsAndWeaknesses: {}
            };
            
            // Calculate learning velocity
            const allSessions = [];
            userProgress.topicProgress.forEach(tp => {
                allSessions.push(...tp.sessionHistory);
            });
            allSessions.sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt));
            
            if (allSessions.length >= 3) {
                const recentSessions = allSessions.slice(-5);
                const scores = recentSessions.map(s => s.masteryScore);
                insights.learningVelocity = adaptiveEvaluationService.calculateImprovementTrend(scores);
            }
            
            // Analyze consistency
            if (allSessions.length >= 3) {
                const scores = allSessions.map(s => s.masteryScore);
                const consistency = adaptiveEvaluationService.calculateConsistency(scores);
                insights.consistencyTrend = consistency > 70 ? 'improving' : consistency < 50 ? 'inconsistent' : 'stable';
            }
            
            // Analyze Bloom level development
            const bloomAnalysis = this.analyzeBloomDevelopment(allSessions);
            insights.bloomDevelopment = bloomAnalysis;
            
            // Analyze time efficiency
            const avgTime = session.responses?.reduce((sum, r, i, arr) => sum + (r.timeSpent || 0), 0) / (session.responses?.length || 1) || 0;
            insights.timeEfficiency = avgTime < 45 ? 'fast' : avgTime > 120 ? 'slow' : 'average';
            
            // Generate recommendations
            insights.recommendations = this.generateProgressRecommendations(insights, userProgress);
            
            // Identify strengths and weaknesses
            insights.strengthsAndWeaknesses = this.identifyStrengthsAndWeaknesses(userProgress, session);
            
            return insights;
            
        } catch (error) {
            console.error('Error generating learning insights:', error);
            return { recommendations: ['Continue practicing regularly'] };
        }
    }
    
    /**
     * Calculate improvement trend for a topic
     */
    calculateTopicImprovement(sessionHistory) {
        if (sessionHistory.length < 2) return 0;
        
        const scores = sessionHistory.map(s => s.masteryScore);
        const firstScore = scores[0];
        const lastScore = scores[scores.length - 1];
        
        return lastScore - firstScore;
    }
    
    /**
     * Determine topic status based on progress
     */
    determineTopicStatus(topicProgress) {
        if (topicProgress.finalQuizCompleted && topicProgress.finalMasteryScore >= 75) {
            return 'mastered';
        }
        if (topicProgress.averageMasteryScore >= 75) {
            return 'proficient';
        }
        if (topicProgress.needsRemediation) {
            return 'needs_improvement';
        }
        if (topicProgress.completedSessions >= 3) {
            return 'developing';
        }
        return 'beginning';
    }
    
    /**
     * Analyze overall Bloom level performance
     */
    analyzeOverallBloomPerformance(topicProgresses) {
        const bloomScores = {};
        let totalCounts = {};
        
        topicProgresses.forEach(tp => {
            tp.sessionHistory.forEach(session => {
                Object.entries(session.bloomScores || {}).forEach(([level, score]) => {
                    if (!bloomScores[level]) {
                        bloomScores[level] = 0;
                        totalCounts[level] = 0;
                    }
                    bloomScores[level] += score;
                    totalCounts[level] += 1;
                });
            });
        });
        
        // Calculate averages
        const averages = {};
        Object.keys(bloomScores).forEach(level => {
            averages[level] = totalCounts[level] > 0 ? 
                Math.round(bloomScores[level] / totalCounts[level]) : 0;
        });
        
        // Find strongest and weakest
        let strongest = null, weakest = null;
        let maxScore = -1, minScore = 101;
        
        Object.entries(averages).forEach(([level, avg]) => {
            if (avg > maxScore) {
                maxScore = avg;
                strongest = level;
            }
            if (avg < minScore && avg > 0) {
                minScore = avg;
                weakest = level;
            }
        });
        
        return { strongest, weakest, averages };
    }
    
    /**
     * Calculate streak information
     */
    calculateStreaks(topicProgresses) {
        const allSessions = [];
        topicProgresses.forEach(tp => {
            allSessions.push(...tp.sessionHistory);
        });
        
        // Sort by completion date
        allSessions.sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt));
        
        let currentStreak = 0;
        let bestStreak = 0;
        let streak = 0;
        
        // Calculate streaks (75%+ scores)
        allSessions.forEach(session => {
            if (session.masteryScore >= 75) {
                streak += 1;
                bestStreak = Math.max(bestStreak, streak);
            } else {
                streak = 0;
            }
        });
        
        // Current streak is from the end
        for (let i = allSessions.length - 1; i >= 0; i--) {
            if (allSessions[i].masteryScore >= 75) {
                currentStreak++;
            } else {
                break;
            }
        }
        
        return { current: currentStreak, best: bestStreak };
    }
    
    /**
     * Check session-based achievements
     */
    checkSessionAchievements(totalSessions) {
        const achievements = [];
        
        Object.entries(this.progressMilestones.sessions).forEach(([key, milestone]) => {
            if (totalSessions === milestone.threshold) {
                achievements.push({
                    type: 'sessions',
                    badge: milestone.badge,
                    points: milestone.points,
                    description: `Completed ${milestone.threshold} quiz sessions`
                });
            }
        });
        
        return achievements;
    }
    
    /**
     * Check score-based achievements
     */
    checkScoreAchievements(currentScore, averageScore) {
        const achievements = [];
        
        Object.entries(this.progressMilestones.scores).forEach(([key, milestone]) => {
            if (currentScore >= milestone.threshold || averageScore >= milestone.threshold) {
                achievements.push({
                    type: 'scores',
                    badge: milestone.badge,
                    points: milestone.points,
                    description: `Achieved ${milestone.threshold}% mastery score`
                });
            }
        });
        
        return achievements;
    }
    
    /**
     * Check streak-based achievements
     */
    checkStreakAchievements(currentStreak) {
        const achievements = [];
        
        Object.entries(this.progressMilestones.streaks).forEach(([key, milestone]) => {
            if (currentStreak === milestone.threshold) {
                achievements.push({
                    type: 'streaks',
                    badge: milestone.badge,
                    points: milestone.points,
                    description: `Achieved ${milestone.threshold} consecutive passing scores`
                });
            }
        });
        
        return achievements;
    }
    
    /**
     * Check Bloom level achievements
     */
    checkBloomAchievements(topicProgresses) {
        const achievements = [];
        const uniqueBloomLevels = new Set();
        
        topicProgresses.forEach(tp => {
            tp.sessionHistory.forEach(session => {
                Object.keys(session.bloomScores || {}).forEach(level => {
                    if ((session.bloomScores[level] || 0) >= 70) {
                        uniqueBloomLevels.add(level);
                    }
                });
            });
        });
        
        const levelCount = uniqueBloomLevels.size;
        
        Object.entries(this.progressMilestones.bloom).forEach(([key, milestone]) => {
            if (levelCount >= milestone.threshold) {
                achievements.push({
                    type: 'bloom',
                    badge: milestone.badge,
                    points: milestone.points,
                    description: `Mastered ${levelCount} Bloom taxonomy levels`
                });
            }
        });
        
        return achievements;
    }
    
    /**
     * Analyze Bloom level development over time
     */
    analyzeBloomDevelopment(allSessions) {
        const development = {};
        const bloomLevels = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];
        
        bloomLevels.forEach(level => {
            const levelScores = allSessions
                .filter(s => s.bloomScores && s.bloomScores[level])
                .map(s => s.bloomScores[level]);
            
            if (levelScores.length >= 2) {
                const trend = levelScores[levelScores.length - 1] - levelScores[0];
                development[level] = {
                    trend: trend > 5 ? 'improving' : trend < -5 ? 'declining' : 'stable',
                    currentLevel: levelScores[levelScores.length - 1],
                    sessionsCount: levelScores.length
                };
            }
        });
        
        return development;
    }
    
    /**
     * Generate progress-based recommendations
     */
    generateProgressRecommendations(insights, userProgress) {
        const recommendations = [];
        
        if (insights.learningVelocity < -10) {
            recommendations.push("Your scores are declining. Take a break and review recent topics.");
        } else if (insights.learningVelocity > 15) {
            recommendations.push("Excellent improvement! Consider advancing to more challenging topics.");
        }
        
        if (insights.consistencyTrend === 'inconsistent') {
            recommendations.push("Work on consistent study habits to stabilize your performance.");
        }
        
        if (insights.timeEfficiency === 'slow') {
            recommendations.push("Try to answer questions more quickly. Consider practicing with time limits.");
        } else if (insights.timeEfficiency === 'fast') {
            recommendations.push("You're answering quickly. Make sure to read questions carefully.");
        }
        
        // Bloom level recommendations
        Object.entries(insights.bloomDevelopment).forEach(([level, data]) => {
            if (data.trend === 'declining') {
                recommendations.push(`Focus on ${level} level questions - your performance is declining.`);
            }
        });
        
        return recommendations.slice(0, 3); // Limit to 3 most important
    }
    
    /**
     * Identify strengths and weaknesses
     */
    identifyStrengthsAndWeaknesses(userProgress, session) {
        const analysis = {
            strengths: [],
            weaknesses: [],
            opportunities: []
        };
        
        const stats = userProgress.overallStats;
        
        // Analyze strengths
        if (stats.averageScore >= 80) {
            analysis.strengths.push("High average performance");
        }
        if (stats.currentStreak >= 3) {
            analysis.strengths.push(`Strong consistency (${stats.currentStreak} consecutive passes)`);
        }
        if (stats.strongestBloomLevel) {
            analysis.strengths.push(`Strong in ${stats.strongestBloomLevel} level thinking`);
        }
        
        // Analyze weaknesses
        if (stats.averageScore < 60) {
            analysis.weaknesses.push("Below average performance overall");
        }
        if (stats.weakestBloomLevel) {
            analysis.weaknesses.push(`Needs improvement in ${stats.weakestBloomLevel} level thinking`);
        }
        
        // Session-specific hints
        const hintUsage = session.responses?.filter(r => r.hintUsed).length || 0;
        const totalQuestions = session.responses?.length || 1;
        if (hintUsage / totalQuestions > 0.7) {
            analysis.weaknesses.push("High dependency on hints");
        }
        
        // Opportunities
        if (analysis.strengths.length > analysis.weaknesses.length) {
            analysis.opportunities.push("Ready for advanced topics or mentoring others");
        }
        if (stats.totalQuizzesCompleted >= 10) {
            analysis.opportunities.push("Consider exploring new topic areas");
        }
        
        return analysis;
    }
    
    /**
     * Generate comprehensive progress summary
     */
    generateProgressSummary(userProgress) {
        const stats = userProgress.overallStats;
        const topicsCount = userProgress.topicProgress.length;
        const masteredTopics = userProgress.topicProgress.filter(tp => 
            tp.finalQuizCompleted && tp.finalMasteryScore >= 75
        ).length;
        
        return {
            level: this.determineLearnerLevel(stats),
            totalSessions: stats.totalQuizzesCompleted,
            averageScore: stats.averageScore,
            topicsEngaged: topicsCount,
            topicsMastered: masteredTopics,
            totalTimeSpent: stats.totalTimeSpent,
            achievements: (userProgress.achievements || []).length,
            totalPoints: stats.totalPoints || 0,
            currentStreak: stats.currentStreak || 0,
            progressRate: this.calculateProgressRate(userProgress)
        };
    }
    
    /**
     * Determine learner level based on performance
     */
    determineLearnerLevel(stats) {
        const score = stats.averageScore || 0;
        const sessions = stats.totalQuizzesCompleted || 0;
        
        if (score >= 90 && sessions >= 20) return 'Expert';
        if (score >= 80 && sessions >= 15) return 'Advanced';
        if (score >= 70 && sessions >= 10) return 'Intermediate';
        if (score >= 60 && sessions >= 5) return 'Developing';
        return 'Beginner';
    }
    
    /**
     * Calculate overall progress rate
     */
    calculateProgressRate(userProgress) {
        const daysSinceStart = userProgress.createdAt ? 
            (Date.now() - userProgress.createdAt.getTime()) / (1000 * 60 * 60 * 24) : 1;
        const sessionsPerDay = (userProgress.overallStats.totalQuizzesCompleted || 0) / daysSinceStart;
        
        if (sessionsPerDay >= 1) return 'High';
        if (sessionsPerDay >= 0.5) return 'Moderate';
        if (sessionsPerDay >= 0.2) return 'Steady';
        return 'Slow';
    }
    
    /**
     * Get detailed progress analytics for a specific timeframe
     * @param {ObjectId} userId - User ID
     * @param {number} days - Number of days to analyze (default: 30)
     * @returns {Object} Detailed analytics
     */
    async getProgressAnalytics(userId, days = 30) {
        try {
            const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
            
            const userProgress = await UserQuizProgress.findOne({ userId });
            if (!userProgress) {
                return { noData: true, message: 'No progress data found' };
            }
            
            // Filter sessions within timeframe
            const recentSessions = [];
            userProgress.topicProgress.forEach(tp => {
                const filteredSessions = tp.sessionHistory.filter(s => 
                    new Date(s.completedAt) >= startDate
                );
                recentSessions.push(...filteredSessions.map(s => ({ ...s, topic: tp.topic })));
            });
            
            if (recentSessions.length === 0) {
                return { noData: true, message: 'No sessions found in the specified timeframe' };
            }
            
            // Sort by date
            recentSessions.sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt));
            
            const analytics = {
                timeframe: days,
                totalSessions: recentSessions.length,
                averageScore: Math.round(
                    recentSessions.reduce((sum, s) => sum + s.masteryScore, 0) / recentSessions.length
                ),
                improvement: adaptiveEvaluationService.calculateImprovementTrend(
                    recentSessions.map(s => s.masteryScore)
                ),
                topicBreakdown: this.analyzeTopicBreakdown(recentSessions),
                dailyActivity: this.analyzeDailyActivity(recentSessions, days),
                bloomProgress: this.analyzeBloomProgress(recentSessions),
                timeSpent: Math.round(recentSessions.reduce((sum, s) => sum + (s.timeSpent || 0), 0) / 60),
                efficiency: this.calculateEfficiency(recentSessions),
                recommendations: this.generateAnalyticsRecommendations(recentSessions)
            };
            
            return analytics;
            
        } catch (error) {
            console.error('Error getting progress analytics:', error);
            throw error;
        }
    }
    
    /**
     * Analyze topic breakdown for analytics
     */
    analyzeTopicBreakdown(sessions) {
        const breakdown = {};
        
        sessions.forEach(session => {
            if (!breakdown[session.topic]) {
                breakdown[session.topic] = {
                    sessions: 0,
                    totalScore: 0,
                    averageScore: 0
                };
            }
            breakdown[session.topic].sessions++;
            breakdown[session.topic].totalScore += session.masteryScore;
        });
        
        Object.keys(breakdown).forEach(topic => {
            const data = breakdown[topic];
            data.averageScore = Math.round(data.totalScore / data.sessions);
        });
        
        return breakdown;
    }
    
    /**
     * Analyze daily activity patterns
     */
    analyzeDailyActivity(sessions, days) {
        const dailyData = {};
        const today = new Date();
        
        // Initialize all days
        for (let i = 0; i < days; i++) {
            const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
            const dateKey = date.toISOString().split('T')[0];
            dailyData[dateKey] = { sessions: 0, averageScore: 0, scores: [] };
        }
        
        // Fill with session data
        sessions.forEach(session => {
            const dateKey = new Date(session.completedAt).toISOString().split('T')[0];
            if (dailyData[dateKey]) {
                dailyData[dateKey].sessions++;
                dailyData[dateKey].scores.push(session.masteryScore);
            }
        });
        
        // Calculate averages
        Object.keys(dailyData).forEach(date => {
            const data = dailyData[date];
            if (data.scores.length > 0) {
                data.averageScore = Math.round(
                    data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length
                );
            }
            delete data.scores; // Remove raw scores to save space
        });
        
        return dailyData;
    }
    
    /**
     * Analyze Bloom level progress over time
     */
    analyzeBloomProgress(sessions) {
        const bloomProgress = {};
        const bloomLevels = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];
        
        bloomLevels.forEach(level => {
            bloomProgress[level] = {
                sessions: 0,
                totalScore: 0,
                averageScore: 0,
                trend: 'stable'
            };
        });
        
        sessions.forEach(session => {
            Object.entries(session.bloomScores || {}).forEach(([level, score]) => {
                if (bloomProgress[level]) {
                    bloomProgress[level].sessions++;
                    bloomProgress[level].totalScore += score;
                }
            });
        });
        
        // Calculate averages and trends
        bloomLevels.forEach(level => {
            const data = bloomProgress[level];
            if (data.sessions > 0) {
                data.averageScore = Math.round(data.totalScore / data.sessions);
            }
        });
        
        return bloomProgress;
    }
    
    /**
     * Calculate learning efficiency metrics
     */
    calculateEfficiency(sessions) {
        if (sessions.length === 0) return 0;
        
        const totalTime = sessions.reduce((sum, s) => sum + (s.timeSpent || 0), 0);
        const averageTime = totalTime / sessions.length;
        const averageScore = sessions.reduce((sum, s) => sum + s.masteryScore, 0) / sessions.length;
        
        // Efficiency: balance of speed and accuracy
        // Target: high score in reasonable time (60-90 seconds per question average)
        const optimalTime = 75; // seconds per question
        const timeEfficiency = Math.min(100, (optimalTime / Math.max(averageTime, 30)) * 100);
        const scoreEfficiency = averageScore;
        
        return Math.round((timeEfficiency + scoreEfficiency) / 2);
    }
    
    /**
     * Generate recommendations based on analytics
     */
    generateAnalyticsRecommendations(sessions) {
        const recommendations = [];
        
        if (sessions.length < 5) {
            recommendations.push("Try to take more quiz sessions to build momentum");
        }
        
        const averageScore = sessions.reduce((sum, s) => sum + s.masteryScore, 0) / sessions.length;
        if (averageScore < 60) {
            recommendations.push("Focus on reviewing fundamental concepts before taking more quizzes");
        } else if (averageScore > 85) {
            recommendations.push("Excellent performance! Consider advancing to more challenging topics");
        }
        
        const improvement = adaptiveEvaluationService.calculateImprovementTrend(
            sessions.map(s => s.masteryScore)
        );
        if (improvement < -10) {
            recommendations.push("Your scores are declining. Take a break and review recent topics");
        } else if (improvement > 15) {
            recommendations.push("Great improvement trend! Keep up the momentum");
        }
        
        return recommendations;
    }
}

module.exports = new ProgressTrackingService();