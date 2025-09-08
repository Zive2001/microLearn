// services/openaiService.js
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

Respond with a JSON object in this exact format:
{
  "question": "Your question here",
  "options": {
    "A": "First option",
    "B": "Second option", 
    "C": "Third option",
    "D": "Fourth option"
  },
  "correctAnswer": "A",
  "explanation": "Brief explanation of why this answer is correct",
  "difficulty": "${difficulty}",
  "topic": "${topic}",
  "estimatedTime": 60
}

Ensure the JSON is valid and complete.`;

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