require('dotenv').config(); // Load environment variables
const OpenAI = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Difficulty levels with parameters
const DIFFICULTY_LEVELS = {
    beginner: {
        level: 'beginner',
        description: 'basic concepts and fundamentals',
        complexity: 'simple',
        weight: 1
    },
    intermediate: {
        level: 'intermediate',
        description: 'practical applications and problem-solving',
        complexity: 'moderate',
        weight: 2
    },
    advanced: {
        level: 'advanced',
        description: 'complex scenarios and best practices',
        complexity: 'challenging',
        weight: 3
    }
};

// Topic-specific contexts for better question generation
const TOPIC_CONTEXTS = {
    javascript: {
        focus: 'JavaScript programming language, ES6+ features, DOM manipulation, async programming',
        examples: 'variables, functions, objects, arrays, promises, async/await',
        applications: 'web development, frontend programming, backend with Node.js'
    },
    react: {
        focus: 'React.js library, components, hooks, state management, JSX',
        examples: 'useState, useEffect, props, components, event handling',
        applications: 'building user interfaces, single page applications, frontend development'
    },
    typescript: {
        focus: 'TypeScript static typing, interfaces, types, generics',
        examples: 'type annotations, interfaces, union types, generics',
        applications: 'type-safe JavaScript development, large-scale applications'
    },
    nodejs: {
        focus: 'Node.js server-side development, APIs, Express.js, databases',
        examples: 'HTTP servers, REST APIs, middleware, file operations',
        applications: 'backend development, server-side programming, API development'
    },
    python: {
        focus: 'Python programming language, data structures, OOP, libraries',
        examples: 'lists, dictionaries, functions, classes, modules',
        applications: 'web development, data science, automation, scripting'
    }
};

class OpenAIService {
    constructor() {
        this.model = 'gpt-3.5-turbo';
        this.maxTokens = 1000;
        this.temperature = 0.7;
        this.openai = openai; // Expose the OpenAI client
    }

