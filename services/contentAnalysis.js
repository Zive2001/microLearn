const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Extract keypoints from transcript segments
 */
const extractKeypoints = async (segments) => {
  try {
    // Combine high-importance segments for analysis
    const importantSegments = segments
      .filter((segment) => segment.importance > 0.6)
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 20); // Top 20 important segments

    const combinedText = importantSegments
      .map((segment) => segment.text)
      .join(" ");

    if (!combinedText.trim()) {
      console.warn("No important segments found for keypoint extraction");
      return [];
    }

    const keypointPrompt = `
    Extract the key educational concepts and learning points from this content:

    "${combinedText}"

    Return a JSON array of keypoints where each keypoint is:
    {
      "concept": "core concept name",
      "description": "brief explanation",
      "importance": number from 1-10,
      "bloom_level": "remember|understand|apply|analyze|evaluate|create",
      "prerequisites": ["prerequisite concepts"],
      "examples": ["concrete examples or applications"],
      "difficulty": "beginner|intermediate|advanced"
    }

    Focus on the 8-12 most important educational concepts that should be covered in a micro-video.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: keypointPrompt }],
      temperature: 0.3,
      max_tokens: 1500,
    });

    const keypoints = JSON.parse(response.choices[0].message.content);

    // Enhance keypoints with additional analysis
    const enhancedKeypoints = await enhanceKeypoints(keypoints, segments);

    return enhancedKeypoints;
  } catch (error) {
    console.error("Keypoint extraction error:", error);
    throw new Error(`Failed to extract keypoints: ${error.message}`);
  }
};

/**
 * Enhance keypoints with segment-level analysis
 */
const enhanceKeypoints = async (keypoints, segments) => {
  return keypoints.map((keypoint) => {
    // Find segments related to this keypoint
    const relatedSegments = segments.filter(
      (segment) =>
        segment.text.toLowerCase().includes(keypoint.concept.toLowerCase()) ||
        keypoint.concept
          .toLowerCase()
          .includes(segment.text.toLowerCase().split(" ")[0])
    );

    // Calculate additional metrics
    const segmentMetrics = analyzeRelatedSegments(relatedSegments);

    return {
      ...keypoint,
      segment_coverage: relatedSegments.length,
      avg_confidence: segmentMetrics.avgConfidence,
      total_duration: segmentMetrics.totalDuration,
      conceptual_density: segmentMetrics.conceptualDensity,
      related_segments: relatedSegments.map((s) => s.id).slice(0, 5), // Top 5 related segments

      // Enhanced educational metadata
      cognitive_load_estimate: estimateCognitiveLoad(keypoint, segmentMetrics),
      learning_time_estimate: estimateLearningTime(keypoint, segmentMetrics),
      teaching_strategies: suggestTeachingStrategies(keypoint),
    };
  });
};

/**
 * Analyze content complexity for CLT-bLM framework
 */
const analyzeContentComplexity = async (transcript) => {
  try {
    const fullText =
      transcript.fullText || transcript.segments.map((s) => s.text).join(" ");

    const complexityPrompt = `
    Analyze the cognitive complexity of this educational content:

    "${fullText.substring(0, 2500)}..."

    Provide analysis in JSON format:
    {
      "overall_complexity": "low|medium|high",
      "conceptual_density": number from 0-1,
      "abstract_concepts": number from 0-10,
      "prerequisite_load": "minimal|moderate|substantial", 
      "information_elements": {
        "facts": number,
        "concepts": number,
        "procedures": number,
        "principles": number
      },
      "cognitive_demands": {
        "working_memory_load": "low|medium|high",
        "processing_speed": "slow|moderate|fast",
        "attention_requirements": "focused|divided|sustained"
      },
      "complexity_factors": {
        "technical_vocabulary": number from 0-10,
        "sentence_complexity": number from 0-10,
        "logical_structure": "simple|moderate|complex",
        "interdependencies": number from 0-10
      },
      "learner_considerations": {
        "novice_friendly": true|false,
        "expert_level": true|false,
        "scaffolding_needed": true|false
      }
    }
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: complexityPrompt }],
      temperature: 0.2,
      max_tokens: 1200,
    });

    const complexityAnalysis = JSON.parse(response.choices[0].message.content);

    // Add computational metrics
    const computationalMetrics = calculateComputationalComplexity(transcript);

    return {
      ...complexityAnalysis,
      computational_metrics: computationalMetrics,
      analysis_timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Content complexity analysis error:", error);
    throw new Error(`Failed to analyze content complexity: ${error.message}`);
  }
};

