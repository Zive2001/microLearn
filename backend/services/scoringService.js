// services/scoringService.js

class ScoringService {
    
    /**
     * Scoring rules for different response patterns
     * Based on your specification: CC: +1, CW: -1, WC: +0.5, WW: -0.5
     */
    scoringRules = {
        CC: { points: 1.0, description: "Correct on first attempt" },
        CW: { points: -1.0, description: "Correct first, then wrong" },
        WC: { points: 0.5, description: "Wrong first, then correct" },
        WW: { points: -0.5, description: "Wrong on multiple attempts" },
        C: { points: 1.0, description: "Single correct attempt" },
        W: { points: -1.0, description: "Single wrong attempt" }
    };
    
    /**
     * Mastery thresholds for different session types
     */
    masteryThresholds = {
        formative: 60,      // Lower threshold for learning sessions
        final: 75,          // Standard mastery threshold
        simplified: 50,     // Lower threshold for struggling learners
        remediation: 65     // Moderate threshold for remediation
    };
    
    /**
     * Bloom level weights for advanced scoring
     */
    bloomWeights = {
        'Remember': 1.0,
        'Understand': 1.1,
        'Apply': 1.2,
        'Analyze': 1.3,
        'Evaluate': 1.4,
        'Create': 1.5
    };
    
    /**
     * Calculate mastery score for a quiz session
     * @param {Array} responses - Array of user responses
     * @param {string} sessionType - Type of session (formative, final, etc.)
     * @param {Array} questions - Array of questions with Bloom levels
     * @returns {Object} Scoring result
     */
    calculateMasteryScore(responses, sessionType = 'formative', questions = []) {
        try {
            if (!responses || responses.length === 0) {
                return {
                    rawScore: 0,
                    masteryScore: 0,
                    passed: false,
                    breakdown: {},
                    recommendations: ['Complete at least one question to receive a score']
                };
            }
            
            let totalRawScore = 0;
            let maxPossibleScore = responses.length;
            const breakdown = {
                CC: 0, CW: 0, WC: 0, WW: 0, C: 0, W: 0,
                totalQuestions: responses.length,
                correctQuestions: 0,
                hintsUsed: 0,
                averageTimePerQuestion: 0,
                bloomLevelScores: {}
            };
            
            let totalTime = 0;
            
            // Process each response
            responses.forEach((response, index) => {
                const pattern = this.getResponsePattern(response);
                const points = this.scoringRules[pattern].points;
                
                // Apply Bloom level weight if questions provided
                let finalPoints = points;
                if (questions[index]) {
                    const bloomLevel = questions[index].bloomLevel || 'Remember';
                    const weight = this.bloomWeights[bloomLevel] || 1.0;
                    finalPoints = points * weight;
                    
                    // Track Bloom level performance
                    if (!breakdown.bloomLevelScores[bloomLevel]) {
                        breakdown.bloomLevelScores[bloomLevel] = { correct: 0, total: 0, score: 0 };
                    }
                    breakdown.bloomLevelScores[bloomLevel].total++;
                    if (response.isCorrect) {
                        breakdown.bloomLevelScores[bloomLevel].correct++;
                    }
                }
                
                totalRawScore += finalPoints;
                breakdown[pattern]++;
                
                if (response.isCorrect) {
                    breakdown.correctQuestions++;
                }
                if (response.hintUsed) {
                    breakdown.hintsUsed++;
                }
                totalTime += response.timeSpent || 0;
            });
            
            // Calculate Bloom level scores
            Object.keys(breakdown.bloomLevelScores).forEach(level => {
                const levelData = breakdown.bloomLevelScores[level];
                levelData.score = levelData.total > 0 ? 
                    Math.round((levelData.correct / levelData.total) * 100) : 0;
            });
            
            breakdown.averageTimePerQuestion = responses.length > 0 ? 
                Math.round(totalTime / responses.length) : 0;
            
            // Convert to percentage (0-100)
            const normalizedScore = this.normalizeScore(totalRawScore, maxPossibleScore);
            const masteryScore = Math.max(0, Math.min(100, normalizedScore));
            
            // Determine if passed
            const threshold = this.masteryThresholds[sessionType] || 75;
            const passed = masteryScore >= threshold;
            
            // Generate recommendations
            const recommendations = this.generateRecommendations(
                breakdown, masteryScore, sessionType, passed
            );
            
            return {
                rawScore: totalRawScore,
                masteryScore: Math.round(masteryScore),
                passed,
                threshold,
                breakdown,
                recommendations,
                sessionType
            };
            
        } catch (error) {
            console.error('Error calculating mastery score:', error);
            return {
                rawScore: 0,
                masteryScore: 0,
                passed: false,
                breakdown: {},
                recommendations: ['Error calculating score - please try again']
            };
        }
    }
    
