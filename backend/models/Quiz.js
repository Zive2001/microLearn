// models/Quiz.js
const mongoose = require('mongoose');

// Quiz Question Schema (embedded in sessions and pools)
const quizQuestionSchema = new mongoose.Schema({
    questionId: {
        type: String,
        required: true,
        default: () => `q_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    },
    question: {
        type: String,
        required: true,
        maxlength: 500
    },
    options: {
        A: { type: String, required: true, maxlength: 200 },
        B: { type: String, required: true, maxlength: 200 },
        C: { type: String, required: true, maxlength: 200 },
        D: { type: String, required: true, maxlength: 200 }
    },
    correctAnswer: {
        type: String,
        required: true,
        enum: ['A', 'B', 'C', 'D']
    },
    explanation: {
        type: String,
        required: true,
        maxlength: 300
    },
    hint: {
        type: String,
        maxlength: 200
    },
    difficulty: {
        type: String,
        enum: ['Beginner', 'Intermediate', 'Professional'],
        required: true
    },
    // Source information
    sourceVideoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Video',
        required: true
    },
    sourceMicroVideoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MicroVideo',
        required: true
    },
    keyPoint: {
        type: String, // Which key point this question tests
        required: true
    },
    cognitiveLoad: {
        type: Number,
        min: 1,
        max: 10,
        default: 5
    },
    // Performance tracking
    timesUsed: {
        type: Number,
        default: 0
    },
    correctRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 1
    }
}, {
    _id: false // Questions are embedded, don't need separate _id
});

// User Answer Schema (for tracking performance)
const userAnswerSchema = new mongoose.Schema({
    questionId: String,
    userAnswer: {
        type: String,
        enum: ['A', 'B', 'C', 'D']
    },
    isCorrect: Boolean,
    hintsUsed: {
        type: Number,
        default: 0
    },
    timeSpent: {
        type: Number, // seconds
        default: 0
    },
    retryAttempts: {
        type: Number,
        default: 0
    },
    answeredAt: {
        type: Date,
        default: Date.now
    },
    // Performance state tracking
    previousState: {
        type: String,
        enum: ['correct', 'wrong', 'new'], // 'new' for first attempt
        default: 'new'
    },
    currentState: {
        type: String,
        enum: ['correct', 'wrong']
    }
}, {
    _id: false
});

// Quiz Session Schema
const quizSessionSchema = new mongoose.Schema({
    // Session identification
    sessionId: {
        type: String,
        required: true,
        unique: true,
        default: () => `quiz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    originalVideoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Video',
        required: true
    },

    // Session Configuration
    sessionType: {
        type: String,
        enum: ['intermediate', 'final'],
        required: true
    },
    sessionNumber: {
        type: Number,
        required: true,
        min: 1
    },

    // Covered micro-videos for this session
    microVideoIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MicroVideo'
    }],

    // Quiz configuration
    totalQuestions: {
        type: Number,
        required: true,
        min: 1,
        max: 15
    },
    questionsPerMicroVideo: {
        type: Number,
        default: 2 // Can be adjusted based on session type
    },

    // Questions for this session
    questions: [quizQuestionSchema],

    // User answers and performance
    userAnswers: [userAnswerSchema],

    // Session performance metrics
    performance: {
        correctAnswers: {
            type: Number,
            default: 0
        },
        totalAnswers: {
            type: Number,
            default: 0
        },
        hintsUsed: {
            type: Number,
            default: 0
        },
        retryAttempts: {
            type: Number,
            default: 0
        },
        totalTimeSpent: {
            type: Number, // seconds
            default: 0
        },
        accuracy: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        }
    },

    // Mastery scoring (for final quiz)
    masteryScore: {
        ccPoints: { type: Number, default: 0 }, // Correct→Correct (+1)
        cwPoints: { type: Number, default: 0 }, // Correct→Wrong (-1)
        wcPoints: { type: Number, default: 0 }, // Wrong→Correct (+0.5)
        wwPoints: { type: Number, default: 0 }, // Wrong→Wrong (-0.5)
        totalScore: { type: Number, default: 0 },
        threshold: { type: Number, default: 6 }, // Mastery threshold
        needsSimplifiedQuiz: { type: Boolean, default: false }
    },

    // Session status
    status: {
        type: String,
        enum: ['active', 'completed', 'abandoned'],
        default: 'active'
    },
    currentQuestionIndex: {
        type: Number,
        default: 0
    },

    // Timestamps
    startedAt: {
        type: Date,
        default: Date.now
    },
    completedAt: Date
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Quiz Pool Schema - stores generated questions for reuse
const quizPoolSchema = new mongoose.Schema({
    originalVideoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Video',
        required: true
    },
    microVideoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MicroVideo',
        required: true
    },

    // Generated questions for this micro-video
    questions: [quizQuestionSchema],

    // Metadata from micro-video
    microVideoTitle: String,
    difficulty: {
        type: String,
        enum: ['Beginner', 'Intermediate', 'Professional']
    },
    keyPoints: [String], // from CLT-bLM script
    learningObjective: String,

    // Pool statistics
    totalQuestions: {
        type: Number,
        default: 0
    },
    questionQuality: {
        type: Number,
        default: 5,
        min: 1,
        max: 10
    },

    // Generation metadata
    generatedAt: {
        type: Date,
        default: Date.now
    },
    generatedBy: {
        type: String,
        default: 'openai-gpt'
    },
    generationVersion: {
        type: String,
        default: '1.0'
    },

    // ==================== PHASE 2: USER SIMILARITY TRACKING ====================
    // User similarity metadata for finding similar user quizzes
    similarityMetadata: {
        // Original user who generated this quiz in assessment
        originUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        // User profile characteristics at time of generation
        originUserProfile: {
            learningPace: String,
            problemSolvingApproach: String,
            availableSessionTime: String,
            learningFocus: String,
            experienceLevel: String,
            learningGoal: String
        }
    },

    // Performance analytics for quality assessment
    performanceAnalytics: {
        // Overall statistics about how this quiz performs
        totalUsesCount: {
            type: Number,
            default: 0
        },
        totalAttempters: {
            type: Number,
            default: 0
        },
        averageAccuracy: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        averageTimeSpent: {
            type: Number,
            default: 0 // seconds
        },
        // Track effectiveness for different user groups
        performanceByDifficulty: {
            beginnerAccuracy: {
                type: Number,
                default: 0,
                min: 0,
                max: 100
            },
            intermediateAccuracy: {
                type: Number,
                default: 0,
                min: 0,
                max: 100
            },
            advancedAccuracy: {
                type: Number,
                default: 0,
                min: 0,
                max: 100
            }
        },
        // Quality metrics
        lastUpdatedAt: {
            type: Date,
            default: Date.now
        }
    },

    // Recommendation tracking
    recommendationMetrics: {
        // Track how often this quiz was recommended
        recommendationCount: {
            type: Number,
            default: 0
        },
        // Track users for whom this was recommended
        recommendedToUsers: [{
            userId: mongoose.Schema.Types.ObjectId,
            similarity: Number, // similarity score with origin user
            recommendedAt: {
                type: Date,
                default: Date.now
            },
            wasUsed: {
                type: Boolean,
                default: false
            }
        }],
        // Average satisfaction/effectiveness for similar users
        effectivenessForSimilarUsers: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better performance
// Note: sessionId already has unique: true constraint, no need for separate index
quizSessionSchema.index({ userId: 1, originalVideoId: 1 });
quizSessionSchema.index({ status: 1, sessionType: 1 });

quizPoolSchema.index({ originalVideoId: 1, microVideoId: 1 });
quizPoolSchema.index({ microVideoId: 1 });
// Phase 2 indexes for similarity tracking and recommendation
quizPoolSchema.index({ 'similarityMetadata.originUserId': 1 });
quizPoolSchema.index({ 'performanceAnalytics.totalUsesCount': -1 }); // For sorting by popularity
quizPoolSchema.index({ 'recommendationMetrics.recommendationCount': -1 });

// Virtual for session progress percentage
quizSessionSchema.virtual('progressPercentage').get(function() {
    if (this.totalQuestions === 0) return 0;
    return Math.round((this.currentQuestionIndex / this.totalQuestions) * 100);
});

// Virtual for current accuracy
quizSessionSchema.virtual('currentAccuracy').get(function() {
    if (this.performance.totalAnswers === 0) return 0;
    return Math.round((this.performance.correctAnswers / this.performance.totalAnswers) * 100);
});

// Instance method to add question to session
quizSessionSchema.methods.addQuestion = function(questionData) {
    this.questions.push(questionData);
    this.totalQuestions = this.questions.length;
    return this.save();
};

// Instance method to submit answer with retry logic
quizSessionSchema.methods.submitAnswer = function(questionId, userAnswer, timeSpent = 0, isRetry = false) {
    const questionIndex = this.questions.findIndex(q => q.questionId === questionId);
    if (questionIndex === -1) {
        throw new Error('Question not found in session');
    }

    const question = this.questions[questionIndex];
    const isCorrect = userAnswer.toUpperCase() === question.correctAnswer.toUpperCase();

    // Find or create user answer record
    let answerRecord = this.userAnswers.find(a => a.questionId === questionId);
    if (!answerRecord) {
        answerRecord = {
            questionId,
            previousState: 'new',
            retryAttempts: 0,
            hintsUsed: 0,
            timeSpent: 0
        };
        this.userAnswers.push(answerRecord);
        answerRecord = this.userAnswers[this.userAnswers.length - 1];
    }

    // Update answer record
    answerRecord.userAnswer = userAnswer.toUpperCase();
    answerRecord.isCorrect = isCorrect;
    answerRecord.timeSpent += timeSpent;
    answerRecord.currentState = isCorrect ? 'correct' : 'wrong';
    answerRecord.answeredAt = new Date();

    if (isRetry) {
        answerRecord.retryAttempts += 1;
    }

    // Update session performance
    if (!isRetry) {
        this.performance.totalAnswers += 1;
    }

    if (isCorrect) {
        this.performance.correctAnswers += 1;
    }

    this.performance.totalTimeSpent += timeSpent;
    this.performance.accuracy = Math.round((this.performance.correctAnswers / this.performance.totalAnswers) * 100);

    // Move to next question if correct or max retries reached
    if (isCorrect || answerRecord.retryAttempts >= 1) {
        this.currentQuestionIndex += 1;

        // Check if session is complete
        if (this.currentQuestionIndex >= this.totalQuestions) {
            this.status = 'completed';
            this.completedAt = new Date();

            // Calculate mastery score for final quiz
            if (this.sessionType === 'final') {
                this.calculateMasteryScore();
            }
        }
    }

    return {
        isCorrect,
        canRetry: !isCorrect && answerRecord.retryAttempts < 1,
        hint: !isCorrect ? question.hint : null,
        explanation: isCorrect ? question.explanation : null,
        sessionComplete: this.status === 'completed',
        nextQuestionIndex: this.currentQuestionIndex
    };
};

// Instance method to use hint
quizSessionSchema.methods.useHint = function(questionId) {
    const answerRecord = this.userAnswers.find(a => a.questionId === questionId);
    if (answerRecord) {
        answerRecord.hintsUsed += 1;
        this.performance.hintsUsed += 1;
    }

    const question = this.questions.find(q => q.questionId === questionId);
    return question ? question.hint : null;
};

// Instance method to calculate mastery score (for final quiz)
quizSessionSchema.methods.calculateMasteryScore = function() {
    if (this.sessionType !== 'final') return;

    let ccPoints = 0, cwPoints = 0, wcPoints = 0, wwPoints = 0;

    this.userAnswers.forEach(answer => {
        const prev = answer.previousState;
        const curr = answer.currentState;

        if (prev === 'correct' && curr === 'correct') {
            ccPoints += 1; // Stable mastery
        } else if (prev === 'correct' && curr === 'wrong') {
            cwPoints -= 1; // Regression
        } else if (prev === 'wrong' && curr === 'correct') {
            wcPoints += 0.5; // Recovery
        } else if (prev === 'wrong' && curr === 'wrong') {
            wwPoints -= 0.5; // Persistent gap
        }
        // 'new' state doesn't affect mastery scoring
    });

    this.masteryScore = {
        ccPoints,
        cwPoints,
        wcPoints,
        wwPoints,
        totalScore: ccPoints + cwPoints + wcPoints + wwPoints,
        threshold: 6,
        needsSimplifiedQuiz: (ccPoints + cwPoints + wcPoints + wwPoints) < 6
    };
};

// Static method to determine adaptive quiz schedule based on actual micro-video count
quizSessionSchema.statics.calculateQuizSchedule = function(totalMicroVideos) {
    const schedule = [];
    let sessionNumber = 1;

    // Adaptive quiz scheduling based on total micro-video count
    if (totalMicroVideos <= 2) {
        // Very small content: Only final quiz
        schedule.push({
            sessionNumber,
            sessionType: 'final',
            afterMicroVideo: totalMicroVideos,
            questionsCount: Math.min(totalMicroVideos * 2, 6), // 2 questions per micro-video, max 6
            description: 'Single comprehensive quiz for short content'
        });
    } else if (totalMicroVideos <= 4) {
        // Small content: One intermediate + final
        const midpoint = Math.ceil(totalMicroVideos / 2);

        schedule.push({
            sessionNumber,
            sessionType: 'intermediate',
            afterMicroVideo: midpoint,
            questionsCount: Math.min(midpoint * 2, 6), // 2 questions per covered micro-video
            description: `Quiz after first ${midpoint} micro-videos`
        });
        sessionNumber++;

        schedule.push({
            sessionNumber,
            sessionType: 'final',
            afterMicroVideo: totalMicroVideos,
            questionsCount: Math.min(totalMicroVideos * 2, 10), // 2 questions per micro-video, max 10
            description: 'Comprehensive final quiz covering all content'
        });
    } else if (totalMicroVideos <= 6) {
        // Medium content: Two intermediates + final
        const firstQuiz = Math.ceil(totalMicroVideos / 3);
        const secondQuiz = Math.ceil(totalMicroVideos * 2 / 3);

        schedule.push({
            sessionNumber,
            sessionType: 'intermediate',
            afterMicroVideo: firstQuiz,
            questionsCount: Math.min(firstQuiz * 2, 6),
            description: `First quiz after ${firstQuiz} micro-videos`
        });
        sessionNumber++;

        schedule.push({
            sessionNumber,
            sessionType: 'intermediate',
            afterMicroVideo: secondQuiz,
            questionsCount: Math.min((secondQuiz - firstQuiz) * 2, 6),
            description: `Second quiz after ${secondQuiz} micro-videos`
        });
        sessionNumber++;

        schedule.push({
            sessionNumber,
            sessionType: 'final',
            afterMicroVideo: totalMicroVideos,
            questionsCount: Math.min(totalMicroVideos * 2, 12),
            description: 'Comprehensive final quiz'
        });
    } else {
        // Large content: Multiple intermediates + final
        const quizInterval = Math.max(2, Math.floor(totalMicroVideos / 4)); // At least every 2, but space them out

        for (let i = quizInterval; i < totalMicroVideos; i += quizInterval) {
            schedule.push({
                sessionNumber,
                sessionType: 'intermediate',
                afterMicroVideo: i,
                questionsCount: Math.min(quizInterval * 2, 8), // 2 questions per micro-video in this segment
                description: `Intermediate quiz ${sessionNumber} after ${i} micro-videos`
            });
            sessionNumber++;
        }

        // Final quiz
        schedule.push({
            sessionNumber,
            sessionType: 'final',
            afterMicroVideo: totalMicroVideos,
            questionsCount: Math.min(totalMicroVideos * 1.5, 15), // 1.5 questions per micro-video, max 15
            description: 'Comprehensive final quiz covering all micro-videos'
        });
    }

    return schedule;
};

// Static method to find active session for user
quizSessionSchema.statics.findActiveSession = function(userId, originalVideoId) {
    return this.findOne({
        userId,
        originalVideoId,
        status: 'active'
    });
};

const QuizSession = mongoose.model('QuizSession', quizSessionSchema);
const QuizPool = mongoose.model('QuizPool', quizPoolSchema);

module.exports = {
    QuizSession,
    QuizPool
};