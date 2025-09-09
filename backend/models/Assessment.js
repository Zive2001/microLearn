// models/Assessment.js
const mongoose = require('mongoose');

// Assessment Session Schema - Tracks ongoing assessments
const assessmentSessionSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true,
        unique: true,
        default: () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    topic: {
        type: String,
        required: true,
        enum: ['javascript', 'react', 'typescript', 'nodejs', 'python', 'nextjs', 'mongodb', 'css-tailwind']
    },
    
    // Session Configuration
    config: {
        maxQuestions: {
            type: Number,
            default: 10,
            min: 5,
            max: 20
        },
        initialDifficulty: {
            type: String,
            enum: ['beginner', 'intermediate', 'advanced'],
            default: 'intermediate'
        },
        adaptiveThreshold: {
            type: Number,
            default: 0.7 // 70% correct to increase difficulty
        }
    },
    
    // Current Session State
    currentState: {
        questionIndex: {
            type: Number,
            default: 0
        },
        currentDifficulty: {
            type: String,
            enum: ['beginner', 'intermediate', 'advanced'],
            default: 'intermediate'
        },
        totalQuestions: {
            type: Number,
            default: 0
        },
        correctAnswers: {
            type: Number,
            default: 0
        },
        consecutiveCorrect: {
            type: Number,
            default: 0
        },
        consecutiveWrong: {
            type: Number,
            default: 0
        }
    },
    
    // Questions Asked
    questions: [{
        questionId: String,
        question: String,
        options: {
            A: String,
            B: String,
            C: String,
            D: String
        },
        correctAnswer: String,
        userAnswer: String,
        isCorrect: Boolean,
        difficulty: String,
        difficultyWeight: Number,
        timeSpent: Number, // seconds
        explanation: String,
        askedAt: {
            type: Date,
            default: Date.now
        },
        answeredAt: Date
    }],
    
    // Performance Tracking
    performance: {
        beginnerScore: {
            correct: { type: Number, default: 0 },
            total: { type: Number, default: 0 },
            percentage: { type: Number, default: 0 }
        },
        intermediateScore: {
            correct: { type: Number, default: 0 },
            total: { type: Number, default: 0 },
            percentage: { type: Number, default: 0 }
        },
        advancedScore: {
            correct: { type: Number, default: 0 },
            total: { type: Number, default: 0 },
            percentage: { type: Number, default: 0 }
        },
        overallScore: {
            type: Number,
            default: 0
        },
        weightedScore: {
            type: Number,
            default: 0
        }
    },
    
    // Session Status
    status: {
        type: String,
        enum: ['active', 'completed', 'abandoned', 'paused'],
        default: 'active'
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    completedAt: Date,
    estimatedTimeRemaining: Number, // minutes
    
    // Final Results (populated when completed)
    finalResults: {
        level: {
            type: String,
            enum: ['Beginner', 'Intermediate', 'Professional']
        },
        score: Number,
        confidence: Number, // 0-1, how confident we are in the level determination
        strengths: [String],
        weaknesses: [String],
        recommendations: String
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Assessment Result Schema - Final assessment records
const assessmentResultSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sessionId: {
        type: String,
        required: true
    },
    topic: {
        type: String,
        required: true
    },
    
    // Final Results
    level: {
        type: String,
        enum: ['Beginner', 'Intermediate', 'Professional'],
        required: true
    },
    score: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    confidence: {
        type: Number,
        min: 0,
        max: 1,
        default: 0.8
    },
    
    // Detailed Performance
    performance: {
        totalQuestions: Number,
        correctAnswers: Number,
        accuracy: Number,
        timeSpent: Number, // total seconds
        averageTimePerQuestion: Number,
        
        // Performance by difficulty
        beginnerPerformance: {
            questions: Number,
            correct: Number,
            percentage: Number
        },
        intermediatePerformance: {
            questions: Number,
            correct: Number,
            percentage: Number
        },
        advancedPerformance: {
            questions: Number,
            correct: Number,
            percentage: Number
        }
    },
    
    // Analysis
    analysis: {
        strengths: [String],
        weaknesses: [String],
        skillGaps: [String],
        nextSteps: [String]
    },
    
    // Recommendations
    recommendations: {
        suggestedPath: String,
        focusAreas: [String],
        estimatedStudyTime: String,
        nextAssessment: Date
    },
    
    // Metadata
    assessmentVersion: {
        type: String,
        default: '1.0'
    },
    questionsUsed: [{
        questionId: String,
        difficulty: String,
        correct: Boolean
    }]
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better performance
assessmentSessionSchema.index({ userId: 1, status: 1 });
assessmentSessionSchema.index({ sessionId: 1 });
assessmentSessionSchema.index({ topic: 1, status: 1 });

assessmentResultSchema.index({ userId: 1, topic: 1 });
assessmentResultSchema.index({ userId: 1, createdAt: -1 });

// Virtual for session progress percentage
assessmentSessionSchema.virtual('progressPercentage').get(function() {
    if (this.config.maxQuestions === 0) return 0;
    return Math.round((this.currentState.questionIndex / this.config.maxQuestions) * 100);
});

// Virtual for current accuracy
assessmentSessionSchema.virtual('currentAccuracy').get(function() {
    if (this.currentState.totalQuestions === 0) return 0;
    return Math.round((this.currentState.correctAnswers / this.currentState.totalQuestions) * 100);
});

// Instance method to add question to session
assessmentSessionSchema.methods.addQuestion = function(questionData) {
    const questionId = `q_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    this.questions.push({
        questionId,
        question: questionData.question,
        options: questionData.options,
        correctAnswer: questionData.correctAnswer,
        difficulty: questionData.difficulty,
        difficultyWeight: questionData.difficultyWeight || 1,
        explanation: questionData.explanation,
        askedAt: new Date()
    });
    
    return questionId;
};

// Instance method to submit answer
assessmentSessionSchema.methods.submitAnswer = function(questionId, userAnswer, timeSpent = 0) {
    const questionIndex = this.questions.findIndex(q => q.questionId === questionId);
    if (questionIndex === -1) {
        throw new Error('Question not found');
    }
    
    const question = this.questions[questionIndex];
    const isCorrect = userAnswer.toUpperCase() === question.correctAnswer.toUpperCase();
    
    // Update question with answer
    question.userAnswer = userAnswer.toUpperCase();
    question.isCorrect = isCorrect;
    question.timeSpent = timeSpent;
    question.answeredAt = new Date();
    
    // Update session state
    this.currentState.totalQuestions = this.questions.filter(q => q.answeredAt).length;
    this.currentState.correctAnswers = this.questions.filter(q => q.isCorrect).length;
    this.currentState.questionIndex = this.currentState.totalQuestions;
    
    // Update consecutive tracking
    if (isCorrect) {
        this.currentState.consecutiveCorrect += 1;
        this.currentState.consecutiveWrong = 0;
    } else {
        this.currentState.consecutiveWrong += 1;
        this.currentState.consecutiveCorrect = 0;
    }
    
    // Update performance by difficulty
    const difficulty = question.difficulty;
    const performanceKey = `${difficulty}Score`;
    
    if (this.performance[performanceKey]) {
        this.performance[performanceKey].total += 1;
        if (isCorrect) {
            this.performance[performanceKey].correct += 1;
        }
        this.performance[performanceKey].percentage = 
            Math.round((this.performance[performanceKey].correct / this.performance[performanceKey].total) * 100);
    }
    
    return {
        isCorrect,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        currentAccuracy: this.currentAccuracy,
        progressPercentage: this.progressPercentage
    };
};

// Static method to find active session for user and topic
assessmentSessionSchema.statics.findActiveSession = function(userId, topic) {
    return this.findOne({
        userId,
        topic,
        status: 'active'
    });
};

// Static method to get user's assessment history
assessmentResultSchema.statics.getUserHistory = function(userId, limit = 10) {
    return this.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('userId', 'profile.firstName profile.lastName');
};

const AssessmentSession = mongoose.model('AssessmentSession', assessmentSessionSchema);
const AssessmentResult = mongoose.model('AssessmentResult', assessmentResultSchema);

module.exports = {
    AssessmentSession,
    AssessmentResult
};