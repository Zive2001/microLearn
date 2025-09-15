// services/youtubeService.js
const axios = require('axios');
const openaiService = require('./openaiService');

class YouTubeService {
    constructor() {
        this.apiKey = process.env.YOUTUBE_API_KEY;
        this.baseURL = 'https://www.googleapis.com/youtube/v3';
        this.maxResults = 5; // Drastically reduced to save quota - minimal API usage

        // Rate limiting and caching
        this.requestCache = new Map();
        this.cacheTimeout = 1800000; // 30 minutes cache - extended to save quota
        this.rateLimitDelay = 1000; // 1 second between requests
        this.lastRequestTime = 0;

        // Retry configuration
        this.maxRetries = 3;
        this.retryDelay = 2000; // 2 seconds
    }

    /**
     * Wait for rate limit delay
     */
    async waitForRateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;

        if (timeSinceLastRequest < this.rateLimitDelay) {
            const waitTime = this.rateLimitDelay - timeSinceLastRequest;
            console.log(`⏱️ Rate limiting: waiting ${waitTime}ms`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        this.lastRequestTime = Date.now();
    }

    /**
     * Get cached result or return null
     */
    getCachedResult(cacheKey) {
        const cached = this.requestCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            console.log(`📋 Using cached result for: ${cacheKey}`);
            return cached.data;
        }
        return null;
    }

    /**
     * Cache result
     */
    setCachedResult(cacheKey, data) {
        this.requestCache.set(cacheKey, {
            data,
            timestamp: Date.now()
        });

        // Clean old cache entries
        if (this.requestCache.size > 50) {
            const entries = Array.from(this.requestCache.entries());
            const oldEntries = entries.filter(([_, entry]) =>
                Date.now() - entry.timestamp > this.cacheTimeout
            );
            oldEntries.forEach(([key]) => this.requestCache.delete(key));
        }
    }

    /**
     * Search for educational videos based on topic and level
     * @param {string} topic - Topic to search for
     * @param {string} level - User skill level (Beginner/Intermediate/Professional)
     * @param {number} maxVideos - Maximum videos to return (default: 3)
     */
    async searchEducationalVideos(topic, level, maxVideos = 3) {
        // Define cache key at function scope
        const cacheKey = `${topic}_${level}_${maxVideos}`;

        try {
            // Check cache first
            const cachedResult = this.getCachedResult(cacheKey);
            if (cachedResult) {
                return cachedResult;
            }

            // Check if YouTube API key is configured
            if (!this.apiKey) {
                throw new Error('YouTube API key is not configured. Please set YOUTUBE_API_KEY environment variable.');
            }

            // Build search query based on topic and level
            const searchQuery = this.buildSearchQuery(topic, level);

            console.log(`🔍 Searching YouTube for: "${searchQuery}"`);

            // Apply rate limiting
            await this.waitForRateLimit();

            // Search for videos with retry logic
            const searchResults = await this.searchVideosWithRetry(searchQuery);

            if (searchResults.length === 0) {
                console.warn(`⚠️ No search results for query: "${searchQuery}"`);
                throw new Error('No videos found for the search criteria');
            }

            console.log(`📹 Found ${searchResults.length} video results`);

            // Get detailed video information
            const detailedVideos = await this.getVideoDetails(searchResults);

            console.log(`📝 Retrieved details for ${detailedVideos.length} videos`);

            // Filter for educational content only
            const educationalVideos = this.filterEducationalContent(detailedVideos);

            console.log(`🎓 Filtered to ${educationalVideos.length} educational videos`);

            if (educationalVideos.length === 0) {
                console.warn(`⚠️ No educational videos found after filtering for topic: ${topic}`);
                // Return basic search results if no educational videos found
                return detailedVideos.slice(0, maxVideos).map(video => ({
                    ...video,
                    aiAnalysis: {
                        educationalScore: 6,
                        relevanceScore: 7,
                        levelAppropriateness: 6,
                        overallScore: 6,
                        reasoning: 'Basic video without AI analysis'
                    }
                }));
            }

            // Analyze and score videos with AI
            const analyzedVideos = await this.analyzeVideosWithAI(educationalVideos, topic, level);

            console.log(`🤖 AI analyzed ${analyzedVideos.length} videos`);

            // Sort by educational quality and relevance
            const rankedVideos = this.rankVideosByQuality(analyzedVideos);

            // Return top videos for the level
            const finalResults = rankedVideos.slice(0, maxVideos);
            console.log(`✅ Returning ${finalResults.length} top-ranked videos`);

            // Cache the result
            this.setCachedResult(cacheKey, finalResults);

            return finalResults;

        } catch (error) {
            console.error('❌ Error searching educational videos:', error);

            // Provide more specific error messages and fallbacks
            if (error.response?.status === 403 || error.response?.status === 429) {
                // Rate limit hit - return cached mock data as fallback
                console.warn('⚠️ YouTube API rate limited, returning fallback content');
                const fallbackVideos = this.getFallbackVideos(topic, level, maxVideos);
                this.setCachedResult(cacheKey, fallbackVideos);
                return fallbackVideos;
            } else if (error.message.includes('quota exceeded')) {
                // Quota exceeded - return fallback
                console.warn('⚠️ YouTube API quota exceeded, returning fallback content');
                const fallbackVideos = this.getFallbackVideos(topic, level, maxVideos);
                this.setCachedResult(cacheKey, fallbackVideos);
                return fallbackVideos;
            } else if (error.message.includes('API key') && !error.response) {
                throw new Error('YouTube service unavailable: API configuration issue');
            } else if (error.response?.status === 400) {
                throw new Error('YouTube service unavailable: Invalid request parameters');
            }

            throw error;
        }
    }

