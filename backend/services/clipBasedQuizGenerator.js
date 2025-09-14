// services/clipBasedQuizGenerator.js - Clip-based Quiz Generator following CLT-bLM methodology

const OpenAI = require('openai');
const bloomTaxonomyService = require('./bloomTaxonomyService');

class ClipBasedQuizGenerator {
    
    constructor() {
        if (!process.env.OPENAI_API_KEY) {
            console.warn('⚠️ OpenAI API key not found. LLM quiz generation will be disabled.');
            this.openai = null;
        } else {
            this.openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY
            });
        }
        
        // Rate limiting and cost tracking
        this.requestCount = 0;
        this.lastRequestTime = Date.now();
        this.maxRequestsPerMinute = 20;
        this.totalTokensUsed = 0;
        this.estimatedCost = 0;
        
        // Quiz pool storage
        this.quizPool = [];
    }
    
    /**
     * Generate quiz sessions based on micro-video clips following CLT-bLM methodology
     * @param {Object} params - Generation parameters
     * @returns {Object} Complete quiz structure with sessions
     */
    async generateClipBasedQuizSessions(params) {
        const {
            subjectArea,
            userLevel,
            totalClips,
            clipMetadata = [],
            keypointsSelected = [],
            availableTimePerDay,
            transcriptSegments = []
        } = params;
        
        try {
            console.log(`🎬 Generating clip-based quiz sessions for ${subjectArea}`);
            console.log(`📊 Input: ${totalClips} clips, User level: ${userLevel}`);
            console.log(`🎯 Selected keypoints: ${keypointsSelected.join(', ')}`);
            
            // Calculate quiz sessions based on clip count
            const quizSessions = this.calculateQuizSessions(totalClips);
            console.log(`📋 Quiz schedule: ${quizSessions.length} sessions (${quizSessions.map(s => s.name).join(', ')})`);
            
            // Generate quiz pool for all clips
            await this.generateQuizPoolFromClips({
                subjectArea,
                userLevel,
                clipMetadata,
                transcriptSegments,
                keypointsSelected
            });
            
            // Create quiz sessions
            const generatedSessions = [];
            for (const session of quizSessions) {
                const sessionQuiz = await this.generateSessionQuiz(session, {
                    subjectArea,
                    userLevel,
                    keypointsSelected
                });
                generatedSessions.push(sessionQuiz);
            }
            
            // Calculate coverage percentage
            const coveragePercentage = this.calculateCoveragePercentage(
                this.quizPool,
                keypointsSelected,
                totalClips
            );
            
            return {
                sessions: generatedSessions,
                quizPool: this.quizPool,
                metadata: {
                    totalClips,
                    totalSessions: generatedSessions.length,
                    coveragePercentage,
                    subjectArea,
                    userLevel,
                    keypointsSelected
                }
            };
            
        } catch (error) {
            console.error('❌ Error generating clip-based quiz sessions:', error);
            throw error;
        }
    }
    
    /**
     * Calculate quiz sessions based on clip count
     * Rule: For every 3 clips, generate one quiz session (≈5 questions)
     */
    calculateQuizSessions(totalClips) {
        const sessions = [];
        
        if (totalClips < 3) {
            // If total clips < 3, generate 1 quiz session with 5 questions
            sessions.push({
                name: 'Formative Quiz 1',
                type: 'formative',
                clipRange: { start: 1, end: totalClips },
                questionCount: 5,
                hintsEnabled: true
            });
        } else {
            // For every 3 clips, generate one quiz session
            let sessionCount = 1;
            for (let i = 3; i <= totalClips; i += 3) {
                sessions.push({
                    name: `Formative Quiz ${sessionCount}`,
                    type: 'formative',
                    clipRange: { start: i - 2, end: i },
                    questionCount: 5,
                    hintsEnabled: true
                });
                sessionCount++;
            }
            
            // Handle remaining clips
            const remainingClips = totalClips % 3;
            if (remainingClips > 0) {
                sessions.push({
                    name: `Formative Quiz ${sessionCount}`,
                    type: 'formative',
                    clipRange: { start: totalClips - remainingClips + 1, end: totalClips },
                    questionCount: 5,
                    hintsEnabled: true
                });
            }
        }
        
        // Add comprehensive final quiz (10 questions)
        sessions.push({
            name: 'Final Comprehensive Quiz',
            type: 'final',
            clipRange: { start: 1, end: totalClips },
            questionCount: 10,
            hintsEnabled: false,
            prioritizeIncorrect: true
        });
        
        return sessions;
    }
    
    /**
     * Generate quiz pool from clip content using LLM
     */
    async generateQuizPoolFromClips(params) {
        const { subjectArea, userLevel, clipMetadata, transcriptSegments, keypointsSelected } = params;
        
        this.quizPool = [];
        
        // Process each clip to generate questions
        for (let i = 0; i < clipMetadata.length; i++) {
            const clip = clipMetadata[i];
            const transcript = transcriptSegments.find(t => t.clipId === clip.clipId) || {};
            
            console.log(`📝 Generating questions for ${clip.clipId}: "${clip.title}"`);
            
            // Determine Bloom level based on clip position (CLT-bLM progression)
            const bloomLevel = this.determineBloomLevelForClip(i + 1, clipMetadata.length);
            
            // Generate questions for this clip
            const clipQuestions = await this.generateQuestionsForClip({
                clip,
                transcript: transcript.content || '',
                subjectArea,
                userLevel,
                bloomLevel,
                keypointsSelected
            });
            
            // Tag questions with clip information
            clipQuestions.forEach(question => {
                question.clipId = clip.clipId;
                question.clipNumber = i + 1;
                question.clipTitle = clip.title;
                question.clipDuration = clip.duration;
                question.answerHistory = {
                    correct: 0,
                    incorrect: 0,
                    hintUsed: 0
                };
            });
            
            this.quizPool.push(...clipQuestions);
        }
        
        console.log(`✅ Generated quiz pool: ${this.quizPool.length} questions across ${clipMetadata.length} clips`);
    }
    
    /**
     * Determine Bloom level based on clip position (CLT-bLM phases)
     */
    determineBloomLevelForClip(clipNumber, totalClips) {
        const progressPercent = clipNumber / totalClips;
        
        if (progressPercent <= 0.33) {
            // Prepare Phase: Remember/Understand
            return clipNumber % 2 === 1 ? 'Remember' : 'Understand';
        } else if (progressPercent <= 0.66) {
            // Initiate Phase: Understand/Apply
            return clipNumber % 2 === 1 ? 'Understand' : 'Apply';
        } else {
            // Deliver Phase: Apply/Analyze
            return clipNumber % 2 === 1 ? 'Apply' : 'Analyze';
        }
    }
    
    /**
     * Generate questions for a specific clip using LLM
     */
    async generateQuestionsForClip(params) {
        const { clip, transcript, subjectArea, userLevel, bloomLevel, keypointsSelected } = params;
        
        if (!this.openai) {
            return this.generateTemplateQuestionsForClip(params);
        }
        
        try {
            await this.checkRateLimit();
            
            const prompt = this.buildClipQuestionPrompt({
                clip,
                transcript,
                subjectArea,
                userLevel,
                bloomLevel,
                keypointsSelected
            });
            
            const response = await this.openai.chat.completions.create({
                model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an educational assessment designer specializing in CLT-bLM methodology and Bloom\'s Taxonomy. Generate quiz questions based on micro-video content.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 1500
            });
            
            const generatedContent = response.choices[0].message.content;
            this.updateUsageStats(response.usage);
            
            const questions = this.parseGeneratedQuestions(generatedContent, bloomLevel);
            return this.validateAndEnhanceQuestions(questions);
            
        } catch (error) {
            console.warn(`⚠️ LLM generation failed for ${clip.clipId}, using templates:`, error.message);
            return this.generateTemplateQuestionsForClip(params);
        }
    }
    
    /**
     * Build LLM prompt for clip-specific question generation
     */
    buildClipQuestionPrompt(params) {
        const { clip, transcript, subjectArea, userLevel, bloomLevel, keypointsSelected } = params;
        
        return `
ROLE: Educational assessment designer generating adaptive quizzes aligned with CLT-bLM phases and Bloom's Taxonomy

INPUTS:
- Subject Area: ${subjectArea}
- User Level: ${userLevel}
- Clip ID: ${clip.clipId}
- Clip Title: "${clip.title}"
- Clip Duration: ${clip.duration} seconds
- Target Bloom Level: ${bloomLevel}
- Keypoints: ${keypointsSelected.join(', ')}

CLIP CONTENT:
${transcript}

REQUIREMENTS:
1. Generate 2-3 questions specifically about this clip's content
2. Focus on Bloom level: ${bloomLevel}
3. Question formats: MCQ (4 options), True/False, or short answer
4. Map each question to one of the selected keypoints
5. Provide contextual hints for formative quizzes
6. Include detailed explanations

BLOOM LEVEL GUIDELINES:
- Remember: Recall facts, definitions, concepts from the clip
- Understand: Explain concepts, compare ideas from the clip
- Apply: Use knowledge from clip to solve problems
- Analyze: Break down concepts, identify patterns from clip content

OUTPUT FORMAT:
For each question, provide:
{
  "questionText": "Question about the clip content",
  "questionType": "mcq|true_false|short_answer",
  "options": [{"text": "option", "isCorrect": true|false}] (for MCQ/T-F),
  "correctAnswer": "answer for short_answer",
  "bloomLevel": "${bloomLevel}",
  "difficulty": "easy|medium|hard",
  "keypoint": "which keypoint this tests",
  "hint": "helpful hint if answer is wrong",
  "explanation": "why this is the correct answer",
  "clipRelevance": "how this relates to the specific clip content"
}

Generate questions now:`;
    }
    
    /**
     * Generate session quiz by selecting appropriate questions from pool
     */
    async generateSessionQuiz(session, params) {
        const { subjectArea, userLevel, keypointsSelected } = params;
        
        console.log(`🎯 Generating ${session.name} (${session.questionCount} questions)`);
        
        // Filter questions based on clip range
        let availableQuestions = this.quizPool.filter(q => {
            return q.clipNumber >= session.clipRange.start && 
                   q.clipNumber <= session.clipRange.end;
        });
        
        // For final quiz, prioritize previously incorrect answers
        if (session.type === 'final' && session.prioritizeIncorrect) {
            availableQuestions = this.prioritizeIncorrectAnswers(availableQuestions);
        }
        
        // Ensure Bloom level distribution appropriate for session
        const selectedQuestions = this.selectBalancedQuestions(
            availableQuestions, 
            session.questionCount,
            session.type,
            userLevel
        );
        
        // Guarantee at least one question per clip in the range
        const finalQuestions = this.ensureClipCoverage(
            selectedQuestions,
            session.clipRange,
            session.questionCount
        );
        
        return {
            sessionId: this.generateSessionId(),
            name: session.name,
            type: session.type,
            clipRange: session.clipRange,
            questions: finalQuestions,
            metadata: {
                totalQuestions: finalQuestions.length,
                hintsEnabled: session.hintsEnabled,
                bloomDistribution: this.getBloomDistribution(finalQuestions),
                clipCoverage: this.getClipCoverage(finalQuestions, session.clipRange)
            }
        };
    }
    
    /**
     * Prioritize questions that were previously answered incorrectly
     */
    prioritizeIncorrectAnswers(questions) {
        const incorrectQuestions = questions.filter(q => q.answerHistory.incorrect > 0);
        const otherQuestions = questions.filter(q => q.answerHistory.incorrect === 0);
        
        return [...incorrectQuestions, ...otherQuestions];
    }
    
    /**
     * Select balanced questions across Bloom taxonomy levels
     */
    selectBalancedQuestions(questions, count, sessionType, userLevel) {
        const selected = [];
        
        // Define Bloom distribution based on session type and user level
        const distribution = this.getBloomDistribution(null, sessionType, userLevel);
        
        for (const [bloomLevel, targetCount] of Object.entries(distribution)) {
            const levelQuestions = questions.filter(q => q.bloomLevel === bloomLevel);
            const selectedFromLevel = levelQuestions.slice(0, targetCount);
            selected.push(...selectedFromLevel);
        }
        
        // Fill remaining slots with any available questions
        while (selected.length < count && questions.length > selected.length) {
            const remaining = questions.filter(q => !selected.includes(q));
            if (remaining.length > 0) {
                selected.push(remaining[0]);
            } else {
                break;
            }
        }
        
        return selected.slice(0, count);
    }
    
    /**
     * Get target Bloom distribution for different session types
     */
    getBloomDistribution(questions, sessionType = null, userLevel = null) {
        if (questions) {
            // Calculate actual distribution
            const distribution = {};
            questions.forEach(q => {
                distribution[q.bloomLevel] = (distribution[q.bloomLevel] || 0) + 1;
            });
            return distribution;
        }
        
        // Return target distribution for session planning
        if (sessionType === 'final') {
            return {
                'Remember': 2,
                'Understand': 3,
                'Apply': 3,
                'Analyze': 2
            };
        } else if (userLevel === 'Beginner') {
            return {
                'Remember': 3,
                'Understand': 2,
                'Apply': 0,
                'Analyze': 0
            };
        } else if (userLevel === 'Intermediate') {
            return {
                'Remember': 1,
                'Understand': 2,
                'Apply': 2,
                'Analyze': 0
            };
        } else {
            return {
                'Remember': 0,
                'Understand': 1,
                'Apply': 2,
                'Analyze': 2
            };
        }
    }
    
    /**
     * Ensure at least one question per clip in the range
     */
    ensureClipCoverage(selectedQuestions, clipRange, targetCount) {
        const coverageMap = {};
        selectedQuestions.forEach(q => {
            coverageMap[q.clipNumber] = true;
        });
        
        const enhanced = [...selectedQuestions];
        
        // Add questions for uncovered clips
        for (let clipNum = clipRange.start; clipNum <= clipRange.end; clipNum++) {
            if (!coverageMap[clipNum]) {
                const clipQuestion = this.quizPool.find(q => q.clipNumber === clipNum);
                if (clipQuestion && enhanced.length < targetCount) {
                    enhanced.push(clipQuestion);
                    coverageMap[clipNum] = true;
                }
            }
        }
        
        return enhanced.slice(0, targetCount);
    }
    
    /**
     * Calculate coverage percentage
     */
    calculateCoveragePercentage(quizPool, keypointsSelected, totalClips) {
        const coveredKeypoints = new Set();
        const coveredClips = new Set();
        
        quizPool.forEach(q => {
            if (q.keypoint) coveredKeypoints.add(q.keypoint);
            if (q.clipNumber) coveredClips.add(q.clipNumber);
        });
        
        const keypointCoverage = coveredKeypoints.size / keypointsSelected.length;
        const clipCoverage = coveredClips.size / totalClips;
        
        return Math.round((keypointCoverage + clipCoverage) / 2 * 100);
    }
    
    /**
     * Parse LLM-generated questions from response
     */
    parseGeneratedQuestions(content, targetBloomLevel) {
        try {
            // Try to parse as JSON
            const parsed = JSON.parse(content);
            return Array.isArray(parsed) ? parsed : [parsed];
        } catch (error) {
            // Parse text format
            return this.parseTextQuestions(content, targetBloomLevel);
        }
    }
    
    /**
     * Parse text-formatted questions
     */
    parseTextQuestions(content, targetBloomLevel) {
        const questions = [];
        const sections = content.split(/\d+\./);
        
        sections.forEach(section => {
            if (section.trim().length < 10) return;
            
            const question = this.extractQuestionFromText(section.trim(), targetBloomLevel);
            if (question) questions.push(question);
        });
        
        return questions;
    }
    
    /**
     * Extract question details from text
     */
    extractQuestionFromText(text, bloomLevel) {
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length < 1) return null;
        
        const questionText = lines[0].trim();
        
        return {
            questionText,
            questionType: 'short_answer',
            bloomLevel,
            difficulty: 'medium',
            keypoint: 'General Concept',
            hint: 'Think about the key concepts covered in this clip',
            explanation: 'This tests understanding of the clip content'
        };
    }
    
    /**
     * Validate and enhance generated questions
     */
    validateAndEnhanceQuestions(questions) {
        return questions.filter(q => {
            return q && 
                   q.questionText && 
                   q.questionText.length > 10 &&
                   q.bloomLevel &&
                   (q.options || q.correctAnswer || q.questionType === 'short_answer');
        }).map(q => ({
            ...q,
            id: this.generateQuestionId(),
            generatedBy: 'llm',
            generatedAt: new Date(),
            validated: true
        }));
    }
    
    /**
     * Template fallback for clip questions
     */
    generateTemplateQuestionsForClip(params) {
        const { clip, subjectArea, bloomLevel } = params;
        
        return [{
            questionText: `What is the main concept covered in "${clip.title}"?`,
            questionType: 'short_answer',
            bloomLevel,
            difficulty: 'easy',
            keypoint: 'Main Concept',
            hint: `Think about the primary topic discussed in ${clip.title}`,
            explanation: `This question tests understanding of the main concept from ${clip.title}`,
            id: this.generateQuestionId(),
            generatedBy: 'template',
            generatedAt: new Date()
        }];
    }
    
    /**
     * Utility methods
     */
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    generateQuestionId() {
        return 'question_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    getClipCoverage(questions, clipRange) {
        const covered = new Set();
        questions.forEach(q => {
            if (q.clipNumber >= clipRange.start && q.clipNumber <= clipRange.end) {
                covered.add(q.clipNumber);
            }
        });
        return covered.size / (clipRange.end - clipRange.start + 1);
    }
    
    async checkRateLimit() {
        const now = Date.now();
        if (now - this.lastRequestTime > 60000) {
            this.requestCount = 0;
            this.lastRequestTime = now;
        }
        
        if (this.requestCount >= this.maxRequestsPerMinute) {
            const waitTime = 60000 - (now - this.lastRequestTime);
            console.log(`⏳ Rate limit reached, waiting ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            this.requestCount = 0;
            this.lastRequestTime = Date.now();
        }
        
        this.requestCount++;
    }
    
    updateUsageStats(usage) {
        this.totalTokensUsed += usage.total_tokens;
        this.estimatedCost += this.calculateCost(usage.total_tokens);
        console.log(`💰 Estimated cost: $${this.estimatedCost.toFixed(4)} (${this.totalTokensUsed} tokens)`);
    }
    
    calculateCost(tokens, model = 'gpt-3.5-turbo') {
        const rates = {
            'gpt-3.5-turbo': 0.0015 / 1000,
            'gpt-4': 0.03 / 1000
        };
        return tokens * (rates[model] || rates['gpt-3.5-turbo']);
    }
}

module.exports = new ClipBasedQuizGenerator();