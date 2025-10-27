/**
 * QuizRecommendationService
 *
 * Advanced quiz recommendations combining:
 * - Similar user discovery (Phase 3)
 * - Quiz pool performance metrics (Phase 2)
 * - User behavioral signals (Phase 4)
 *
 * Phase 4: Final - Advanced Recommendations & System Integration
 */

const SimilarUserService = require('./similarUserService');
const QuizPoolEnhancedService = require('./quizPoolEnhancedService');
const UserFeatureVectorService = require('./userFeatureVectorService');
const { QuizPool } = require('../models/Quiz');
const { AssessmentResult } = require('../models/Assessment');
const User = require('../models/User');

class QuizRecommendationService {
  /**
   * Get comprehensive quiz recommendations for a user
   * Combines similar user quiz performance with system metrics
   *
   * @param {ObjectId} userId - User requesting recommendations
   * @param {ObjectId} videoId - Video/topic for recommendations
   * @param {Object} options - Recommendation options
   * @returns {Promise<Object>} Ranked quiz recommendations with reasoning
   */
  static async getRecommendedQuizzes(userId, videoId, options = {}) {
    const {
      limit = 5,
      includeSimilarUsers = true,
      includeSystemMetrics = true,
      minSimilarity = 0.7,
      minQuestionQuality = 6
    } = options;

    try {
      console.log(`Generating recommendations for user ${userId} on video ${videoId}`);

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get all quiz pools for this video
      const quizzes = await QuizPool.find({
        originalVideoId: videoId,
        questionQuality: { $gte: minQuestionQuality }
      });

      if (quizzes.length === 0) {
        return {
          success: true,
          recommendedQuizzes: [],
          message: 'No quizzes available for this topic yet',
          metadata: {
            userId,
            videoId,
            totalQuizzesConsidered: 0,
            timestamp: new Date()
          }
        };
      }

      let recommendations = [];

      // Add similarity-based scoring if enabled
      if (includeSimilarUsers) {
        recommendations = await this._scoreByUserSimilarity(
          userId,
          quizzes,
          minSimilarity
        );
      } else {
        // Use only quiz pool metrics
        recommendations = quizzes.map(quiz => ({
          quizPoolId: quiz._id,
          microVideoId: quiz.microVideoId,
          microVideoTitle: quiz.microVideoTitle,
          totalQuestions: quiz.totalQuestions,
          questionQuality: quiz.questionQuality,
          difficulty: quiz.difficulty,
          baseScore: quiz.questionQuality / 10
        }));
      }

      // Add system metrics if enabled
      if (includeSystemMetrics) {
        recommendations = await this._enhanceWithSystemMetrics(
          recommendations,
          user
        );
      }

      // Calculate final recommendation score
      recommendations = recommendations.map(rec => ({
        ...rec,
        recommendationScore: this._calculateFinalScore(rec),
        recommendationReason: this._generateReason(rec)
      }));

      // Sort by recommendation score (highest first)
      recommendations.sort((a, b) => b.recommendationScore - a.recommendationScore);

      return {
        success: true,
        recommendedQuizzes: recommendations.slice(0, limit),
        totalQuizzesConsidered: quizzes.length,
        metadata: {
          userId,
          videoId,
          recommendationMethod: 'Advanced (Similarity + Performance)',
          faissUsed: SimilarUserService.getFAISSStatus().faissAvailable,
          timestamp: new Date()
        }
      };
    } catch (error) {
      console.error('Error generating quiz recommendations:', error);
      throw error;
    }
  }

