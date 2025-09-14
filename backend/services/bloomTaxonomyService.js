// services/bloomTaxonomyService.js

class BloomTaxonomyService {
    
    /**
     * Bloom's Taxonomy levels with descriptions and question stems
     */
    bloomLevels = {
        Remember: {
            level: 1,
            description: "Retrieving, recognizing, and recalling relevant knowledge from memory",
            keywords: ["remember", "recall", "recognize", "identify", "define", "list", "name", "state"],
            questionStems: [
                "What is...?",
                "When did...?",
                "Where is...?",
                "How would you define...?",
                "Which one...?",
                "Who was...?",
                "List the...",
                "Name the...",
                "Identify the..."
            ],
            cognitiveLoad: "low",
            timeAllocation: "15%" // Of total learning time
        },
        Understand: {
            level: 2,
            description: "Constructing meaning from oral, written, and graphic messages",
            keywords: ["understand", "explain", "describe", "summarize", "paraphrase", "classify", "compare"],
            questionStems: [
                "Explain why...",
                "Describe how...",
                "Summarize the...",
                "What is the main idea of...?",
                "Compare and contrast...",
                "How would you classify...?",
                "What is meant by...?",
                "Give an example of...",
                "Paraphrase the..."
            ],
            cognitiveLoad: "low-medium",
            timeAllocation: "20%"
        },
        Apply: {
            level: 3,
            description: "Carrying out or using a procedure through executing or implementing",
            keywords: ["apply", "use", "implement", "execute", "demonstrate", "solve", "operate"],
            questionStems: [
                "How would you use...?",
                "What would result if...?",
                "Apply the concept of...",
                "Demonstrate how...",
                "Solve the problem...",
                "What approach would you use to...?",
                "How would you organize...?",
                "What would happen if...?",
                "Implement the..."
            ],
            cognitiveLoad: "medium",
            timeAllocation: "25%"
        },
        Analyze: {
            level: 4,
            description: "Breaking material into constituent parts, determining relationships between parts",
            keywords: ["analyze", "examine", "compare", "contrast", "distinguish", "differentiate", "investigate"],
            questionStems: [
                "What are the components of...?",
                "How does... relate to...?",
                "Why do you think...?",
                "What evidence can you find...?",
                "What is the relationship between...?",
                "What conclusions can you draw...?",
                "Distinguish between...",
                "What are the implications of...?",
                "Analyze the..."
            ],
            cognitiveLoad: "medium-high",
            timeAllocation: "20%"
        },
        Evaluate: {
            level: 5,
            description: "Making judgments based on criteria and standards",
            keywords: ["evaluate", "critique", "judge", "assess", "justify", "defend", "support"],
            questionStems: [
                "What is your opinion of...?",
                "How would you evaluate...?",
                "What are the strengths and weaknesses of...?",
                "Do you agree that...?",
                "Assess the value of...",
                "What criteria would you use to...?",
                "How would you prioritize...?",
                "Justify your position on...",
                "What is the most important...?"
            ],
            cognitiveLoad: "high",
            timeAllocation: "10%"
        },
        Create: {
            level: 6,
            description: "Putting elements together to form a coherent whole; reorganizing into new pattern",
            keywords: ["create", "design", "develop", "construct", "formulate", "produce", "generate"],
            questionStems: [
                "How would you design...?",
                "Create a plan for...",
                "Develop a new...",
                "What would happen if...?",
                "Propose an alternative...",
                "Formulate a theory...",
                "How would you test...?",
                "Design an experiment to...",
                "What changes would you make to...?"
            ],
            cognitiveLoad: "high",
            timeAllocation: "10%"
        }
    };
    
    /**
     * CLT-bLM Phase mapping to Bloom levels
     */
    cltBlmPhases = {
        Prepare: {
            description: "Initial cognitive load management and foundation building",
            bloomLevels: ["Remember", "Understand"],
            cognitiveLoadStrategy: "minimize_extraneous",
            learningTechniques: ["chunking", "scaffolding", "prior_knowledge_activation"]
        },
        Initiate: {
            description: "Guided practice and skill development",
            bloomLevels: ["Understand", "Apply"],
            cognitiveLoadStrategy: "optimize_germane",
            learningTechniques: ["worked_examples", "guided_practice", "feedback"]
        },
        Deliver: {
            description: "Independent application and problem solving",
            bloomLevels: ["Apply", "Analyze"],
            cognitiveLoadStrategy: "manage_intrinsic",
            learningTechniques: ["problem_solving", "case_studies", "project_work"]
        },
        End: {
            description: "Reflection, evaluation and knowledge construction",
            bloomLevels: ["Analyze", "Evaluate", "Create"],
            cognitiveLoadStrategy: "enhance_metacognition",
            learningTechniques: ["reflection", "peer_review", "synthesis"]
        }
    };
    
