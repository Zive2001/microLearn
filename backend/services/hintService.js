// services/hintService.js
const bloomTaxonomyService = require('./bloomTaxonomyService');

class HintService {
    
    /**
     * Hint types with difficulty levels and strategies
     */
    hintTypes = {
        contextual: {
            description: "Provides context about the topic or concept",
            difficulty: "easy",
            strategy: "background_knowledge"
        },
        directional: {
            description: "Points toward the correct approach or method",
            difficulty: "medium", 
            strategy: "guided_thinking"
        },
        eliminative: {
            description: "Helps eliminate incorrect options",
            difficulty: "medium",
            strategy: "process_elimination"
        },
        conceptual: {
            description: "Explains the underlying concept",
            difficulty: "easy",
            strategy: "concept_clarification"
        },
        procedural: {
            description: "Shows steps or procedures to follow",
            difficulty: "hard",
            strategy: "step_by_step"
        },
        metacognitive: {
            description: "Helps learner think about their thinking",
            difficulty: "hard",
            strategy: "reflection"
        }
    };
    
    /**
     * Hint escalation levels for progressive support
     */
    hintLevels = {
        1: { name: "Gentle Nudge", specificity: "low", cognitive_load: "minimal" },
        2: { name: "Guided Direction", specificity: "medium", cognitive_load: "moderate" },
        3: { name: "Clear Guidance", specificity: "high", cognitive_load: "substantial" }
    };
    
    /**
     * Get appropriate hint for a question based on user context
     * @param {Object} question - Question object
     * @param {Object} userContext - User's learning context
     * @param {number} attemptNumber - Which attempt this is (1, 2, 3...)
     * @param {Array} previousHints - Previously shown hints
     * @returns {Object} Hint object
     */
    getContextualHint(question, userContext = {}, attemptNumber = 1, previousHints = []) {
        try {
            const {
                userLevel = 'Beginner',
                bloomStrengths = [],
                bloomWeaknesses = [],
                preferredHintStyle = 'balanced',
                learningStyle = 'visual'
            } = userContext;
            
            // Determine hint level based on attempt number
            const hintLevel = Math.min(attemptNumber, 3);
            
            // Get base hint from question
            let baseHint = question.hint || this.generateDefaultHint(question);
            
            // Enhance hint based on user context and attempt
            const enhancedHint = this.enhanceHint(
                baseHint,
                question,
                userLevel,
                hintLevel,
                bloomStrengths,
                bloomWeaknesses,
                preferredHintStyle,
                previousHints
            );
            
            return {
                text: enhancedHint,
                level: hintLevel,
                type: this.determineHintType(question, userLevel, attemptNumber),
                bloomLevel: question.bloomLevel,
                escalated: attemptNumber > 1,
                metadata: {
                    userLevel,
                    attemptNumber,
                    questionType: question.questionType,
                    difficulty: question.difficulty,
                    generatedAt: new Date().toISOString()
                }
            };
            
        } catch (error) {
            console.error('Error getting contextual hint:', error);
            return {
                text: question.hint || "Think about the key concepts involved in this question.",
                level: 1,
                type: 'contextual',
                error: true
            };
        }
    }
    
    /**
     * Generate progressive hints for multiple attempts
     * @param {Object} question - Question object
     * @param {Object} userContext - User context
     * @param {number} maxHints - Maximum number of hints to generate
     * @returns {Array} Array of progressive hints
     */
    generateProgressiveHints(question, userContext = {}, maxHints = 3) {
        try {
            const hints = [];
            
            for (let attempt = 1; attempt <= maxHints; attempt++) {
                const hint = this.getContextualHint(
                    question, 
                    userContext, 
                    attempt, 
                    hints
                );
                hints.push(hint);
            }
            
            return hints;
            
        } catch (error) {
            console.error('Error generating progressive hints:', error);
            return [
                {
                    text: question.hint || "Review the question carefully and consider the key concepts.",
                    level: 1,
                    type: 'contextual'
                }
            ];
        }
    }
    