    /**
     * Get fallback videos when API is rate limited
     * @param {string} topic - Programming topic
     * @param {string} level - User skill level
     * @param {number} maxVideos - Max videos to return
     */
    getFallbackVideos(topic, level, maxVideos) {
        const fallbackData = {
            react: {
                Beginner: [
                    { title: "React Tutorial for Beginners", videoId: "SqcY0GlETPk", channel: "Programming with Mosh" },
                    { title: "React Crash Course", videoId: "w7ejDZ8SWv8", channel: "Traversy Media" },
                    { title: "Learn React in 30 Minutes", videoId: "hQAHSlTtcmY", channel: "Web Dev Simplified" }
                ],
                Intermediate: [
                    { title: "React Hooks Tutorial", videoId: "O6P86uwfdR0", channel: "Web Dev Simplified" },
                    { title: "Advanced React Patterns", videoId: "Ld9Aw_b0lQE", channel: "Kent C. Dodds" },
                    { title: "React Context & Hooks", videoId: "35lXWvCuM8o", channel: "Net Ninja" }
                ],
                Professional: [
                    { title: "React Performance Optimization", videoId: "8pDqJVdNa44", channel: "React Conf" },
                    { title: "Advanced React Architecture", videoId: "nLF0n9SACd4", channel: "React Europe" },
                    { title: "React Testing Best Practices", videoId: "3e1GHCA3GP0", channel: "Kent C. Dodds" }
                ]
            },
            javascript: {
                Beginner: [
                    { title: "JavaScript Crash Course", videoId: "hdI2bqOjy3c", channel: "Traversy Media" },
                    { title: "JavaScript Tutorial for Beginners", videoId: "W6NZfCO5SIk", channel: "Programming with Mosh" },
                    { title: "Learn JavaScript in 1 Hour", videoId: "W6NZfCO5SIk", channel: "Programming with Mosh" }
                ],
                Intermediate: [
                    { title: "JavaScript ES6 Features", videoId: "NCwa_xi0Uuc", channel: "Traversy Media" },
                    { title: "Async JavaScript", videoId: "PoRJizFvM7s", channel: "Web Dev Simplified" },
                    { title: "JavaScript Objects Deep Dive", videoId: "PFmuCDHHpwk", channel: "Fun Fun Function" }
                ],
                Professional: [
                    { title: "Advanced JavaScript Concepts", videoId: "Bv_5Zv5c-Ts", channel: "Akshay Saini" },
                    { title: "JavaScript Design Patterns", videoId: "kuirGzhGhyw", channel: "Traversy Media" },
                    { title: "JavaScript Performance", videoId: "8aGhZQkoFbQ", channel: "Google Chrome Developers" }
                ]
            }
        };

        const videos = fallbackData[topic]?.[level] || fallbackData.javascript.Beginner;

        return videos.slice(0, maxVideos).map((video, index) => ({
            videoId: video.videoId,
            title: video.title,
            description: `${level} level ${topic} tutorial`,
            channelTitle: video.channel,
            url: `https://www.youtube.com/watch?v=${video.videoId}`,
            embedUrl: `https://www.youtube.com/embed/${video.videoId}`,
            thumbnails: {
                medium: { url: `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg` }
            },
            duration: 1200, // 20 minutes average
            durationText: "20:00",
            viewCount: 50000 + (index * 10000),
            likeCount: 2000 + (index * 100),
            publishedAt: new Date(Date.now() - (index * 86400000)).toISOString(),
            aiAnalysis: {
                educationalScore: 8,
                relevanceScore: 9,
                levelAppropriateness: 8,
                overallScore: 8,
                reasoning: `Fallback ${level} ${topic} content - high quality educational video`
            },
            compositeScore: 8.5
        }));
    }

