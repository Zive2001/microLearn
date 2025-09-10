// services/youtubeSeService.js - Smart Educational YouTube Service
const axios = require('axios');
const User = require('../models/User');
const openaiService = require('./openaiService');

class YoutubeSeService {
    constructor() {
        this.API_KEY = process.env.YOUTUBE_API_KEY;
        this.BASE_URL = 'https://www.googleapis.com/youtube/v3';
        this.cache = new Map(); // Simple in-memory cache
        this.cacheTimeout = 1000 * 60 * 30; // 30 minutes
    }

    // Generate search queries based on user level and topic
    generateSearchQueries(topic, userLevel) {
        const levelModifiers = {
            'Beginner': ['tutorial', 'basics', 'introduction', 'fundamentals', 'getting started', 'beginner guide'],
            'Intermediate': ['advanced tutorial', 'deep dive', 'practical', 'intermediate', 'examples', 'best practices'],
            'Professional': ['advanced', 'expert', 'architecture', 'optimization', 'production', 'master class', 'professional']
        };

        const topicVariations = {
            'javascript': ['JavaScript', 'JS', 'ECMAScript', 'Vanilla JavaScript'],
            'react': ['React.js', 'ReactJS', 'React', 'React Hooks', 'React Components'],
            'typescript': ['TypeScript', 'TS', 'TypeScript tutorial'],
            'nodejs': ['Node.js', 'NodeJS', 'Node', 'Express.js'],
            'python': ['Python', 'Python programming', 'Python tutorial'],
            'nextjs': ['Next.js', 'NextJS', 'Next', 'React Next.js'],
            'mongodb': ['MongoDB', 'Mongo DB', 'NoSQL', 'Database'],
            'css-tailwind': ['Tailwind CSS', 'TailwindCSS', 'Tailwind', 'CSS Framework']
        };

        const queries = [];
        const topicTerms = topicVariations[topic] || [topic];
        const levelTerms = levelModifiers[userLevel] || levelModifiers['Intermediate'];

        // Generate combinations of topic + level modifiers
        topicTerms.forEach(topicTerm => {
            levelTerms.forEach(levelTerm => {
                queries.push(`${topicTerm} ${levelTerm}`);
                queries.push(`${levelTerm} ${topicTerm}`);
            });
        });

        // Add some general queries
        queries.push(`${topic} tutorial ${userLevel.toLowerCase()}`);
        queries.push(`learn ${topic} ${userLevel.toLowerCase()}`);
        
        return queries.slice(0, 5); // Return top 5 queries
    }

    // Search YouTube API for videos
    async searchVideos(query, maxResults = 10) {
        try {
            const response = await axios.get(`${this.BASE_URL}/search`, {
                params: {
                    part: 'snippet',
                    q: query,
                    type: 'video',
                    maxResults,
                    order: 'relevance',
                    videoDuration: 'medium', // 4-20 minutes
                    videoDefinition: 'high',
                    key: this.API_KEY
                }
            });

            return response.data.items;
        } catch (error) {
            console.error('YouTube API search error:', error.response?.data || error.message);
            throw new Error('Failed to search YouTube videos');
        }
    }

    // Get video statistics and details
    async getVideoDetails(videoIds) {
        try {
            const response = await axios.get(`${this.BASE_URL}/videos`, {
                params: {
                    part: 'statistics,contentDetails,snippet',
                    id: videoIds.join(','),
                    key: this.API_KEY
                }
            });

            return response.data.items;
        } catch (error) {
            console.error('YouTube video details error:', error.response?.data || error.message);
            return [];
        }
    }

    // Parse duration from YouTube format (PT4M13S) to seconds
    parseDuration(duration) {
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        const hours = parseInt(match[1] || 0);
        const minutes = parseInt(match[2] || 0);
        const seconds = parseInt(match[3] || 0);
        return hours * 3600 + minutes * 60 + seconds;
    }

