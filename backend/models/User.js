// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    // Basic Authentication Info
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters'],
        select: false // Don't return password in queries by default
    },
    
    // Profile Information (from your user flow)
    profile: {
        firstName: {
            type: String,
            required: [true, 'First name is required'],
            trim: true,
            maxlength: [50, 'First name cannot exceed 50 characters']
        },
        lastName: {
            type: String,
            required: [true, 'Last name is required'],
            trim: true,
            maxlength: [50, 'Last name cannot exceed 50 characters']
        },
        profession: {
            type: String,
            required: [true, 'Profession is required'],
            enum: [
                'Student',
                'Software Developer',
                'Web Developer', 
                'Data Scientist',
                'UI/UX Designer',
                'Product Manager',
                'Other'
            ]
        },
        gender: {
            type: String,
            enum: ['Male', 'Female', 'Other', 'Prefer not to say'],
            default: 'Prefer not to say'
        },
        experienceLevel: {
            type: String,
            enum: ['Complete Beginner', 'Some Experience', 'Intermediate', 'Advanced'],
            default: 'Complete Beginner'
        },
        dateOfBirth: {
            type: Date,
            default: null
        },
        location: {
            type: String,
            trim: true,
            maxlength: [100, 'Location cannot exceed 100 characters'],
            default: ''
        },
        bio: {
            type: String,
            trim: true,
            maxlength: [200, 'Bio cannot exceed 200 characters'],
            default: ''
        },
        // NEW: Learning pace preference
        learningPace: {
            type: String,
            enum: ['Slow', 'Moderate', 'Fast'],
            default: 'Moderate'
        },
        // NEW: Problem-solving approach
        problemSolvingApproach: {
            type: String,
            enum: ['Analytical', 'Practical', 'Creative'],
            default: 'Practical'
        }
    },

    // Learning Preferences
    learningPreferences: {
        interestedAreas: [{
            type: String,
            enum: [
                'javascript',
                'react', 
                'python',
                'typescript',
                'nodejs',
                'css',
                'database',
                'mobile'
            ]
        }],
        preferredContentLength: {
            type: String,
            enum: ['Short (5-10 min)', 'Medium (10-20 min)', 'Long (20+ min)'],
            default: 'Short (5-10 min)'
        },
        learningGoal: {
            type: String,
            enum: ['Career Change', 'Skill Enhancement', 'Academic Requirements', 'Personal Interest'],
            required: [true, 'Learning goal is required']
        },
        learningStyle: {
            type: String,
            enum: ['visual', 'hands_on', 'reading', 'interactive'],
            default: 'visual'
        },
        preferredSchedule: [{
            type: String,
            enum: ['morning', 'afternoon', 'evening', 'night']
        }],
        enableNotifications: {
            type: Boolean,
            default: true
        },
        // NEW: Available session time
        availableSessionTime: {
            type: String,
            enum: ['Micro (5-10 min)', 'Short (15-30 min)', 'Medium (30-60 min)', 'Long (60+ min)'],
            default: 'Short (15-30 min)'
        },
        // NEW: Learning focus
        learningFocus: {
            type: String,
            enum: ['Conceptual', 'Practical-Projects', 'Interview-Prep', 'Certification', 'Mixed'],
            default: 'Mixed'
        }
    },

    // Topic-Specific Knowledge Levels (will be populated after assessment)
    // Using a flexible Schema.Types.Mixed structure to support any topic
    knowledgeLevels: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },

    // Learning Progress Tracking
    learningProgress: {
        selectedTopics: [{
            topic: {
                type: String,
                required: true
            },
            selectedAt: {
                type: Date,
                default: Date.now
            }
        }],
        completedVideos: [{
            videoId: String,
            title: String,
            topic: String,
            completedAt: {
                type: Date,
                default: Date.now
            }
        }],
        totalLearningTime: {
            type: Number,
            default: 0 // in minutes
        }
    },

    // System Fields
    isActive: {
        type: Boolean,
        default: true
    },
    emailVerified: {
        type: Boolean,
        default: false
    },
    lastLogin: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true, // Adds createdAt and updatedAt automatically
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
    return `${this.profile.firstName} ${this.profile.lastName}`;
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) return next();
    
    try {
        // Hash password with cost of 12
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to get assessment summary
userSchema.methods.getAssessmentSummary = function() {
    const assessedTopics = [];

    // Handle object structure
    if (this.knowledgeLevels && typeof this.knowledgeLevels === 'object') {
        for (const topic in this.knowledgeLevels) {
            if (this.knowledgeLevels[topic] && this.knowledgeLevels[topic].level) {
                assessedTopics.push({
                    topic: topic,
                    level: this.knowledgeLevels[topic].level,
                    score: this.knowledgeLevels[topic].score,
                    assessedAt: this.knowledgeLevels[topic].assessedAt
                });
            }
        }
    }

    return assessedTopics;
};

// Static method to find user by email
userSchema.statics.findByEmail = function(email) {
    return this.findOne({ email: email.toLowerCase() });
};

module.exports = mongoose.model('User', userSchema);