    /**
     * Determine response pattern (CC, CW, WC, WW, C, W)
     * @param {Object} response - User response object
     * @returns {string} Response pattern
     */
    getResponsePattern(response) {
        const attempts = response.attemptHistory || [];
        
        if (attempts.length === 0) {
            return response.isCorrect ? 'C' : 'W';
        }
        
        if (attempts.length === 1) {
            return attempts[0].correct ? 'C' : 'W';
        }
        
        // Multiple attempts
        const firstCorrect = attempts[0].correct;
        const finalCorrect = response.isCorrect;
        
        if (firstCorrect && finalCorrect) return 'CC';
        if (firstCorrect && !finalCorrect) return 'CW';
        if (!firstCorrect && finalCorrect) return 'WC';
        return 'WW'; // !firstCorrect && !finalCorrect
    }
    
    /**
     * Normalize raw score to 0-100 scale
     * @param {number} rawScore - Raw calculated score
     * @param {number} maxPossible - Maximum possible score
     * @returns {number} Normalized score (0-100)
     */
    normalizeScore(rawScore, maxPossible) {
        if (maxPossible === 0) return 0;
        
        // Score can be negative due to penalties, so we need to adjust the scale
        // Minimum possible score is -maxPossible, maximum is +maxPossible
        const minPossible = -maxPossible;
        const scoreRange = maxPossible - minPossible; // 2 * maxPossible
        
        // Shift score to positive range (0 to 2*maxPossible)
        const shiftedScore = rawScore - minPossible;
        
        // Convert to percentage
        return (shiftedScore / scoreRange) * 100;
    }
    
    /**
     * Generate recommendations based on performance
     * @param {Object} breakdown - Score breakdown
     * @param {number} masteryScore - Final mastery score
     * @param {string} sessionType - Session type
     * @param {boolean} passed - Whether user passed
     * @returns {Array} Recommendations
     */
    generateRecommendations(breakdown, masteryScore, sessionType, passed) {
        const recommendations = [];
        
        // Overall performance
        if (passed) {
            recommendations.push(`Great job! You achieved ${masteryScore}% mastery.`);
        } else {
            const threshold = this.masteryThresholds[sessionType];
            recommendations.push(
                `You scored ${masteryScore}% (need ${threshold}% to pass). Keep practicing!`
            );
        }
        
        // Specific patterns analysis
        if (breakdown.CW > 0) {
            recommendations.push(
                `Avoid changing correct answers - trust your first instinct more often.`
            );
        }
        
        if (breakdown.WC > breakdown.CC) {
            recommendations.push(
                `You're improving during questions - consider reading more carefully on first attempts.`
            );
        }
        
        if (breakdown.WW > breakdown.totalQuestions * 0.3) {
            recommendations.push(
                `Review the fundamental concepts - you're struggling with multiple attempts.`
            );
        }
        
        // Hint usage analysis
        const hintPercentage = (breakdown.hintsUsed / breakdown.totalQuestions) * 100;
        if (hintPercentage > 70) {
            recommendations.push(
                `You used hints frequently (${Math.round(hintPercentage)}% of questions). Try reviewing the material before taking quizzes.`
            );
        } else if (hintPercentage < 10 && !passed) {
            recommendations.push(
                `Consider using hints when available - they can help guide your learning.`
            );
        }
        
        // Time analysis
        if (breakdown.averageTimePerQuestion < 15) {
            recommendations.push(
                `You're answering very quickly (${breakdown.averageTimePerQuestion}s average). Consider reading questions more carefully.`
            );
        } else if (breakdown.averageTimePerQuestion > 120) {
            recommendations.push(
                `You're taking a long time per question (${breakdown.averageTimePerQuestion}s average). Try to be more decisive.`
            );
        }
        
        // Bloom level specific recommendations
        Object.entries(breakdown.bloomLevelScores).forEach(([level, data]) => {
            if (data.score < 50) {
                recommendations.push(
                    `Focus on ${level} level concepts - you scored ${data.score}% in this area.`
                );
            }
        });
        
        return recommendations;
    }
    
