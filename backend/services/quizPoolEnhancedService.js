/**
 * QuizPoolEnhancedService
 *
 * Enhanced quiz pool management with user similarity tracking and
 * intelligent quiz reuse based on similar users.
 *
 * Phase 2: Foundation for quiz pool tracking and similar user recommendations
 * Phase 3: Integration with FAISS for large-scale similarity-based recommendations implemented
 */

const { QuizPool } = require('../models/Quiz');
const SimilarUserService = require('./similarUserService');
const User = require('../models/User');

class QuizPoolEnhancedService {
  /**
   * Add quiz to pool with user similarity metadata
   *
   * @param {Object} quizData - Quiz data from generation
   * @param {ObjectId} originUserId - User who took the assessment generating this quiz
   * @returns {Promise<Object>} Created quiz pool document
   */
  static async addQuizToPoolWithMetadata(quizData, originUserId) {
    try {
      // Get origin user profile for similarity metadata
      const originUser = await User.findById(originUserId);
      if (!originUser) {
        throw new Error('Origin user not found');
      }

      // Create quiz pool entry with similarity metadata
      const quizPoolEntry = new QuizPool({
        originalVideoId: quizData.originalVideoId,
        microVideoId: quizData.microVideoId,
        questions: quizData.questions,
        microVideoTitle: quizData.microVideoTitle,
        difficulty: quizData.difficulty,
        keyPoints: quizData.keyPoints,
        learningObjective: quizData.learningObjective,
        totalQuestions: quizData.questions.length,
        questionQuality: quizData.questionQuality || 7, // Default quality
        generatedAt: quizData.generatedAt || new Date(),
        generatedBy: quizData.generatedBy || 'openai-gpt',
        generationVersion: quizData.generationVersion || '1.0',

        // Phase 2: Add similarity metadata
        similarityMetadata: {
          originUserId: originUser._id,
          originUserProfile: {
            learningPace: originUser.profile?.learningPace,
            problemSolvingApproach: originUser.profile?.problemSolvingApproach,
            availableSessionTime: originUser.learningPreferences?.availableSessionTime,
            learningFocus: originUser.learningPreferences?.learningFocus,
            experienceLevel: originUser.profile?.experienceLevel,
            learningGoal: originUser.learningPreferences?.learningGoal
          }
        },

        // Initialize analytics and recommendation tracking
        performanceAnalytics: {
          totalUsesCount: 0,
          totalAttempters: 0,
          averageAccuracy: 0,
          averageTimeSpent: 0,
          performanceByDifficulty: {
            beginnerAccuracy: 0,
            intermediateAccuracy: 0,
            advancedAccuracy: 0
          },
          lastUpdatedAt: new Date()
        },

        recommendationMetrics: {
          recommendationCount: 0,
          recommendedToUsers: [],
          effectivenessForSimilarUsers: 0
        }
      });

      await quizPoolEntry.save();

      console.log(`Quiz pool entry created with ID: ${quizPoolEntry._id}`);
      return quizPoolEntry;
    } catch (error) {
      console.error('Error adding quiz to pool with metadata:', error);
      throw error;
    }
  }

  /**
   * Update quiz performance analytics after user attempt
   *
   * @param {ObjectId} quizPoolId - Quiz pool ID
   * @param {Object} attemptData - Data from user's quiz attempt
   * @returns {Promise<Object>} Updated quiz pool document
   */
  static async updateQuizPerformanceAnalytics(quizPoolId, attemptData) {
    try {
      const quizPool = await QuizPool.findById(quizPoolId);
      if (!quizPool) {
        throw new Error('Quiz pool not found');
      }

      const {
        userId,
        accuracy,
        timeSpent,
        userDifficulty
      } = attemptData;

      // Update usage count
      quizPool.performanceAnalytics.totalUsesCount += 1;

      // Update accuracy (running average)
      const totalUses = quizPool.performanceAnalytics.totalUsesCount;
      quizPool.performanceAnalytics.averageAccuracy =
        ((quizPool.performanceAnalytics.averageAccuracy * (totalUses - 1)) + accuracy) / totalUses;

      // Update time spent (running average)
      quizPool.performanceAnalytics.averageTimeSpent =
        ((quizPool.performanceAnalytics.averageTimeSpent * (totalUses - 1)) + timeSpent) / totalUses;

      // Update performance by difficulty level
      if (userDifficulty && quizPool.performanceAnalytics.performanceByDifficulty) {
        const difficultyKey = `${userDifficulty.toLowerCase()}Accuracy`;
        if (difficultyKey in quizPool.performanceAnalytics.performanceByDifficulty) {
          const currentValue = quizPool.performanceAnalytics.performanceByDifficulty[difficultyKey];
          quizPool.performanceAnalytics.performanceByDifficulty[difficultyKey] =
            ((currentValue * (totalUses - 1)) + accuracy) / totalUses;
        }
      }

      // Track unique attemptors (if new user)
      const alreadyAttempted = quizPool.performanceAnalytics.totalAttempters;
      // Update attempted count (in production, would check if user already attempted)
      quizPool.performanceAnalytics.totalAttempters += 1;

      quizPool.performanceAnalytics.lastUpdatedAt = new Date();

      await quizPool.save();

      return quizPool;
    } catch (error) {
      console.error('Error updating quiz performance analytics:', error);
      throw error;
    }
  }

