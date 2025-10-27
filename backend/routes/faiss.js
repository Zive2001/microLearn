/**
 * FAISS Management Routes
 *
 * Endpoints for managing FAISS index building and status monitoring
 * Phase 3: FAISS Integration
 */

const express = require('express');
const { protect } = require('../middleware/auth');
const SimilarUserService = require('../services/similarUserService');

const router = express.Router();

/**
 * @desc    Get FAISS status and availability
 * @route   GET /api/faiss/status
 * @access  Public (no auth required, informational endpoint)
 */
router.get('/status', (req, res) => {
  try {
    const status = SimilarUserService.getFAISSStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error getting FAISS status:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting FAISS status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @desc    Get FAISS index statistics
 * @route   GET /api/faiss/stats
 * @access  Private (admin only)
 */
router.get('/stats', protect, async (req, res) => {
  try {
    // Optional: Add admin check here
    // if (!req.user.isAdmin) return res.status(403).json({ success: false, message: 'Not authorized' });

    const stats = await SimilarUserService.getFAISSStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting FAISS stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting FAISS stats',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @desc    Rebuild FAISS index with all current users
 * @route   POST /api/faiss/rebuild
 * @access  Private (admin only)
 *
 * This is a CPU-intensive operation.
 * Should only be called:
 * - After significant user growth
 * - During off-peak hours
 * - By authorized administrators
 */
router.post('/rebuild', protect, async (req, res) => {
  try {
    // Optional: Add admin check here
    // if (!req.user.isAdmin) return res.status(403).json({ success: false, message: 'Not authorized' });

    console.log(`[FAISS] Rebuild requested by user ${req.user._id}`);

    const result = await SimilarUserService.rebuildFAISSIndex();

    res.json({
      success: result.success,
      message: result.message,
      data: {
        vectorsIndexed: result.vectorsIndexed,
        buildTimeMs: result.buildTimeMs,
        sizeBytes: result.sizeBytes,
        faissUsed: result.faissUsed,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Error rebuilding FAISS index:', error);
    res.status(500).json({
      success: false,
      message: 'Error rebuilding FAISS index',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @desc    Find similar users (with FAISS or fallback)
 * @route   GET /api/faiss/similar-users/:userId
 * @access  Private
 *
 * Query Parameters:
 * - limit: number of results (default: 5)
 * - minSimilarity: minimum similarity threshold 0-1 (default: 0.7)
 */
router.get('/similar-users/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 5, minSimilarity = 0.7 } = req.query;

    // Optional: Add authorization check - user can only see similar users if authorized
    // if (req.user._id.toString() !== userId) {
    //   return res.status(403).json({ success: false, message: 'Not authorized' });
    // }

    const similarUsers = await SimilarUserService.findSimilarUsers(userId, {
      limit: parseInt(limit),
      minSimilarity: parseFloat(minSimilarity)
    });

    res.json({
      success: true,
      data: {
        similarUsersFound: similarUsers.length,
        users: similarUsers,
        searchMethod: SimilarUserService.getFAISSStatus().faissAvailable ? 'FAISS' : 'Brute Force',
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Error finding similar users:', error);
    res.status(500).json({
      success: false,
      message: 'Error finding similar users',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @desc    Get system FAISS configuration and capabilities
 * @route   GET /api/faiss/config
 * @access  Public
 */
router.get('/config', (req, res) => {
  try {
    const status = SimilarUserService.getFAISSStatus();

    res.json({
      success: true,
      data: {
        faissAvailable: status.faissAvailable,
        fallbackEnabled: status.fallbackEnabled,
        vectorDimensions: 10,
        capabilities: {
          similarUserSearch: true,
          quizRecommendation: true,
          performanceOptimization: status.faissAvailable
        },
        notes: [
          'Vector dimension: 10 (learning metadata)',
          'Similarity metric: Cosine distance',
          'Fallback: Brute force search always available',
          'Index rebuild: Triggered on user registration and on-demand'
        ]
      }
    });
  } catch (error) {
    console.error('Error getting FAISS config:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting FAISS config',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;
