// models/Quiz.js
const mongoose = require('mongoose');

// Individual Question Schema
const questionSchema = new mongoose.Schema({
    questionText: {
        type: String,
        required: [true, 'Question text is required'],
        trim: true
    },
    questionType: {
        type: String,
        enum: ['mcq', 'true_false', 'short_answer'],
        required: [true, 'Question type is required']
    },
    options: [{
        text: {
            type: String,
            required: true,
            trim: true
        },
        isCorrect: {
            type: Boolean,
            default: false
        }
    }],
    correctAnswer: {
        type: String, // For short answer questions
        trim: true
    },
    bloomLevel: {
        type: String,
        enum: ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'],
        required: [true, 'Bloom taxonomy level is required']
    },
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium'
    },
    hint: {
        type: String,
        trim: true
    },
    explanation: {
        type: String,
        trim: true
    },
    // Mapping to video clips and keypoints
    clipId: {
        type: String, // Will map to video clip ID when Component 2 is ready
        required: true
    },
    keypoints: [{
        type: String,
        trim: true
    }],
    timeRelevance: {
        startTime: Number, // seconds in the clip
        endTime: Number
    },
    // Question usage tracking
    timesAsked: {
        type: Number,
        default: 0
    },
    correctAnswerRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 1
    }
}, {
    timestamps: true
});

