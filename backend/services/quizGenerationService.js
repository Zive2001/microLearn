// services/quizGenerationService.js
const openaiService = require('./openaiService');

class QuizGenerationService {
    constructor() {
        this.questionsPerMicroVideo = 3; // Generate 3 questions per micro-video
        this.maxRetries = 2;
    }

    /**
     * Generate quiz questions from CLT-bLM script using OpenAI
     * @param {Object} microVideo - MicroVideo document with CLT-bLM script
     * @param {number} questionCount - Number of questions to generate (default: 3)
     * @returns {Array} Generated quiz questions
     */
    async generateQuestionsFromCLTScript(microVideo, questionCount = 3) {
        try {
            const cltScript = microVideo.cltBlmScript;
            const timeRange = microVideo.timeRange;

            if (!cltScript || !cltScript.educationalScript) {
                throw new Error('No CLT-bLM educational script found for this micro-video');
            }

            console.log(`🧠 Generating ${questionCount} quiz questions for: ${microVideo.title}`);

            const prompt = this.buildQuizGenerationPrompt(microVideo, questionCount);

            const response = await openaiService.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert educational assessment creator who generates high-quality quiz questions based on micro-learning content. Always respond with valid JSON only.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 1200,
                temperature: 0.7
            });

            const content = response.choices[0].message.content.trim();

            // Parse the JSON response
            let questionsData;
            try {
                questionsData = JSON.parse(content);
            } catch (parseError) {
                console.error('JSON parsing error:', parseError);
                console.error('Raw content:', content);
                throw new Error('Invalid JSON response from OpenAI');
            }

            // Validate and format questions
            const formattedQuestions = this.validateAndFormatQuestions(
                questionsData.questions,
                microVideo
            );