/**
 * Calculate computational complexity metrics
 */
const calculateComputationalComplexity = (transcript) => {
  const segments = transcript.segments || [];
  const fullText = transcript.fullText || "";

  // Lexical complexity
  const words = fullText
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 0);
  const uniqueWords = new Set(words);
  const lexicalDiversity = uniqueWords.size / words.length;

  // Average word length
  const avgWordLength =
    words.reduce((sum, word) => sum + word.length, 0) / words.length;

  // Sentence complexity (approximate)
  const sentences = fullText.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const avgSentenceLength = words.length / sentences.length;

  // Technical term density
  const technicalTerms = identifyTechnicalTerms(words);
  const technicalDensity = technicalTerms.length / words.length;

  // Information density per segment
  const avgSegmentComplexity =
    segments.reduce((sum, seg) => sum + (seg.conceptualDensity || 0), 0) /
    segments.length;

  return {
    lexical_diversity: Math.round(lexicalDiversity * 100) / 100,
    avg_word_length: Math.round(avgWordLength * 10) / 10,
    avg_sentence_length: Math.round(avgSentenceLength * 10) / 10,
    technical_density: Math.round(technicalDensity * 100) / 100,
    information_density: Math.round(avgSegmentComplexity * 100) / 100,

    // Readability estimates
    flesch_estimate: estimateFleschScore(avgSentenceLength, avgWordLength),
    cognitive_load_index: calculateCognitiveLoadIndex(
      lexicalDiversity,
      technicalDensity,
      avgSentenceLength
    ),
  };
};

/**
 * Identify technical terms in word list
 */
const identifyTechnicalTerms = (words) => {
  // Simple heuristics for technical terms
  const technicalPatterns = [
    /\w{8,}/, // Long words (8+ characters)
    /[A-Z]{2,}/, // Acronyms
    /\w+tion$/, // Words ending in -tion
    /\w+ism$/, // Words ending in -ism
    /\w+ology$/, // Words ending in -ology
    /\w+metric$/, // Words ending in -metric
    /\w+analysis$/, // Words ending in -analysis
  ];

  return words.filter(
    (word) =>
      technicalPatterns.some((pattern) => pattern.test(word)) ||
      word.length > 12 // Very long words likely technical
  );
};

/**
 * Estimate Flesch reading score
 */
const estimateFleschScore = (avgSentenceLength, avgWordLength) => {
  // Simplified Flesch formula
  const score =
    206.835 - 1.015 * avgSentenceLength - 84.6 * (avgWordLength / 5);
  return Math.max(0, Math.min(100, Math.round(score)));
};

/**
 * Calculate cognitive load index
 */
const calculateCognitiveLoadIndex = (
  lexicalDiversity,
  technicalDensity,
  avgSentenceLength
) => {
  // Composite index where higher values indicate higher cognitive load
  const diversityFactor = 1 - lexicalDiversity; // Higher diversity = lower load
  const technicalFactor = technicalDensity * 2; // Technical terms increase load
  const lengthFactor = Math.min(avgSentenceLength / 20, 1); // Longer sentences = higher load

  const index = (diversityFactor + technicalFactor + lengthFactor) / 3;
  return Math.round(index * 100) / 100;
};

/**
 * Analyze segments related to a keypoint
 */
const analyzeRelatedSegments = (segments) => {
  if (segments.length === 0) {
    return {
      avgConfidence: 0,
      totalDuration: 0,
      conceptualDensity: 0,
    };
  }

  const avgConfidence =
    segments.reduce((sum, seg) => sum + (seg.confidence || 0), 0) /
    segments.length;
  const totalDuration = segments.reduce(
    (sum, seg) => sum + (seg.duration || 0),
    0
  );
  const conceptualDensity =
    segments.reduce((sum, seg) => sum + (seg.conceptualDensity || 0), 0) /
    segments.length;

  return {
    avgConfidence: Math.round(avgConfidence * 100) / 100,
    totalDuration,
    conceptualDensity: Math.round(conceptualDensity * 100) / 100,
  };
};

/**
 * Estimate cognitive load for a keypoint
 */