    /**
     * Enhance base hint with user context and attempt level
     */
    enhanceHint(baseHint, question, userLevel, hintLevel, strengths, weaknesses, style, previousHints) {
        let enhancedHint = baseHint;
        
        try {
            // Level 1: Gentle nudge
            if (hintLevel === 1) {
                enhancedHint = this.addGentleNudge(baseHint, question, userLevel);
            }
            
            // Level 2: More specific guidance
            if (hintLevel === 2) {
                enhancedHint = this.addSpecificGuidance(baseHint, question, userLevel, weaknesses);
            }
            
            // Level 3: Clear direction
            if (hintLevel === 3) {
                enhancedHint = this.addClearDirection(baseHint, question, userLevel);
            }
            
            // Adapt for user's Bloom level weaknesses
            if (weaknesses.includes(question.bloomLevel)) {
                enhancedHint = this.adaptForBloomWeakness(enhancedHint, question.bloomLevel);
            }
            
            // Adapt for preferred learning style
            enhancedHint = this.adaptForLearningStyle(enhancedHint, style, question);
            
            return enhancedHint;
            
        } catch (error) {
            console.error('Error enhancing hint:', error);
            return baseHint;
        }
    }
    
    /**
     * Add gentle nudge to hint (Level 1)
     */
    addGentleNudge(baseHint, question, userLevel) {
        const nudges = {
            'Beginner': [
                "Here's a gentle hint: ",
                "Think about this: ",
                "Consider: "
            ],
            'Intermediate': [
                "A small hint: ",
                "Think about: ",
                "Consider the concept of: "
            ],
            'Advanced': [
                "Quick pointer: ",
                "Think critically about: ",
                "Analyze: "
            ]
        };
        
        const levelNudges = nudges[userLevel] || nudges['Beginner'];
        const randomNudge = levelNudges[Math.floor(Math.random() * levelNudges.length)];
        
        return randomNudge + baseHint;
    }
    
    /**
     * Add specific guidance to hint (Level 2)
     */
    addSpecificGuidance(baseHint, question, userLevel, weaknesses) {
        let guidance = baseHint;
        
        // Add Bloom-level specific guidance
        const bloomGuidance = {
            'Remember': "Try to recall the definition or key facts about this concept.",
            'Understand': "Think about what this concept means and how it works.",
            'Apply': "Consider how you would use this concept in practice.",
            'Analyze': "Break down the components and examine their relationships.",
            'Evaluate': "Think about the criteria for making this judgment.",
            'Create': "Consider how you might combine elements to form something new."
        };
        
        const bloomLevel = question.bloomLevel;
        if (bloomGuidance[bloomLevel] && weaknesses.includes(bloomLevel)) {
            guidance += " " + bloomGuidance[bloomLevel];
        }
        
        // Add question-type specific guidance
        if (question.questionType === 'mcq') {
            guidance += " Look at each option carefully and eliminate the obviously wrong ones first.";
        } else if (question.questionType === 'short_answer') {
            guidance += " Think about the key terms that should be included in your answer.";
        }
        
        return guidance;
    }
    
    /**
     * Add clear direction to hint (Level 3)
     */
    addClearDirection(baseHint, question, userLevel) {
        let direction = baseHint;
        
        // Add more explicit guidance for final attempt
        if (question.questionType === 'mcq' && question.options) {
            const correctOption = question.options.find(opt => opt.isCorrect);
            if (correctOption) {
                direction += ` Focus on options that relate to: ${this.getKeyConceptFromOption(correctOption.text)}.`;
            }
        }
        
        // Add conceptual direction based on keypoints
        if (question.keypoints && question.keypoints.length > 0) {
            direction += ` This question is primarily about: ${question.keypoints[0]}.`;
        }
        
        return direction;
    }
    
    /**
     * Adapt hint for Bloom level weakness
     */
    adaptForBloomWeakness(hint, bloomLevel) {
        const adaptations = {
            'Remember': hint + " Try to memorize this concept for future reference.",
            'Understand': hint + " Make sure you can explain this concept in your own words.",
            'Apply': hint + " Practice using this concept in different scenarios.",
            'Analyze': hint + " Try breaking this down into smaller parts to understand it better.",
            'Evaluate': hint + " Think about what criteria you're using to make this judgment.",
            'Create': hint + " Consider how different elements can be combined in new ways."
        };
        
        return adaptations[bloomLevel] || hint;
    }
    
    /**
     * Adapt hint for learning style preference
     */
    adaptForLearningStyle(hint, style, question) {
        if (style === 'visual' && question.keypoints) {
            return hint + " Try visualizing or drawing a diagram of this concept.";
        }
        
        if (style === 'auditory') {
            return hint + " Try explaining this concept out loud to yourself.";
        }
        
        if (style === 'kinesthetic') {
            return hint + " Try working through this step by step with your hands or writing it out.";
        }
        
        return hint;
    }
    
