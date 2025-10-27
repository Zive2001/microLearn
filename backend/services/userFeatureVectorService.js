/**
 * UserFeatureVectorService
 *
 * Converts user metadata into normalized feature vectors for FAISS-based similarity matching.
 * Each user is represented as a high-dimensional vector capturing their learning profile.
 *
 * Phase 2: Metadata → Vector conversion
 * Phase 3: FAISS indexing and similarity search
 */

const VECTOR_DIMENSIONS = 10; // Total dimensions for feature vector

/**
 * Feature Categories and Encoding
 *
 * Learning Pace (Dim 0): Slow=0.33, Moderate=0.66, Fast=1.0
 * Problem-Solving Approach (Dim 1): Analytical=0.33, Practical=0.66, Creative=1.0
 * Available Session Time (Dim 2): Micro=0.25, Short=0.5, Medium=0.75, Long=1.0
 * Learning Focus (Dim 3): Conceptual=0.2, Practical=0.4, Interview=0.6, Cert=0.8, Mixed=1.0
 * Experience Level (Dim 4): Beginner=0.33, Intermediate=0.66, Advanced=1.0
 * Learning Goal (Dim 5): Career=0.25, Skill=0.5, Hobby=0.75, Academic=1.0
 * Learning Style (Dim 6): Visual=0.25, Hands-on=0.5, Reading=0.75, Interactive=1.0
 * Time Commitment (Dim 7): 5-10min=0.25, 15-30min=0.5, 30-60min=0.75, 60+min=1.0
 * Interested Topics (Dim 8): Count normalized to [0,1] based on total available topics
 * Performance Signal (Dim 9): Reserved for behavioral signals from quiz performance [0,1]
 */

class UserFeatureVectorService {
  /**
   * Convert a user's profile and preferences into a normalized feature vector
   *
   * @param {Object} user - User document from MongoDB
   * @returns {Object} Feature vector with metadata
   */
  static getUserFeatureVector(user) {
    if (!user) {
      throw new Error('User object is required');
    }

    const vector = new Array(VECTOR_DIMENSIONS).fill(0);

    try {
      // Dimension 0: Learning Pace
      vector[0] = this._encodeLearningPace(user.profile?.learningPace);

      // Dimension 1: Problem-Solving Approach
      vector[1] = this._encodeProblemSolvingApproach(user.profile?.problemSolvingApproach);

      // Dimension 2: Available Session Time
      vector[2] = this._encodeAvailableSessionTime(user.learningPreferences?.availableSessionTime);

      // Dimension 3: Learning Focus
      vector[3] = this._encodeLearningFocus(user.learningPreferences?.learningFocus);

      // Dimension 4: Experience Level
      vector[4] = this._encodeExperienceLevel(user.profile?.experienceLevel);

      // Dimension 5: Learning Goal
      vector[5] = this._encodeLearningGoal(user.learningPreferences?.learningGoal);

      // Dimension 6: Learning Style
      vector[6] = this._encodeLearningStyle(user.learningPreferences?.learningStyle);

      // Dimension 7: Time Commitment
      vector[7] = this._encodeTimeCommitment(user.learningPreferences?.preferredContentLength);

      // Dimension 8: Interested Topics (normalized count)
      vector[8] = this._encodeInterestedTopics(user.learningPreferences?.interestedAreas);

      // Dimension 9: Performance Signal (will be populated from quiz data)
      vector[9] = this._encodePerformanceSignal(user);

      return {
        userId: user._id.toString(),
        vector: vector,
        metadata: {
          learningPace: user.profile?.learningPace || 'Moderate',
          problemSolvingApproach: user.profile?.problemSolvingApproach || 'Practical',
          availableSessionTime: user.learningPreferences?.availableSessionTime || 'Short (15-30 min)',
          learningFocus: user.learningPreferences?.learningFocus || 'Mixed',
          experienceLevel: user.profile?.experienceLevel || 'Complete Beginner',
          learningGoal: user.learningPreferences?.learningGoal || 'Personal Interest',
          learningStyle: user.learningPreferences?.learningStyle || 'visual',
          preferredContentLength: user.learningPreferences?.preferredContentLength || 'Short (5-10 min)',
          interestedTopicsCount: (user.learningPreferences?.interestedAreas || []).length,
          generatedAt: new Date()
        },
        dimensions: VECTOR_DIMENSIONS
      };
    } catch (error) {
      console.error('Error generating feature vector:', error);
      throw error;
    }
  }

