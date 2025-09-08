// routes/auth.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { generateToken, protect } = require('../middleware/auth');

const router = express.Router();

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', [
    // Validation middleware
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters'),
    body('profile.firstName')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('First name must be between 2-50 characters'),
    body('profile.lastName')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Last name must be between 2-50 characters'),
    body('profile.profession')
        .isIn(['Student', 'Software Developer', 'Web Developer', 'Data Scientist', 'UI/UX Designer', 'Product Manager', 'Other'])
        .withMessage('Please select a valid profession'),
    body('profile.gender')
        .isIn(['Male', 'Female', 'Other', 'Prefer not to say'])
        .withMessage('Please select a valid gender'),
    body('learningPreferences.learningGoal')
        .isIn(['Career Change', 'Skill Enhancement', 'Academic Requirements', 'Personal Interest'])
        .withMessage('Please select a valid learning goal')
], async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const {
            email,
            password,
            profile,
            learningPreferences
        } = req.body;

        // Check if user already exists
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email'
            });
        }

        // Create new user
        const user = new User({
            email,
            password,
            profile: {
                firstName: profile.firstName,
                lastName: profile.lastName,
                profession: profile.profession,
                gender: profile.gender,
                experienceLevel: profile.experienceLevel || 'Complete Beginner'
            },
            learningPreferences: {
                interestedAreas: learningPreferences.interestedAreas || [],
                preferredContentLength: learningPreferences.preferredContentLength || 'Short (5-10 min)',
                learningGoal: learningPreferences.learningGoal
            }
        });

        await user.save();

        // Generate JWT token
        const token = generateToken(user._id);

        // Return user data (without password)
        const userData = await User.findById(user._id).select('-password');

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user: userData,
                token
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during registration',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required')
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

        const { email, password } = req.body;

        // Find user by email and include password for comparison
        const user = await User.findByEmail(email).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Your account has been deactivated'
            });
        }

        // Check password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Generate token
        const token = generateToken(user._id);

        // Get user data without password
        const userData = await User.findById(user._id).select('-password');

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: userData,
                token
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
    try {
        // User is already attached to req by protect middleware
        const user = await User.findById(req.user._id).select('-password');
        
        res.json({
            success: true,
            data: {
                user: user,
                assessmentSummary: user.getAssessmentSummary()
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching profile'
        });
    }
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
router.put('/profile', protect, [
    body('profile.firstName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('First name must be between 2-50 characters'),
    body('profile.lastName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Last name must be between 2-50 characters'),
    body('profile.profession')
        .optional()
        .isIn(['Student', 'Software Developer', 'Web Developer', 'Data Scientist', 'UI/UX Designer', 'Product Manager', 'Other'])
        .withMessage('Please select a valid profession')
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

        const updateData = {};
        
        // Update profile fields if provided
        if (req.body.profile) {
            updateData.profile = { ...req.user.profile.toObject(), ...req.body.profile };
        }
        
        // Update learning preferences if provided
        if (req.body.learningPreferences) {
            updateData.learningPreferences = { ...req.user.learningPreferences.toObject(), ...req.body.learningPreferences };
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: { user }
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating profile'
        });
    }
});

// @desc    Get user dashboard data
// @route   GET /api/auth/dashboard
// @access  Private
router.get('/dashboard', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        
        // Get learning progress statistics
        const stats = {
            totalSelectedTopics: user.learningProgress.selectedTopics.length,
            completedVideos: user.learningProgress.completedVideos.length,
            totalLearningTime: user.learningProgress.totalLearningTime,
            assessedTopics: user.getAssessmentSummary().length,
            joinedDate: user.createdAt
        };

        res.json({
            success: true,
            data: {
                user,
                stats,
                assessmentSummary: user.getAssessmentSummary(),
                recentActivity: user.learningProgress.completedVideos.slice(-5) // Last 5 videos
            }
        });

    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching dashboard data'
        });
    }
});

module.exports = router;