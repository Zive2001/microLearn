// services/recommendationEngine.js
const youtubeService = require('./youtubeService');
const User = require('../models/User');
const { AssessmentResult } = require('../models/Assessment');

class RecommendationEngine {
    constructor() {
        // Recommendation weights for different factors
        this.weights = {
            levelMatch: 0.4,        // How well video matches user's level
            topicRelevance: 0.3,    // How relevant to the topic
            educationalQuality: 0.2, // AI-assessed educational value
            userPreferences: 0.1    // User's learning preferences
        };
    }

    /**
     * Get personalized video recommendations for user
     * @param {string} userId - User ID
     * @param {string} topic - Topic to get recommendations for
     * @param {Object} options - Additional options
     */
    async getPersonalizedRecommendations(userId, topic, options = {}) {
        try {
            const {
                maxVideos = 3,
                includeAlternativeLevels = false,
                forceRefresh = false
            } = options;

            // Get user data and assessment history
            const userProfile = await this.getUserProfile(userId, topic);
            
            if (!userProfile.hasAssessment) {
                throw new Error('User must complete assessment for this topic first');
            }

            // Get video recommendations based on user's level
            const primaryRecommendations = await youtubeService.searchEducationalVideos(
                topic, 
                userProfile.currentLevel, 
                maxVideos
            );

            let allRecommendations = primaryRecommendations;

            // Include videos from adjacent levels if requested
            if (includeAlternativeLevels) {
                const alternativeVideos = await this.getAlternativeLevelVideos(
                    topic, 
                    userProfile.currentLevel, 
                    2
                );
                allRecommendations = [...primaryRecommendations, ...alternativeVideos];
            }

            // Apply personalization scoring
            const personalizedVideos = await this.applyPersonalizationScoring(
                allRecommendations,
                userProfile
            );

            // Sort by personalized score and return top videos
            const finalRecommendations = personalizedVideos
                .sort((a, b) => b.personalizedScore - a.personalizedScore)
                .slice(0, maxVideos);

            return {
                userId,
                topic,
                userLevel: userProfile.currentLevel,
                userScore: userProfile.currentScore,
                totalVideos: finalRecommendations.length,
                recommendations: finalRecommendations.map(video => this.formatVideoForMicrolearning(video)),
                metadata: {
                    generatedAt: new Date(),
                    basedOnAssessment: userProfile.lastAssessmentDate,
                    confidenceScore: userProfile.assessmentConfidence,
                    includesAlternativeLevels: includeAlternativeLevels
                }
            };

        } catch (error) {
            console.error('Error getting personalized recommendations:', error);
            throw error;
        }
    }

    /**
     * Get user profile and assessment data
     * @param {string} userId - User ID
     * @param {string} topic - Topic
     */
    async getUserProfile(userId, topic) {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Check if user has selected this topic
        const hasSelectedTopic = user.learningProgress.selectedTopics.some(
            st => st.topic === topic
        );

        if (!hasSelectedTopic) {
            throw new Error('User has not selected this topic for learning');
        }

        // Get assessment data for this topic
        const knowledgeLevel = user.knowledgeLevels[topic];
        const hasAssessment = knowledgeLevel && knowledgeLevel.level;

        // Get latest assessment result for more detailed info
        let latestAssessment = null;
        if (hasAssessment) {
            latestAssessment = await AssessmentResult.findOne({
                userId,
                topic
            }).sort({ createdAt: -1 });
        }

        return {
            userId,
            topic,
            hasAssessment,
            currentLevel: knowledgeLevel?.level || null,
            currentScore: knowledgeLevel?.score || null,
            lastAssessmentDate: knowledgeLevel?.assessedAt || null,
            assessmentConfidence: latestAssessment?.confidence || 0,
            strengths: latestAssessment?.analysis?.strengths || [],
            weaknesses: latestAssessment?.analysis?.weaknesses || [],
            learningPreferences: user.learningPreferences,
            profile: user.profile
        };
    }

