// routes/topics.js
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const Topic = require('../models/Topic');
const User = require('../models/User');
const { protect, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// @desc    Get all topics grouped by category
// @route   GET /api/topics
// @access  Public
router.get('/', optionalAuth, async (req, res) => {
    try {
        const { category, featured, search } = req.query;
        
        let query = { isActive: true };
        
        // Filter by category if provided
        if (category) {
            query.category = category;
        }
        
        // Filter featured topics
        if (featured === 'true') {
            query.featured = true;
        }
        
        // Search functionality
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { tags: { $in: [new RegExp(search, 'i')] } }
            ];
        }
        
        let topics;
        
        if (category || featured || search) {
            // Return flat list for filtered results
            topics = await Topic.find(query)
                .sort({ popularity: -1, name: 1 })
                .select('-prerequisites -learningObjectives -skillsGained');
        } else {
            // Return grouped by category for general browsing
            topics = await Topic.getByCategory();
        }
        
        res.json({
            success: true,
            count: Array.isArray(topics) ? topics.length : topics.reduce((acc, cat) => acc + cat.topics.length, 0),
            data: topics
        });
        
    } catch (error) {
        console.error('Get topics error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching topics'
        });
    }
});

// @desc    Get featured topics
// @route   GET /api/topics/featured
// @access  Public
router.get('/featured', async (req, res) => {
    try {
        const topics = await Topic.getFeatured();
        
        res.json({
            success: true,
            count: topics.length,
            data: topics
        });
        
    } catch (error) {
        console.error('Get featured topics error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching featured topics'
        });
    }
});

// @desc    Get recommended topics for user
// @route   GET /api/topics/recommended
// @access  Private
router.get('/recommended', protect, async (req, res) => {
    try {
        const userInterests = req.user.learningPreferences.interestedAreas || [];
        const limit = parseInt(req.query.limit) || 8;
        
        const topics = await Topic.getRecommended(userInterests, limit);
        
        res.json({
            success: true,
            count: topics.length,
            data: topics,
            basedOn: userInterests
        });
        
    } catch (error) {
        console.error('Get recommended topics error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching recommended topics'
        });
    }
});

// @desc    Get single topic details
// @route   GET /api/topics/:slug
// @access  Public
router.get('/:slug', [
    param('slug').isSlug().withMessage('Invalid topic slug')
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
        
        const topic = await Topic.findOne({ 
            slug: req.params.slug, 
            isActive: true 
        }).populate('prerequisites.topicId', 'name slug');
        
        if (!topic) {
            return res.status(404).json({
                success: false,
                message: 'Topic not found'
            });
        }
        
        // Get prerequisite topics
        const prerequisiteTopics = await topic.getPrerequisiteTopics();
        
        res.json({
            success: true,
            data: {
                topic,
                prerequisites: prerequisiteTopics
            }
        });
        
    } catch (error) {
        console.error('Get topic details error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching topic details'
        });
    }
});

// @desc    Select topics for learning
// @route   POST /api/topics/select
// @access  Private
router.post('/select', protect, [
    body('topics')
        .isArray({ min: 1 })
        .withMessage('At least one topic must be selected'),
    body('topics.*')
        .isMongoId()
        .withMessage('Invalid topic ID')
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
        
        const { topics: topicIds } = req.body;
        
        // Verify all topics exist and are active
        const topics = await Topic.find({
            _id: { $in: topicIds },
            isActive: true
        });
        
        if (topics.length !== topicIds.length) {
            return res.status(400).json({
                success: false,
                message: 'Some topics are invalid or inactive'
            });
        }
        
        // Prepare selected topics data
        const selectedTopics = topics.map(topic => ({
            topic: topic.slug,
            selectedAt: new Date()
        }));
        
        // Update user's selected topics
        const user = await User.findByIdAndUpdate(
            req.user._id,
            {
                $push: {
                    'learningProgress.selectedTopics': {
                        $each: selectedTopics
                    }
                }
            },
            { new: true }
        ).select('-password');
        
        // Update topic popularity
        await Topic.updateMany(
            { _id: { $in: topicIds } },
            { $inc: { totalLearners: 1, popularity: 1 } }
        );
        
        res.json({
            success: true,
            message: 'Topics selected successfully',
            data: {
                selectedTopics: topics,
                user: user
            }
        });
        
    } catch (error) {
        console.error('Select topics error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error selecting topics'
        });
    }
});

// @desc    Get user's selected topics
// @route   GET /api/topics/my-topics
// @access  Private
router.get('/my/selected', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select('learningProgress.selectedTopics knowledgeLevels');
        
        // Get topic details for selected topics
        const selectedTopicSlugs = user.learningProgress.selectedTopics.map(st => st.topic);
        
        const topics = await Topic.find({
            slug: { $in: selectedTopicSlugs },
            isActive: true
        });
        
        // Combine topic data with user's progress
        const topicsWithProgress = topics.map(topic => {
            const userSelection = user.learningProgress.selectedTopics.find(st => st.topic === topic.slug);
            const knowledgeLevel = user.knowledgeLevels[topic.slug];
            
            return {
                ...topic.toObject(),
                selectedAt: userSelection?.selectedAt,
                knowledgeLevel: knowledgeLevel?.level,
                assessmentScore: knowledgeLevel?.score,
                assessedAt: knowledgeLevel?.assessedAt
            };
        });
        
        res.json({
            success: true,
            count: topicsWithProgress.length,
            data: topicsWithProgress
        });
        
    } catch (error) {
        console.error('Get user topics error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching user topics'
        });
    }
});

// @desc    Remove topic from user's selection
// @route   DELETE /api/topics/my/:slug
// @access  Private
router.delete('/my/:slug', protect, [
    param('slug').isSlug().withMessage('Invalid topic slug')
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
        
        const { slug } = req.params;
        
        // Remove topic from user's selected topics
        const user = await User.findByIdAndUpdate(
            req.user._id,
            {
                $pull: {
                    'learningProgress.selectedTopics': { topic: slug }
                }
            },
            { new: true }
        ).select('-password');
        
        res.json({
            success: true,
            message: 'Topic removed from selection',
            data: { user }
        });
        
    } catch (error) {
        console.error('Remove topic error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error removing topic'
        });
    }
});

// @desc    Get all available categories
// @route   GET /api/topics/categories
// @access  Public
router.get('/meta/categories', async (req, res) => {
    try {
        const categories = await Topic.distinct('category', { isActive: true });
        
        res.json({
            success: true,
            data: categories.sort()
        });
        
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching categories'
        });
    }
});

module.exports = router;