  /**
   * Calculate similarity between two feature vectors using cosine similarity
   * Returns value in range [0, 1] where 1.0 = identical, 0.0 = completely different
   *
   * @param {Array<number>} vector1 - First feature vector
   * @param {Array<number>} vector2 - Second feature vector
   * @returns {number} Similarity score 0-1
   */
  static calculateSimilarity(vector1, vector2) {
    if (!Array.isArray(vector1) || !Array.isArray(vector2)) {
      throw new Error('Both inputs must be arrays');
    }

    if (vector1.length !== vector2.length) {
      throw new Error('Vectors must have equal dimensions');
    }

    // Cosine Similarity: (A · B) / (||A|| * ||B||)
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < vector1.length; i++) {
      dotProduct += vector1[i] * vector2[i];
      magnitudeA += vector1[i] * vector1[i];
      magnitudeB += vector2[i] * vector2[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    const similarity = dotProduct / (magnitudeA * magnitudeB);
    // Normalize to [0, 1]
    return Math.max(0, Math.min(1, (similarity + 1) / 2));
  }

  /**
   * Find similar users based on feature vector similarity
   *
   * @param {Array<Object>} allUserVectors - Array of user vectors to search
   * @param {Array<number>} queryVector - Query user's feature vector
   * @param {Object} options - Search options
   * @returns {Array<Object>} Similar users sorted by similarity (highest first)
   */
  static findSimilarUsers(allUserVectors, queryVector, options = {}) {
    const {
      limit = 5,
      minSimilarity = 0.7, // 70% similarity threshold
      excludeUserId = null
    } = options;

    const similarities = allUserVectors
      .map(userVector => ({
        userId: userVector.userId,
        similarity: this.calculateSimilarity(queryVector, userVector.vector),
        metadata: userVector.metadata
      }))
      .filter(item => {
        // Filter by minimum similarity threshold
        if (item.similarity < minSimilarity) return false;
        // Exclude self
        if (excludeUserId && item.userId === excludeUserId.toString()) return false;
        return true;
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return similarities;
  }

  /**
   * Batch generate feature vectors for multiple users
   * Useful for building initial FAISS index
   *
   * @param {Array<Object>} users - Array of user documents
   * @returns {Array<Object>} Array of feature vectors
   */
  static batchGenerateVectors(users) {
    return users.map(user => {
      try {
        return this.getUserFeatureVector(user);
      } catch (error) {
        console.error(`Error generating vector for user ${user._id}:`, error);
        return null;
      }
    }).filter(v => v !== null);
  }

  // ==================== ENCODING FUNCTIONS ====================

  /**
   * Encodes learning pace into normalized value
   * @private
   */
  static _encodeLearningPace(pace) {
    const encoding = {
      'Slow': 0.33,
      'Moderate': 0.66,
      'Fast': 1.0
    };
    return encoding[pace] || 0.66; // Default to Moderate
  }

  /**
   * Encodes problem-solving approach into normalized value
   * @private
   */
  static _encodeProblemSolvingApproach(approach) {
    const encoding = {
      'Analytical': 0.33,
      'Practical': 0.66,
      'Creative': 1.0
    };
    return encoding[approach] || 0.66; // Default to Practical
  }

  /**
   * Encodes available session time into normalized value
   * @private
   */
  static _encodeAvailableSessionTime(time) {
    const encoding = {
      'Micro (5-10 min)': 0.25,
      'Short (15-30 min)': 0.5,
      'Medium (30-60 min)': 0.75,
      'Long (60+ min)': 1.0
    };
    return encoding[time] || 0.5; // Default to Short
  }

  /**
   * Encodes learning focus into normalized value
   * @private
   */
  static _encodeLearningFocus(focus) {
    const encoding = {
      'Conceptual': 0.2,
      'Practical-Projects': 0.4,
      'Interview-Prep': 0.6,
      'Certification': 0.8,
      'Mixed': 1.0
    };
    return encoding[focus] || 1.0; // Default to Mixed
  }

  /**
   * Encodes experience level into normalized value
   * @private
   */
  static _encodeExperienceLevel(level) {
    const encoding = {
      'Complete Beginner': 0.33,
      'Some Experience': 0.5,
      'Intermediate': 0.66,
      'Advanced': 1.0
    };
    return encoding[level] || 0.33; // Default to Beginner
  }

  /**
   * Encodes learning goal into normalized value
   * @private
   */
  static _encodeLearningGoal(goal) {
    const encoding = {
      'Career Change': 0.25,
      'Skill Enhancement': 0.5,
      'Personal Interest': 0.75,
      'Academic Requirements': 1.0
    };
    return encoding[goal] || 0.75; // Default to Personal Interest
  }

  /**
   * Encodes learning style into normalized value
   * @private
   */
  static _encodeLearningStyle(style) {
    const encoding = {
      'visual': 0.25,
      'hands_on': 0.5,
      'reading': 0.75,
      'interactive': 1.0
    };
    return encoding[style] || 0.25; // Default to visual
  }

  /**
   * Encodes time commitment (preferred content length) into normalized value
   * @private
   */
  static _encodeTimeCommitment(commitment) {
    const encoding = {
      'Short (5-10 min)': 0.25,
      'Medium (10-20 min)': 0.5,
      'Long (20+ min)': 0.75,
      'Very Long (30+ min)': 1.0
    };
    return encoding[commitment] || 0.25; // Default to Short
  }

  /**
   * Encodes interested topics as normalized count
   * Assumes max 8 topics (all programming topics available)
   * @private
   */
  static _encodeInterestedTopics(topics) {
    if (!Array.isArray(topics) || topics.length === 0) {
      return 0;
    }
    const maxTopics = 8;
    return Math.min(1.0, topics.length / maxTopics);
  }

  /**
   * Encodes performance signal from quiz history
   * Calculated from quiz accuracy and completion rates
   * @private
   */
  static _encodePerformanceSignal(user) {
    // This will be populated from AssessmentResult and QuizSession data
    // For now, return neutral value
    // TODO: Calculate from user.learningProgress.completedVideos and assessment results

    if (!user.learningProgress) {
      return 0.5; // Neutral signal for new users
    }

    const completedVideos = user.learningProgress.completedVideos || [];
    if (completedVideos.length === 0) {
      return 0.5;
    }

    // Simple performance signal: normalized completion rate
    // This will be enhanced in Phase 3 with actual quiz performance data
    const completionRate = Math.min(1.0, completedVideos.length / 10);
    return completionRate;
  }

  /**
   * Get vector statistics and metadata
   * Useful for debugging and monitoring
   * @param {Array<Object>} vectors - Array of feature vectors
   * @returns {Object} Statistics about the vectors
   */
  static getVectorStatistics(vectors) {
    if (!Array.isArray(vectors) || vectors.length === 0) {
      return { error: 'No vectors provided' };
    }

    const stats = {
      totalVectors: vectors.length,
      dimensions: VECTOR_DIMENSIONS,
      vectorMean: new Array(VECTOR_DIMENSIONS).fill(0),
      vectorStdDev: new Array(VECTOR_DIMENSIONS).fill(0)
    };

    // Calculate mean for each dimension
    for (let dim = 0; dim < VECTOR_DIMENSIONS; dim++) {
      let sum = 0;
      for (let i = 0; i < vectors.length; i++) {
        sum += vectors[i].vector[dim];
      }
      stats.vectorMean[dim] = sum / vectors.length;
    }

    // Calculate standard deviation
    for (let dim = 0; dim < VECTOR_DIMENSIONS; dim++) {
      let sumSquaredDiffs = 0;
      for (let i = 0; i < vectors.length; i++) {
        const diff = vectors[i].vector[dim] - stats.vectorMean[dim];
        sumSquaredDiffs += diff * diff;
      }
      stats.vectorStdDev[dim] = Math.sqrt(sumSquaredDiffs / vectors.length);
    }

    return stats;
  }
}

module.exports = UserFeatureVectorService;