    /**
     * Get videos from adjacent difficulty levels
     * @param {string} topic - Topic
     * @param {string} currentLevel - User's current level
     * @param {number} maxVideos - Max videos per level
     */
    async getAlternativeLevelVideos(topic, currentLevel, maxVideos = 2) {
        const levelHierarchy = {
            'Beginner': ['Intermediate'],
            'Intermediate': ['Beginner', 'Professional'],
            'Professional': ['Intermediate']
        };

        const alternativeLevels = levelHierarchy[currentLevel] || [];
        const alternativeVideos = [];

        for (const level of alternativeLevels) {
            try {
                const videos = await youtubeService.searchEducationalVideos(topic, level, maxVideos);
                // Mark these as alternative level videos
                const markedVideos = videos.map(video => ({
                    ...video,
                    isAlternativeLevel: true,
                    originalLevel: level,
                    recommendedFor: currentLevel
                }));
                alternativeVideos.push(...markedVideos);
            } catch (error) {
                console.error(`Error getting ${level} videos for ${topic}:`, error);
            }
        }

        return alternativeVideos;
    }

    /**
     * Apply personalization scoring to videos
     * @param {Array} videos - Array of video objects
     * @param {Object} userProfile - User profile data
     */
    async applyPersonalizationScoring(videos, userProfile) {
        return videos.map(video => {
            // Level match score
            const levelMatchScore = this.calculateLevelMatchScore(video, userProfile);
            
            // Topic relevance (already from AI analysis)
            const topicRelevanceScore = video.aiAnalysis?.relevanceScore || 5;
            
            // Educational quality (already from AI analysis)
            const educationalQualityScore = video.aiAnalysis?.educationalScore || 5;
            
            // User preference score
            const userPreferenceScore = this.calculateUserPreferenceScore(video, userProfile);

            // Calculate weighted personalized score
            const personalizedScore = (
                (levelMatchScore * this.weights.levelMatch) +
                (topicRelevanceScore * this.weights.topicRelevance) +
                (educationalQualityScore * this.weights.educationalQuality) +
                (userPreferenceScore * this.weights.userPreferences)
            );

            return {
                ...video,
                personalizedScore,
                scoringBreakdown: {
                    levelMatch: levelMatchScore,
                    topicRelevance: topicRelevanceScore,
                    educationalQuality: educationalQualityScore,
                    userPreference: userPreferenceScore,
                    weighted: personalizedScore
                }
            };
        });
    }

    /**
     * Calculate how well video matches user's level
     * @param {Object} video - Video object
     * @param {Object} userProfile - User profile
     */
    calculateLevelMatchScore(video, userProfile) {
        // Perfect match for user's exact level
        if (!video.isAlternativeLevel) {
            return 10;
        }

        // Alternative level scoring
        const userLevel = userProfile.currentLevel;
        const videoLevel = video.originalLevel;

        // Scoring based on user's score within their level
        const userScore = userProfile.currentScore || 50;

        // If user scored high in their level, recommend higher level content
        if (userLevel === 'Beginner' && userScore >= 70 && videoLevel === 'Intermediate') {
            return 8; // Good progression recommendation
        }

        // If user scored low in their level, recommend lower level content
        if (userLevel === 'Intermediate' && userScore <= 60 && videoLevel === 'Beginner') {
            return 7; // Good reinforcement recommendation
        }

        // Advanced users might benefit from reviewing intermediate concepts
        if (userLevel === 'Professional' && videoLevel === 'Intermediate') {
            return 6; // Moderate recommendation for review
        }

        return 4; // Default score for other combinations
    }

    /**
     * Calculate user preference score based on learning preferences
     * @param {Object} video - Video object
     * @param {Object} userProfile - User profile
     */
    calculateUserPreferenceScore(video, userProfile) {
        let score = 5; // Base score

        // Duration preference scoring
        const videoDuration = video.duration || 0;
        const preferredLength = userProfile.learningPreferences?.preferredContentLength;

        if (preferredLength === 'Short (5-10 min)' && videoDuration <= 600) {
            score += 2;
        } else if (preferredLength === 'Medium (10-20 min)' && videoDuration >= 600 && videoDuration <= 1200) {
            score += 2;
        } else if (preferredLength === 'Long (20+ min)' && videoDuration > 1200) {
            score += 2;
        }

        // Channel credibility (view count and engagement)
        const viewCount = video.viewCount || 0;
        if (viewCount > 100000) {
            score += 1; // Popular content bonus
        }

        // Educational keywords in title
        const title = video.title.toLowerCase();
        const educationalKeywords = ['complete', 'full course', 'tutorial', 'explained', 'guide'];
        const hasEducationalKeywords = educationalKeywords.some(keyword => title.includes(keyword));
        
        if (hasEducationalKeywords) {
            score += 1;
        }

        return Math.min(score, 10); // Cap at 10
    }