    /**
     * Categorize question by Bloom taxonomy level
     * @param {string} questionText - The question text
     * @param {string} questionType - MCQ, true_false, short_answer
     * @returns {Object} Bloom level analysis
     */
    categorizeQuestion(questionText, questionType) {
        try {
            const lowerText = questionText.toLowerCase();
            let detectedLevel = 'Remember'; // Default
            let confidence = 0;
            
            // Analyze question stems and keywords
            Object.entries(this.bloomLevels).forEach(([level, data]) => {
                let levelScore = 0;
                
                // Check for question stems
                data.questionStems.forEach(stem => {
                    const stemWords = stem.toLowerCase().replace(/[^a-z\s]/g, '').split(' ');
                    const matchCount = stemWords.filter(word => 
                        word.length > 2 && lowerText.includes(word)
                    ).length;
                    if (matchCount > 0) levelScore += matchCount * 2;
                });
                
                // Check for keywords
                data.keywords.forEach(keyword => {
                    if (lowerText.includes(keyword)) levelScore += 3;
                });
                
                // Adjust score based on question type
                if (questionType === 'short_answer' && ['Apply', 'Analyze', 'Evaluate', 'Create'].includes(level)) {
                    levelScore += 1;
                }
                if (questionType === 'true_false' && ['Remember', 'Understand'].includes(level)) {
                    levelScore += 1;
                }
                
                if (levelScore > confidence) {
                    confidence = levelScore;
                    detectedLevel = level;
                }
            });
            
            return {
                bloomLevel: detectedLevel,
                confidence: Math.min(confidence / 5, 1), // Normalize to 0-1
                levelData: this.bloomLevels[detectedLevel],
                cognitiveLoad: this.bloomLevels[detectedLevel].cognitiveLoad
            };
            
        } catch (error) {
            console.error('Error categorizing question:', error);
            return {
                bloomLevel: 'Remember',
                confidence: 0,
                levelData: this.bloomLevels.Remember,
                cognitiveLoad: 'low'
            };
        }
    }
    
    /**
     * Get appropriate Bloom levels for CLT-bLM phase
     * @param {string} phase - CLT-bLM phase (Prepare, Initiate, Deliver, End)
     * @returns {Array} Recommended Bloom levels
     */
    getBloomLevelsForPhase(phase) {
        return this.cltBlmPhases[phase]?.bloomLevels || ['Remember', 'Understand'];
    }
    
    /**
     * Validate question alignment with Bloom level
     * @param {Object} question - Question object
     * @param {string} targetLevel - Target Bloom level
     * @returns {Object} Validation result
     */
    validateQuestionAlignment(question, targetLevel) {
        try {
            const analysis = this.categorizeQuestion(question.questionText, question.questionType);
            const isAligned = analysis.bloomLevel === targetLevel;
            const confidence = analysis.confidence;
            
            let suggestions = [];
            if (!isAligned) {
                suggestions = this.generateAlignmentSuggestions(question, targetLevel, analysis.bloomLevel);
            }
            
            return {
                isAligned,
                detectedLevel: analysis.bloomLevel,
                targetLevel,
                confidence,
                suggestions,
                cognitiveLoad: analysis.cognitiveLoad
            };
            
        } catch (error) {
            console.error('Error validating question alignment:', error);
            return {
                isAligned: false,
                detectedLevel: 'Unknown',
                targetLevel,
                confidence: 0,
                suggestions: ['Question analysis failed - manual review required']
            };
        }
    }
    
    /**
     * Generate suggestions to align question with target Bloom level
     */
    generateAlignmentSuggestions(question, targetLevel, detectedLevel) {
        const suggestions = [];
        const targetData = this.bloomLevels[targetLevel];
        
        suggestions.push(`Current level: ${detectedLevel}, Target level: ${targetLevel}`);
        
        if (targetData) {
            suggestions.push(`Try using these question stems: ${targetData.questionStems.slice(0, 3).join(', ')}`);
            suggestions.push(`Include these keywords: ${targetData.keywords.slice(0, 3).join(', ')}`);
        }
        
        // Specific suggestions based on level gap
        const currentLevelNum = this.bloomLevels[detectedLevel]?.level || 1;
        const targetLevelNum = targetData?.level || 1;
        
        if (targetLevelNum > currentLevelNum) {
            suggestions.push("Make the question more complex - require deeper thinking and analysis");
        } else {
            suggestions.push("Simplify the question - focus on basic recall or understanding");
        }
        
        return suggestions;
    }
    
