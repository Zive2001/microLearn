const mongoose = require('mongoose');

const transcriptSegmentSchema = new mongoose.Schema({
  startTime: {
    type: Number, // in seconds
    required: true,
    min: 0,
  },
  endTime: {
    type: Number, // in seconds
    required: true,
    min: 0,
  },
  text: {
    type: String,
    required: [true, "Transcript text is required"],
    trim: true,
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 1,
  },
  speaker: String, // for multi-speaker videos

  // Semantic Analysis
  embedding: [Number], // vector embedding for semantic search
  keyTopics: [String], // extracted key topics from this segment
  bloomLevel: {
    type: String,
    enum: ["remember", "understand", "apply", "analyze", "evaluate", "create"],
  },

  // CLT-bLM Classification
  cltPhase: {
    type: String,
    enum: ["prepare", "initiate", "deliver", "end", "unclassified"],
    default: "unclassified",
  },
  importance: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.5,
  },
});

const transcriptSchema = new mongoose.Schema(
  {
    // Reference to original video
    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Video",
      required: true,
    },

    // Extraction Method
    extractionMethod: {
      type: String,
      enum: ["whisper", "youtube_captions", "manual", "azure_speech"],
      required: true,
    },

    // Language Information
    language: {
      code: {
        type: String,
        default: "en",
      },
      confidence: {
        type: Number,
        min: 0,
        max: 1,
        default: 1,
      },
    },

    // Transcript Segments
    segments: [transcriptSegmentSchema],

    // Full Text (for quick search)
    fullText: {
      type: String,
      required: true,
    },

    // Processing Information
    processingStatus: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
    },
    processingError: String,
    processingDuration: Number, // milliseconds

    // Quality Metrics
    quality: {
      overallConfidence: {
        type: Number,
        min: 0,
        max: 1,
      },
      wordCount: {
        type: Number,
        default: 0,
      },
      segmentCount: {
        type: Number,
        default: 0,
      },
      averageSegmentLength: Number,
      silencePercentage: {
        type: Number,
        min: 0,
        max: 100,
      },
    },

    // Semantic Analysis Results
    semanticAnalysis: {
      keyTopics: [
        {
          topic: String,
          confidence: Number,
          frequency: Number,
        },
      ],
      difficulty: {
        type: String,
        enum: ["beginner", "intermediate", "advanced"],
      },
      readabilityScore: Number,
      technicalTerms: [String],
      concepts: [
        {
          concept: String,
          definition: String,
          importance: Number,
        },
      ],
    },

    // Ownership
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
transcriptSchema.index({ videoId: 1 });
transcriptSchema.index({ processingStatus: 1 });
transcriptSchema.index({ "language.code": 1 });
transcriptSchema.index({ "quality.overallConfidence": -1 });
transcriptSchema.index({ createdAt: -1 });

// Text search index
transcriptSchema.index({ fullText: "text" });

// Virtual for formatted duration
transcriptSchema.virtual("duration").get(function () {
  if (this.segments.length === 0) return 0;
  const lastSegment = this.segments[this.segments.length - 1];
  return lastSegment.endTime;
});

// Virtual for words per minute
transcriptSchema.virtual("wordsPerMinute").get(function () {
  if (!this.quality.wordCount || !this.duration) return 0;
  return Math.round((this.quality.wordCount / this.duration) * 60);
});

// Pre-save middleware to update quality metrics
transcriptSchema.pre("save", function (next) {
  if (this.isModified("segments")) {
    // Update quality metrics
    this.quality.segmentCount = this.segments.length;
    this.quality.wordCount = this.fullText.split(/\s+/).length;

    if (this.segments.length > 0) {
      const totalConfidence = this.segments.reduce(
        (sum, seg) => sum + seg.confidence,
        0
      );
      this.quality.overallConfidence = totalConfidence / this.segments.length;

      const totalDuration = this.segments.reduce(
        (sum, seg) => sum + (seg.endTime - seg.startTime),
        0
      );
      this.quality.averageSegmentLength = totalDuration / this.segments.length;
    }
  }
  next();
});

// Instance method to find segments by time range
transcriptSchema.methods.getSegmentsByTimeRange = function (
  startTime,
  endTime
) {
  return this.segments.filter(
    (segment) => segment.startTime >= startTime && segment.endTime <= endTime
  );
};

// Instance method to search text
transcriptSchema.methods.searchText = function (query) {
  const regex = new RegExp(query, "i");
  return this.segments.filter((segment) => regex.test(segment.text));
};

// Instance method to get key phrases
transcriptSchema.methods.getKeyPhrases = function () {
  const words = this.fullText.toLowerCase().split(/\s+/);
  const wordCount = {};

  // Count word frequency
  words.forEach((word) => {
    word = word.replace(/[^\w]/g, "");
    if (word.length > 3) {
      wordCount[word] = (wordCount[word] || 0) + 1;
    }
  });

  // Return top phrases
  return Object.entries(wordCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([word, count]) => ({ word, count }));
};

// Static method to find by confidence threshold
transcriptSchema.statics.findHighQuality = function (threshold = 0.8) {
  return this.find({
    "quality.overallConfidence": { $gte: threshold },
    processingStatus: "completed",
  });
};

const Transcript = mongoose.model("Transcript", transcriptSchema);
module.exports = Transcript;