    /**
     * Determine appropriate hint type based on context
     */
    determineHintType(question, userLevel, attemptNumber) {
        // First attempt: contextual hints
        if (attemptNumber === 1) {
            return 'contextual';
        }
        
        // Second attempt: directional or eliminative
        if (attemptNumber === 2) {
            return question.questionType === 'mcq' ? 'eliminative' : 'directional';
        }
        
        // Third+ attempt: procedural or conceptual
        if (attemptNumber >= 3) {
            return ['Apply', 'Analyze', 'Create'].includes(question.bloomLevel) ? 'procedural' : 'conceptual';
        }
        
        return 'contextual';
    }
    
    /**
     * Generate default hint if none exists
     */
    generateDefaultHint(question) {
        const defaultHints = {
            'Remember': "Think about the basic definition or key facts related to this topic.",
            'Understand': "Consider what this concept means and how it relates to other ideas.",
            'Apply': "Think about how you would use this knowledge in a practical situation.",
            'Analyze': "Break down the problem into smaller parts and examine each component.",
            'Evaluate': "Consider the criteria you would use to make a judgment about this.",
            'Create': "Think about how you might combine different elements to solve this problem."
        };
        
        const bloomLevel = question.bloomLevel || 'Remember';
        return defaultHints[bloomLevel];
    }
    
    /**
     * Extract key concept from option text
     */
    getKeyConceptFromOption(optionText) {
        // Simple extraction - in practice, this could be more sophisticated
        const words = optionText.split(' ');
        const keyWords = words.filter(word => 
            word.length > 4 && 
            !['that', 'with', 'from', 'they', 'have', 'this', 'will', 'your'].includes(word.toLowerCase())
        );
        return keyWords[0] || optionText.split(' ')[0];
    }
    
    /**
     * Validate hint appropriateness and quality
     * @param {string} hintText - The hint text to validate
     * @param {Object} question - The question object
     * @returns {Object} Validation result
     */
    validateHint(hintText, question) {
        try {
            const issues = [];
            const suggestions = [];
            
            // Check hint length
            if (hintText.length < 10) {
                issues.push("Hint is too short to be helpful");
                suggestions.push("Provide more context or explanation");
            }
            
            if (hintText.length > 200) {
                issues.push("Hint is too long and may be overwhelming");
                suggestions.push("Make hint more concise and focused");
            }
            
            // Check if hint gives away the answer
            if (question.questionType === 'mcq' && question.options) {
                const correctOption = question.options.find(opt => opt.isCorrect);
                if (correctOption && hintText.toLowerCase().includes(correctOption.text.toLowerCase())) {
                    issues.push("Hint reveals the correct answer");
                    suggestions.push("Make hint more indirect");
                }
            }
            
            // Check if hint is relevant to Bloom level
            const bloomKeywords = bloomTaxonomyService.bloomLevels[question.bloomLevel]?.keywords || [];
            const hintHasBloomKeywords = bloomKeywords.some(keyword => 
                hintText.toLowerCase().includes(keyword)
            );
            
            if (!hintHasBloomKeywords && bloomKeywords.length > 0) {
                suggestions.push(`Consider using ${question.bloomLevel}-level language like: ${bloomKeywords.slice(0, 3).join(', ')}`);
            }
            
            return {
                isValid: issues.length === 0,
                issues,
                suggestions,
                score: Math.max(0, 100 - (issues.length * 25)),
                metadata: {
                    length: hintText.length,
                    bloomAlignment: hintHasBloomKeywords,
                    validatedAt: new Date().toISOString()
                }
            };
            
        } catch (error) {
            console.error('Error validating hint:', error);
            return {
                isValid: false,
                issues: ['Validation error occurred'],
                suggestions: ['Review hint manually'],
                score: 0
            };
        }
    }
    