    /**
     * Generate question progression for CLT-bLM phases
     * @param {string} topic - Topic name
     * @param {Array} keypoints - Learning keypoints
     * @param {number} totalClips - Total number of clips
     * @returns {Object} Progression plan
     */
    generateQuestionProgression(topic, keypoints, totalClips) {
        try {
            const progression = {
                phases: {},
                distribution: {},
                totalQuestions: 0
            };
            
            // Calculate clips per phase
            const clipsPerPhase = Math.ceil(totalClips / 4);
            let currentClip = 1;
            
            Object.entries(this.cltBlmPhases).forEach(([phaseName, phaseData]) => {
                const phaseClips = Math.min(clipsPerPhase, totalClips - currentClip + 1);
                const questionsPerPhase = phaseClips * 2; // 2 questions per clip average
                
                progression.phases[phaseName] = {
                    ...phaseData,
                    clipRange: {
                        start: currentClip,
                        end: currentClip + phaseClips - 1
                    },
                    recommendedQuestions: questionsPerPhase,
                    bloomLevels: phaseData.bloomLevels,
                    keypoints: keypoints.slice(
                        Math.floor((currentClip - 1) / clipsPerPhase * keypoints.length),
                        Math.floor(currentClip / clipsPerPhase * keypoints.length)
                    )
                };
                
                progression.totalQuestions += questionsPerPhase;
                currentClip += phaseClips;
            });
            
            // Calculate Bloom level distribution
            Object.values(this.bloomLevels).forEach(levelData => {
                const percentage = parseFloat(levelData.timeAllocation.replace('%', ''));
                progression.distribution[levelData] = Math.round(
                    (percentage / 100) * progression.totalQuestions
                );
            });
            
            return progression;
            
        } catch (error) {
            console.error('Error generating question progression:', error);
            throw error;
        }
    }
    
    /**
     * Analyze quiz session for Bloom level coverage
     * @param {Array} questions - Session questions
     * @returns {Object} Coverage analysis
     */
    analyzeBloomCoverage(questions) {
        try {
            const coverage = {};
            const levelCounts = {};
            
            // Initialize counters
            Object.keys(this.bloomLevels).forEach(level => {
                levelCounts[level] = 0;
            });
            
            // Count questions per level
            questions.forEach(question => {
                const level = question.bloomLevel || 'Remember';
                levelCounts[level]++;
            });
            
            const totalQuestions = questions.length;
            
            // Calculate percentages and recommendations
            Object.entries(levelCounts).forEach(([level, count]) => {
                const percentage = totalQuestions > 0 ? (count / totalQuestions) * 100 : 0;
                const recommended = parseFloat(this.bloomLevels[level].timeAllocation.replace('%', ''));
                
                coverage[level] = {
                    count,
                    percentage: Math.round(percentage),
                    recommended,
                    status: this.getCoverageStatus(percentage, recommended),
                    cognitiveLoad: this.bloomLevels[level].cognitiveLoad
                };
            });
            
            // Overall assessment
            const balanceScore = this.calculateBalanceScore(coverage);
            
            return {
                coverage,
                totalQuestions,
                balanceScore,
                recommendations: this.generateCoverageRecommendations(coverage)
            };
            
        } catch (error) {
            console.error('Error analyzing Bloom coverage:', error);
            throw error;
        }
    }
    
    /**
     * Get coverage status (adequate, low, high)
     */
    getCoverageStatus(actual, recommended) {
        const tolerance = 5; // 5% tolerance
        if (actual < recommended - tolerance) return 'low';
        if (actual > recommended + tolerance) return 'high';
        return 'adequate';
    }
    
    /**
     * Calculate balance score for Bloom distribution
     */
    calculateBalanceScore(coverage) {
        let totalDeviation = 0;
        let levelCount = 0;
        
        Object.values(coverage).forEach(levelData => {
            const deviation = Math.abs(levelData.percentage - levelData.recommended);
            totalDeviation += deviation;
            levelCount++;
        });
        
        const averageDeviation = totalDeviation / levelCount;
        return Math.max(0, 100 - averageDeviation * 2); // Scale to 0-100
    }
    
    /**
     * Generate recommendations for improving Bloom coverage
     */
    generateCoverageRecommendations(coverage) {
        const recommendations = [];
        
        Object.entries(coverage).forEach(([level, data]) => {
            if (data.status === 'low') {
                recommendations.push(
                    `Add more ${level} level questions (current: ${data.percentage}%, recommended: ${data.recommended}%)`
                );
            } else if (data.status === 'high') {
                recommendations.push(
                    `Reduce ${level} level questions (current: ${data.percentage}%, recommended: ${data.recommended}%)`
                );
            }
        });
        
        if (recommendations.length === 0) {
            recommendations.push("Bloom taxonomy distribution is well balanced");
        }
        
        return recommendations;
    }
    
    /**
     * Get question difficulty based on Bloom level and user experience
     * @param {string} bloomLevel - Bloom taxonomy level
     * @param {string} userLevel - User experience level
     * @returns {string} Question difficulty (easy, medium, hard)
     */
    getQuestionDifficulty(bloomLevel, userLevel) {
        const levelHierarchy = {
            'Remember': 1, 'Understand': 2, 'Apply': 3,
            'Analyze': 4, 'Evaluate': 5, 'Create': 6
        };
        
        const userLevelMap = {
            'Beginner': 1, 'Intermediate': 2, 'Advanced': 3
        };
        
        const bloomComplexity = levelHierarchy[bloomLevel] || 1;
        const userCapability = userLevelMap[userLevel] || 1;
        
        if (bloomComplexity <= userCapability) return 'easy';
        if (bloomComplexity === userCapability + 1) return 'medium';
        return 'hard';
    }
}

module.exports = new BloomTaxonomyService();