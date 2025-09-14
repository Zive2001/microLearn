// test-quiz-models.js - Test script for Quiz models
const mongoose = require('mongoose');
const { QuizSession, QuizPool } = require('./models/Quiz');
require('dotenv').config();

// Connect to database
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB for testing');
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        process.exit(1);
    }
};

// Test Quiz models
const testQuizModels = async () => {
    try {
        console.log('\n🧪 Testing Quiz Models...\n');

        // Test 1: Quiz Schedule Calculation
        console.log('📋 Test 1: Quiz Schedule Calculation');

        const schedule6Videos = QuizSession.calculateQuizSchedule(6);
        console.log('Schedule for 6 micro-videos:', schedule6Videos);

        const schedule9Videos = QuizSession.calculateQuizSchedule(9);
        console.log('Schedule for 9 micro-videos:', schedule9Videos);

        const schedule12Videos = QuizSession.calculateQuizSchedule(12);
        console.log('Schedule for 12 micro-videos:', schedule12Videos);

        // Test 2: Create a Quiz Pool (mock data)
        console.log('\n📚 Test 2: Creating Quiz Pool');

        const mockVideoId = new mongoose.Types.ObjectId();
        const mockMicroVideoId = new mongoose.Types.ObjectId();

        const testQuizPool = new QuizPool({
            originalVideoId: mockVideoId,
            microVideoId: mockMicroVideoId,
            microVideoTitle: 'JavaScript Variables Test',
            difficulty: 'Beginner',
            keyPoints: ['Variable declarations', 'Data types', 'Scope'],
            learningObjective: 'Master JavaScript variables',
            questions: [
                {
                    question: 'Which keyword is used to declare a constant in JavaScript?',
                    options: {
                        A: 'var',
                        B: 'let',
                        C: 'const',
                        D: 'final'
                    },
                    correctAnswer: 'C',
                    explanation: 'const is used to declare constants that cannot be reassigned',
                    hint: 'Think about the keyword that prevents reassignment',
                    difficulty: 'Beginner',
                    sourceVideoId: mockVideoId,
                    sourceMicroVideoId: mockMicroVideoId,
                    keyPoint: 'Variable declarations',
                    cognitiveLoad: 3
                }
            ],
            totalQuestions: 1
        });

        await testQuizPool.save();
        console.log('✅ Quiz Pool created:', testQuizPool._id);

        // Test 3: Create a Quiz Session
        console.log('\n🎯 Test 3: Creating Quiz Session');

        const mockUserId = new mongoose.Types.ObjectId();

        const testQuizSession = new QuizSession({
            userId: mockUserId,
            originalVideoId: mockVideoId,
            sessionType: 'intermediate',
            sessionNumber: 1,
            microVideoIds: [mockMicroVideoId],
            totalQuestions: 1,
            questions: testQuizPool.questions // Use same question
        });

        await testQuizSession.save();
        console.log('✅ Quiz Session created:', testQuizSession.sessionId);

        // Test 4: Test Answer Submission
        console.log('\n✍️ Test 4: Testing Answer Submission');

        const questionId = testQuizSession.questions[0].questionId;

        // Submit wrong answer first
        const wrongResult = testQuizSession.submitAnswer(questionId, 'A', 30);
        console.log('Wrong answer result:', wrongResult);

        // Use hint
        const hint = testQuizSession.useHint(questionId);
        console.log('Hint used:', hint);

        // Submit correct answer (retry)
        const correctResult = testQuizSession.submitAnswer(questionId, 'C', 15, true);
        console.log('Correct answer result:', correctResult);

        await testQuizSession.save();

        // Test 5: Check Virtual Properties
        console.log('\n📊 Test 5: Virtual Properties');
        console.log('Progress percentage:', testQuizSession.progressPercentage);
        console.log('Current accuracy:', testQuizSession.currentAccuracy);
        console.log('Performance:', testQuizSession.performance);

        // Test 6: Static Methods
        console.log('\n🔍 Test 6: Static Methods');

        const foundSession = await QuizSession.findActiveSession(mockUserId, mockVideoId);
        console.log('Found active session:', foundSession ? foundSession.sessionId : 'None');

        console.log('\n✅ All Quiz Model Tests Completed Successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
};

// Cleanup test data
const cleanup = async () => {
    try {
        await QuizSession.deleteMany({});
        await QuizPool.deleteMany({});
        console.log('🧹 Test data cleaned up');
    } catch (error) {
        console.error('❌ Cleanup failed:', error);
    }
};

// Run tests
const runTests = async () => {
    await connectDB();
    await cleanup(); // Clean before testing
    await testQuizModels();
    await cleanup(); // Clean after testing

    await mongoose.connection.close();
    console.log('👋 Database connection closed');
    process.exit(0);
};

// Handle process termination
process.on('SIGINT', async () => {
    await cleanup();
    await mongoose.connection.close();
    process.exit(0);
});

runTests();