// Quiz Pool Schema - Collection of questions for a topic
const quizPoolSchema = new mongoose.Schema({
    topic: {
        type: String,
        required: [true, 'Topic is required'],
        enum: ['javascript', 'react', 'typescript', 'nodejs', 'python', 'nextjs', 'mongodb', 'css-tailwind']
    },
    subject: {
        type: String,
        required: [true, 'Subject is required']
    },
    userLevel: {
        type: String,
        enum: ['Beginner', 'Intermediate', 'Advanced'],
        required: [true, 'User level is required']
    },
    questions: [questionSchema],
    totalClips: {
        type: Number,
        required: [true, 'Total clips count is required']
    },
    keypoints: [{
        type: String,
        trim: true
    }],
    coveragePercentage: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    // Quiz generation metadata
    generatedBy: {
        type: String,
        enum: ['system', 'manual'],
        default: 'system'
    },
    generationDate: {
        type: Date,
        default: Date.now
    },
    // Status
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Quiz Session Schema - Individual quiz instance for a user
const quizSessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required']
    },
    quizPoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'QuizPool',
        required: false // Optional for AI-powered dynamic sessions
    },
    // Dynamic AI session configuration
    dynamicConfig: {
        topic: String,
        userLevel: String,
        questionsPerSession: Number,
        timeLimit: Number,
        adaptiveDifficulty: Boolean,
        bloomProgression: Boolean,
        hintsEnabled: Boolean,
        currentBloomLevel: String,
        currentDifficulty: String,
        currentQuestion: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        }
    },
    // Session mode indicator
    sessionMode: {
        type: String,
        enum: ['static', 'dynamic_ai'],
        default: 'static'
    },
    sessionType: {
        type: String,
        enum: ['formative', 'final', 'simplified', 'remediation'],
        required: [true, 'Session type is required']
    },
    sessionNumber: {
        type: Number,
        required: [true, 'Session number is required']
    },
    totalSessions: {
        type: Number,
        required: [true, 'Total sessions count is required']
    },
    // Quiz configuration
    questionsToAsk: [{
        questionId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        order: {
            type: Number,
            required: true
        }
    }],
    // Session settings
    timeLimit: {
        type: Number, // minutes
        default: 10
    },
    hintsEnabled: {
        type: Boolean,
        default: true
    },
    // Session status
    status: {
        type: String,
        enum: ['not_started', 'in_progress', 'completed', 'abandoned'],
        default: 'not_started'
    },
    startedAt: Date,
    completedAt: Date,
    // Progress tracking
    currentQuestionIndex: {
        type: Number,
        default: 0
    },
    responses: [{
        questionId: {
            type: mongoose.Schema.Types.Mixed, // Allow both ObjectId and String for dynamic AI questions
            required: true
        },
        userAnswer: {
            type: String,
            required: true
        },
        isCorrect: {
            type: Boolean,
            required: true
        },
        timeSpent: {
            type: Number, // seconds
            default: 0
        },
        hintUsed: {
            type: Boolean,
            default: false
        },
        attemptHistory: [{
            answer: String,
            timestamp: Date,
            correct: Boolean
        }],
        answeredAt: {
            type: Date,
            default: Date.now
        }
    }],
    // Scoring
    score: {
        rawScore: {
            type: Number,
            default: 0
        },
        masteryScore: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        bloomLevelScores: {
            Remember: { type: Number, default: 0 },
            Understand: { type: Number, default: 0 },
            Apply: { type: Number, default: 0 },
            Analyze: { type: Number, default: 0 },
            Evaluate: { type: Number, default: 0 },
            Create: { type: Number, default: 0 }
        }
    },
    // Performance metrics
    metrics: {
        averageTimePerQuestion: {
            type: Number,
            default: 0
        },
        hintsUsedCount: {
            type: Number,
            default: 0
        },
        correctFirstAttempt: {
            type: Number,
            default: 0
        },
        totalAttempts: {
            type: Number,
            default: 0
        }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// User Quiz Progress Schema - Overall progress tracking
const userQuizProgressSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required'],
        unique: true
    },
    topicProgress: [{
        topic: {
            type: String,
            required: true
        },
        totalSessions: {
            type: Number,
            default: 0
        },
        completedSessions: {
            type: Number,
            default: 0
        },
        averageMasteryScore: {
            type: Number,
            default: 0
        },
        finalQuizCompleted: {
            type: Boolean,
            default: false
        },
        finalMasteryScore: {
            type: Number,
            default: 0
        },
        needsRemediation: {
            type: Boolean,
            default: false
        },
        lastSessionDate: Date,
        sessionHistory: [{
            sessionId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'QuizSession'
            },
            sessionType: String,
            masteryScore: Number,
            completedAt: Date
        }]
    }],
    // Overall statistics
    overallStats: {
        totalQuizzesCompleted: {
            type: Number,
            default: 0
        },
        averageScore: {
            type: Number,
            default: 0
        },
        strongestBloomLevel: String,
        weakestBloomLevel: String,
        totalTimeSpent: {
            type: Number,
            default: 0 // minutes
        }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better performance
questionSchema.index({ bloomLevel: 1, difficulty: 1 });
questionSchema.index({ clipId: 1 });

quizPoolSchema.index({ topic: 1, userLevel: 1 });
quizPoolSchema.index({ isActive: 1 });

quizSessionSchema.index({ userId: 1, status: 1 });
quizSessionSchema.index({ quizPoolId: 1 });

userQuizProgressSchema.index({ userId: 1 });

// Virtual for question count in quiz pool
quizPoolSchema.virtual('questionCount').get(function() {
    return this.questions ? this.questions.length : 0;
});

// Virtual for session completion percentage
quizSessionSchema.virtual('completionPercentage').get(function() {
    if (!this.questionsToAsk || this.questionsToAsk.length === 0) return 0;
    return Math.round((this.responses.length / this.questionsToAsk.length) * 100);
});

// Instance method to calculate mastery score
quizSessionSchema.methods.calculateMasteryScore = function() {
    if (this.responses.length === 0) return 0;
    
    let totalScore = 0;
    this.responses.forEach(response => {
        // Apply scoring logic: CC: +1, CW: -1, WC: +0.5, WW: -0.5
        if (response.attemptHistory.length === 1) {
            // First attempt
            totalScore += response.isCorrect ? 1 : -1;
        } else {
            // Multiple attempts
            const firstWrong = !response.attemptHistory[0].correct;
            const finalCorrect = response.isCorrect;
            
            if (firstWrong && finalCorrect) totalScore += 0.5; // WC
            else if (firstWrong && !finalCorrect) totalScore -= 0.5; // WW
            else if (!firstWrong && !finalCorrect) totalScore -= 1; // CW
            else totalScore += 1; // CC
        }
    });
    
    const maxPossibleScore = this.responses.length;
    const masteryScore = Math.max(0, Math.min(100, ((totalScore + maxPossibleScore) / (2 * maxPossibleScore)) * 100));
    
    this.score.masteryScore = Math.round(masteryScore);
    return this.score.masteryScore;
};

// Instance method to check if user passed
quizSessionSchema.methods.hasPassed = function() {
    return this.score.masteryScore >= 75;
};

// Static method to find active quiz pool
quizPoolSchema.statics.findActivePool = function(topic, userLevel) {
    return this.findOne({
        topic: topic,
        userLevel: userLevel,
        isActive: true
    }).sort({ createdAt: -1 });
};

// Models export
const Question = mongoose.model('Question', questionSchema);
const QuizPool = mongoose.model('QuizPool', quizPoolSchema);
const QuizSession = mongoose.model('QuizSession', quizSessionSchema);
const UserQuizProgress = mongoose.model('UserQuizProgress', userQuizProgressSchema);

module.exports = {
    Question,
    QuizPool,
    QuizSession,
    UserQuizProgress
};