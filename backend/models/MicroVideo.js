const mongoose = require('mongoose');

const keypointSchema = new mongoose.Schema({
  label: {
    type: String,
    required: true,
    trim: true,
  },
  description: String,
  weight: {
    type: Number,
    min: 0,
    max: 1,
    default: 1,
  },
  bloomLevel: {
    type: String,
    enum: ["remember", "understand", "apply", "analyze", "evaluate", "create"],
  },
});

const cltBlmScriptSchema = new mongoose.Schema({
  // CLT-bLM Four Phases
  prepare: {
    content: String,
    duration: Number, // seconds
    visualCues: [String],
    priorKnowledge: [String],
  },
  initiate: {
    content: String,
    duration: Number,
    objectives: [String],
    analogies: [String],
  },
  deliver: {
    content: String,
    duration: Number,
    coreIdeas: [String],
    captions: [String],
    diagrams: [String],
  },
  end: {
    content: String,
    duration: Number,
    recap: String,
    reflectionQuestions: [String],
  },
});

const microVideoSchema = new mongoose.Schema(
  {
    // References
    originalVideoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Video",
      required: true,
    },
    transcriptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transcript",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Basic Information
    title: {
      type: String,
      required: [true, "Micro-video title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    sequence: {
      type: Number,
      required: true,
      min: 1,
    },

    // Time Range from Original Video
    timeRange: {
      startTime: {
        type: Number,
        required: true,
        min: 0,
      },
      endTime: {
        type: Number,
        required: true,
        min: 0,
      },
      duration: {
        type: Number,
        required: true,
        min: 120, // 2 minutes minimum
        max: 360, // 6 minutes maximum
      },
    },

    // CLT-bLM Integration
    cltBlmScript: cltBlmScriptSchema,

    keypoints: [keypointSchema],

    // Cognitive Load Analysis
    cognitiveLoad: {
      intrinsic: {
        type: Number,
        min: 1,
        max: 5,
        default: 3,
      },
      extraneous: {
        type: Number,
        min: 1,
        max: 5,
        default: 2,
      },
      germane: {
        type: Number,
        min: 1,
        max: 5,
        default: 3,
      },
    },

    // Learning Objectives
    learningObjectives: [
      {
        objective: String,
        bloomLevel: {
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
        achieved: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // Generated Content
    generatedScript: {
      type: String,
      required: true,
    },

    // TTS Configuration
    ttsConfig: {
      voice: {
        type: String,
        default: "alloy",
        enum: ["alloy", "echo", "fable", "onyx", "nova", "shimmer"],
      },
      speed: {
        type: Number,
        default: 1.0,
        min: 0.5,
        max: 2.0,
      },
      language: {
        type: String,
        default: "en",
      },
    },

    // Output Files
    outputFiles: {
      videoFile: {
        filename: String,
        path: String,
        size: Number,
        format: {
          type: String,
          default: "mp4",
        },
      },
      audioFile: {
        filename: String,
        path: String,
        size: Number,
        format: {
          type: String,
          default: "mp3",
        },
      },
      subtitleFile: {
        filename: String,
        path: String,
        format: {
          type: String,
          default: "srt",
        },
      },
    },

    // Processing Status
    processingStatus: {
      type: String,
      enum: [
        "pending",
        "generating_script",
        "creating_audio",
        "rendering_video",
        "completed",
        "failed",
      ],
      default: "pending",
    },

    // Quality Metrics
    qualityMetrics: {
      coherenceScore: {
        type: Number,
        min: 0,
        max: 1,
      },
      relevanceScore: {
        type: Number,
        min: 0,
        max: 1,
      },
      engagementScore: {
        type: Number,
        min: 0,
        max: 1,
      },
    },

    // Coverage Analysis
    coverageAnalysis: {
      topicsCovered: [String],
      topicsMissed: [String],
      coveragePercentage: {
        type: Number,
        min: 0,
        max: 100,
      },
    },

    // User Analytics
    analytics: {
      views: {
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
        min: 1,
        max: 5,
      },
      ratings: [
        {
          userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
          rating: {
            type: Number,
            min: 1,
            max: 5,
          },
          comment: String,
          createdAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
microVideoSchema.index({ originalVideoId: 1 });
microVideoSchema.index({ userId: 1 });
microVideoSchema.index({ processingStatus: 1 });
microVideoSchema.index({ createdAt: -1 });
microVideoSchema.index({ "analytics.averageRating": -1 });

// Validation
microVideoSchema.pre("save", function (next) {
  if (this.timeRange.endTime <= this.timeRange.startTime) {
    next(new Error("End time must be greater than start time"));
  }
  if (
    this.timeRange.duration !==
    this.timeRange.endTime - this.timeRange.startTime
  ) {
    this.timeRange.duration = this.timeRange.endTime - this.timeRange.startTime;
  }
  next();
});

const MicroVideo = mongoose.model("MicroVideo", microVideoSchema);
module.exports = MicroVideo;