const estimateCognitiveLoad = (keypoint, segmentMetrics) => {
  let load = 0.5; // Base load

  // Adjust based on difficulty
  const difficultyMap = { beginner: 0.3, intermediate: 0.6, advanced: 0.9 };
  load = difficultyMap[keypoint.difficulty] || 0.5;

  // Adjust based on Bloom's level
  const bloomMap = {
    remember: 0.2,
    understand: 0.4,
    apply: 0.6,
    analyze: 0.7,
    evaluate: 0.8,
    create: 0.9,
  };
  load = (load + (bloomMap[keypoint.bloom_level] || 0.5)) / 2;

  // Adjust based on conceptual density
  load = load + segmentMetrics.conceptualDensity * 0.3;

  return Math.min(1, Math.max(0, Math.round(load * 100) / 100));
};

/**
 * Estimate learning time for a keypoint
 */
const estimateLearningTime = (keypoint, segmentMetrics) => {
  let baseTime = 30; // 30 seconds base

  // Adjust for difficulty
  const difficultyMultiplier = {
    beginner: 0.8,
    intermediate: 1.0,
    advanced: 1.4,
  };
  baseTime *= difficultyMultiplier[keypoint.difficulty] || 1.0;

  // Adjust for Bloom's level
  const bloomMultiplier = {
    remember: 0.7,
    understand: 1.0,
    apply: 1.3,
    analyze: 1.5,
    evaluate: 1.7,
    create: 2.0,
  };
  baseTime *= bloomMultiplier[keypoint.bloom_level] || 1.0;

  // Adjust for conceptual density
  baseTime *= 1 + segmentMetrics.conceptualDensity;

  return Math.round(baseTime);
};

/**
 * Suggest teaching strategies for a keypoint
 */
const suggestTeachingStrategies = (keypoint) => {
  const strategies = [];

  // Base strategies by Bloom's level
  const bloomStrategies = {
    remember: ["Repetition", "Mnemonics", "Visual aids", "Flashcards"],
    understand: ["Examples", "Analogies", "Paraphrasing", "Concept maps"],
    apply: [
      "Practice problems",
      "Simulations",
      "Case studies",
      "Demonstrations",
    ],
    analyze: [
      "Compare/contrast",
      "Categorization",
      "Root cause analysis",
      "Pattern recognition",
    ],
    evaluate: [
      "Criteria-based assessment",
      "Pros/cons analysis",
      "Critical questioning",
      "Peer review",
    ],
    create: [
      "Project-based learning",
      "Design thinking",
      "Synthesis activities",
      "Innovation challenges",
    ],
  };

  strategies.push(
    ...(bloomStrategies[keypoint.bloom_level] || bloomStrategies.understand)
  );

  // Add difficulty-specific strategies
  if (keypoint.difficulty === "beginner") {
    strategies.push(
      "Step-by-step guidance",
      "Scaffolding",
      "Frequent check-ins"
    );
  } else if (keypoint.difficulty === "advanced") {
    strategies.push(
      "Self-directed exploration",
      "Complex problem solving",
      "Theory application"
    );
  }

  // Add strategies based on concept type
  if (
    keypoint.concept.includes("process") ||
    keypoint.concept.includes("procedure")
  ) {
    strategies.push(
      "Flowcharts",
      "Sequential demonstration",
      "Practice workflow"
    );
  }

  if (
    keypoint.concept.includes("theory") ||
    keypoint.concept.includes("principle")
  ) {
    strategies.push(
      "Real-world connections",
      "Historical context",
      "Multiple perspectives"
    );
  }

  return strategies.slice(0, 4); // Return top 4 strategies
};

/**
 * Extract learning pathways from content
 */
