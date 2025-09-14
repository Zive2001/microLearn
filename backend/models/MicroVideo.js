// models/MicroVideo.js
const mongoose = require('mongoose');

const microVideoSchema = new mongoose.Schema({
    // Reference to the original processed video
    originalVideoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Video',
        required: [true, 'Original video ID is required']
    },

    // Segment information
    title: {
        type: String,
        required: [true, 'Micro-video title is required'],
        trim: true,
        maxlength: [150, 'Title cannot exceed 150 characters']
    },
    sequence: {
        type: Number,
        required: [true, 'Sequence number is required'],
        min: [1, 'Sequence must be at least 1']
    },

    // Time segment in the original video
    timeRange: {
        startTime: {
            type: Number, // in seconds
            required: [true, 'Start time is required'],
            min: [0, 'Start time cannot be negative']
        },
        endTime: {
            type: Number, // in seconds
            required: [true, 'End time is required']
        },
        duration: {
            type: Number, // in seconds
            required: [true, 'Duration is required']
        }
    },

    // Enhanced CLT-bLM content for educational shorts
    cltBlmScript: {
        // Main learning objective for this segment
        learningObjective: {
            type: String,
            required: [true, 'Learning objective is required'],
            maxlength: [200, 'Learning objective cannot exceed 200 characters']
        },

        // Key points covered in this segment
        keypoints: [{
            type: String,
            trim: true,
            maxlength: [100, 'Keypoint cannot exceed 100 characters']
        }],

        // Estimated cognitive load (1-10 scale)
        cognitiveLoad: {
            type: Number,
            min: [1, 'Cognitive load must be at least 1'],
            max: [10, 'Cognitive load cannot exceed 10'],
            default: 5
        },

        // Prerequisites for understanding this segment
        prerequisites: [{
            type: String,
            trim: true
        }],

        // Enhanced fields for educational shorts
        practicalExample: {
            type: String,
            maxlength: [300, 'Practical example cannot exceed 300 characters']
        },

        difficulty: {
            type: String,
            enum: ['Beginner', 'Intermediate', 'Advanced'],
            default: 'Beginner'
        },

        educationalScript: {
            type: String,
            maxlength: [2000, 'Educational script cannot exceed 2000 characters']
        },

        visualCues: [{
            type: String,
            trim: true,
            maxlength: [100, 'Visual cue cannot exceed 100 characters']
        }]
    },

    // Processing status for this segment
    processingStatus: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
    },

    // Extracted transcript for this segment only
    segmentTranscript: {
        type: String,
        default: null
    },

    // File paths (will be used later for actual video files)
    videoUrl: {
        type: String,
        default: null
    },
    thumbnailUrl: {
        type: String,
        default: null
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for formatted time range
microVideoSchema.virtual('timeRangeFormatted').get(function() {
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return {
        start: formatTime(this.timeRange.startTime),
        end: formatTime(this.timeRange.endTime),
        duration: formatTime(this.timeRange.duration)
    };
});

// Virtual for YouTube embed URL with start time
microVideoSchema.virtual('youtubeEmbedUrl').get(function() {
    return new Promise(async (resolve) => {
        try {
            const video = await mongoose.model('Video').findById(this.originalVideoId);
            if (video) {
                resolve(`https://www.youtube.com/embed/${video.youtubeVideoId}?start=${this.timeRange.startTime}&end=${this.timeRange.endTime}`);
            } else {
                resolve(null);
            }
        } catch (error) {
            resolve(null);
        }
    });
});

// Static method to get all micro-videos for a parent video
microVideoSchema.statics.getByVideoId = function(videoId) {
    return this.find({ originalVideoId: videoId }).sort({ sequence: 1 });
};

// Instance method to update processing status
microVideoSchema.methods.updateProcessingStatus = function(status) {
    this.processingStatus = status;
    return this.save();
};

// Pre-save middleware to calculate duration
microVideoSchema.pre('save', function(next) {
    if (this.timeRange && this.timeRange.startTime !== undefined && this.timeRange.endTime !== undefined) {
        this.timeRange.duration = this.timeRange.endTime - this.timeRange.startTime;
    }
    next();
});

// Compound index for efficient querying
microVideoSchema.index({ originalVideoId: 1, sequence: 1 });

module.exports = mongoose.model('MicroVideo', microVideoSchema);