    /**
     * Generate a question for assessment
     * @param {string} topic - The topic to generate question for
     * @param {string} difficulty - The difficulty level
     * @param {Array} previousQuestions - Previously asked questions to avoid repetition
     * @returns {Object} Generated question object
     */
    async generateQuestion(topic, difficulty = 'intermediate', previousQuestions = []) {
        try {
            const difficultyConfig = DIFFICULTY_LEVELS[difficulty.toLowerCase()];
            const topicContext = TOPIC_CONTEXTS[topic.toLowerCase()] || {
                focus: `${topic} programming concepts and practices`,
                examples: 'fundamental concepts, syntax, best practices',
                applications: 'software development, programming'
            };

            // Create context about previous questions to avoid repetition
            const previousQuestionsContext = previousQuestions.length > 0
                ? `\n\nAvoid asking questions similar to these previously asked questions:\n${previousQuestions.map(q => `- ${q.question}`).join('\n')}`
                : '';

            const prompt = `You are an expert technical interviewer creating assessment questions for ${topic}.

Topic Context:
- Focus: ${topicContext.focus}
- Key concepts: ${topicContext.examples}
- Applications: ${topicContext.applications}

Question Requirements:
- Difficulty Level: ${difficultyConfig.level} (${difficultyConfig.description})
- Complexity: ${difficultyConfig.complexity}
- Topic: ${topic}
- Question Type: Multiple choice with 4 options
- Practical and relevant to real-world scenarios
- Clear and unambiguous wording
- One correct answer, three plausible distractors${previousQuestionsContext}

Generate a ${difficultyConfig.level} level multiple-choice question about ${topic}. The question should test ${difficultyConfig.description} and be suitable for someone learning ${topic}.

IMPORTANT: Randomize the position of the correct answer. Do NOT always use "A" as the correct answer.

Respond with a JSON object in this exact format:
{
  "question": "Your question here",
  "options": {
    "A": "First option",
    "B": "Second option",
    "C": "Third option",
    "D": "Fourth option"
  },
  "correctAnswer": "B",
  "explanation": "Brief explanation of why this answer is correct",
  "difficulty": "${difficulty}",
  "topic": "${topic}",
  "estimatedTime": 60
}

CRITICAL: The correctAnswer field should vary between A, B, C, and D randomly. Mix up which option is correct to ensure fair assessment. Ensure the JSON is valid and complete.`;

            const response = await openai.chat.completions.create({
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert technical educator who creates high-quality assessment questions. Always respond with valid JSON only.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: this.maxTokens,
                temperature: this.temperature,
            });

            const content = response.choices[0].message.content.trim();

            // Parse the JSON response
            let questionData;
            try {
                questionData = JSON.parse(content);
            } catch (parseError) {
                console.error('JSON parsing error:', parseError);
                console.error('Raw content:', content);
                throw new Error('Invalid JSON response from OpenAI');
            }

            // Validate the response structure
            const requiredFields = ['question', 'options', 'correctAnswer', 'explanation'];
            for (const field of requiredFields) {
                if (!questionData[field]) {
                    throw new Error(`Missing required field: ${field}`);
                }
            }

            // Validate correct answer is valid option
            if (!['A', 'B', 'C', 'D'].includes(questionData.correctAnswer)) {
                throw new Error(`Invalid correct answer: ${questionData.correctAnswer}. Must be A, B, C, or D.`);
            }

            // If AI still defaulted to 'A', randomize the answer position
            if (questionData.correctAnswer === 'A' && Math.random() < 0.7) { // 70% chance to randomize
                const newCorrectAnswer = ['B', 'C', 'D'][Math.floor(Math.random() * 3)];
                const correctContent = questionData.options[questionData.correctAnswer];
                const newContent = questionData.options[newCorrectAnswer];

                // Swap the options
                questionData.options[questionData.correctAnswer] = newContent;
                questionData.options[newCorrectAnswer] = correctContent;
                questionData.correctAnswer = newCorrectAnswer;

                console.log(`🔀 Randomized answer position from A to ${newCorrectAnswer}`);
            }

            // Add metadata
            questionData.generatedAt = new Date();
            questionData.model = this.model;
            questionData.difficultyWeight = difficultyConfig.weight;

            return questionData;

        } catch (error) {
            console.error('Error generating question:', error);
            throw new Error(`Failed to generate question: ${error.message}`);
        }
    }

    /**
     * Evaluate user's answer using GPT for more nuanced feedback
     * @param {Object} question - The question object
     * @param {string} userAnswer - User's selected answer (A, B, C, D)
     * @param {string} userExplanation - Optional: User's explanation (for advanced assessment)
     * @returns {Object} Evaluation result
     */
    async evaluateAnswer(question, userAnswer, userExplanation = null) {
        try {
            const isCorrect = userAnswer.toUpperCase() === question.correctAnswer.toUpperCase();

            // Basic evaluation
            const basicResult = {
                isCorrect,
                correctAnswer: question.correctAnswer,
                userAnswer: userAnswer.toUpperCase(),
                points: isCorrect ? question.difficultyWeight || 1 : 0,
                explanation: question.explanation
            };

            // If no explanation provided, return basic result
            if (!userExplanation) {
                return basicResult;
            }

            // Enhanced evaluation with GPT for explanation analysis
            const evaluationPrompt = `Evaluate this student's answer and explanation:

Question: ${question.question}
Correct Answer: ${question.correctAnswer} - ${question.options[question.correctAnswer]}
Student's Answer: ${userAnswer} - ${question.options[userAnswer]}
Student's Explanation: ${userExplanation}

Even if the student chose the wrong option, if their explanation shows good understanding of the concept, they should receive partial credit.

Respond with JSON:
{
  "basicScore": ${basicResult.points},
  "partialCredit": 0.5,
  "totalScore": 1.0,
  "feedback": "Detailed feedback about their understanding",
  "conceptsUnderstood": ["concept1", "concept2"],
  "conceptsMissed": ["concept3"],
  "improvementSuggestions": "What they should focus on next"
}`;

            const response = await openai.chat.completions.create({
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert technical educator who provides fair and constructive feedback.'
                    },
                    {
                        role: 'user',
                        content: evaluationPrompt
                    }
                ],
                max_tokens: 500,
                temperature: 0.3,
            });