const extractLearningPathways = async (keypoints, contentAnalysis) => {
  try {
    const pathwayPrompt = `
    Based on these educational keypoints and content analysis, create optimal learning pathways:

    KEYPOINTS: ${JSON.stringify(keypoints.slice(0, 8), null, 2)}
    
    CONTENT ANALYSIS: ${JSON.stringify(contentAnalysis, null, 2)}

    Generate learning pathways in JSON format:
    {
      "pathways": [
        {
          "name": "pathway name",
          "description": "pathway description",
          "sequence": ["keypoint1", "keypoint2", "keypoint3"],
          "rationale": "why this sequence works",
          "estimated_duration": number_in_seconds,
          "cognitive_progression": "description of cognitive development",
          "prerequisite_check": ["concepts to verify before starting"],
          "success_indicators": ["signs of successful learning"]
        }
      ],
      "optimal_pathway": "name of recommended pathway",
      "alternative_pathways": ["alternative1", "alternative2"],
      "personalization_factors": ["factors that might change pathway choice"]
    }

    Consider:
    - Cognitive load progression (simple to complex)
    - Prerequisite dependencies
    - Bloom's taxonomy progression
    - Content difficulty scaffolding
    - Logical conceptual flow
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: pathwayPrompt }],
      temperature: 0.3,
      max_tokens: 1500,
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("Learning pathway extraction error:", error);
    throw new Error(`Failed to extract learning pathways: ${error.message}`);
  }
};

/**
 * Analyze content for misconceptions and learning difficulties
 */
const analyzePotentialDifficulties = async (keypoints, segments) => {
  try {
    // Identify segments with low confidence or high complexity
    const difficultSegments = segments.filter(
      (segment) =>
        segment.confidence < 0.7 ||
        segment.conceptualDensity > 0.8 ||
        segment.speakingRate > 180
    );

    const difficultyPrompt = `
    Analyze potential learning difficulties and misconceptions for these educational concepts:

    KEYPOINTS: ${keypoints
      .slice(0, 6)
      .map((k) => k.concept)
      .join(", ")}
    
    DIFFICULT SEGMENTS: ${difficultSegments
      .slice(0, 5)
      .map((s) => s.text)
      .join(" | ")}

    Return analysis in JSON format:
    {
      "common_misconceptions": [
        {
          "concept": "related keypoint",
          "misconception": "common misunderstanding",
          "why_it_occurs": "cognitive reason",
          "correction_strategy": "how to address it"
        }
      ],
      "learning_difficulties": [
        {
          "concept": "challenging concept",
          "difficulty_type": "cognitive|procedural|conceptual",
          "symptoms": ["signs of difficulty"],
          "support_strategies": ["ways to help"]
        }
      ],
      "cognitive_barriers": [
        {
          "barrier": "what blocks understanding",
          "impact": "how it affects learning",
          "mitigation": "how to overcome"
        }
      ],
      "attention_points": ["concepts requiring extra focus"],
      "simplification_opportunities": ["areas that can be made clearer"]
    }
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: difficultyPrompt }],
      temperature: 0.4,
      max_tokens: 1200,
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("Difficulty analysis error:", error);
    throw new Error(
      `Failed to analyze potential difficulties: ${error.message}`
    );
  }
};

/**
 * Generate content adaptation recommendations
 */
const generateAdaptationRecommendations = (
  contentAnalysis,
  userPreferences = {}
) => {
  const recommendations = {
    pace_adjustments: [],
    content_modifications: [],
    delivery_enhancements: [],
    cognitive_supports: [],
  };

  // Pace adjustments based on content complexity and user preferences
  if (
    contentAnalysis.overall_complexity === "high" &&
    userPreferences.pace === "slow"
  ) {
    recommendations.pace_adjustments.push(
      "Extend video duration to 5-6 minutes for thorough explanation",
      "Add pauses between complex concepts",
      "Include more transition time between ideas"
    );
  } else if (
    contentAnalysis.overall_complexity === "low" &&
    userPreferences.pace === "fast"
  ) {
    recommendations.pace_adjustments.push(
      "Compress to 2-3 minutes focusing on essentials",
      "Reduce redundant explanations",
      "Increase information density"
    );
  }

  // Content modifications based on analysis
  if (contentAnalysis.complexity_factors.technical_vocabulary > 7) {
    recommendations.content_modifications.push(
      "Add definitions for technical terms",
      "Use simpler synonyms where possible",
      "Include glossary references"
    );
  }

  if (
    contentAnalysis.information_elements.concepts >
    contentAnalysis.information_elements.examples
  ) {
    recommendations.content_modifications.push(
      "Add more concrete examples",
      "Include real-world applications",
      "Use analogies to familiar concepts"
    );
  }

  // Delivery enhancements
  if (
    contentAnalysis.cognitive_demands.attention_requirements === "sustained"
  ) {
    recommendations.delivery_enhancements.push(
      "Include attention-grabbing visuals",
      "Vary vocal emphasis and pacing",
      "Add interactive elements or questions"
    );
  }

  // Cognitive supports based on learner considerations
  if (!contentAnalysis.learner_considerations.novice_friendly) {
    recommendations.cognitive_supports.push(
      "Add prerequisite knowledge check",
      "Include conceptual scaffolding",
      "Provide additional context and background"
    );
  }

  if (contentAnalysis.learner_considerations.scaffolding_needed) {
    recommendations.cognitive_supports.push(
      "Break down complex procedures into steps",
      "Use guided practice approach",
      "Provide cognitive prompts and cues"
    );
  }

  return recommendations;
};

module.exports = {
  extractKeypoints,
  analyzeContentComplexity,
  extractLearningPathways,
  analyzePotentialDifficulties,
  generateAdaptationRecommendations,
};
