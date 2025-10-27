/**
 * Recommendations Routes
 *
 * API endpoints for advanced quiz recommendations and learning path guidance
 * Phase 4: Final - Advanced Recommendations with system integration
 */

const express = require('express');
const { protect } = require('../middleware/auth');
const QuizRecommendationService = require('../services/quizRecommendationService');
const SimilarUserService = require('../services/similarUserService');
const recommendationCacheService = require('../services/recommendationCacheService');

const router = express.Router();

/**
 * @desc    Get recommended quizzes for a video
 * @route   GET /api/recommendations/quizzes/:videoId
 * @access  Private
 *
 * Query Parameters:
 * - limit: number of recommendations (default: 5)
 * - minSimilarity: minimum similarity threshold (default: 0.7)
 * - minQuality: minimum question quality (default: 6)
 *
 * Returns ranked quiz recommendations with similarity reasoning
 */
router.get('/quizzes/:videoId', protect, async (req, res) => {
  try {
    const { videoId } = req.params;
    const {
      limit = 5,
      minSimilarity = 0.7,
      minQuality = 6
    } = req.query;

    // Use cache to reduce database queries
    const recommendations = await recommendationCacheService.getQuizRecommendationsWithCache(
      req.user._id,
      videoId,
      async () => {
        return await QuizRecommendationService.getRecommendedQuizzes(
          req.user._id,
          videoId,
          {
            limit: parseInt(limit),
            minSimilarity: parseFloat(minSimilarity),
            minQuestionQuality: parseInt(minQuality),
            includeSimilarUsers: true,
            includeSystemMetrics: true
          }
        );
      }
    );

    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    console.error('Error getting quiz recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting quiz recommendations',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @desc    Get similar users for current user
 * @route   GET /api/recommendations/similar-users
 * @access  Private
 *
 * Query Parameters:
 * - limit: number of similar users (default: 5)
 * - minSimilarity: minimum similarity (default: 0.7)
 *
 * Returns similar users with matching dimensions and profiles
 */
router.get('/similar-users', protect, async (req, res) => {
  try {
    const {
      limit = 5,
      minSimilarity = 0.7
    } = req.query;

    // Use cache for similar user queries
    const similarUsers = await recommendationCacheService.getSimilarUsersWithCache(
      req.user._id,
      parseInt(limit),
      parseFloat(minSimilarity),
      async () => {
        return await SimilarUserService.findSimilarUsers(req.user._id, {
          limit: parseInt(limit),
          minSimilarity: parseFloat(minSimilarity)
        });
      }
    );

    // Clean up user objects for JSON serialization
    const cleanedUsers = similarUsers.map(u => ({
      userId: u.userId,
      similarity: u.similarity,
      similarityPercentage: u.similarityPercentage,
      matchedDimensions: u.matchedDimensions,
      user: u.user ? {
        email: u.user.email,
        profile: u.user.profile ? {
          firstName: u.user.profile.firstName,
          lastName: u.user.profile.lastName,
          learningPace: u.user.profile.learningPace,
          problemSolvingApproach: u.user.profile.problemSolvingApproach,
          experienceLevel: u.user.profile.experienceLevel
        } : null,
        learningPreferences: u.user.learningPreferences ? {
          availableSessionTime: u.user.learningPreferences.availableSessionTime,
          learningFocus: u.user.learningPreferences.learningFocus,
          learningGoal: u.user.learningPreferences.learningGoal,
          learningStyle: u.user.learningPreferences.learningStyle
        } : null
      } : null
    }));

    res.json({
      success: true,
      data: {
        similarUsersCount: cleanedUsers.length,
        similarUsers: cleanedUsers,
        avgSimilarity: cleanedUsers.length > 0
          ? (cleanedUsers.reduce((sum, u) => sum + u.similarity, 0) / cleanedUsers.length).toFixed(2)
          : 0,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Error getting similar users:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting similar users',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @desc    Get personalized learning path
 * @route   GET /api/recommendations/learning-path
 * @access  Private
 *
 * Returns personalized learning recommendations based on:
 * - User profile and preferences
 * - Similar user success patterns
 * - User's assessment history
 */
router.get('/learning-path', protect, async (req, res) => {
  try {
    // Use cache for learning path
    const learningPath = await recommendationCacheService.getLearningPathWithCache(
      req.user._id,
      async () => {
        return await QuizRecommendationService.getPersonalizedLearningPath(req.user._id);
      }
    );

    res.json({
      success: true,
      data: learningPath
    });
  } catch (error) {
    console.error('Error getting learning path:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting learning path',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @desc    Track quiz recommendation usage
 * @route   POST /api/recommendations/track-usage
 * @access  Private
 *
 * Body:
 * {
 *   quizPoolId: ObjectId,
 *   videoId: ObjectId,
 *   accuracy: number (0-100),
 *   timeSpent: number (seconds),
 *   difficulty: string (beginner|intermediate|advanced)
 * }
 *
 * Called when user completes a recommended quiz
 * Updates recommendation effectiveness metrics
 */
router.post('/track-usage', protect, async (req, res) => {
  try {
    const { quizPoolId, videoId, accuracy, timeSpent, difficulty } = req.body;

    if (!quizPoolId || accuracy === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: quizPoolId, accuracy'
      });
    }

    await QuizRecommendationService.trackRecommendationUsage(
      quizPoolId,
      req.user._id,
      {
        userId: req.user._id,
        accuracy: parseInt(accuracy),
        timeSpent: parseInt(timeSpent) || 0,
        userDifficulty: difficulty || 'intermediate'
      }
    );

    // Invalidate user caches since they've completed a quiz
    recommendationCacheService.invalidateUserCaches(req.user._id);

    res.json({
      success: true,
      message: 'Recommendation usage tracked',
      data: {
        userId: req.user._id,
        quizPoolId,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Error tracking recommendation usage:', error);
    res.status(500).json({
      success: false,
      message: 'Error tracking recommendation usage',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @desc    Get system analytics and insights
 * @route   GET /api/recommendations/analytics
 * @access  Private (admin/optional)
 *
 * Returns system-wide analytics about:
 * - Quiz pool performance
 * - User success patterns
 * - Recommendation effectiveness
 * - FAISS system status
 */
router.get('/analytics', protect, async (req, res) => {
  try {
    const analytics = await QuizRecommendationService.getSystemAnalytics();

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error getting analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @desc    Get cache statistics
 * @route   GET /api/recommendations/cache-stats
 * @access  Private (admin/monitoring)
 *
 * Returns cache performance metrics for monitoring
 */
router.get('/cache-stats', protect, async (req, res) => {
  try {
    const stats = recommendationCacheService.getStats();

    res.json({
      success: true,
      data: {
        cachePerformance: stats,
        message: 'Cache is improving recommendation performance'
      }
    });
  } catch (error) {
    console.error('Error getting cache stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting cache stats',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @desc    Clear user caches
 * @route   POST /api/recommendations/clear-cache
 * @access  Private
 *
 * Manually clear recommendation caches (useful when profile changes)
 */
router.post('/clear-cache', protect, async (req, res) => {
  try {
    const result = recommendationCacheService.invalidateUserCaches(req.user._id);

    res.json({
      success: true,
      message: 'User caches cleared',
      data: result
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      message: 'Error clearing cache',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;