    /**
     * Format video data for microlearning consumption
     * @param {Object} video - Video object with all analysis
     */
    formatVideoForMicrolearning(video) {
        return {
            // Basic video info
            videoId: video.videoId,
            title: video.title,
            description: video.description?.substring(0, 200) + '...',
            channelTitle: video.channelTitle,
            
            // Media URLs
            url: video.url,
            embedUrl: video.embedUrl,
            thumbnails: {
                default: video.thumbnails?.default?.url,
                medium: video.thumbnails?.medium?.url,
                high: video.thumbnails?.high?.url
            },
            
            // Duration and timing
            duration: video.duration,
            durationText: video.durationText,
            publishedAt: video.publishedAt,
            
            // Quality metrics
            viewCount: video.viewCount,
            likeCount: video.likeCount,
            engagementRate: video.likeCount / Math.max(video.viewCount, 1),
            
            // AI Analysis
            educationalScore: video.aiAnalysis?.educationalScore || 5,
            relevanceScore: video.aiAnalysis?.relevanceScore || 5,
            levelAppropriateness: video.aiAnalysis?.levelAppropriateness || 5,
            aiReasoning: video.aiAnalysis?.reasoning,
            
            // Personalization
            personalizedScore: video.personalizedScore,
            recommendationReason: this.generateRecommendationReason(video),
            
            // Alternative level info
            isAlternativeLevel: video.isAlternativeLevel || false,
            originalLevel: video.originalLevel,
            
            // Microlearning specific
            suggestedBreakpoints: this.suggestVideoBreakpoints(video),
            keyTopics: this.extractKeyTopics(video),
            difficulty: video.aiAnalysis?.levelAppropriateness >= 7 ? 'appropriate' : 'challenging'
        };
    }

    /**
     * Generate human-readable recommendation reason
     * @param {Object} video - Video with scoring
     */
    generateRecommendationReason(video) {
        const score = video.personalizedScore;
        const breakdown = video.scoringBreakdown;

        if (score >= 8) {
            return 'Highly recommended: Perfect match for your level and learning style';
        } else if (score >= 7) {
            return 'Good fit: Aligns well with your current knowledge level';
        } else if (video.isAlternativeLevel) {
            if (breakdown.levelMatch >= 7) {
                return `Progression opportunity: Slightly ${video.originalLevel.toLowerCase()} content to challenge you`;
            } else {
                return `Review material: ${video.originalLevel} content to reinforce fundamentals`;
            }
        } else {
            return 'Moderate fit: May require some background knowledge';
        }
    }

    /**
     * Suggest video breakpoints for microlearning
     * @param {Object} video - Video object
     */
    suggestVideoBreakpoints(video) {
        const duration = video.duration || 0;
        const breakpoints = [];

        // Suggest 5-10 minute chunks for optimal microlearning
        const chunkSize = 300; // 5 minutes
        
        for (let i = chunkSize; i < duration; i += chunkSize) {
            breakpoints.push({
                timestamp: i,
                timeText: this.formatTimestamp(i),
                suggestedPause: true,
                reason: 'Good stopping point for microlearning'
            });
        }

        return breakpoints.slice(0, 5); // Max 5 breakpoints
    }

    /**
     * Extract key topics from video title and description
     * @param {Object} video - Video object
     */
    extractKeyTopics(video) {
        const text = `${video.title} ${video.description}`.toLowerCase();
        const topics = [];

        // Common programming concepts to identify
        const conceptKeywords = {
            'variables': ['variable', 'var', 'let', 'const'],
            'functions': ['function', 'arrow function', 'callback'],
            'objects': ['object', 'property', 'method'],
            'arrays': ['array', 'list', 'iteration'],
            'classes': ['class', 'constructor', 'inheritance'],
            'async': ['async', 'await', 'promise', 'callback'],
            'dom': ['dom', 'element', 'selector', 'event'],
            'api': ['api', 'fetch', 'request', 'response']
        };

        Object.entries(conceptKeywords).forEach(([concept, keywords]) => {
            if (keywords.some(keyword => text.includes(keyword))) {
                topics.push(concept);
            }
        });

        return topics.slice(0, 5); // Max 5 key topics
    }

