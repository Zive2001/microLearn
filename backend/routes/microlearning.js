// routes/microlearning.js
const express = require('express');
const { param, query, validationResult } = require('express-validator');
const recommendationEngine = require('../services/recommendationEngine');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @desc    Get personalized video recommendations for user
// @route   GET /api/microlearning/recommendations/:topic
// @access  Private
router.get('/recommendations/:topic', protect, [
    param('topic')
        .isIn(['javascript', 'react', 'typescript', 'nodejs', 'python', 'nextjs', 'mongodb', 'css-tailwind'])
        .withMessage('Invalid topic'),
    query('maxVideos')
        .optional()
        .isInt({ min: 1, max: 10 })
        .withMessage('Max videos must be between 1 and 10'),
    query('includeAlternative')
        .optional()
        .isBoolean()
        .withMessage('Include alternative must be boolean')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { topic } = req.params;
        const maxVideos = parseInt(req.query.maxVideos) || 3;
        const includeAlternative = req.query.includeAlternative === 'true';

        const startTime = Date.now();
        
        const recommendations = await recommendationEngine.getPersonalizedRecommendations(
            req.user._id,
            topic,
            {
                maxVideos,
                includeAlternativeLevels: includeAlternative
            }
        );

        const responseTime = Date.now() - startTime;

        res.json({
            success: true,
            message: `Found ${recommendations.totalVideos} personalized recommendations`,
            data: recommendations,
            metadata: {
                responseTime: `${responseTime}ms`,
                requestedAt: new Date().toISOString(),
                userId: req.user._id,
                topic
            }
        });

    } catch (error) {
        console.error('Error getting recommendations:', error);
        
        // Handle specific error cases
        if (error.message.includes('assessment')) {
            return res.status(400).json({
                success: false,
                message: 'Assessment required',
                error: error.message,
                action: 'complete_assessment'
            });
        }

        if (error.message.includes('not selected')) {
            return res.status(400).json({
                success: false,
                message: 'Topic not selected',
                error: error.message,
                action: 'select_topic'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to get recommendations',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// @desc    Generate learning path for topic
// @route   GET /api/microlearning/learning-path/:topic
// @access  Private
router.get('/learning-path/:topic', protect, [
    param('topic')
        .isIn(['javascript', 'react', 'typescript', 'nodejs', 'python', 'nextjs', 'mongodb', 'css-tailwind'])
        .withMessage('Invalid topic'),
    query('maxVideos')
        .optional()
        .isInt({ min: 3, max: 10 })
        .withMessage('Max videos must be between 3 and 10')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { topic } = req.params;
        const maxVideos = parseInt(req.query.maxVideos) || 5;

        const startTime = Date.now();
        
        const learningPath = await recommendationEngine.generateLearningPath(
            req.user._id,
            topic,
            maxVideos
        );

        const responseTime = Date.now() - startTime;

        res.json({
            success: true,
            message: `Generated learning path with ${learningPath.pathLength} videos`,
            data: learningPath,
            metadata: {
                responseTime: `${responseTime}ms`,
                generatedAt: new Date().toISOString(),
                userId: req.user._id,
                topic
            }
        });

    } catch (error) {
        console.error('Error generating learning path:', error);
        
        if (error.message.includes('assessment')) {
            return res.status(400).json({
                success: false,
                message: 'Assessment required for learning path generation',
                error: error.message,
                action: 'complete_assessment'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to generate learning path',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// @desc    Get all user's available topics for microlearning
// @route   GET /api/microlearning/available-topics
// @access  Private
router.get('/available-topics', protect, async (req, res) => {
    try {
        const User = require('../models/User');
        const user = await User.findById(req.user._id)
            .select('learningProgress.selectedTopics knowledgeLevels');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get topics that are both selected and assessed
        const availableTopics = user.learningProgress.selectedTopics
            .filter(selectedTopic => {
                const knowledgeLevel = user.knowledgeLevels[selectedTopic.topic];
                return knowledgeLevel && knowledgeLevel.level;
            })
            .map(selectedTopic => {
                const knowledgeLevel = user.knowledgeLevels[selectedTopic.topic];
                return {
                    topic: selectedTopic.topic,
                    selectedAt: selectedTopic.selectedAt,
                    currentLevel: knowledgeLevel.level,
                    currentScore: knowledgeLevel.score,
                    lastAssessedAt: knowledgeLevel.assessedAt,
                    readyForMicrolearning: true
                };
            });

        // Get topics that are selected but not assessed
        const pendingTopics = user.learningProgress.selectedTopics
            .filter(selectedTopic => {
                const knowledgeLevel = user.knowledgeLevels[selectedTopic.topic];
                return !knowledgeLevel || !knowledgeLevel.level;
            })
            .map(selectedTopic => ({
                topic: selectedTopic.topic,
                selectedAt: selectedTopic.selectedAt,
                currentLevel: null,
                currentScore: null,
                lastAssessedAt: null,
                readyForMicrolearning: false,
                requiresAssessment: true
            }));

        res.json({
            success: true,
            data: {
                availableTopics,
                pendingTopics,
                summary: {
                    totalSelected: user.learningProgress.selectedTopics.length,
                    readyForMicrolearning: availableTopics.length,
                    requiresAssessment: pendingTopics.length
                }
            }
        });

    } catch (error) {
        console.error('Error getting available topics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get available topics',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// @desc    Get quick recommendations (top 1 video per assessed topic)
// @route   GET /api/microlearning/quick-recommendations
// @access  Private
router.get('/quick-recommendations', protect, async (req, res) => {
    try {
        const User = require('../models/User');
        const user = await User.findById(req.user._id)
            .select('learningProgress.selectedTopics knowledgeLevels');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get assessed topics
        const assessedTopics = user.learningProgress.selectedTopics
            .filter(selectedTopic => {
                const knowledgeLevel = user.knowledgeLevels[selectedTopic.topic];
                return knowledgeLevel && knowledgeLevel.level;
            })
            .map(st => st.topic);

        if (assessedTopics.length === 0) {
            return res.json({
                success: true,
                message: 'No assessed topics available for recommendations',
                data: {
                    recommendations: [],
                    requiresAssessment: user.learningProgress.selectedTopics.map(st => st.topic)
                }
            });
        }

        // Get 1 top recommendation per topic
        const quickRecommendations = [];
        
        for (const topic of assessedTopics.slice(0, 5)) { // Max 5 topics
            try {
                const topicRecommendations = await recommendationEngine.getPersonalizedRecommendations(
                    req.user._id,
                    topic,
                    { maxVideos: 1 }
                );

                if (topicRecommendations.recommendations.length > 0) {
                    quickRecommendations.push({
                        topic,
                        userLevel: topicRecommendations.userLevel,
                        recommendation: topicRecommendations.recommendations[0]
                    });
                }
            } catch (error) {
                console.error(`Error getting quick recommendation for ${topic}:`, error);
                // Continue with other topics if one fails
            }
        }

        res.json({
            success: true,
            message: `Found quick recommendations for ${quickRecommendations.length} topics`,
            data: {
                recommendations: quickRecommendations,
                totalTopics: quickRecommendations.length,
                generatedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Error getting quick recommendations:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get quick recommendations',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// @desc    Get video details with microlearning enhancements
// @route   GET /api/microlearning/video/:videoId
// @access  Private
router.get('/video/:videoId', protect, [
    param('videoId').notEmpty().withMessage('Video ID is required'),
    query('topic').optional().isString()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { videoId } = req.params;
        const { topic } = req.query;

        // Get video details from YouTube API
        const youtubeService = require('../services/youtubeService');
        
        try {
            const videoDetails = await youtubeService.getVideoDetails([{ videoId }]);
            
            if (videoDetails.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Video not found'
                });
            }

            const video = videoDetails[0];
            
            // Enhance with microlearning features
            const enhancedVideo = {
                ...video,
                microlearningFeatures: {
                    suggestedBreakpoints: recommendationEngine.suggestVideoBreakpoints(video),
                    keyTopics: recommendationEngine.extractKeyTopics(video),
                    recommendedFor: topic || 'general learning',
                    optimalSessionLength: '10-15 minutes',
                    difficulty: 'moderate'
                },
                embedUrl: `https://www.youtube.com/embed/${videoId}`,
                accessibilityFeatures: {
                    captionsAvailable: true, // Most educational videos have captions
                    speedControl: true,
                    chapterMarkers: video.duration > 600 // Suggest chapters for videos >10min
                }
            };

            res.json({
                success: true,
                data: enhancedVideo
            });

        } catch (error) {
            // If video details fetch fails, return basic info
            res.json({
                success: true,
                data: {
                    videoId,
                    url: `https://www.youtube.com/watch?v=${videoId}`,
                    embedUrl: `https://www.youtube.com/embed/${videoId}`,
                    microlearningFeatures: {
                        suggestedBreakpoints: [],
                        keyTopics: [],
                        recommendedFor: topic || 'general learning',
                        optimalSessionLength: '10-15 minutes',
                        difficulty: 'moderate'
                    },
                    note: 'Limited details available'
                }
            });
        }

    } catch (error) {
        console.error('Error getting video details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get video details',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// @desc    Get user's microlearning statistics
// @route   GET /api/microlearning/stats
// @access  Private
router.get('/stats', protect, async (req, res) => {
    try {
        const User = require('../models/User');
        const { AssessmentResult } = require('../models/Assessment');
        
        const user = await User.findById(req.user._id)
            .select('learningProgress knowledgeLevels createdAt');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get assessment history
        const assessmentHistory = await AssessmentResult.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .limit(10);

        // Calculate statistics
        const stats = {
            // Topic progress
            totalSelectedTopics: user.learningProgress.selectedTopics.length,
            assessedTopics: Object.keys(user.knowledgeLevels).filter(
                topic => user.knowledgeLevels[topic].level
            ).length,
            
            // Level distribution
            levelDistribution: {
                Beginner: 0,
                Intermediate: 0,
                Professional: 0
            },
            
            // Learning progress
            totalAssessments: assessmentHistory.length,
            averageScore: 0,
            
            // Time tracking
            memberSince: user.createdAt,
            lastAssessment: assessmentHistory[0]?.createdAt || null,
            
            // Ready for microlearning
            readyTopics: [],
            pendingTopics: []
        };

        // Calculate level distribution and average score
        const assessedLevels = Object.values(user.knowledgeLevels)
            .filter(level => level.level);

        assessedLevels.forEach(level => {
            if (level.level && stats.levelDistribution[level.level] !== undefined) {
                stats.levelDistribution[level.level]++;
            }
        });

        if (assessmentHistory.length > 0) {
            stats.averageScore = Math.round(
                assessmentHistory.reduce((sum, result) => sum + result.score, 0) / assessmentHistory.length
            );
        }

        // Categorize topics
        user.learningProgress.selectedTopics.forEach(selectedTopic => {
            const knowledgeLevel = user.knowledgeLevels[selectedTopic.topic];
            if (knowledgeLevel && knowledgeLevel.level) {
                stats.readyTopics.push({
                    topic: selectedTopic.topic,
                    level: knowledgeLevel.level,
                    score: knowledgeLevel.score
                });
            } else {
                stats.pendingTopics.push(selectedTopic.topic);
            }
        });

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('Error getting microlearning stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get statistics',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// @desc    Search videos by topic and level (for teammate's custom searches)
// @route   POST /api/microlearning/search
// @access  Private
router.post('/search', protect, [
    require('express-validator').body('topic')
        .isIn(['javascript', 'react', 'typescript', 'nodejs', 'python', 'nextjs', 'mongodb', 'css-tailwind'])
        .withMessage('Invalid topic'),
    require('express-validator').body('level')
        .isIn(['Beginner', 'Intermediate', 'Professional'])
        .withMessage('Invalid level'),
    require('express-validator').body('maxResults')
        .optional()
        .isInt({ min: 1, max: 10 })
        .withMessage('Max results must be between 1 and 10'),
    require('express-validator').body('customQuery')
        .optional()
        .isString()
        .withMessage('Custom query must be string')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { topic, level, maxResults = 5, customQuery } = req.body;

        const startTime = Date.now();
        const youtubeService = require('../services/youtubeService');

        // Use custom search if provided, otherwise use standard topic search
        let searchResults;
        if (customQuery) {
            // Custom search implementation would go here
            // For now, use modified topic search
            searchResults = await youtubeService.searchEducationalVideos(topic, level, maxResults);
        } else {
            searchResults = await youtubeService.searchEducationalVideos(topic, level, maxResults);
        }

        const responseTime = Date.now() - startTime;

        // Format results for microlearning
        const formattedResults = searchResults.map(video => 
            recommendationEngine.formatVideoForMicrolearning(video)
        );

        res.json({
            success: true,
            message: `Found ${formattedResults.length} videos`,
            data: {
                query: { topic, level, customQuery },
                results: formattedResults,
                totalResults: formattedResults.length,
                searchTime: `${responseTime}ms`
            },
            metadata: {
                searchedAt: new Date().toISOString(),
                userId: req.user._id
            }
        });

    } catch (error) {
        console.error('Error searching videos:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search videos',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// @desc    Process recommended video for microlearning content generation
// @route   POST /api/microlearning/process-recommendation
// @access  Private
router.post('/process-recommendation', protect, [
    require('express-validator').body('videoId')
        .notEmpty()
        .withMessage('Video ID is required'),
    require('express-validator').body('topic')
        .isIn(['javascript', 'react', 'typescript', 'nodejs', 'python', 'nextjs', 'mongodb', 'css-tailwind'])
        .withMessage('Invalid topic'),
    require('express-validator').body('title')
        .optional()
        .isString()
        .withMessage('Title must be string'),
    require('express-validator').body('description')
        .optional()
        .isString()
        .withMessage('Description must be string')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { videoId, topic, title, description } = req.body;
        const userId = req.user._id;

        // Construct YouTube URL from videoId
        const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

        // Import video controller function
        const { processYouTubeURL } = require('../controllers/videoController');

        // Create a mock request object with the required data
        const mockReq = {
            body: {
                url: youtubeUrl,
                title: title || `Microlearning: ${topic}`,
                description: description || `Generated microlearning content for ${topic}`
            },
            user: { _id: userId }
        };

        // Create a response wrapper to capture the result
        let processResult = null;
        let processError = null;

        const mockRes = {
            status: (code) => ({
                json: (data) => {
                    if (code === 201) {
                        processResult = data;
                    } else {
                        processError = { code, data };
                    }
                }
            }),
            json: (data) => {
                processResult = data;
            }
        };

        // Call the YouTube processing function
        await processYouTubeURL(mockReq, mockRes);

        if (processError) {
            return res.status(processError.code).json(processError.data);
        }

        if (!processResult) {
            return res.status(500).json({
                success: false,
                message: 'Failed to process video recommendation'
            });
        }

        // Add the topic and source information to the response
        const enhancedResult = {
            ...processResult,
            data: {
                ...processResult.data,
                sourceType: 'recommendation',
                originalTopic: topic,
                selectedFromRecommendations: true,
                processingSteps: [
                    'Video download and processing',
                    'Transcript extraction',
                    'CLT-bLM script generation', 
                    'Micro-video segmentation',
                    'Content ready for rendering'
                ]
            },
            metadata: {
                processedAt: new Date().toISOString(),
                userId,
                topic,
                videoId,
                youtubeUrl
            }
        };

        res.status(201).json(enhancedResult);

    } catch (error) {
        console.error('Error processing recommendation for microlearning:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process video recommendation',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// @desc    Get processing status for recommendation-based video
// @route   GET /api/microlearning/recommendation-status/:videoId
// @access  Private
router.get('/recommendation-status/:videoId', protect, [
    param('videoId').notEmpty().withMessage('Video ID is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { videoId } = req.params;
        const userId = req.user._id;

        // Import necessary models
        const Video = require('../models/Video');
        const MicroVideo = require('../models/MicroVideo');

        // Find the video record
        const video = await Video.findOne({ _id: videoId, uploadedBy: userId });
        if (!video) {
            return res.status(404).json({
                success: false,
                message: 'Video not found or access denied'
            });
        }

        // Get associated micro-videos if completed
        let microVideos = [];
        if (video.processingStatus === 'completed') {
            microVideos = await MicroVideo.find({ originalVideoId: videoId })
                .select('title sequence timeRange processingStatus cltBlmScript keypoints')
                .sort({ sequence: 1 });
        }

        // Calculate processing progress
        const getProgressPercentage = (status) => {
            switch (status) {
                case 'pending': return 10;
                case 'processing': return 50;
                case 'completed': return 100;
                case 'failed': return 0;
                default: return 0;
            }
        };

        const response = {
            success: true,
            data: {
                videoId: video._id,
                title: video.title,
                description: video.description,
                sourceUrl: video.sourceUrl,
                processingStatus: video.processingStatus,
                processingError: video.processingError,
                progress: getProgressPercentage(video.processingStatus),
                
                // Video metadata
                originalDuration: video.originalDuration,
                formattedDuration: video.formattedDuration,
                subject: video.subject,
                difficulty: video.difficulty,
                tags: video.tags,
                
                // Micro-learning specific data
                microVideos: {
                    count: microVideos.length,
                    list: microVideos.map(mv => ({
                        id: mv._id,
                        title: mv.title,
                        sequence: mv.sequence,
                        duration: mv.timeRange.duration,
                        status: mv.processingStatus,
                        hasScript: !!(mv.cltBlmScript && Object.keys(mv.cltBlmScript).length > 0),
                        keypointCount: mv.keypoints?.length || 0
                    }))
                },
                
                // Processing timeline
                processingSteps: [
                    { step: 'Video Download', completed: true },
                    { step: 'Transcript Extraction', completed: video.processingStatus !== 'pending' },
                    { step: 'CLT-bLM Script Generation', completed: microVideos.length > 0 },
                    { step: 'Micro-video Segmentation', completed: video.processingStatus === 'completed' },
                    { step: 'Ready for Rendering', completed: video.processingStatus === 'completed' }
                ],
                
                // Timestamps
                createdAt: video.createdAt,
                updatedAt: video.updatedAt
            },
            metadata: {
                requestedAt: new Date().toISOString(),
                userId: req.user._id
            }
        };

        // Add next steps based on current status
        if (video.processingStatus === 'completed' && microVideos.length > 0) {
            response.data.nextSteps = [
                'Videos are ready for rendering',
                'Use POST /api/videos/microvideo/:microVideoId/render to render individual micro-videos',
                'Configure TTS settings and visual options before rendering'
            ];
        } else if (video.processingStatus === 'processing') {
            response.data.nextSteps = [
                'Video is currently being processed',
                'Check back in a few minutes for completion',
                'Processing typically takes 5-8 minutes'
            ];
        } else if (video.processingStatus === 'failed') {
            response.data.nextSteps = [
                'Processing failed - check the error message',
                'Try processing the video again',
                'Contact support if the issue persists'
            ];
        }

        res.json(response);

    } catch (error) {
        console.error('Error getting recommendation status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get processing status',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

module.exports = router;