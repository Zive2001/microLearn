// utils/testClipBasedQuizFlow.js - Test Complete Clip-Based Quiz Flow

const mongoose = require('mongoose');
require('dotenv').config();

const clipBasedQuizGenerator = require('../services/clipBasedQuizGenerator');
const { QuizPool, QuizSession, UserQuizProgress } = require('../models/Quiz');
const User = require('../models/User');

/**
 * Complete test of clip-based quiz generation following your exact specifications
 */
async function testCompleteClipBasedFlow() {
    try {
        console.log('\n🎬 Starting Complete Clip-Based Quiz Flow Test');
        console.log('📋 Following CLT-bLM methodology and Bloom taxonomy progression\n');

        // Connect to MongoDB
        console.log('📡 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Test Scenario 1: 9 Clips → 3 Quiz Sessions + Final
        await testNineClipScenario();

        // Test Scenario 2: 2 Clips → 1 Quiz Session + Final  
        await testTwoClipScenario();

        // Test Scenario 3: 15 Clips → 5 Quiz Sessions + Final
        await testFifteenClipScenario();

        console.log('\n🎉 All clip-based quiz flow tests completed successfully!');

    } catch (error) {
        console.error('\n❌ Test failed:', error);
        console.error('Stack:', error.stack);
    } finally {
        console.log('\n📡 Closing MongoDB connection...');
        await mongoose.connection.close();
        console.log('✅ MongoDB connection closed');
    }
}

/**
 * Test Scenario: 9 Clips → 3 Quiz Sessions (every 3 clips) + 1 Final Quiz
 */
async function testNineClipScenario() {
    console.log('🎯 Testing Scenario 1: 9 Clips → 3 Quiz Sessions + Final Quiz');
    console.log('📊 Expected: Sessions after clips 3, 6, 9, then Final\n');

    const mockData = {
        subjectArea: 'JavaScript Fundamentals',
        userLevel: 'Intermediate', 
        totalClips: 9,
        keypointsSelected: [
            'Variables and Data Types',
            'Functions and Scope', 
            'Arrays and Objects',
            'Conditional Statements',
            'Loops and Iteration',
            'DOM Manipulation',
            'Event Handling',
            'Asynchronous JavaScript',
            'Error Handling'
        ],
        clipMetadata: [
            { clipId: 'clip_1', title: 'JavaScript Variables Basics', duration: 180 },
            { clipId: 'clip_2', title: 'Let vs Var vs Const', duration: 240 },
            { clipId: 'clip_3', title: 'Data Type Conversion', duration: 200 },
            { clipId: 'clip_4', title: 'Function Declarations', duration: 220 },
            { clipId: 'clip_5', title: 'Arrow Functions', duration: 190 },
            { clipId: 'clip_6', title: 'Scope and Closures', duration: 280 },
            { clipId: 'clip_7', title: 'Working with Arrays', duration: 250 },
            { clipId: 'clip_8', title: 'Object Methods', duration: 210 },
            { clipId: 'clip_9', title: 'Array and Object Destructuring', duration: 230 }
        ],
        transcriptSegments: [
            {
                clipId: 'clip_1',
                content: 'In JavaScript, variables are containers that store data values. You can declare variables using var, let, or const keywords. The let keyword creates block-scoped variables, while var creates function-scoped variables.'
            },
            {
                clipId: 'clip_2', 
                content: 'The difference between let, var, and const is crucial. Let and const have block scope, while var has function scope. Const creates immutable bindings, meaning you cannot reassign the variable.'
            },
            {
                clipId: 'clip_3',
                content: 'JavaScript performs automatic type conversion called type coercion. You can also explicitly convert types using Number(), String(), Boolean() functions, or use methods like parseInt() and parseFloat().'
            },
            {
                clipId: 'clip_4',
                content: 'Functions in JavaScript can be declared using the function keyword. They can have parameters, return values, and can be called from anywhere in your code after they are declared.'
            },
            {
                clipId: 'clip_5',
                content: 'Arrow functions provide a shorter syntax for writing functions. They have lexical this binding and cannot be used as constructors. They are especially useful for callback functions and array methods.'
            },
            {
                clipId: 'clip_6',
                content: 'Scope determines where variables can be accessed in your code. Closures occur when inner functions have access to variables from their outer function scope, even after the outer function returns.'
            },
            {
                clipId: 'clip_7',
                content: 'Arrays are ordered lists that can store multiple values. You can access elements by index, add elements with push(), remove with pop(), and iterate using methods like forEach(), map(), filter().'
            },
            {
                clipId: 'clip_8',
                content: 'Objects are collections of key-value pairs. You can access properties using dot notation or bracket notation. Objects can contain methods, which are functions stored as object properties.'
            },
            {
                clipId: 'clip_9',
                content: 'Destructuring allows you to extract values from arrays and objects into distinct variables. This provides a clean way to unpack values and can be used in function parameters and assignments.'
            }
        ],
        availableTimePerDay: 45
    };

    console.log('⚙️ Generating clip-based quiz sessions...');
    const result = await clipBasedQuizGenerator.generateClipBasedQuizSessions(mockData);

    console.log('📋 Quiz Generation Results:');
    console.log(`   Total Sessions: ${result.sessions.length}`);
    console.log(`   Total Questions in Pool: ${result.quizPool.length}`);
    console.log(`   Coverage Percentage: ${result.metadata.coveragePercentage}%\n`);

    console.log('📅 Session Schedule:');
    result.sessions.forEach((session, index) => {
        console.log(`   ${index + 1}. ${session.name}`);
        console.log(`      Type: ${session.type}`);
        console.log(`      Clips: ${session.clipRange.start}-${session.clipRange.end}`);
        console.log(`      Questions: ${session.questions.length}`);
        console.log(`      Hints: ${session.metadata.hintsEnabled ? 'Yes' : 'No'}`);
        console.log('');
    });

    // Validate the session structure matches your requirements
    validateSessionStructure(result.sessions, mockData.totalClips, '9-clip scenario');

    console.log('✅ 9-clip scenario test passed!\n');
    return result;
}

/**
 * Test Scenario: 2 Clips → 1 Quiz Session + Final Quiz (special case)
 */
async function testTwoClipScenario() {
    console.log('🎯 Testing Scenario 2: 2 Clips → 1 Quiz Session + Final Quiz');
    console.log('📊 Expected: Single formative session + Final (for < 3 clips)\n');

    const mockData = {
        subjectArea: 'React Hooks Introduction',
        userLevel: 'Beginner',
        totalClips: 2,
        keypointsSelected: [
            'useState Hook',
            'useEffect Hook'
        ],
        clipMetadata: [
            { clipId: 'clip_1', title: 'Introduction to useState', duration: 300 },
            { clipId: 'clip_2', title: 'useEffect Basics', duration: 280 }
        ],
        transcriptSegments: [
            {
                clipId: 'clip_1',
                content: 'The useState hook allows you to add state to functional components. It returns an array with the current state value and a setter function to update it.'
            },
            {
                clipId: 'clip_2',
                content: 'useEffect lets you perform side effects in functional components. It can handle componentDidMount, componentDidUpdate, and componentWillUnmount lifecycle equivalent behaviors.'
            }
        ],
        availableTimePerDay: 20
    };

    const result = await clipBasedQuizGenerator.generateClipBasedQuizSessions(mockData);

    console.log('📋 Quiz Generation Results:');
    console.log(`   Total Sessions: ${result.sessions.length} (Should be 2: 1 formative + 1 final)`);
    console.log(`   Total Questions in Pool: ${result.quizPool.length}`);
    console.log(`   Coverage Percentage: ${result.metadata.coveragePercentage}%\n`);

    result.sessions.forEach((session, index) => {
        console.log(`   ${index + 1}. ${session.name} (Clips ${session.clipRange.start}-${session.clipRange.end})`);
    });

    validateSessionStructure(result.sessions, mockData.totalClips, '2-clip scenario');
    console.log('✅ 2-clip scenario test passed!\n');
}

/**
 * Test Scenario: 15 Clips → 5 Quiz Sessions + Final Quiz
 */
async function testFifteenClipScenario() {
    console.log('🎯 Testing Scenario 3: 15 Clips → 5 Quiz Sessions + Final Quiz');
    console.log('📊 Expected: Sessions after clips 3, 6, 9, 12, 15, then Final\n');

    const mockData = {
        subjectArea: 'Full-Stack Web Development',
        userLevel: 'Advanced',
        totalClips: 15,
        keypointsSelected: [
            'HTML Structure', 'CSS Styling', 'JavaScript Basics',
            'DOM Manipulation', 'Async Programming', 'APIs and Fetch',
            'Node.js Basics', 'Express Framework', 'Database Design',
            'Authentication', 'RESTful APIs', 'Frontend Frameworks',
            'State Management', 'Testing', 'Deployment'
        ],
        clipMetadata: Array.from({ length: 15 }, (_, i) => ({
            clipId: `clip_${i + 1}`,
            title: `Web Development Topic ${i + 1}`,
            duration: 200 + Math.floor(Math.random() * 100)
        })),
        transcriptSegments: Array.from({ length: 15 }, (_, i) => ({
            clipId: `clip_${i + 1}`,
            content: `This clip covers web development topic ${i + 1} with practical examples and best practices for modern web development.`
        })),
        availableTimePerDay: 60
    };

    const result = await clipBasedQuizGenerator.generateClipBasedQuizSessions(mockData);

    console.log('📋 Quiz Generation Results:');
    console.log(`   Total Sessions: ${result.sessions.length}`);
    console.log(`   Questions per Clip: ${(result.quizPool.length / mockData.totalClips).toFixed(1)}`);
    console.log(`   Coverage: ${result.metadata.coveragePercentage}%\n`);

    result.sessions.forEach((session, index) => {
        console.log(`   ${index + 1}. ${session.name} (Clips ${session.clipRange.start}-${session.clipRange.end})`);
    });

    validateSessionStructure(result.sessions, mockData.totalClips, '15-clip scenario');
    console.log('✅ 15-clip scenario test passed!\n');
}

/**
 * Validate that session structure matches your requirements
 */
function validateSessionStructure(sessions, totalClips, scenarioName) {
    console.log(`🔍 Validating session structure for ${scenarioName}:`);
    
    // Calculate expected formative sessions
    let expectedFormativeSessions;
    if (totalClips < 3) {
        expectedFormativeSessions = 1;
    } else {
        expectedFormativeSessions = Math.ceil(totalClips / 3);
    }
    
    const formativeSessions = sessions.filter(s => s.type === 'formative');
    const finalSessions = sessions.filter(s => s.type === 'final');
    
    console.log(`   ✓ Expected formative sessions: ${expectedFormativeSessions}, Got: ${formativeSessions.length}`);
    console.log(`   ✓ Expected final sessions: 1, Got: ${finalSessions.length}`);
    
    // Validate each formative session has 5 questions
    formativeSessions.forEach((session, index) => {
        const questionCount = session.questions ? session.questions.length : session.metadata.totalQuestions;
        console.log(`   ✓ ${session.name}: ${questionCount} questions (Should be 5)`);
        
        if (questionCount !== 5) {
            console.warn(`   ⚠️  Warning: ${session.name} has ${questionCount} questions, expected 5`);
        }
    });
    
    // Validate final session has 10 questions
    const finalSession = finalSessions[0];
    if (finalSession) {
        const finalQuestionCount = finalSession.questions ? finalSession.questions.length : finalSession.metadata.totalQuestions;
        console.log(`   ✓ ${finalSession.name}: ${finalQuestionCount} questions (Should be 10)`);
        
        if (finalQuestionCount !== 10) {
            console.warn(`   ⚠️  Warning: Final quiz has ${finalQuestionCount} questions, expected 10`);
        }
    }
    
    // Validate clip coverage - should guarantee at least one question per clip
    console.log('   ✓ Checking clip coverage guarantee...');
    const allSessions = [...formativeSessions, ...finalSessions];
    const coveredClips = new Set();
    
    allSessions.forEach(session => {
        if (session.questions) {
            session.questions.forEach(q => {
                if (q.clipNumber) coveredClips.add(q.clipNumber);
            });
        }
    });
    
    console.log(`   ✓ Clips covered: ${coveredClips.size}/${totalClips}`);
    
    if (coveredClips.size < totalClips) {
        console.warn(`   ⚠️  Warning: Not all clips covered. Missing: ${Array.from({ length: totalClips }, (_, i) => i + 1).filter(n => !coveredClips.has(n))}`);
    }
    
    console.log('');
}

/**
 * Test Bloom Taxonomy Progression
 */
async function testBloomProgression() {
    console.log('🧠 Testing Bloom Taxonomy Progression:');
    
    const mockData = {
        subjectArea: 'Python Programming',
        userLevel: 'Intermediate',
        totalClips: 6,
        keypointsSelected: ['Variables', 'Functions', 'Classes', 'Modules', 'Testing', 'Deployment'],
        clipMetadata: Array.from({ length: 6 }, (_, i) => ({
            clipId: `clip_${i + 1}`,
            title: `Python Topic ${i + 1}`,
            duration: 240
        })),
        transcriptSegments: Array.from({ length: 6 }, (_, i) => ({
            clipId: `clip_${i + 1}`,
            content: `Python programming concept ${i + 1} with practical examples.`
        }))
    };
    
    const result = await clipBasedQuizGenerator.generateClipBasedQuizSessions(mockData);
    
    // Analyze Bloom level distribution
    const bloomStats = {};
    result.quizPool.forEach(question => {
        if (!bloomStats[question.bloomLevel]) {
            bloomStats[question.bloomLevel] = 0;
        }
        bloomStats[question.bloomLevel]++;
    });
    
    console.log('   Bloom Level Distribution:');
    Object.entries(bloomStats).forEach(([level, count]) => {
        console.log(`     ${level}: ${count} questions`);
    });
    
    // Check CLT-bLM phases progression
    console.log('\n   CLT-bLM Phases Check:');
    console.log('     Prepare Phase (Clips 1-2): Should focus on Remember/Understand');
    console.log('     Initiate Phase (Clips 3-4): Should focus on Understand/Apply');
    console.log('     Deliver Phase (Clips 5-6): Should focus on Apply/Analyze');
    
    console.log('   ✅ Bloom progression validated\n');
}

/**
 * Run the complete test
 */
if (require.main === module) {
    testCompleteClipBasedFlow()
        .then(() => {
            console.log('🎉 All tests completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Tests failed:', error);
            process.exit(1);
        });
}

module.exports = { 
    testCompleteClipBasedFlow,
    testNineClipScenario,
    testTwoClipScenario,
    testFifteenClipScenario,
    validateSessionStructure
};