/**
 * RecommendationCacheService
 *
 * In-memory caching for recommendation results
 * Reduces database queries and FAISS searches for frequently accessed recommendations
 *
 * Phase 4: Performance optimization through intelligent caching
 */

const NodeCache = require('node-cache');

class RecommendationCacheService {
  constructor() {
    // Cache configuration
    // stdTTL: standard time to live (5 minutes)
    // checkperiod: automatic delete check period (10 minutes)
    this.cache = new NodeCache({ stdTTL: 300, checkperiod: 600 });
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }

  /**
   * Generate cache key for similar users
   * @private
   */
  _getSimilarUsersCacheKey(userId, limit, minSimilarity) {
    return `similar_users:${userId}:${limit}:${minSimilarity}`;
  }

  /**
   * Generate cache key for quiz recommendations
   * @private
   */
  _getQuizRecommendationsCacheKey(userId, videoId) {
    return `quiz_recommendations:${userId}:${videoId}`;
  }

  /**
   * Generate cache key for learning path
   * @private
   */
  _getLearningPathCacheKey(userId) {
    return `learning_path:${userId}`;
  }

  /**
   * Get similar users from cache or set if not found
   *
   * @param {ObjectId} userId - User ID
   * @param {number} limit - Results limit
   * @param {number} minSimilarity - Similarity threshold
   * @param {Function} fetchFunction - Function to call if cache miss
   * @returns {Promise<Array>} Similar users
   */
  async getSimilarUsersWithCache(userId, limit, minSimilarity, fetchFunction) {
    const cacheKey = this._getSimilarUsersCacheKey(userId, limit, minSimilarity);

    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.stats.hits += 1;
      console.log(`✓ Cache hit: ${cacheKey}`);
      return cached;
    }

    this.stats.misses += 1;
    console.log(`✗ Cache miss: ${cacheKey}`);

    // Fetch from source
    const result = await fetchFunction();

    // Cache the result
    this.cache.set(cacheKey, result);
    this.stats.sets += 1;

    return result;
  }

  /**
   * Get quiz recommendations from cache or set if not found
   *
   * @param {ObjectId} userId - User ID
   * @param {ObjectId} videoId - Video ID
   * @param {Function} fetchFunction - Function to call if cache miss
   * @returns {Promise<Object>} Quiz recommendations
   */
  async getQuizRecommendationsWithCache(userId, videoId, fetchFunction) {
    const cacheKey = this._getQuizRecommendationsCacheKey(userId, videoId);

    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.stats.hits += 1;
      console.log(`✓ Cache hit: ${cacheKey}`);
      return cached;
    }

    this.stats.misses += 1;
    console.log(`✗ Cache miss: ${cacheKey}`);

    // Fetch from source
    const result = await fetchFunction();

    // Cache the result
    this.cache.set(cacheKey, result);
    this.stats.sets += 1;

    return result;
  }

  /**
   * Get learning path from cache or set if not found
   *
   * @param {ObjectId} userId - User ID
   * @param {Function} fetchFunction - Function to call if cache miss
   * @returns {Promise<Object>} Learning path recommendations
   */
  async getLearningPathWithCache(userId, fetchFunction) {
    const cacheKey = this._getLearningPathCacheKey(userId);

    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.stats.hits += 1;
      console.log(`✓ Cache hit: ${cacheKey}`);
      return cached;
    }

    this.stats.misses += 1;
    console.log(`✗ Cache miss: ${cacheKey}`);

    // Fetch from source
    const result = await fetchFunction();

    // Cache the result
    this.cache.set(cacheKey, result);
    this.stats.sets += 1;

    return result;
  }

  /**
   * Invalidate user caches when their profile changes
   * Called when user updates profile or completes assessment
   *
   * @param {ObjectId} userId - User ID
   */
  invalidateUserCaches(userId) {
    const keysToDelete = this.cache.keys().filter(key => key.includes(userId.toString()));

    keysToDelete.forEach(key => {
      this.cache.del(key);
      this.stats.deletes += 1;
    });

    console.log(`Invalidated ${keysToDelete.length} cache entries for user ${userId}`);

    return {
      invalidated: keysToDelete.length,
      keys: keysToDelete
    };
  }

  /**
   * Invalidate all caches when system data changes significantly
   * Called after FAISS index rebuild or quiz pool update
   */
  invalidateAllCaches() {
    const beforeCount = this.cache.keys().length;
    this.cache.flushAll();
    this.stats.deletes += beforeCount;

    console.log(`Flushed ${beforeCount} cache entries`);

    return {
      invalidated: beforeCount,
      message: 'All caches cleared'
    };
  }

  /**
   * Get cache statistics
   *
   * @returns {Object} Cache performance statistics
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? ((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100).toFixed(2)
      : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: `${hitRate}%`,
      sets: this.stats.sets,
      deletes: this.stats.deletes,
      currentSize: this.cache.keys().length,
      maxMemoryUsage: this._estimateMemoryUsage(),
      keys: this.cache.keys().slice(0, 20) // First 20 keys
    };
  }

  /**
   * Estimate memory usage (rough estimate)
   * @private
   */
  _estimateMemoryUsage() {
    let total = 0;
    this.cache.keys().forEach(key => {
      const value = this.cache.get(key);
      total += JSON.stringify(value).length;
    });
    return `~${(total / 1024).toFixed(2)} KB`;
  }

  /**
   * Clear old cache entries to manage memory
   * Called periodically to prevent unbounded growth
   *
   * @returns {Object} Cleanup statistics
   */
  cleanupOldEntries() {
    const beforeCount = this.cache.keys().length;
    // NodeCache automatically handles TTL deletion
    this.cache.keys().forEach(key => {
      if (!this.cache.get(key)) {
        // Key was deleted by TTL, count it
        this.stats.deletes += 1;
      }
    });

    const afterCount = this.cache.keys().length;

    return {
      beforeCount,
      afterCount,
      cleaned: beforeCount - afterCount,
      memoryUsage: this._estimateMemoryUsage()
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    const previousStats = { ...this.stats };
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
    return previousStats;
  }
}

// Singleton instance
const cacheService = new RecommendationCacheService();

module.exports = cacheService;