    // Format duration for display
    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    // Score video quality using AI analysis
    async scoreVideoQuality(video, topic, userLevel) {
        try {
            const prompt = `
            Analyze this YouTube video for educational quality on ${topic} for a ${userLevel} learner:
            
            Title: ${video.snippet.title}
            Description: ${video.snippet.description.substring(0, 500)}...
            Channel: ${video.snippet.channelTitle}
            Views: ${video.statistics?.viewCount || 'N/A'}
            Duration: ${video.contentDetails?.duration || 'N/A'}
            
            Rate this video from 1-100 based on:
            1. Relevance to ${topic} for ${userLevel} level
            2. Educational value (clear explanations, practical examples)
            3. Production quality indicators
            4. Channel credibility
            5. Content freshness and accuracy
            
            Respond in JSON format:
            {
                "overallScore": 85,
                "relevanceScore": 90,
                "educationalScore": 80,
                "qualityScore": 85,
                "reasoning": "Brief explanation of the score",
                "strengths": ["strength1", "strength2"],
                "concerns": ["concern1"] or []
            }
            `;

            const analysis = await openaiService.analyzeWithGPT(prompt);
            return JSON.parse(analysis);
        } catch (error) {
            console.error('AI scoring error:', error);
            // Fallback scoring based on basic metrics
            return this.basicVideoScoring(video, topic, userLevel);
        }
    }

    // Basic fallback scoring when AI fails
    basicVideoScoring(video, topic, userLevel) {
        let score = 50; // Base score
        
        // Title relevance
        const title = video.snippet.title.toLowerCase();
        const topicLower = topic.toLowerCase();
        if (title.includes(topicLower)) score += 20;
        if (title.includes(userLevel.toLowerCase())) score += 15;
        
        // View count (popular but not too viral)
        const views = parseInt(video.statistics?.viewCount || 0);
        if (views > 1000 && views < 1000000) score += 10;
        else if (views >= 1000000) score += 5;
        
        // Duration (prefer 5-20 minutes)
        if (video.contentDetails?.duration) {
            const duration = this.parseDuration(video.contentDetails.duration);
            if (duration >= 300 && duration <= 1200) score += 10; // 5-20 minutes
        }
        
        // Recent content (within 3 years)
        const publishDate = new Date(video.snippet.publishedAt);
        const yearDiff = (new Date() - publishDate) / (1000 * 60 * 60 * 24 * 365);
        if (yearDiff <= 3) score += 5;
        
        return {
            overallScore: Math.min(score, 100),
            relevanceScore: score,
            educationalScore: 70,
            qualityScore: 60,
            reasoning: "Basic scoring due to AI analysis unavailable",
            strengths: ["Popular content", "Recent upload"],
            concerns: []
        };
    }

    // Get personalized recommendations for a user
    async getRecommendationsForUser(userId, topic, maxVideos = 5) {
        const cacheKey = `user_${userId}_${topic}_${maxVideos}`;
        
        // Check cache
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }

