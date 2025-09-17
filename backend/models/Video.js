// models/Video.js
const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
    // Basic video information
    title: {
        type: String,
        required: [true, 'Video title is required'],
        trim: true,
        maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },

    // YouTube source info
    sourceUrl: {
        type: String,
        required: [true, 'Source URL is required'],
        validate: {
            validator: function(url) {
                const patterns = [
                    /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[a-zA-Z0-9_-]{11}/,
                    /^https?:\/\/youtu\.be\/[a-zA-Z0-9_-]{11}/,
                    /^https?:\/\/(www\.)?youtube\.com\/embed\/[a-zA-Z0-9_-]{11}/,
                    /^https?:\/\/m\.youtube\.com\/watch\?v=[a-zA-Z0-9_-]{11}/
                ];
                return patterns.some(pattern => pattern.test(url));
            },
            message: 'Must be a valid YouTube URL'
        }
    },
    youtubeVideoId: {
        type: String,
        required: [true, 'YouTube video ID is required']
    },

    // User who processed this video
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required']
    },

    // Processing status tracking
    processingStatus: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
    },
    processingError: {
        type: String,
        default: null
    },

    // Video metadata (will be populated during processing)
    originalDuration: {
        type: Number, // duration in seconds
        default: null
    },
    formattedDuration: {
        type: String, // "15m 30s" format
        default: null
    },

    // Extracted transcript
    transcript: {
        type: String,
        default: null
    },

    // Topic classification (from recommendation context)
    topic: {
        type: String,
        enum: ['javascript', 'react', 'typescript', 'nodejs', 'python', 'nextjs', 'mongodb', 'css-tailwind'],
        required: [true, 'Topic is required']
    },
    difficulty: {
        type: String,
        enum: ['Beginner', 'Intermediate', 'Professional'],
        default: 'Intermediate'
    },

    // Basic tags for organization
    tags: [{
        type: String,
        trim: true
    }],

    // Subject categorization
    subject: {
        type: String,
        default: 'Programming'
    }
}, {
    timestamps: true, // adds createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for getting video embed URL
videoSchema.virtual('embedUrl').get(function() {
    return `https://www.youtube.com/embed/${this.youtubeVideoId}`;
});

// Virtual for getting direct YouTube URL
videoSchema.virtual('watchUrl').get(function() {
    return `https://www.youtube.com/watch?v=${this.youtubeVideoId}`;
});

// Static method to extract YouTube video ID from URL
videoSchema.statics.extractVideoId = function(url) {
    if (!url) return null;

    // Handle various YouTube URL formats
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|m\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }

    return null;
};

// Instance method to update processing status
videoSchema.methods.updateProcessingStatus = function(status, error = null) {
    this.processingStatus = status;
    if (error) {
        this.processingError = error;
    }
    return this.save();
};

// Pre-save middleware to extract video ID
videoSchema.pre('save', function(next) {
    if (this.sourceUrl && !this.youtubeVideoId) {
        this.youtubeVideoId = this.constructor.extractVideoId(this.sourceUrl);
    }
    next();
});

module.exports = mongoose.model('Video', videoSchema);