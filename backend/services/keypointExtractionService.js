/**
 * Keypoint Extraction Service
 * Extracts 5-7 key learning topics from video metadata using OpenAI
 * Implements caching to avoid redundant API calls
 */

const NodeCache = require('node-cache');
const openaiService = require('./openaiService');

// Initialize cache with 1 hour TTL
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

/**
 * Extract key topics from video metadata
 * @param {Object} videoData - Video metadata
 * @param {string} videoData.title - Video title
 * @param {string} videoData.description - Video description
 * @param {string} videoData.topic - Learning topic (javascript, react, etc)
 * @param {string} videoData.difficulty - Video difficulty level
 * @returns {Promise<Array>} Array of 5-7 key topics
 */
async function extractKeyTopicsFromVideo(videoData) {
    try {
        const { title, description = '', topic = 'general', difficulty = 'Intermediate' } = videoData;

        // Create cache key
        const cacheKey = `keypoints:${title}:${topic}`;

        // Check cache first
        const cachedResult = cache.get(cacheKey);
        if (cachedResult) {
            console.log(`✅ Keypoints found in cache for: "${title}"`);
            return cachedResult;
        }

        console.log(`🔍 Extracting keypoints for: "${title}"`);

        // Prepare prompt for GPT
        const prompt = `You are an expert educational content curator. Extract 3-4 key learning topics from this ${topic} video.

Video Details:
- Title: ${title}
- Description: ${description}
- Difficulty Level: ${difficulty}
- Topic: ${topic}

Requirements:
1. MUST extract EXACTLY 3 or 4 specific, actionable learning topics
2. Topics should be concrete and learnable (not too vague)
3. Topics should reflect the video's likely content
4. Order by importance/complexity (simpler first)
5. Each topic should be 2-5 words
6. Never return fewer than 3 topics
7. Never return more than 4 topics

Example format:
["Variable Declaration", "Scope Concepts", "Hoisting Behavior"]

Return ONLY a valid JSON array of strings, no additional text.`;

        // Call OpenAI
        const response = await openaiService.callGPT(prompt);

        // Parse response - handle potential markdown code blocks
        let keyTopics = response.trim();

        // Remove markdown code blocks if present
        if (keyTopics.includes('```json')) {
            keyTopics = keyTopics.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        }

        // Parse JSON
        const parsed = JSON.parse(keyTopics);

        if (!Array.isArray(parsed) || parsed.length === 0) {
            throw new Error('Invalid keypoints format received');
        }

        // Ensure we have at least 3 keypoints, max 4
        let keypoints = parsed.slice(0, 4); // Max 4

        if (keypoints.length < 3) {
            console.warn(`⚠️ Only ${keypoints.length} keypoints extracted (minimum: 3), augmenting with fallback topics...`);
            // If we have less than 3, add fallback keypoints to reach minimum
            const fallbackTopics = generateFallbackKeypoints(videoData.topic, videoData.title);
            keypoints = [
                ...keypoints,
                ...fallbackTopics.slice(0, 3 - keypoints.length)
            ];
            console.log(`✅ Augmented with fallback. Total: ${keypoints.length} keypoints`);
        }

        console.log(`✅ Extracted ${keypoints.length} keypoints (3-4):`, keypoints);

        // Cache the result
        cache.set(cacheKey, keypoints);

        return keypoints;

    } catch (error) {
        console.error('❌ Error extracting keypoints:', error.message);

        // Fallback: Generate generic keypoints based on topic
        console.log('⚠️ Using fallback generic keypoints...');
        return generateFallbackKeypoints(videoData.topic, videoData.title);
    }
}

/**
 * Generate fallback keypoints when API fails
 * Always returns 3-4 keypoints
 * @param {string} topic - Learning topic
 * @param {string} title - Video title
 * @returns {Array} Fallback keypoints (exactly 3-4)
 */
function generateFallbackKeypoints(topic, title) {
    const fallbackMap = {
        javascript: [
            'Variables & Data Types',
            'Functions & Scope',
            'Async Programming'
        ],
        react: [
            'Components & JSX',
            'State Management',
            'Hooks & Effects'
        ],
        nodejs: [
            'Node.js Fundamentals',
            'Express.js Framework',
            'REST APIs'
        ],
        typescript: [
            'Type Annotations',
            'Interfaces & Types',
            'Generics'
        ],
        python: [
            'Python Basics',
            'Data Structures',
            'Functions & Modules'
        ],
        nextjs: [
            'Next.js Fundamentals',
            'File-based Routing',
            'Server-Side Rendering'
        ],
        mongodb: [
            'Collections & Documents',
            'CRUD Operations',
            'Aggregation Pipeline'
        ],
        'css-tailwind': [
            'CSS Fundamentals',
            'Responsive Design',
            'Tailwind Utilities'
        ]
    };

    const topics = fallbackMap[topic] || [
        'Core Concepts',
        'Practical Applications',
        'Best Practices'
    ];

    // Ensure at least 3 keypoints
    if (topics.length < 3) {
        topics.push(
            'Essential Fundamentals',
            'Practical Implementation',
            'Common Use Cases'
        );
    }

    // Return exactly 3-4 keypoints
    return topics.slice(0, 4);
}

/**
 * Batch extract keypoints for multiple videos
 * @param {Array} videos - Array of video objects
 * @returns {Promise<Array>} Videos with keypoints added
 */
async function extractKeyPointsForMultipleVideos(videos) {
    try {
        console.log(`🔄 Extracting keypoints for ${videos.length} videos...`);

        const results = await Promise.allSettled(
            videos.map(video =>
                extractKeyTopicsFromVideo({
                    title: video.title,
                    description: video.description || '',
                    topic: video.topic || 'general',
                    difficulty: video.difficulty || 'Intermediate'
                }).then(keyTopics => ({
                    ...video,
                    keyTopics,
                    keyTopicsCount: keyTopics.length
                }))
            )
        );

        // Handle results
        const enrichedVideos = results.map((result, index) => {
            if (result.status === 'fulfilled') {
                return result.value;
            } else {
                console.error(`❌ Failed to extract keypoints for video ${index}:`, result.reason);
                return {
                    ...videos[index],
                    keyTopics: generateFallbackKeypoints(videos[index].topic, videos[index].title),
                    keyTopicsCount: 5
                };
            }
        });

        console.log(`✅ Extracted keypoints for ${enrichedVideos.length} videos`);
        return enrichedVideos;

    } catch (error) {
        console.error('❌ Error in batch keypoint extraction:', error);
        throw error;
    }
}

/**
 * Clear cache (useful for testing or manual refresh)
 */
function clearCache() {
    cache.flushAll();
    console.log('✅ Cache cleared');
}

/**
 * Get cache stats
 */
function getCacheStats() {
    return {
        keys: cache.keys().length,
        stats: cache.getStats()
    };
}

module.exports = {
    extractKeyTopicsFromVideo,
    extractKeyPointsForMultipleVideos,
    clearCache,
    getCacheStats,
    generateFallbackKeypoints
};