    /**
     * Format timestamp to readable time
     * @param {number} seconds - Seconds
     */
    formatTimestamp(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    /**
     * Get learning path recommendations (sequence of videos)
     * @param {string} userId - User ID
     * @param {string} topic - Topic
     * @param {number} maxVideos - Maximum videos in path
     */
    async generateLearningPath(userId, topic, maxVideos = 5) {
        try {
            // Get user profile
            const userProfile = await this.getUserProfile(userId, topic);
            
            if (!userProfile.hasAssessment) {
                throw new Error('User must complete assessment for this topic first');
            }

            // Get diverse content (current level + progression)
            const currentLevelVideos = await youtubeService.searchEducationalVideos(
                topic, 
                userProfile.currentLevel, 
                3
            );

            const progressionVideos = await this.getProgressionVideos(
                topic, 
                userProfile.currentLevel, 
                2
            );

            // Combine and sequence videos
            const allVideos = [...currentLevelVideos, ...progressionVideos];
            const personalizedVideos = await this.applyPersonalizationScoring(allVideos, userProfile);

            // Sort by learning progression logic
            const sequencedPath = this.sequenceForOptimalLearning(personalizedVideos, userProfile);

            return {
                userId,
                topic,
                userLevel: userProfile.currentLevel,
                pathLength: sequencedPath.length,
                estimatedCompletionTime: this.calculatePathDuration(sequencedPath),
                learningPath: sequencedPath.slice(0, maxVideos).map((video, index) => ({
                    position: index + 1,
                    ...this.formatVideoForMicrolearning(video),
                    learningObjective: this.generateLearningObjective(video, index, userProfile)
                })),
                metadata: {
                    generatedAt: new Date(),
                    basedOnLevel: userProfile.currentLevel,
                    progressionIncluded: true
                }
            };

        } catch (error) {
            console.error('Error generating learning path:', error);
            throw error;
        }
    }

    /**
     * Get videos for skill progression
     * @param {string} topic - Topic
     * @param {string} currentLevel - Current user level
     * @param {number} maxVideos - Max videos
     */
    async getProgressionVideos(topic, currentLevel, maxVideos) {
        const progression = {
            'Beginner': 'Intermediate',
            'Intermediate': 'Professional',
            'Professional': 'Professional' // Stay at advanced level
        };

        const nextLevel = progression[currentLevel];
        if (nextLevel && nextLevel !== currentLevel) {
            const videos = await youtubeService.searchEducationalVideos(topic, nextLevel, maxVideos);
            return videos.map(video => ({
                ...video,
                isProgression: true,
                targetLevel: nextLevel
            }));
        }

        return [];
    }

    /**
     * Sequence videos for optimal learning progression
     * @param {Array} videos - All available videos
     * @param {Object} userProfile - User profile
     */
    sequenceForOptimalLearning(videos, userProfile) {
        // Separate by type
        const currentLevelVideos = videos.filter(v => !v.isProgression && !v.isAlternativeLevel);
        const progressionVideos = videos.filter(v => v.isProgression);
        const reviewVideos = videos.filter(v => v.isAlternativeLevel);

        // Optimal sequence: review (if needed) → current level → progression
        let sequence = [];

        // Add review videos for users who scored low
        if (userProfile.currentScore < 60 && reviewVideos.length > 0) {
            sequence.push(...reviewVideos.slice(0, 1));
        }

        // Add current level videos (foundation)
        sequence.push(...currentLevelVideos.slice(0, 3));

        // Add progression videos (advancement)
        sequence.push(...progressionVideos.slice(0, 2));

        return sequence;
    }

    /**
     * Calculate total path duration
     * @param {Array} videos - Video sequence
     */
    calculatePathDuration(videos) {
        const totalSeconds = videos.reduce((sum, video) => sum + (video.duration || 0), 0);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }

    /**
     * Generate learning objective for video in sequence
     * @param {Object} video - Video object
     * @param {number} index - Position in sequence
     * @param {Object} userProfile - User profile
     */
    generateLearningObjective(video, index, userProfile) {
        if (index === 0) {
            return `Foundation: Master core ${userProfile.topic} concepts`;
        } else if (video.isProgression) {
            return `Advancement: Explore ${video.targetLevel.toLowerCase()} ${userProfile.topic} techniques`;
        } else if (video.isAlternativeLevel) {
            return `Review: Strengthen fundamental understanding`;
        } else {
            return `Practice: Apply ${userProfile.topic} skills in real scenarios`;
        }
    }
}

module.exports = new RecommendationEngine();