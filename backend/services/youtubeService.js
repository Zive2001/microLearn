// services/youtubeService.js
const axios = require('axios');
const openaiService = require('./openaiService');

class YouTubeService {
    constructor() {
        this.apiKey = process.env.YOUTUBE_API_KEY;
        this.baseURL = 'https://www.googleapis.com/youtube/v3';
        this.maxResults = 50; // Fetch more to filter better content
    }

    /**
     * Search for educational videos based on topic and level
     * @param {string} topic - Topic to search for
     * @param {string} level - User skill level (Beginner/Intermediate/Professional)
     * @param {number} maxVideos - Maximum videos to return (default: 3)
     */
    async searchEducationalVideos(topic, level, maxVideos = 3) {
        try {
            // Build search query based on topic and level
            const searchQuery = this.buildSearchQuery(topic, level);
            
            console.log(`Searching YouTube for: "${searchQuery}"`);

            // Search for videos
            const searchResults = await this.searchVideos(searchQuery);
            
            if (searchResults.length === 0) {
                throw new Error('No videos found for the search criteria');
            }

            // Get detailed video information
            const detailedVideos = await this.getVideoDetails(searchResults);
            
            // Filter for educational content only
            const educationalVideos = this.filterEducationalContent(detailedVideos);
            
            // Analyze and score videos with AI
            const analyzedVideos = await this.analyzeVideosWithAI(educationalVideos, topic, level);
            
            // Sort by educational quality and relevance
            const rankedVideos = this.rankVideosByQuality(analyzedVideos);
            
            // Return top videos for the level
            return rankedVideos.slice(0, maxVideos);

        } catch (error) {
            console.error('Error searching educational videos:', error);
            throw error;
        }
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
                }
            });

            return response.data.items.map(item => ({
                videoId: item.id.videoId,
                title: item.snippet.title,
                description: item.snippet.description,
                channelTitle: item.snippet.channelTitle,
                publishedAt: item.snippet.publishedAt,
                thumbnails: item.snippet.thumbnails
            }));

        } catch (error) {
            console.error('YouTube API search error:', error.response?.data || error.message);
            throw new Error('Failed to search YouTube videos');
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
                'react', 'funny', 'meme', 'compilation', 'music', 'song', 
                'game', 'vlog', 'review', 'unboxing', 'news'
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
            for (const video of videos.slice(0, 15)) { // Analyze top 15 candidates
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