    /**
     * Calculate progress score across multiple sessions
     * @param {Array} sessions - Array of completed sessions
     * @returns {Object} Progress analysis
     */
    calculateProgressScore(sessions) {
        try {
            if (!sessions || sessions.length === 0) {
                return {
                    overallScore: 0,
                    trend: 'no_data',
                    improvement: 0,
                    consistency: 0,
                    recommendations: ['Complete more quiz sessions to see progress analysis']
                };
            }
            
            const scores = sessions.map(s => s.score?.masteryScore || 0);
            const overallScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
            
            // Calculate trend (improvement over time)
            let trend = 'stable';
            let improvement = 0;
            
            if (scores.length >= 2) {
                const firstHalf = scores.slice(0, Math.ceil(scores.length / 2));
                const secondHalf = scores.slice(Math.floor(scores.length / 2));
                
                const firstAvg = firstHalf.reduce((sum, score) => sum + score, 0) / firstHalf.length;
                const secondAvg = secondHalf.reduce((sum, score) => sum + score, 0) / secondHalf.length;
                
                improvement = secondAvg - firstAvg;
                
                if (improvement > 5) trend = 'improving';
                else if (improvement < -5) trend = 'declining';
                else trend = 'stable';
            }
            
            // Calculate consistency (standard deviation)
            const mean = overallScore;
            const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
            const standardDeviation = Math.sqrt(variance);
            const consistency = Math.max(0, 100 - standardDeviation); // Higher consistency = lower deviation
            
            const recommendations = this.generateProgressRecommendations(
                overallScore, trend, improvement, consistency, sessions
            );
            
            return {
                overallScore,
                trend,
                improvement: Math.round(improvement),
                consistency: Math.round(consistency),
                totalSessions: sessions.length,
                recommendations
            };
            
        } catch (error) {
            console.error('Error calculating progress score:', error);
            return {
                overallScore: 0,
                trend: 'error',
                improvement: 0,
                consistency: 0,
                recommendations: ['Error analyzing progress']
            };
        }
    }
    
    /**
     * Generate progress-specific recommendations
     */
    generateProgressRecommendations(overallScore, trend, improvement, consistency, sessions) {
        const recommendations = [];
        
        // Overall performance
        if (overallScore >= 80) {
            recommendations.push('Excellent overall performance! Keep up the great work.');
        } else if (overallScore >= 60) {
            recommendations.push('Good progress. Focus on challenging areas to reach mastery.');
        } else {
            recommendations.push('Consider reviewing fundamental concepts and taking more practice quizzes.');
        }
        
        // Trend analysis
        if (trend === 'improving') {
            recommendations.push(`Great progress! You've improved by ${improvement} points recently.`);
        } else if (trend === 'declining') {
            recommendations.push(`Scores have declined by ${Math.abs(improvement)} points. Review recent topics.`);
        } else {
            recommendations.push('Performance is stable. Challenge yourself with harder questions.');
        }
        
        // Consistency analysis
        if (consistency < 60) {
            recommendations.push('Your scores vary significantly. Focus on consistent study habits.');
        } else if (consistency > 85) {
            recommendations.push('Very consistent performance! You have solid understanding.');
        }
        
        // Session frequency
        const recentSessions = sessions.filter(s => {
            const sessionDate = new Date(s.completedAt);
            const daysSince = (Date.now() - sessionDate.getTime()) / (1000 * 60 * 60 * 24);
            return daysSince <= 7;
        });
        
        if (recentSessions.length === 0) {
            recommendations.push('Try to take quizzes more regularly to maintain momentum.');
        }
        
        return recommendations;
    }
    