    /**
     * Generate adaptive hint based on user's learning pattern
     * @param {Object} userLearningPattern - User's learning behavior data
     * @param {Object} question - Question object
     * @returns {Object} Adaptive hint
     */
    generateAdaptiveHint(userLearningPattern, question) {
        try {
            const {
                averageTimePerQuestion = 60,
                hintUsageRate = 0.5,
                correctFirstAttemptRate = 0.6,
                strongBloomLevels = [],
                weakBloomLevels = [],
                preferredQuestionTypes = []
            } = userLearningPattern;
            
            let adaptedHint = question.hint || this.generateDefaultHint(question);
            
            // Adapt based on time patterns
            if (averageTimePerQuestion < 30) {
                adaptedHint = "Take your time to read carefully. " + adaptedHint;
            } else if (averageTimePerQuestion > 120) {
                adaptedHint = "Trust your instincts. " + adaptedHint;
            }
            
            // Adapt based on first attempt success rate
            if (correctFirstAttemptRate < 0.4) {
                adaptedHint = "Think through each option systematically. " + adaptedHint;
            }
            
            // Adapt based on Bloom level performance
            if (weakBloomLevels.includes(question.bloomLevel)) {
                const strengthenHints = {
                    'Remember': "Focus on memorizing key facts and definitions.",
                    'Understand': "Try to explain the concept in your own words first.",
                    'Apply': "Think of a concrete example where you'd use this.",
                    'Analyze': "Break this down into smaller, manageable parts.",
                    'Evaluate': "What criteria are you using to make this judgment?",
                    'Create': "How can you combine different ideas to solve this?"
                };
                adaptedHint += " " + (strengthenHints[question.bloomLevel] || "");
            }
            
            return {
                text: adaptedHint,
                adaptations: {
                    timePattern: averageTimePerQuestion < 30 ? 'rush' : averageTimePerQuestion > 120 ? 'slow' : 'normal',
                    bloomFocus: weakBloomLevels.includes(question.bloomLevel),
                    experienceLevel: correctFirstAttemptRate > 0.7 ? 'confident' : 'needs_support'
                },
                metadata: {
                    adaptedFor: 'learning_pattern',
                    generatedAt: new Date().toISOString()
                }
            };
            
        } catch (error) {
            console.error('Error generating adaptive hint:', error);
            return {
                text: question.hint || this.generateDefaultHint(question),
                error: true
            };
        }
    }
    
    /**
     * Get hint statistics for analytics
     * @param {Array} hintUsageData - Array of hint usage records
     * @returns {Object} Hint usage statistics
     */
    getHintStatistics(hintUsageData) {
        try {
            if (!hintUsageData || hintUsageData.length === 0) {
                return {
                    totalHintsUsed: 0,
                    hintEffectiveness: 0,
                    averageHintsPerQuestion: 0,
                    hintTypeDistribution: {},
                    bloomLevelHintUsage: {},
                    recommendations: ['No hint usage data available']
                };
            }
            
            const stats = {
                totalHintsUsed: hintUsageData.length,
                hintEffectiveness: 0,
                averageHintsPerQuestion: 0,
                hintTypeDistribution: {},
                bloomLevelHintUsage: {},
                levelDistribution: { 1: 0, 2: 0, 3: 0 },
                recommendations: []
            };
            
            // Calculate effectiveness (hints that led to correct answers)
            const effectiveHints = hintUsageData.filter(hint => hint.ledToCorrectAnswer);
            stats.hintEffectiveness = Math.round((effectiveHints.length / hintUsageData.length) * 100);
            
            // Calculate type distribution
            hintUsageData.forEach(hint => {
                const type = hint.type || 'contextual';
                stats.hintTypeDistribution[type] = (stats.hintTypeDistribution[type] || 0) + 1;
                
                const bloomLevel = hint.bloomLevel || 'Remember';
                stats.bloomLevelHintUsage[bloomLevel] = (stats.bloomLevelHintUsage[bloomLevel] || 0) + 1;
                
                const level = hint.level || 1;
                stats.levelDistribution[level] = (stats.levelDistribution[level] || 0) + 1;
            });
            
            // Generate recommendations
            if (stats.hintEffectiveness < 50) {
                stats.recommendations.push("Hint effectiveness is low - consider reviewing hint quality");
            }
            
            if (stats.levelDistribution[3] > stats.totalHintsUsed * 0.3) {
                stats.recommendations.push("High usage of Level 3 hints - may need better initial hints");
            }
            
            if (stats.hintEffectiveness > 80) {
                stats.recommendations.push("Excellent hint effectiveness - keep up the good work!");
            }
            
            return stats;
            
        } catch (error) {
            console.error('Error calculating hint statistics:', error);
            return {
                totalHintsUsed: 0,
                error: 'Failed to calculate statistics'
            };
        }
    }
}

module.exports = new HintService();