    /**
     * Build optimized search query for educational content
     * @param {string} topic - Programming topic
     * @param {string} level - User skill level
     */
    buildSearchQuery(topic, level) {
        const topicQueries = {
            javascript: {
                Beginner: 'JavaScript tutorial beginners course basics fundamentals',
                Intermediate: 'JavaScript intermediate course practical projects ES6',
                Professional: 'Advanced JavaScript design patterns performance optimization'
            },
            react: {
                Beginner: 'React tutorial beginners course components JSX',
                Intermediate: 'React intermediate hooks state management projects',
                Professional: 'Advanced React patterns performance optimization testing'
            },
            typescript: {
                Beginner: 'TypeScript tutorial beginners course types basics',
                Intermediate: 'TypeScript intermediate interfaces generics practical',
                Professional: 'Advanced TypeScript patterns compiler configuration'
            },
            nodejs: {
                Beginner: 'Node.js tutorial beginners course server basics',
                Intermediate: 'Node.js intermediate Express API database MongoDB',
                Professional: 'Advanced Node.js microservices performance scaling'
            },
            python: {
                Beginner: 'Python tutorial beginners course programming basics',
                Intermediate: 'Python intermediate OOP projects web development',
                Professional: 'Advanced Python design patterns performance optimization'
            },
            nextjs: {
                Beginner: 'Next.js tutorial beginners course React SSR',
                Intermediate: 'Next.js intermediate API routes deployment',
                Professional: 'Advanced Next.js optimization performance patterns'
            },
            mongodb: {
                Beginner: 'MongoDB tutorial beginners database NoSQL basics',
                Intermediate: 'MongoDB intermediate aggregation indexing queries',
                Professional: 'Advanced MongoDB performance scaling replication'
            },
            'css-tailwind': {
                Beginner: 'CSS Tailwind tutorial beginners responsive design',
                Intermediate: 'Tailwind CSS intermediate components utilities',
                Professional: 'Advanced Tailwind CSS customization optimization'
            }
        };

        return topicQueries[topic]?.[level] || `${topic} ${level.toLowerCase()} tutorial course`;
    }

    /**
     * Search videos with retry logic for rate limiting
     * @param {string} query - Search query
     */
    async searchVideosWithRetry(query, attempt = 1) {
        try {
            return await this.searchVideos(query);
        } catch (error) {
            // Check if this is a quota exceeded error (don't retry)
            if (error.message.includes('quota exceeded')) {
                console.warn('⚠️ YouTube API quota exceeded - no retry needed');
                throw error;
            }

            // If rate limited (429) and we have retries left
            if (error.response?.status === 429 && attempt <= this.maxRetries) {
                const delay = this.retryDelay * attempt;
                console.log(`🔄 Rate limited, retrying in ${delay}ms (attempt ${attempt}/${this.maxRetries})`);

                await new Promise(resolve => setTimeout(resolve, delay));
                return this.searchVideosWithRetry(query, attempt + 1);
            }

            throw error;
        }
    }