        try {
            // Get user data to determine level and preferences
            const user = await User.findById(userId).select('knowledgeLevels learningPreferences profile');
            if (!user) {
                throw new Error('User not found');
            }

            // Determine user level for this topic
            const userLevel = user.knowledgeLevels[topic]?.level || 'Beginner';
            
            // Generate search queries
            const queries = this.generateSearchQueries(topic, userLevel);
            
            let allVideos = [];
            
            // Search with multiple queries
            for (const query of queries) {
                try {
                    const videos = await this.searchVideos(query, 5);
                    allVideos.push(...videos);
                } catch (error) {
                    console.error(`Search failed for query: ${query}`, error.message);
                }
            }

            // Remove duplicates
            const uniqueVideos = allVideos.filter((video, index, self) => 
                index === self.findIndex(v => v.id.videoId === video.id.videoId)
            );

            // Get detailed video information
            const videoIds = uniqueVideos.map(v => v.id.videoId).slice(0, 15); // Limit for API efficiency
            const videoDetails = await this.getVideoDetails(videoIds);

            // Combine search results with detailed data
            const enrichedVideos = uniqueVideos.map(searchVideo => {
                const details = videoDetails.find(d => d.id === searchVideo.id.videoId);
                return {
                    videoId: searchVideo.id.videoId,
                    title: searchVideo.snippet.title,
                    description: searchVideo.snippet.description,
                    channelTitle: searchVideo.snippet.channelTitle,
                    publishedAt: searchVideo.snippet.publishedAt,
                    thumbnails: searchVideo.snippet.thumbnails,
                    url: `https://www.youtube.com/watch?v=${searchVideo.id.videoId}`,
                    embedUrl: `https://www.youtube.com/embed/${searchVideo.id.videoId}`,
                    statistics: details?.statistics || {},
                    contentDetails: details?.contentDetails || {},
                    viewCount: parseInt(details?.statistics?.viewCount || 0),
                    likeCount: parseInt(details?.statistics?.likeCount || 0),
                    duration: details?.contentDetails?.duration,
                    durationSeconds: details?.contentDetails?.duration ? 
                        this.parseDuration(details.contentDetails.duration) : 0,
                    durationText: details?.contentDetails?.duration ? 
                        this.formatDuration(this.parseDuration(details.contentDetails.duration)) : 'N/A'
                };
            });

            // Score videos with AI
            const scoredVideos = [];
            for (const video of enrichedVideos) {
                try {
                    const aiAnalysis = await this.scoreVideoQuality(
                        { 
                            snippet: video, 
                            statistics: video.statistics,
                            contentDetails: video.contentDetails 
                        }, 
                        topic, 
                        userLevel
                    );
                    
                    scoredVideos.push({
                        ...video,
                        aiAnalysis,
                        finalScore: aiAnalysis.overallScore
                    });
                } catch (error) {
                    console.error(`Scoring failed for video ${video.videoId}:`, error.message);
                    // Add with basic scoring
                    scoredVideos.push({
                        ...video,
                        aiAnalysis: this.basicVideoScoring(
                            { snippet: video, statistics: video.statistics, contentDetails: video.contentDetails },
                            topic,
                            userLevel
                        ),
                        finalScore: 60
                    });
                }
            }

            // Sort by score and filter by minimum quality
            const topVideos = scoredVideos
                .filter(video => video.finalScore >= 60) // Minimum quality threshold
                .sort((a, b) => b.finalScore - a.finalScore)
                .slice(0, maxVideos);

            const result = {
                userId,
                topic,
                userLevel,
                totalVideosAnalyzed: enrichedVideos.length,
                recommendedVideos: topVideos,
                metadata: {
                    generatedAt: new Date().toISOString(),
                    searchQueries: queries,
                    userPreferences: {
                        experienceLevel: user.profile?.experienceLevel || 'Complete Beginner',
                        interestedAreas: user.learningPreferences?.interestedAreas || [],
                        preferredContentLength: user.learningPreferences?.preferredContentLength || 'Short (5-10 min)'
                    }
                }
            };

            // Cache the result
            this.cache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
            });

            return result;

        } catch (error) {
            console.error('Get recommendations error:', error);
            throw new Error(`Failed to get video recommendations: ${error.message}`);
        }
    }

    // Search educational videos (public method, used by test routes)
    async searchEducationalVideos(topic, level, maxVideos = 5) {
        const queries = this.generateSearchQueries(topic, level);
        let allVideos = [];
        
        // Search with the first query to get quick results
        const videos = await this.searchVideos(queries[0], maxVideos * 2);
        const videoIds = videos.map(v => v.id.videoId);
        const videoDetails = await this.getVideoDetails(videoIds);
        
        // Combine and enrich data
        const enrichedVideos = videos.map(searchVideo => {
            const details = videoDetails.find(d => d.id === searchVideo.id.videoId);
            return {
                videoId: searchVideo.id.videoId,
                title: searchVideo.snippet.title,
                channelTitle: searchVideo.snippet.channelTitle,
                url: `https://www.youtube.com/watch?v=${searchVideo.id.videoId}`,
                viewCount: parseInt(details?.statistics?.viewCount || 0),
                duration: details?.contentDetails?.duration,
                durationText: details?.contentDetails?.duration ? 
                    this.formatDuration(this.parseDuration(details.contentDetails.duration)) : 'N/A'
            };
        });

        // Score videos
        const scoredVideos = [];
        for (const video of enrichedVideos.slice(0, maxVideos + 2)) { // Score a few extra
            const aiAnalysis = await this.scoreVideoQuality(
                { 
                    snippet: video, 
                    statistics: { viewCount: video.viewCount },
                    contentDetails: { duration: video.duration }
                }, 
                topic, 
                level
            );
            
            scoredVideos.push({
                ...video,
                aiAnalysis
            });
        }

        return scoredVideos
            .filter(video => video.aiAnalysis.overallScore >= 60)
            .sort((a, b) => b.aiAnalysis.overallScore - a.aiAnalysis.overallScore)
            .slice(0, maxVideos);
    }

    // Clear cache (useful for testing or periodic cleanup)
    clearCache() {
        this.cache.clear();
    }

    // Get cache statistics
    getCacheStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}

module.exports = new YoutubeSeService();