            const enhancedEvaluation = JSON.parse(response.choices[0].message.content.trim());

            return {
                ...basicResult,
                enhanced: enhancedEvaluation,
                finalScore: enhancedEvaluation.totalScore
            };

        } catch (error) {
            console.error('Error evaluating answer:', error);
            // Return basic evaluation if enhanced evaluation fails
            return {
                isCorrect: userAnswer.toUpperCase() === question.correctAnswer.toUpperCase(),
                correctAnswer: question.correctAnswer,
                userAnswer: userAnswer.toUpperCase(),
                points: userAnswer.toUpperCase() === question.correctAnswer.toUpperCase() ?
                    (question.difficultyWeight || 1) : 0,
                explanation: question.explanation,
                error: 'Enhanced evaluation failed, using basic evaluation'
            };
        }
    }

    /**
     * Generate personalized learning recommendations based on assessment results
     * @param {Object} assessmentResults - Complete assessment results
     * @returns {Object} Learning recommendations
     */
    async generateLearningRecommendations(assessmentResults) {
        try {
            const { topic, score, level, weakAreas, strongAreas } = assessmentResults;

            const prompt = `Based on this assessment result, provide personalized learning recommendations:

Topic: ${topic}
Level Determined: ${level}
Score: ${score}%
Strong Areas: ${strongAreas.join(', ')}
Weak Areas: ${weakAreas.join(', ')}

Provide specific, actionable learning recommendations in JSON format:
{
  "nextSteps": ["specific action 1", "specific action 2"],
  "recommendedTopics": ["related topic 1", "related topic 2"],
  "studyPlan": {
    "week1": "Focus area for week 1",
    "week2": "Focus area for week 2",
    "week3": "Focus area for week 3"
  },
  "resources": {
    "beginner": ["resource for beginners"],
    "intermediate": ["resource for intermediate"],
    "advanced": ["resource for advanced"]
  },
  "practiceAreas": ["hands-on practice suggestion 1", "hands-on practice suggestion 2"]
}`;

            const response = await openai.chat.completions.create({
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert learning advisor who creates personalized study plans.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 800,
                temperature: 0.7,
            });

            return JSON.parse(response.choices[0].message.content.trim());

        } catch (error) {
            console.error('Error generating recommendations:', error);
            throw new Error(`Failed to generate recommendations: ${error.message}`);
        }
    }

    /**
     * Chunk transcript into manageable pieces for OpenAI processing
     * @param {string} transcript - Full transcript
     * @param {number} maxChunkSize - Maximum characters per chunk
     * @returns {Array} Array of transcript chunks
     */
    chunkTranscript(transcript, maxChunkSize = 2000) {
        if (transcript.length <= maxChunkSize) {
            return [transcript];
        }

        const chunks = [];
        const sentences = transcript.split(/[.!?]+/);
        let currentChunk = '';

        for (const sentence of sentences) {
            const trimmedSentence = sentence.trim();
            if (!trimmedSentence) continue;

            // If adding this sentence would exceed limit, save current chunk
            if (currentChunk.length + trimmedSentence.length + 1 > maxChunkSize) {
                if (currentChunk) {
                    chunks.push(currentChunk.trim());
                    currentChunk = '';
                }
            }

            currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
        }

        // Add the last chunk
        if (currentChunk) {
            chunks.push(currentChunk.trim());
        }

        console.log(`📝 Chunked transcript: ${transcript.length} chars → ${chunks.length} chunks`);
        return chunks;
    }

    /**
     * Generate CLT-bLM analysis for educational content creation
     * @param {string} transcript - Video transcript
     * @param {string} topic - Content topic
     * @param {number} duration - Video duration in seconds
     * @returns {Object} CLT-bLM analysis with educational segments
     */
    async generateCLTAnalysis(transcript, topic, duration) {
        try {
            // Handle long transcripts by chunking
            const transcriptChunks = this.chunkTranscript(transcript, 1500);

            if (transcriptChunks.length === 1) {
                // Short transcript - process normally
                return await this.generateSingleCLTAnalysis(transcript, topic, duration);
            } else {
                // Long transcript - process in chunks
                return await this.generateChunkedCLTAnalysis(transcriptChunks, topic, duration);
            }

        } catch (error) {
            console.error('❌ Error in CLT analysis:', error);
            throw new Error(`Failed to generate CLT analysis: ${error.message}`);
        }
    }

    /**
     * Generate CLT analysis for single short transcript
     */
    async generateSingleCLTAnalysis(transcript, topic, duration) {
        const prompt = `You are an expert educational content creator. Create comprehensive educational shorts for this topic using CLT-bLM principles.

TOPIC: ${topic}
VIDEO CONTEXT: Educational content about ${topic}
TARGET DURATION: ${Math.floor(duration / 60)} minutes worth of content

REFERENCE CONTENT:
${transcript}

TASK: Create 3-5 educational micro-learning segments (5-8 minutes each) that cover essential ${topic} concepts:

1. **Cognitive Load Theory (CLT):**
   - ONE main concept per segment
   - Minimize extraneous information
   - Build from simple to complex

2. **Micro-Learning Principles:**
   - Focused learning objectives
   - Standalone segments
   - Practical, actionable content

3. **Educational Shorts Format:**
   - Engaging titles
   - Clear explanations
   - Real-world examples

Generate JSON response:
{
  "overallObjective": "What learners will master after all segments",
  "totalSegments": 4,
  "estimatedTotalDuration": 28,
  "segments": [
    {
      "segmentNumber": 1,
      "title": "Catchy educational title",
      "duration": 420,
      "learningObjective": "Specific skill/knowledge gained",
      "keyPoints": ["3-4 main concepts to cover"],
      "practicalExample": "Real-world use case",
      "cognitiveLoad": 4,
      "difficulty": "Beginner",
      "educationalScript": "Complete script for this segment (200-300 words)",
      "visualCues": ["What visuals/examples to show"]
    }
  ],
  "learningPath": "How segments connect for complete understanding"
}

Create educational shorts that are better than the original - more focused, clearer, and optimized for learning!`;

        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert educational content designer specializing in Cognitive Load Theory and micro-learning. Always respond with valid JSON only.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 2000,
            temperature: 0.7,
        });

        const content = response.choices[0].message.content.trim();

        // Parse the JSON response
        let analysisData;
        try {
            analysisData = JSON.parse(content);
        } catch (parseError) {
            console.error('❌ JSON parsing error:', parseError);
            console.error('Raw content:', content);
            throw new Error('Invalid JSON response from OpenAI CLT analysis');
        }

        // Validate response structure
        if (!analysisData.segments || !Array.isArray(analysisData.segments)) {
            throw new Error('Invalid CLT analysis structure: missing segments array');
        }

        console.log(`✅ OpenAI CLT-bLM Response received: ${analysisData.segments.length} segments generated`);

        return analysisData;

    }

    /**
     * Generate CLT analysis for chunked long transcript
     */
    async generateChunkedCLTAnalysis(transcriptChunks, topic, duration) {
        console.log(`🔄 Processing ${transcriptChunks.length} transcript chunks for ${topic}`);

        // Step 1: Analyze each chunk to extract key concepts
        const chunkAnalyses = [];
        for (let i = 0; i < transcriptChunks.length; i++) {
            console.log(`📝 Analyzing chunk ${i + 1}/${transcriptChunks.length}`);

            const chunkPrompt = `Extract key ${topic} concepts from this transcript chunk:

TRANSCRIPT CHUNK ${i + 1}:
${transcriptChunks[i]}

Extract only the most important ${topic} concepts, techniques, and examples. Respond in JSON:
{
  "keyConcepts": ["concept1", "concept2", "concept3"],
  "techniques": ["technique1", "technique2"],
  "examples": ["example1", "example2"],
  "difficulty": "Beginner/Intermediate/Advanced"
}`;

            try {
                const response = await openai.chat.completions.create({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        { role: 'system', content: 'You are an expert content analyzer. Extract key concepts only. Respond with valid JSON.' },
                        { role: 'user', content: chunkPrompt }
                    ],
                    max_tokens: 500,
                    temperature: 0.3,
                });

                const chunkAnalysis = JSON.parse(response.choices[0].message.content.trim());
                chunkAnalyses.push(chunkAnalysis);
            } catch (error) {
                console.log(`⚠️ Chunk ${i + 1} analysis failed, skipping`);
            }
        }

        // Step 2: Combine all concepts and create unified segments
        const allConcepts = chunkAnalyses.flatMap(chunk => chunk.keyConcepts || []);
        const allTechniques = chunkAnalyses.flatMap(chunk => chunk.techniques || []);
        const allExamples = chunkAnalyses.flatMap(chunk => chunk.examples || []);

        // Remove duplicates
        const uniqueConcepts = [...new Set(allConcepts)].slice(0, 10);
        const uniqueTechniques = [...new Set(allTechniques)].slice(0, 8);
        const uniqueExamples = [...new Set(allExamples)].slice(0, 8);

        // Step 3: Generate final educational segments based on extracted concepts
        const finalPrompt = `Create educational micro-learning segments for ${topic} using these extracted concepts:

KEY CONCEPTS: ${uniqueConcepts.join(', ')}
TECHNIQUES: ${uniqueTechniques.join(', ')}
EXAMPLES: ${uniqueExamples.join(', ')}

Create 3-5 educational segments (5-8 minutes each) that cover these concepts systematically.

Respond with JSON:
{
  "overallObjective": "What learners will master after all segments",
  "totalSegments": 4,
  "estimatedTotalDuration": 28,
  "segments": [
    {
      "segmentNumber": 1,
      "title": "Catchy educational title",
      "duration": 420,
      "learningObjective": "Specific skill/knowledge gained",
      "keyPoints": ["3-4 main concepts to cover"],
      "practicalExample": "Real-world use case",
      "cognitiveLoad": 4,
      "difficulty": "Beginner",
      "educationalScript": "Complete script for this segment (200-300 words)",
      "visualCues": ["What visuals/examples to show"]
    }
  ],
  "learningPath": "How segments connect for complete understanding"
}`;

        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: 'You are an expert educational content designer. Create structured learning segments. Respond with valid JSON only.' },
                { role: 'user', content: finalPrompt }
            ],
            max_tokens: 2000,
            temperature: 0.7,
        });

        const finalAnalysis = JSON.parse(response.choices[0].message.content.trim());

        console.log(`✅ Chunked analysis complete: ${finalAnalysis.segments?.length || 0} segments created from ${transcriptChunks.length} chunks`);

        return finalAnalysis;
    }

    /**
     * Generate response using OpenAI with custom prompt and options
     * @param {string} prompt - The prompt to send to OpenAI
     * @param {Object} options - OpenAI API options
     * @returns {Promise<string>} Generated response
     */
    async generateResponse(prompt, options = {}) {
        try {
            const {
                model = 'gpt-3.5-turbo',
                maxTokens = 1000,
                temperature = 0.7,
                systemMessage = 'You are a helpful assistant that provides detailed, structured responses.'
            } = options;

            const response = await openai.chat.completions.create({
                model: model,
                messages: [
                    { role: 'system', content: systemMessage },
                    { role: 'user', content: prompt }
                ],
                max_tokens: maxTokens,
                temperature: temperature
            });

            return response.choices[0].message.content.trim();

        } catch (error) {
            console.error('OpenAI generateResponse error:', error);
            throw new Error(`OpenAI API error: ${error.message}`);
        }
    }

    /**
     * Check OpenAI API health and quota
     * @returns {Object} API status
     */
    async checkAPIHealth() {
        try {
            const response = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: 'Hello' }],
                max_tokens: 10
            });

            return {
                status: 'healthy',
                model: 'gpt-3.5-turbo',
                responseTime: Date.now(),
                tokensUsed: response.usage?.total_tokens || 0
            };
        } catch (error) {
            return {
                status: 'error',
                error: error.message,
                timestamp: Date.now()
            };
        }
    }
}

module.exports = new OpenAIService();