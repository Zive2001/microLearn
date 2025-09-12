// models/Topic.js
const mongoose = require('mongoose');

const topicSchema = new mongoose.Schema({
    // Topic identification
    name: {
        type: String,
        required: [true, 'Topic name is required'],
        unique: true,
        trim: true
    },
    slug: {
        type: String,
        required: [true, 'Topic slug is required'],
        unique: true,
        lowercase: true
    },
    
    // Topic information
    description: {
        type: String,
        required: [true, 'Topic description is required'],
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    category: {
        type: String,
        required: [true, 'Topic category is required'],
        enum: [
            'Frontend Development',
            'Backend Development',
            'Full Stack Development',
            'Mobile Development',
            'Data Science',
            'DevOps',
            'Programming Languages',
            'Frameworks & Libraries',
            'Tools & Technologies'
        ]
    },
    
    // Learning path information
    difficulty: {
        type: String,
        enum: ['Beginner', 'Intermediate', 'Advanced', 'All Levels'],
        default: 'All Levels'
    },
    estimatedDuration: {
        type: String, // e.g., "2-4 weeks", "1-2 months"
        required: [true, 'Estimated duration is required']
    },
    
    // Prerequisites and relationships
    prerequisites: [{
        topicId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Topic'
        },
        topicName: String,
        level: {
            type: String,
            enum: ['Basic', 'Intermediate', 'Advanced'],
            default: 'Basic'
        }
    }],
    
    // Topic metadata
    tags: [{
        type: String,
        trim: true
    }],
    icon: {
        type: String, // URL or icon class name
        default: '📚'
    },
    color: {
        type: String, // Hex color for UI
        default: '#3B82F6'
    },
    
    // Learning objectives
    learningObjectives: [{
        type: String,
        trim: true
    }],
    
    // Skills gained
    skillsGained: [{
        type: String,
        trim: true
    }],
    
    // Statistics
    popularity: {
        type: Number,
        default: 0
    },
    totalLearners: {
        type: Number,
        default: 0
    },
    averageRating: {
        type: Number,
        min: 0,
        max: 5,
        default: 0
    },
    
    // Status
    isActive: {
        type: Boolean,
        default: true
    },
    featured: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better query performance
topicSchema.index({ slug: 1 });
topicSchema.index({ category: 1, isActive: 1 });
topicSchema.index({ featured: 1, popularity: -1 });

// Virtual for total content count (will be useful later)
topicSchema.virtual('contentCount', {
    ref: 'Content',
    localField: '_id',
    foreignField: 'topic',
    count: true
});

// Static method to get all active topics by category
topicSchema.statics.getByCategory = function() {
    return this.aggregate([
        { $match: { isActive: true } },
        { $sort: { popularity: -1, name: 1 } },
        {
            $group: {
                _id: '$category',
                topics: {
                    $push: {
                        _id: '$_id',
                        name: '$name',
                        slug: '$slug',
                        description: '$description',
                        difficulty: '$difficulty',
                        estimatedDuration: '$estimatedDuration',
                        icon: '$icon',
                        color: '$color',
                        tags: '$tags',
                        popularity: '$popularity',
                        featured: '$featured'
                    }
                }
            }
        },
        { $sort: { _id: 1 } }
    ]);
};

// Static method to get featured topics
topicSchema.statics.getFeatured = function() {
    return this.find({ 
        isActive: true, 
        featured: true 
    }).sort({ popularity: -1 }).limit(6);
};

// Static method to get recommended topics based on user's interests
topicSchema.statics.getRecommended = function(userInterests = [], limit = 8) {
    const matchStage = {
        isActive: true
    };
    
    // If user has interests, prioritize those categories
    if (userInterests.length > 0) {
        matchStage.category = { $in: userInterests };
    }
    
    return this.find(matchStage)
        .sort({ popularity: -1, averageRating: -1 })
        .limit(limit);
};

// Instance method to check if topic has prerequisites
topicSchema.methods.hasPrerequisites = function() {
    return this.prerequisites && this.prerequisites.length > 0;
};

// Instance method to get prerequisite topics
topicSchema.methods.getPrerequisiteTopics = async function() {
    if (!this.hasPrerequisites()) return [];
    
    const prerequisiteIds = this.prerequisites.map(p => p.topicId);
    return await this.constructor.find({
        _id: { $in: prerequisiteIds },
        isActive: true
    });
};

module.exports = mongoose.model('Topic', topicSchema);