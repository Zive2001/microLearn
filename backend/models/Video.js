const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema(
  {
    // Basic Video Information
    title: {
      type: String,
      required: [true, "Video title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },

    // Source Information
    sourceUrl: {
      type: String,
      required: [true, "Source URL is required"],
      validate: {
        validator: function (v) {
          return /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/.test(
            v
          );
        },
        message: "Please enter a valid URL",
      },
    },
    sourceType: {
      type: String,
      enum: ["youtube", "vimeo", "direct", "upload"],
      required: true,
    },
    originalDuration: {
      type: Number, // in seconds
      required: true,
      min: [1, "Duration must be at least 1 second"],
    },

    // File Information
    fileInfo: {
      originalFilename: String,
      filename: String,
      path: String,
      size: Number, // in bytes
      mimeType: String,
      resolution: {
        width: Number,
        height: Number,
      },
      bitrate: Number,
      framerate: Number,
    },

    // Processing Status
    processingStatus: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
    },
    processingError: String,

    // Educational Metadata
    subject: {
      type: String,
      required: [true, "Subject is required"],
      trim: true,
    },
    difficulty: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      required: true,
    },
    bloomLevels: [
      {
        type: String,
        enum: [
          "remember",
          "understand",
          "apply",
          "analyze",
          "evaluate",
          "create",
        ],
      },
    ],
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],

    // CLT-bLM Configuration
    cltBLMConfig: {
      preparePhaseKeywords: [String],
      initiatePhaseKeywords: [String],
      deliverPhaseKeywords: [String],
      endPhaseKeywords: [String],
      targetMicroVideoCount: {
        type: Number,
        default: 5,
        min: [2, "Minimum 2 micro-videos required"],
        max: [20, "Maximum 20 micro-videos allowed"],
      },
    },

    // Analytics
    analytics: {
      viewCount: {
        type: Number,
        default: 0,
      },
      completionRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      totalRatings: {
        type: Number,
        default: 0,
      },
    },

    // Ownership
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
videoSchema.index({ uploadedBy: 1 });
videoSchema.index({ subject: 1 });
videoSchema.index({ difficulty: 1 });
videoSchema.index({ processingStatus: 1 });
videoSchema.index({ "analytics.viewCount": -1 });
videoSchema.index({ createdAt: -1 });
videoSchema.index({ tags: 1 });

// Virtual for formatted duration
videoSchema.virtual("formattedDuration").get(function () {
  const hours = Math.floor(this.originalDuration / 3600);
  const minutes = Math.floor((this.originalDuration % 3600) / 60);
  const seconds = this.originalDuration % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
});

// Virtual for file size in MB
videoSchema.virtual("fileSizeMB").get(function () {
  if (!this.fileInfo?.size) return 0;
  return (this.fileInfo.size / (1024 * 1024)).toFixed(2);
});

// Instance method to update analytics
videoSchema.methods.updateAnalytics = function (updates) {
  Object.keys(updates).forEach((key) => {
    if (this.analytics[key] !== undefined) {
      this.analytics[key] = updates[key];
    }
  });
  return this.save();
};

// Instance method to add rating
videoSchema.methods.addRating = function (rating) {
  const currentTotal =
    this.analytics.averageRating * this.analytics.totalRatings;
  this.analytics.totalRatings += 1;
  this.analytics.averageRating =
    (currentTotal + rating) / this.analytics.totalRatings;
  return this.save();
};

// Static method to find by difficulty
videoSchema.statics.findByDifficulty = function (difficulty) {
  return this.find({ difficulty, isActive: true });
};

// Static method to find popular videos
videoSchema.statics.findPopular = function (limit = 10) {
  return this.find({ isActive: true, isPublic: true })
    .sort({ "analytics.viewCount": -1 })
    .limit(limit);
};

const Video = mongoose.model("Video", videoSchema);
module.exports = Video;