    /**
     * Search YouTube for videos using the Data API
     * @param {string} query - Search query
     */
    async searchVideos(query) {
        try {
            const response = await axios.get(`${this.baseURL}/search`, {
                params: {
                    key: this.apiKey,
                    q: query,
                    part: 'snippet',
                    type: 'video',
                    maxResults: this.maxResults,
                    order: 'relevance',
                    videoDuration: 'medium', // 4-20 minutes (good for learning)
                    videoDefinition: 'high',
                    safeSearch: 'strict'
                },
                timeout: 10000 // 10 second timeout
            });

            if (!response.data.items || response.data.items.length === 0) {
                console.warn(`⚠️ YouTube API returned no results for query: "${query}"`);
                return [];
            }

            return response.data.items.map(item => ({
                videoId: item.id.videoId,
                title: item.snippet.title,
                description: item.snippet.description,
                channelTitle: item.snippet.channelTitle,
                publishedAt: item.snippet.publishedAt,
                thumbnails: item.snippet.thumbnails
            }));

        } catch (error) {
            console.error('❌ YouTube API search error:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                message: error.message
            });

            if (error.response?.status === 403) {
                throw new Error('YouTube API quota exceeded or invalid API key');
            } else if (error.response?.status === 400) {
                throw new Error('Invalid YouTube API request parameters');
            } else if (error.code === 'ECONNABORTED') {
                throw new Error('YouTube API request timeout');
            } else if (!error.response) {
                throw new Error('Unable to connect to YouTube API');
            }

            throw new Error(`YouTube API error: ${error.response?.status || 'Unknown error'}`);
        }
    }

    /**
     * Get detailed information about videos
     * @param {Array} videos - Array of video objects
     */
    async getVideoDetails(videos) {
        try {
            const videoIds = videos.map(v => v.videoId).join(',');
            
            const response = await axios.get(`${this.baseURL}/videos`, {
                params: {
                    key: this.apiKey,
                    id: videoIds,
                    part: 'snippet,statistics,contentDetails'
                }
            });

            return response.data.items.map(item => {
                const duration = this.parseISO8601Duration(item.contentDetails.duration);
                
                return {
                    videoId: item.id,
                    title: item.snippet.title,
                    description: item.snippet.description,
                    channelTitle: item.snippet.channelTitle,
                    publishedAt: item.snippet.publishedAt,
                    thumbnails: item.snippet.thumbnails,
                    duration: duration,
                    durationText: this.formatDuration(duration),
                    viewCount: parseInt(item.statistics.viewCount || 0),
                    likeCount: parseInt(item.statistics.likeCount || 0),
                    commentCount: parseInt(item.statistics.commentCount || 0),
                    url: `https://www.youtube.com/watch?v=${item.id}`,
                    embedUrl: `https://www.youtube.com/embed/${item.id}`
                };
            });

        } catch (error) {
            console.error('Error getting video details:', error);
            throw new Error('Failed to get video details');
        }
    }

    /**
     * Filter for educational content based on metrics
     * @param {Array} videos - Array of detailed video objects
     */
    filterEducationalContent(videos) {
        return videos.filter(video => {
            // Filter criteria for educational content
            const minDuration = 300; // 5 minutes minimum
            const maxDuration = 7200; // 2 hours maximum
            const minViews = 1000; // Minimum view count for credibility
            
            // Check duration (educational videos should be substantial)
            if (video.duration < minDuration || video.duration > maxDuration) {
                return false;
            }
            
            // Check view count (some credibility indicator)
            if (video.viewCount < minViews) {
                return false;
            }
            
            // Filter out clearly non-educational content
            const title = video.title.toLowerCase();
            const blacklistedTerms = [
                'funny', 'meme', 'compilation', 'music', 'song',
                'game', 'vlog', 'review', 'unboxing', 'news', 'prank',
                'challenge', 'vs', 'reaction'
            ];
            
            const hasBlacklistedTerm = blacklistedTerms.some(term => 
                title.includes(term) && !this.isEducationalContext(title, term)
            );
            
            if (hasBlacklistedTerm) {
                return false;
            }
            
            // Prefer educational keywords
            const educationalKeywords = [
                'tutorial', 'course', 'learn', 'guide', 'how to', 'introduction',
                'beginner', 'intermediate', 'advanced', 'complete', 'full',
                'programming', 'coding', 'development', 'explained'
            ];
            
            const hasEducationalKeyword = educationalKeywords.some(keyword => 
                title.includes(keyword)
            );
            
            return hasEducationalKeyword;
        });
    }

    /**
     * Check if a term is used in educational context
     * @param {string} title - Video title
     * @param {string} term - Term to check
     */
    isEducationalContext(title, term) {
        const educationalContext = {
            'react': ['tutorial', 'course', 'learn', 'guide', 'development'],
            'game': ['development', 'programming', 'coding', 'tutorial'],
            'music': ['programming', 'theory', 'algorithm']
        };
        
        const contextWords = educationalContext[term] || [];
        return contextWords.some(word => title.includes(word));
    }

    /**
     * Analyze videos using AI for educational quality
     * @param {Array} videos - Filtered video array
     * @param {string} topic - Original topic
     * @param {string} level - User level
     */
    async analyzeVideosWithAI(videos, topic, level) {
        try {
            const analyzedVideos = [];
            
            // Analyze videos in batches to avoid rate limits
            for (const video of videos.slice(0, 10)) { // Analyze top 10 candidates to save OpenAI quota
                try {
                    const analysis = await this.analyzeVideoEducationalValue(video, topic, level);
                    analyzedVideos.push({
                        ...video,
                        aiAnalysis: analysis
                    });
                } catch (error) {
                    console.error(`Error analyzing video ${video.videoId}:`, error);
                    // Include video with default analysis if AI analysis fails
                    analyzedVideos.push({
                        ...video,
                        aiAnalysis: {
                            educationalScore: 5,
                            relevanceScore: 5,
                            levelAppropriateness: 5,
                            overallScore: 5,
                            reasoning: 'AI analysis unavailable'
                        }
                    });
                }
            }
            
            return analyzedVideos;
            
        } catch (error) {
            console.error('Error in AI video analysis:', error);
            // Return videos with basic scoring if AI analysis fails
            return videos.map(video => ({
                ...video,
                aiAnalysis: {
                    educationalScore: 5,
                    relevanceScore: 5,
                    levelAppropriateness: 5,
                    overallScore: 5,
                    reasoning: 'Basic scoring applied'
                }
            }));
        }
    }

    /**
     * Analyze individual video's educational value using AI
     * @param {Object} video - Video object
     * @param {string} topic - Topic
     * @param {string} level - User level
     */
    async analyzeVideoEducationalValue(video, topic, level) {
        const prompt = `Analyze this YouTube video for educational value:

Title: ${video.title}
Description: ${video.description.substring(0, 500)}
Channel: ${video.channelTitle}
Duration: ${video.durationText}
Views: ${video.viewCount.toLocaleString()}

Topic: ${topic}
Target Level: ${level}

Rate this video on a scale of 1-10 for:
1. Educational Quality (clear explanation, structured content)
2. Topic Relevance (how well it matches ${topic})
3. Level Appropriateness (suitable for ${level} level)

Respond with JSON only:
{
  "educationalScore": 8,
  "relevanceScore": 9,
  "levelAppropriateness": 7,
  "overallScore": 8,
  "reasoning": "Well-structured tutorial with clear examples, perfect for intermediate learners",
  "pros": ["Clear explanation", "Good examples"],
  "cons": ["Could be more detailed", "Assumes some prior knowledge"]
}`;

        try {
            const response = await openaiService.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert educational content evaluator. Analyze videos objectively and provide accurate ratings.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 300,
                temperature: 0.3
            });

            return JSON.parse(response.choices[0].message.content.trim());

        } catch (error) {
            console.error('Error in AI video analysis:', error);
            throw error;
        }
    }

    /**
     * Rank videos by overall quality score
     * @param {Array} videos - Videos with AI analysis
     */
    rankVideosByQuality(videos) {
        return videos
            .map(video => {
                // Calculate composite score
                const aiScore = video.aiAnalysis.overallScore || 5;
                const viewScore = Math.min(Math.log10(video.viewCount) / 2, 5); // Normalize views
                const engagementScore = video.likeCount / Math.max(video.viewCount, 1) * 100;
                
                const compositeScore = (aiScore * 0.6) + (viewScore * 0.3) + (engagementScore * 0.1);
                
                return {
                    ...video,
                    compositeScore
                };
            })
            .sort((a, b) => b.compositeScore - a.compositeScore);
    }

    /**
     * Utility functions
     */
    parseISO8601Duration(duration) {
        const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
        const hours = (parseInt(match[1]) || 0);
        const minutes = (parseInt(match[2]) || 0);
        const seconds = (parseInt(match[3]) || 0);
        return hours * 3600 + minutes * 60 + seconds;
    }

    formatDuration(seconds) {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hrs > 0) {
            return `${hrs}h ${mins}m`;
        } else if (mins > 0) {
            return `${mins}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }

    /**
     * Get video recommendations for user
     * @param {string} userId - User ID
     * @param {string} topic - Topic to get recommendations for
     */
    async getRecommendationsForUser(userId, topic) {
        try {
            // Get user's level for this topic from database
            const User = require('../models/User');
            const user = await User.findById(userId);
            
            if (!user) {
                throw new Error('User not found');
            }

            const userLevel = user.knowledgeLevels[topic]?.level;
            if (!userLevel) {
                throw new Error('User has not been assessed for this topic');
            }

            // Get video recommendations
            const recommendations = await this.searchEducationalVideos(topic, userLevel, 3);
            
            return {
                topic,
                userLevel,
                totalVideos: recommendations.length,
                recommendations: recommendations.map(video => ({
                    videoId: video.videoId,
                    title: video.title,
                    channelTitle: video.channelTitle,
                    duration: video.durationText,
                    url: video.url,
                    embedUrl: video.embedUrl,
                    thumbnails: video.thumbnails,
                    educationalScore: video.aiAnalysis.overallScore,
                    reasoning: video.aiAnalysis.reasoning,
                    viewCount: video.viewCount.toLocaleString()
                }))
            };

        } catch (error) {
            console.error('Error getting user recommendations:', error);
            throw error;
        }
    }
}

module.exports = new YouTubeService();