    /**
     * Get performance metrics for analytics
     * @param {Array} responses - Quiz responses
     * @param {Array} questions - Quiz questions
     * @returns {Object} Detailed metrics
     */
    getPerformanceMetrics(responses, questions = []) {
        try {
            const metrics = {
                accuracy: 0,
                speed: 0,
                efficiency: 0,
                bloomDistribution: {},
                difficultyPerformance: {},
                hintDependency: 0,
                learningVelocity: 0
            };
            
            if (!responses || responses.length === 0) return metrics;
            
            // Accuracy metrics
            const correctCount = responses.filter(r => r.isCorrect).length;
            metrics.accuracy = Math.round((correctCount / responses.length) * 100);
            
            // Speed metrics (average time per question)
            const totalTime = responses.reduce((sum, r) => sum + (r.timeSpent || 0), 0);
            metrics.speed = Math.round(totalTime / responses.length);
            
            // Efficiency (accuracy per time)
            metrics.efficiency = metrics.speed > 0 ? 
                Math.round(metrics.accuracy / (metrics.speed / 60)) : 0;
            
            // Hint dependency
            const hintsUsed = responses.filter(r => r.hintUsed).length;
            metrics.hintDependency = Math.round((hintsUsed / responses.length) * 100);
            
            // Bloom level distribution
            if (questions.length === responses.length) {
                questions.forEach((question, index) => {
                    const bloomLevel = question.bloomLevel || 'Remember';
                    const response = responses[index];
                    
                    if (!metrics.bloomDistribution[bloomLevel]) {
                        metrics.bloomDistribution[bloomLevel] = { correct: 0, total: 0 };
                    }
                    
                    metrics.bloomDistribution[bloomLevel].total++;
                    if (response.isCorrect) {
                        metrics.bloomDistribution[bloomLevel].correct++;
                    }
                });
                
                // Convert to percentages
                Object.keys(metrics.bloomDistribution).forEach(level => {
                    const data = metrics.bloomDistribution[level];
                    data.percentage = data.total > 0 ? 
                        Math.round((data.correct / data.total) * 100) : 0;
                });
            }
            
            // Learning velocity (improvement over the session)
            const firstHalfAccuracy = this.calculateAccuracy(
                responses.slice(0, Math.ceil(responses.length / 2))
            );
            const secondHalfAccuracy = this.calculateAccuracy(
                responses.slice(Math.floor(responses.length / 2))
            );
            metrics.learningVelocity = secondHalfAccuracy - firstHalfAccuracy;
            
            return metrics;
            
        } catch (error) {
            console.error('Error calculating performance metrics:', error);
            return {};
        }
    }
    
    /**
     * Calculate accuracy for a subset of responses
     */
    calculateAccuracy(responses) {
        if (!responses || responses.length === 0) return 0;
        const correct = responses.filter(r => r.isCorrect).length;
        return Math.round((correct / responses.length) * 100);
    }
    
    /**
     * Determine if user needs remediation
     * @param {Object} scoringResult - Result from calculateMasteryScore
     * @param {Array} previousSessions - Previous session results
     * @returns {Object} Remediation assessment
     */
    assessRemediationNeed(scoringResult, previousSessions = []) {
        const needsRemediation = {
            required: false,
            type: null, // 'simplified', 'review', 'practice'
            reasons: [],
            focus: []
        };
        
        // Check current performance
        if (scoringResult.masteryScore < 50) {
            needsRemediation.required = true;
            needsRemediation.type = 'simplified';
            needsRemediation.reasons.push('Low mastery score');
        }
        
        // Check pattern analysis
        const breakdown = scoringResult.breakdown;
        if (breakdown.WW > breakdown.totalQuestions * 0.4) {
            needsRemediation.required = true;
            needsRemediation.type = 'review';
            needsRemediation.reasons.push('High wrong-wrong pattern');
        }
        
        if (breakdown.hintsUsed > breakdown.totalQuestions * 0.8) {
            needsRemediation.required = true;
            needsRemediation.type = 'practice';
            needsRemediation.reasons.push('High hint dependency');
        }
        
        // Check Bloom level weaknesses
        Object.entries(breakdown.bloomLevelScores || {}).forEach(([level, data]) => {
            if (data.score < 40) {
                needsRemediation.focus.push(level);
            }
        });
        
        // Check historical performance
        if (previousSessions.length >= 2) {
            const recentScores = previousSessions.slice(-3).map(s => s.score?.masteryScore || 0);
            const averageRecent = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;
            
            if (averageRecent < 60) {
                needsRemediation.required = true;
                needsRemediation.reasons.push('Consistently low performance');
            }
        }
        
        return needsRemediation;
    }
}

module.exports = new ScoringService();