  /**
   * Record a quiz recommendation for a user
   *
   * @param {ObjectId} quizPoolId - Quiz pool ID
   * @param {ObjectId} userId - User it was recommended to
   * @param {number} similarity - User similarity score (0-1)
   * @returns {Promise<Object>} Updated quiz pool document
   */
  static async recordQuizRecommendation(quizPoolId, userId, similarity = 0) {
    try {
      const quizPool = await QuizPool.findById(quizPoolId);
      if (!quizPool) {
        throw new Error('Quiz pool not found');
      }

      // Increment recommendation count
      quizPool.recommendationMetrics.recommendationCount += 1;

      // Add user to recommended list
      quizPool.recommendationMetrics.recommendedToUsers.push({
        userId: userId,
        similarity: similarity,
        recommendedAt: new Date(),
        wasUsed: false
      });

      await quizPool.save();

      return quizPool;
    } catch (error) {
      console.error('Error recording quiz recommendation:', error);
      throw error;
    }
  }

  /**
   * Mark a recommended quiz as used by a user
   *
   * @param {ObjectId} quizPoolId - Quiz pool ID
   * @param {ObjectId} userId - User who used the quiz
   * @returns {Promise<Object>} Updated quiz pool document
   */
  static async markRecommendationAsUsed(quizPoolId, userId) {
    try {
      const quizPool = await QuizPool.findByIdAndUpdate(
        quizPoolId,
        {
          $set: {
            'recommendationMetrics.recommendedToUsers.$[elem].wasUsed': true
          }
        },
        {
          arrayFilters: [{ 'elem.userId': userId }],
          new: true
        }
      );

      if (!quizPool) {
        throw new Error('Quiz pool not found');
      }

      return quizPool;
    } catch (error) {
      console.error('Error marking recommendation as used:', error);
      throw error;
    }
  }

  /**
   * Find best quizzes for recommendation based on quality and performance
   *
   * @param {ObjectId} videoId - Video ID to find quizzes for
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Top quizzes sorted by recommendation score
   */
  static async findTopQuizzesForRecommendation(videoId, options = {}) {
    const {
      limit = 5,
      minQuality = 6,
      sortBy = 'quality' // 'quality', 'popularity', 'effectiveness'
    } = options;

    try {
      let query = QuizPool.find({
        originalVideoId: videoId,
        questionQuality: { $gte: minQuality }
      });

      // Sort based on criteria
      switch (sortBy) {
        case 'popularity':
          query = query.sort({ 'performanceAnalytics.totalUsesCount': -1 });
          break;
        case 'effectiveness':
          query = query.sort({ 'performanceAnalytics.averageAccuracy': -1 });
          break;
        case 'quality':
        default:
          query = query.sort({ questionQuality: -1, generatedAt: -1 });
      }

      const quizzes = await query.limit(limit);

      // Enhance with recommendation scores
      const enrichedQuizzes = quizzes.map(quiz => ({
        ...quiz.toObject(),
        recommendationScore: this._calculateRecommendationScore(quiz)
      }));

      return enrichedQuizzes.sort((a, b) => b.recommendationScore - a.recommendationScore);
    } catch (error) {
      console.error('Error finding top quizzes for recommendation:', error);
      throw error;
    }
  }

  /**
   * Get similar user quizzes for a target user
   *
   * @param {ObjectId} userId - Target user ID
   * @param {ObjectId} videoId - Video ID
   * @returns {Promise<Object>} Recommended quizzes from similar users
   */
  static async getSimilarUserQuizzesForUser(userId, videoId) {
    try {
      // Use SimilarUserService to find quizzes from similar users
      const recommendations = await SimilarUserService.findSimilarUserQuizzes(
        userId,
        videoId,
        {
          limit: 3,
          minSimilarity: 0.75,
          minQuestionQuality: 6
        }
      );

      return recommendations;
    } catch (error) {
      console.error('Error getting similar user quizzes for user:', error);
      throw error;
    }
  }