            console.log(`✅ Generated ${formattedQuestions.length} quiz questions successfully`);
            return formattedQuestions;

        } catch (error) {
            console.error('Error generating quiz questions:', error);

            // Fallback: try simpler prompt or throw error
            if (error.message.includes('JSON')) {
                console.log('🔄 Retrying with simpler prompt...');
                return await this.generateSimpleQuestions(microVideo, questionCount);
            }

            throw new Error(`Failed to generate quiz questions: ${error.message}`);
        }
    }

    /**
     * Build comprehensive prompt for quiz question generation
     * @param {Object} microVideo - MicroVideo document
     * @param {number} questionCount - Number of questions needed
     * @returns {string} Complete prompt for OpenAI
     */
    buildQuizGenerationPrompt(microVideo, questionCount) {
        const cltScript = microVideo.cltBlmScript;

        return `You are creating quiz questions for a micro-learning video segment. Generate ${questionCount} high-quality multiple-choice questions based on this educational content.

MICRO-VIDEO DETAILS:
Title: ${microVideo.title}
Duration: ${Math.floor(microVideo.timeRange.duration / 60)} minutes
Difficulty Level: ${cltScript.difficulty}
Cognitive Load: ${cltScript.cognitiveLoad}/10

LEARNING CONTENT:
Learning Objective: ${cltScript.learningObjective}

Key Points:
${cltScript.keypoints.map((point, idx) => `${idx + 1}. ${point}`).join('\n')}

Educational Script:
${cltScript.educationalScript}

Practical Example: ${cltScript.practicalExample}

QUESTION REQUIREMENTS:
- Generate exactly ${questionCount} questions
- Each question should test understanding of the learning content
- Questions should match the ${cltScript.difficulty} difficulty level
- Include questions about key concepts, practical applications, and learning objectives
- Provide helpful hints for wrong answers (not too obvious)
- Create plausible distractors that test common misconceptions
- Questions should be clear, concise, and unambiguous

IMPORTANT - ANSWER RANDOMIZATION:
- RANDOMIZE the position of the correct answer across all questions
- The correct answer should be in position A, B, C, or D randomly
- DO NOT always put the correct answer in position A
- Vary the correct answer position for each question to prevent pattern recognition
- After placing options, set "correctAnswer" to the letter (A, B, C, or D) where you placed the correct option

Respond with valid JSON in this exact format:
{
  "questions": [
    {
      "question": "Clear, specific question about the learning content",
      "options": {
        "A": "First option",
        "B": "Second option",
        "C": "Third option",
        "D": "Fourth option"
      },
      "correctAnswer": "B",
      "explanation": "Why this answer is correct and relates to the learning objective",
      "hint": "Helpful hint for learners who get it wrong (not too obvious)",
      "keyPoint": "Which key point this question tests",
      "questionType": "concept|application|objective"
    }
  ],
  "metadata": {
    "difficulty": "${cltScript.difficulty}",
    "totalQuestions": ${questionCount},
    "cognitiveLoad": ${cltScript.cognitiveLoad}
  }
}

Note: In the example above, "correctAnswer" is "B" - but YOU must randomize this for each question (A, B, C, or D).

Focus on creating questions that reinforce the learning objective and test practical understanding, not just memorization.`;
    }
    

    /**
     * Validate and format questions from OpenAI response
     * @param {Array} questions - Raw questions from OpenAI
     * @param {Object} microVideo - MicroVideo document
     * @returns {Array} Formatted and validated questions
     */
    validateAndFormatQuestions(questions, microVideo) {
        const formattedQuestions = [];

        questions.forEach((q, index) => {
            try {
                // Validate required fields
                if (!q.question || !q.options || !q.correctAnswer || !q.explanation) {
                    console.warn(`Question ${index + 1} missing required fields, skipping`);
                    return;
                }

                // Validate options
                if (!q.options.A || !q.options.B || !q.options.C || !q.options.D) {
                    console.warn(`Question ${index + 1} missing option fields, skipping`);
                    return;
                }

                // Validate correct answer
                if (!['A', 'B', 'C', 'D'].includes(q.correctAnswer)) {
                    console.warn(`Question ${index + 1} has invalid correct answer, skipping`);
                    return;
                }

                const formattedQuestion = {
                    questionId: `q_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                    question: q.question.trim(),
                    options: {
                        A: q.options.A.trim(),
                        B: q.options.B.trim(),
                        C: q.options.C.trim(),
                        D: q.options.D.trim()
                    },
                    correctAnswer: q.correctAnswer.toUpperCase(),
                    explanation: q.explanation.trim(),
                    hint: q.hint ? q.hint.trim() : 'Think about the main concepts covered in this video segment.',
                    difficulty: microVideo.cltBlmScript.difficulty,
                    sourceVideoId: microVideo.originalVideoId,
                    sourceMicroVideoId: microVideo._id,
                    keyPoint: q.keyPoint || microVideo.cltBlmScript.keypoints[0] || 'General concept',
                    cognitiveLoad: microVideo.cltBlmScript.cognitiveLoad || 5,
                    questionType: q.questionType || 'concept',
                    timesUsed: 0,
                    correctRate: 0
                };

                // Randomize answer positions to prevent pattern recognition
                const randomizedQuestion = this.randomizeAnswerPositions(formattedQuestion);
                formattedQuestions.push(randomizedQuestion);

            } catch (error) {
                console.error(`Error formatting question ${index + 1}:`, error);
            }
        });

        return formattedQuestions;
    }

    /**
     * Randomize answer positions to prevent users from recognizing patterns
     * @param {Object} question - Formatted question with options
     * @returns {Object} Question with randomized answer positions
     */
    randomizeAnswerPositions(question) {
        // Extract all options with their labels
        const optionEntries = [
            { label: 'A', text: question.options.A },
            { label: 'B', text: question.options.B },
            { label: 'C', text: question.options.C },
            { label: 'D', text: question.options.D }
        ];

        // Find which option is the correct answer
        const correctOption = optionEntries.find(opt => opt.label === question.correctAnswer);
        if (!correctOption) {
            console.warn('Correct answer not found, returning question unchanged');
            return question;
        }

        // Shuffle the options using Fisher-Yates algorithm
        for (let i = optionEntries.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [optionEntries[i], optionEntries[j]] = [optionEntries[j], optionEntries[i]];
        }

        // Rebuild the options object with shuffled positions
        const shuffledOptions = {};
        const labels = ['A', 'B', 'C', 'D'];
        let newCorrectAnswer = null;

        optionEntries.forEach((entry, index) => {
            const newLabel = labels[index];
            shuffledOptions[newLabel] = entry.text;

            // Track where the correct answer moved to
            if (entry.text === correctOption.text) {
                newCorrectAnswer = newLabel;
            }
        });

        return {
            ...question,
            options: shuffledOptions,
            correctAnswer: newCorrectAnswer
        };
    }

    /**
     * Fallback: Generate simpler questions with basic prompt
     * @param {Object} microVideo - MicroVideo document
     * @param {number} questionCount - Number of questions needed
     * @returns {Array} Simple generated questions
     */
    async generateSimpleQuestions(microVideo, questionCount) {
        try {
            const simplePrompt = `Create ${questionCount} multiple-choice quiz questions about: ${microVideo.title}

Learning Objective: ${microVideo.cltBlmScript.learningObjective}
Key Points: ${microVideo.cltBlmScript.keypoints.join(', ')}

Return only valid JSON:
{
  "questions": [
    {
      "question": "Question text?",
      "options": {"A": "Option A", "B": "Option B", "C": "Option C", "D": "Option D"},
      "correctAnswer": "A",
      "explanation": "Explanation text",
      "hint": "Hint text"
    }
  ]
}`;

            const response = await openaiService.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: simplePrompt }],
                max_tokens: 800,
                temperature: 0.5
            });

            const questionsData = JSON.parse(response.choices[0].message.content.trim());
            return this.validateAndFormatQuestions(questionsData.questions, microVideo);

        } catch (error) {
            console.error('Fallback question generation failed:', error);
            throw new Error('Unable to generate quiz questions');
        }
    }

    /**
     * Generate questions for multiple micro-videos in batch
     * @param {Array} microVideos - Array of MicroVideo documents
     * @param {number} questionsPerVideo - Questions per micro-video
     * @returns {Object} Questions organized by micro-video ID
     */
    async batchGenerateQuestions(microVideos, questionsPerVideo = 3) {
        const questionsByMicroVideo = {};

        console.log(`📚 Batch generating questions for ${microVideos.length} micro-videos`);

        for (const microVideo of microVideos) {
            try {
                const questions = await this.generateQuestionsFromCLTScript(
                    microVideo,
                    questionsPerVideo
                );

                questionsByMicroVideo[microVideo._id.toString()] = questions;

                // Small delay to avoid rate limits
                await this.delay(500);

            } catch (error) {
                console.error(`Failed to generate questions for micro-video ${microVideo._id}:`, error);
                questionsByMicroVideo[microVideo._id.toString()] = [];
            }
        }

        return questionsByMicroVideo;
    }

    /**
     * Generate questions specifically for final quiz (prioritize difficult concepts)
     * @param {Array} microVideos - All micro-videos for the final quiz
     * @param {Object} userPerformanceData - User's previous performance (optional)
     * @returns {Array} Questions optimized for final assessment
     */
    async generateFinalQuizQuestions(microVideos, userPerformanceData = null) {
        try {
            console.log('🏁 Generating final quiz questions...');

            // Prioritize micro-videos based on difficulty and user performance
            const prioritizedMicroVideos = this.prioritizeMicroVideosForFinal(
                microVideos,
                userPerformanceData
            );

            // Generate more questions from higher priority micro-videos
            const allQuestions = [];

            for (let i = 0; i < prioritizedMicroVideos.length; i++) {
                const microVideo = prioritizedMicroVideos[i];
                const questionCount = i < 3 ? 2 : 1; // More questions from top 3 priority videos

                try {
                    const questions = await this.generateQuestionsFromCLTScript(
                        microVideo,
                        questionCount
                    );

                    // Mark questions as final quiz type
                    questions.forEach(q => {
                        q.questionType = 'final';
                        q.priority = i + 1;
                    });

                    allQuestions.push(...questions);
                    await this.delay(300);

                } catch (error) {
                    console.error(`Error generating final quiz questions for ${microVideo.title}:`, error);
                }
            }

            // Limit to 10 questions max, prioritize by difficulty and user performance
            return allQuestions.slice(0, 10);

        } catch (error) {
            console.error('Error generating final quiz questions:', error);
            throw error;
        }
    }

    /**
     * Prioritize micro-videos for final quiz based on difficulty and performance
     * @param {Array} microVideos - All micro-videos
     * @param {Object} userPerformanceData - User's performance data
     * @returns {Array} Prioritized micro-videos
     */
    prioritizeMicroVideosForFinal(microVideos, userPerformanceData) {
        return microVideos.sort((a, b) => {
            // Priority factors:
            // 1. Higher cognitive load = higher priority
            // 2. User performed poorly = higher priority
            // 3. More key points = higher priority

            const aCognitiveLoad = a.cltBlmScript.cognitiveLoad || 5;
            const bCognitiveLoad = b.cltBlmScript.cognitiveLoad || 5;

            const aKeyPointsCount = a.cltBlmScript.keypoints?.length || 1;
            const bKeyPointsCount = b.cltBlmScript.keypoints?.length || 1;

            // User performance factor (if available)
            let aPerformanceFactor = 0;
            let bPerformanceFactor = 0;

            if (userPerformanceData) {
                aPerformanceFactor = userPerformanceData[a._id.toString()]?.incorrectCount || 0;
                bPerformanceFactor = userPerformanceData[b._id.toString()]?.incorrectCount || 0;
            }

            const aScore = aCognitiveLoad + aKeyPointsCount + aPerformanceFactor;
            const bScore = bCognitiveLoad + bKeyPointsCount + bPerformanceFactor;

            return bScore - aScore; // Descending order (highest priority first)
        });
    }

    /**
     * Utility function to add delay
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} Promise that resolves after delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get question statistics and quality metrics
     * @param {Array} questions - Generated questions
     * @returns {Object} Statistics about question quality
     */
    getQuestionStats(questions) {
        const difficulties = {};
        const questionTypes = {};
        const keyPoints = {};

        questions.forEach(q => {
            difficulties[q.difficulty] = (difficulties[q.difficulty] || 0) + 1;
            questionTypes[q.questionType] = (questionTypes[q.questionType] || 0) + 1;
            keyPoints[q.keyPoint] = (keyPoints[q.keyPoint] || 0) + 1;
        });

        return {
            totalQuestions: questions.length,
            averageCognitiveLoad: questions.reduce((sum, q) => sum + q.cognitiveLoad, 0) / questions.length,
            difficultyDistribution: difficulties,
            questionTypeDistribution: questionTypes,
            keyPointCoverage: keyPoints,
            qualityScore: this.calculateQualityScore(questions)
        };
    }

    /**
     * Calculate quality score for generated questions
     * @param {Array} questions - Generated questions
     * @returns {number} Quality score (1-10)
     */
    calculateQualityScore(questions) {
        if (questions.length === 0) return 0;

        let score = 5; // Base score

        // Bonus for variety in question types
        const uniqueTypes = new Set(questions.map(q => q.questionType)).size;
        score += Math.min(uniqueTypes, 3) * 0.5;

        // Bonus for good key point coverage
        const uniqueKeyPoints = new Set(questions.map(q => q.keyPoint)).size;
        score += Math.min(uniqueKeyPoints, 3) * 0.5;

        // Bonus for appropriate difficulty distribution
        const difficulties = questions.map(q => q.difficulty);
        const hasVariety = new Set(difficulties).size > 1;
        if (hasVariety) score += 1;

        return Math.min(Math.round(score * 10) / 10, 10);
    }
}

module.exports = new QuizGenerationService();