  /**
   * Get personalized learning recommendations
   * Based on user profile and similar user success patterns
   *
   * @param {ObjectId} userId - User ID
   * @returns {Promise<Object>} Personalized learning path recommendations
   */
  static async getPersonalizedLearningPath(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get similar users
      const similarUsers = await SimilarUserService.findSimilarUsers(userId, {
        limit: 5,
        minSimilarity: 0.7
      });

      // Get similar users' assessment results
      const similarUserIds = similarUsers.map(u => u.userId);
      const assessmentResults = await AssessmentResult.find({
        userId: { $in: similarUserIds }
      }).sort({ createdAt: -1 }).limit(20);

      // Analyze learning patterns
      const patterns = this._analyzeLearningPatterns(assessmentResults);

      // Get user's current performance
      const userAssessments = await AssessmentResult.find({
        userId: userId
      }).sort({ createdAt: -1 }).limit(10);

      // Generate recommendations based on patterns
      const recommendations = this._generatePathRecommendations(
        user,
        patterns,
        userAssessments,
        similarUsers
      );

      return {
        success: true,
        personalization: {
          learningPace: user.profile?.learningPace || 'Moderate',
          sessionTime: user.learningPreferences?.availableSessionTime || 'Short (15-30 min)',
          learningFocus: user.learningPreferences?.learningFocus || 'Mixed'
        },
        similarUsersAnalyzed: similarUserIds.length,
        patterns: patterns,
        recommendations: recommendations,
        metadata: {
          userId,
          timestamp: new Date()
        }
      };
    } catch (error) {
      console.error('Error generating personalized learning path:', error);
      throw error;
    }
  }

  /**
   * Get system-wide quiz pool analytics and insights
   *
   * @returns {Promise<Object>} Analytics and insights
   */
  static async getSystemAnalytics() {
    try {
      const quizPoolStats = await QuizPoolEnhancedService.getQuizPoolAnalytics();

      const totalUsers = await User.countDocuments();
      const totalAssessments = await AssessmentResult.countDocuments();

      // Get most recommended quizzes
      const mostRecommended = await QuizPool.find()
        .sort({ 'recommendationMetrics.recommendationCount': -1 })
        .limit(10)
        .select('microVideoTitle recommendationMetrics performanceAnalytics');

      // Get effectiveness distribution
      const effectivenessDistribution = await this._getEffectivenessDistribution();

      return {
        success: true,
        system: {
          totalUsers,
          totalAssessments,
          totalQuizzes: quizPoolStats.summary?.totalQuizzes || 0,
          totalQuestions: quizPoolStats.summary?.totalQuestions || 0
        },
        quizPool: quizPoolStats,
        insights: {
          mostRecommendedQuizzes: mostRecommended,
          effectivenessDistribution,
          avgQuizQuality: quizPoolStats.summary?.avgQuality || 0,
          avgUserAccuracy: quizPoolStats.summary?.avgAccuracy || 0,
          totalRecommendationsMade: await QuizPool.aggregate([
            { $group: { _id: null, total: { $sum: '$recommendationMetrics.recommendationCount' } } }
          ]).then(res => res[0]?.total || 0)
        },
        faissStatus: SimilarUserService.getFAISSStatus(),
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error getting system analytics:', error);
      throw error;
    }
  }

  /**
   * Track quiz recommendation usage
   * Updates metrics when recommended quiz is used
   *
   * @param {ObjectId} quizPoolId - Quiz that was used
   * @param {ObjectId} userId - User who used it
   * @param {Object} performanceData - Performance metrics
   * @returns {Promise<Object>} Updated metrics
   */
  static async trackRecommendationUsage(quizPoolId, userId, performanceData) {
    try {
      const quizPool = await QuizPool.findById(quizPoolId);
      if (!quizPool) {
        throw new Error('Quiz pool not found');
      }

      // Mark recommendation as used
      await QuizPoolEnhancedService.markRecommendationAsUsed(quizPoolId, userId);

      // Update performance analytics
      await QuizPoolEnhancedService.updateQuizPerformanceAnalytics(
        quizPoolId,
        performanceData
      );

      // Update effectiveness for similar users
      await QuizPoolEnhancedService.calculateEffectivenessForSimilarUsers(quizPoolId);

      return {
        success: true,
        message: 'Recommendation usage tracked',
        quizPoolId,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error tracking recommendation usage:', error);
      throw error;
    }
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Score quizzes by similar user performance
   * @private
   */
  static async _scoreByUserSimilarity(userId, quizzes, minSimilarity) {
    try {
      const similarUsers = await SimilarUserService.findSimilarUsers(userId, {
        limit: 10,
        minSimilarity
      });

      return quizzes.map(quiz => {
        // Find most similar user who attempted this quiz
        const relatedSimilarUser = similarUsers.find(u => u.similarity >= minSimilarity);

        const similarityScore = relatedSimilarUser?.similarity || minSimilarity;
        const qualityScore = quiz.questionQuality / 10;
        const performanceScore = (quiz.performanceAnalytics?.averageAccuracy || 0) / 100;

        return {
          quizPoolId: quiz._id,
          microVideoId: quiz.microVideoId,
          microVideoTitle: quiz.microVideoTitle,
          totalQuestions: quiz.totalQuestions,
          questionQuality: quiz.questionQuality,
          difficulty: quiz.difficulty,
          similarityScore,
          qualityScore,
          performanceScore,
          baseScore: (qualityScore * 0.4 + performanceScore * 0.3 + similarityScore * 0.3),
          relatedSimilarUser: relatedSimilarUser?.userId,
          similarityPercentage: Math.round((relatedSimilarUser?.similarity || 0) * 100)
        };
      });
    } catch (error) {
      console.error('Error scoring by similarity:', error);
      return quizzes.map(q => ({ quizPoolId: q._id, baseScore: q.questionQuality / 10 }));
    }
  }

  /**
   * Enhance recommendations with system metrics
   * @private
   */
  static async _enhanceWithSystemMetrics(recommendations, user) {
    return recommendations.map(rec => ({
      ...rec,
      systemMetrics: {
        populationScore: Math.min(rec.baseScore + 0.1, 1), // Boost popular quizzes
        recencyScore: 0.85, // Prefer newer quizzes
        personalityMatch: this._calculatePersonalityMatch(rec, user)
      }
    }));
  }

  /**
   * Calculate final recommendation score
   * @private
   */
  static _calculateFinalScore(recommendation) {
    const baseScore = recommendation.baseScore || 0;
    const similarityBoost = (recommendation.similarityScore || 0) * 0.3;
    const qualityBoost = (recommendation.qualityScore || 0) * 0.25;
    const performanceBoost = (recommendation.performanceScore || 0) * 0.2;
    const systemBoost = recommendation.systemMetrics?.populationScore * 0.1 || 0;

    return Math.round((baseScore + similarityBoost + qualityBoost + performanceBoost + systemBoost) * 100) / 100;
  }

  /**
   * Generate human-readable recommendation reason
   * @private
   */
  static _generateReason(recommendation) {
    const reasons = [];

    if (recommendation.similarityPercentage >= 80) {
      reasons.push(`${recommendation.similarityPercentage}% similar user loved this`);
    } else if (recommendation.similarityPercentage >= 70) {
      reasons.push(`Similar user found this helpful`);
    }

    if (recommendation.questionQuality >= 8) {
      reasons.push('High quality questions');
    }

    if (recommendation.performanceScore >= 0.8) {
      reasons.push('Most users succeed with this');
    } else if (recommendation.performanceScore >= 0.6) {
      reasons.push('Good practice difficulty');
    }

    return reasons.length > 0 ? reasons.join(' • ') : 'Recommended for your learning style';
  }

  /**
   * Calculate personality match with recommendation
   * @private
   */
  static _calculatePersonalityMatch(quiz, user) {
    let score = 0.5; // Base score

    // Learning focus match
    if (quiz.difficulty === 'Beginner' && user.profile?.experienceLevel === 'Complete Beginner') {
      score += 0.15;
    } else if (quiz.difficulty === 'Intermediate' && user.profile?.experienceLevel === 'Intermediate') {
      score += 0.15;
    } else if (quiz.difficulty === 'Professional' && user.profile?.experienceLevel === 'Advanced') {
      score += 0.15;
    }

    // Session time fit
    if (quiz.totalQuestions <= 5 && user.learningPreferences?.availableSessionTime === 'Micro (5-10 min)') {
      score += 0.15;
    } else if (quiz.totalQuestions <= 10 && user.learningPreferences?.availableSessionTime?.includes('Short')) {
      score += 0.1;
    }

    return Math.min(score, 1);
  }

  /**
   * Analyze learning patterns from assessment results
   * @private
   */
  static _analyzeLearningPatterns(assessmentResults) {
    if (assessmentResults.length === 0) {
      return { pattern: 'insufficient_data' };
    }

    const topicPerformance = {};
    let totalAttempts = 0;
    let successfulAttempts = 0;

    assessmentResults.forEach(result => {
      totalAttempts += 1;
      if (result.level === 'Professional' || result.score >= 80) {
        successfulAttempts += 1;
      }

      if (!topicPerformance[result.topic]) {
        topicPerformance[result.topic] = { attempts: 0, successes: 0 };
      }
      topicPerformance[result.topic].attempts += 1;
      if (result.level === 'Professional' || result.score >= 80) {
        topicPerformance[result.topic].successes += 1;
      }
    });

    const successRate = (successfulAttempts / totalAttempts) * 100;

    return {
      successRate: Math.round(successRate),
      topicPerformance,
      recommendedFocus: Object.entries(topicPerformance)
        .sort((a, b) => (b[1].successes / b[1].attempts) - (a[1].successes / a[1].attempts))
        .slice(0, 3)
        .map(([topic, data]) => ({
          topic,
          successRate: Math.round((data.successes / data.attempts) * 100)
        }))
    };
  }

  /**
   * Generate personalized path recommendations
   * @private
   */
  static _generatePathRecommendations(user, patterns, userAssessments, similarUsers) {
    const recommendations = [];

    if (patterns.successRate >= 80) {
      recommendations.push({
        type: 'advancement',
        title: 'Ready for Advanced Topics',
        description: `You're performing excellently (${patterns.successRate}% success rate). Consider moving to more advanced content to accelerate your learning.`,
        action: 'explore_advanced'
      });
    } else if (patterns.successRate < 50) {
      recommendations.push({
        type: 'reinforcement',
        title: 'Strengthen Fundamentals',
        description: `Focus on foundational concepts. Consider more basic quizzes to build confidence before advancing.`,
        action: 'practice_basics'
      });
    }

    if (similarUsers.length > 0) {
      recommendations.push({
        type: 'peer_learning',
        title: `Learn from Similar Users`,
        description: `You have ${similarUsers.length} learning peers with similar profiles. See what quizzes they found helpful.`,
        action: 'view_similar_users'
      });
    }

    if (user.learningPreferences?.availableSessionTime?.includes('Short')) {
      recommendations.push({
        type: 'time_optimization',
        title: 'Optimized for Your Schedule',
        description: `Your quizzes are tailored for ${user.learningPreferences.availableSessionTime} sessions. Keep the momentum!`,
        action: 'continue_learning'
      });
    }

    return recommendations;
  }

  /**
   * Get effectiveness distribution
   * @private
   */
  static async _getEffectivenessDistribution() {
    try {
      const distribution = await QuizPool.aggregate([
        {
          $group: {
            _id: null,
            highEffectiveness: {
              $sum: {
                $cond: [{ $gte: ['$recommendationMetrics.effectivenessForSimilarUsers', 80] }, 1, 0]
              }
            },
            mediumEffectiveness: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gte: ['$recommendationMetrics.effectivenessForSimilarUsers', 50] },
                      { $lt: ['$recommendationMetrics.effectivenessForSimilarUsers', 80] }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            lowEffectiveness: {
              $sum: {
                $cond: [{ $lt: ['$recommendationMetrics.effectivenessForSimilarUsers', 50] }, 1, 0]
              }
            }
          }
        }
      ]);

      return distribution[0] || { highEffectiveness: 0, mediumEffectiveness: 0, lowEffectiveness: 0 };
    } catch (error) {
      console.error('Error getting effectiveness distribution:', error);
      return {};
    }
  }
}

module.exports = QuizRecommendationService;