  /**
   * Calculate effectiveness score for similar users
   * Updates the effectivenessForSimilarUsers metric
   *
   * @param {ObjectId} quizPoolId - Quiz pool ID
   * @returns {Promise<Object>} Updated quiz pool document
   */
  static async calculateEffectivenessForSimilarUsers(quizPoolId) {
    try {
      const quizPool = await QuizPool.findById(quizPoolId);
      if (!quizPool) {
        throw new Error('Quiz pool not found');
      }

      if (quizPool.recommendationMetrics.recommendedToUsers.length === 0) {
        return quizPool;
      }

      // Calculate effectiveness: average accuracy for users who actually used the quiz
      const usedByUsers = quizPool.recommendationMetrics.recommendedToUsers.filter(
        u => u.wasUsed === true
      );

      if (usedByUsers.length === 0) {
        return quizPool;
      }

      // Average similarity score of users who used this quiz
      const avgSimilarity = usedByUsers.reduce((sum, u) => sum + u.similarity, 0) / usedByUsers.length;

      // Combine with accuracy metrics
      const effectiveness = (
        (quizPool.performanceAnalytics.averageAccuracy * 0.6) +
        (avgSimilarity * 100 * 0.4) // Scale similarity to 0-100
      );

      quizPool.recommendationMetrics.effectivenessForSimilarUsers = Math.round(effectiveness);

      await quizPool.save();

      return quizPool;
    } catch (error) {
      console.error('Error calculating effectiveness for similar users:', error);
      throw error;
    }
  }

  /**
   * Get analytics dashboard for quiz pool
   *
   * @returns {Promise<Object>} Overall quiz pool analytics
   */
  static async getQuizPoolAnalytics() {
    try {
      const analytics = await QuizPool.aggregate([
        {
          $group: {
            _id: null,
            totalQuizzes: { $sum: 1 },
            totalQuestions: { $sum: '$totalQuestions' },
            avgQuality: { $avg: '$questionQuality' },
            avgAccuracy: { $avg: '$performanceAnalytics.averageAccuracy' },
            totalUses: { $sum: '$performanceAnalytics.totalUsesCount' },
            totalRecommendations: { $sum: '$recommendationMetrics.recommendationCount' },
            mostPopular: { $max: '$performanceAnalytics.totalUsesCount' }
          }
        }
      ]);

      // Get best performing quizzes
      const topQuizzes = await QuizPool.find()
        .sort({ 'performanceAnalytics.averageAccuracy': -1 })
        .limit(5)
        .select('microVideoTitle questionQuality performanceAnalytics');

      // Get most recommended quizzes
      const mostRecommended = await QuizPool.find()
        .sort({ 'recommendationMetrics.recommendationCount': -1 })
        .limit(5)
        .select('microVideoTitle recommendationMetrics');

      return {
        summary: analytics[0] || {},
        topPerformingQuizzes: topQuizzes,
        mostRecommendedQuizzes: mostRecommended,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error getting quiz pool analytics:', error);
      throw error;
    }
  }

  // ==================== HELPER FUNCTIONS ====================

  /**
   * Calculate recommendation score for a quiz
   * @private
   */
  static _calculateRecommendationScore(quiz) {
    // Normalize metrics to 0-1 range
    const qualityScore = Math.min(quiz.questionQuality / 10, 1);
    const accuracyScore = quiz.performanceAnalytics.averageAccuracy / 100;
    const popularityScore = Math.min(quiz.performanceAnalytics.totalUsesCount / 50, 1); // Normalize to max 50 uses
    const effectivenessScore = Math.min(quiz.recommendationMetrics.effectivenessForSimilarUsers / 100, 1);

    // Weighted recommendation score
    // Quality 40%, Accuracy 30%, Popularity 20%, Effectiveness 10%
    const score =
      (qualityScore * 0.4) +
      (accuracyScore * 0.3) +
      (popularityScore * 0.2) +
      (effectivenessScore * 0.1);

    return Math.round(score * 100) / 100; // Round to 2 decimals
  }

  /**
   * Batch update performance analytics for multiple quizzes
   * @private
   */
  static async _batchUpdateAnalytics(updates) {
    const updatePromises = updates.map(update =>
      this.updateQuizPerformanceAnalytics(update.quizPoolId, update.attemptData)
    );

    return Promise.all(updatePromises);
  }
}

module.exports = QuizPoolEnhancedService;
