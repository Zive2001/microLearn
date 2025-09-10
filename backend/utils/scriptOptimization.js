const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Optimize CLT-bLM script for target duration and learning effectiveness
 */
const optimizeScriptDuration = async (
  cltBlmScript,
  targetDuration = 240,
  options = {}
) => {
  try {
    const currentDuration = calculateScriptDuration(cltBlmScript);
    const durationDifference = currentDuration - targetDuration;
    const toleranceSeconds = options.tolerance || 20; // ±20 seconds tolerance

    console.log(
      `Current script duration: ${currentDuration}s, Target: ${targetDuration}s`
    );

    // If within tolerance, minor adjustments only
    if (Math.abs(durationDifference) <= toleranceSeconds) {
      return await minorOptimizations(cltBlmScript, targetDuration, options);
    }

    // If too long, compress content
    if (durationDifference > toleranceSeconds) {
      return await compressScript(cltBlmScript, targetDuration, options);
    }

    // If too short, expand content
    if (durationDifference < -toleranceSeconds) {
      return await expandScript(cltBlmScript, targetDuration, options);
    }

    return cltBlmScript;
  } catch (error) {
    console.error("Script optimization error:", error);
    throw new Error(`Failed to optimize script duration: ${error.message}`);
  }
};

/**
 * Calculate total script duration
 */
const calculateScriptDuration = (script) => {
  return Object.values(script).reduce((total, phase) => {
    return total + (phase.duration || 0);
  }, 0);
};

/**
 * Apply minor optimizations for scripts close to target duration
 */
const minorOptimizations = async (script, targetDuration, options) => {
  const optimizedScript = { ...script };
  const currentDuration = calculateScriptDuration(script);
  const adjustment = targetDuration - currentDuration;

  // Distribute adjustment across phases proportionally
  const phases = Object.keys(script);
  const adjustmentPerPhase = adjustment / phases.length;

  phases.forEach((phaseName) => {
    const phase = optimizedScript[phaseName];
    const newDuration = Math.max(10, phase.duration + adjustmentPerPhase);

    optimizedScript[phaseName] = {
      ...phase,
      duration: Math.round(newDuration),
      content: adjustContentForDuration(
        phase.content,
        newDuration,
        phase.duration
      ),
    };
  });

  return optimizedScript;
};

/**
 * Compress script when it's too long
 */
const compressScript = async (script, targetDuration, options) => {
  try {
    const compressionPrompt = `
    Compress this CLT-bLM educational script to fit ${targetDuration} seconds while maintaining educational effectiveness:

    CURRENT SCRIPT: ${JSON.stringify(script, null, 2)}

    COMPRESSION REQUIREMENTS:
    - Maintain CLT-bLM four-phase structure
    - Preserve core educational content
    - Keep essential learning objectives
    - Remove redundant explanations
    - Condense examples without losing clarity
    - Maintain logical flow between phases

    COMPRESSION STRATEGIES:
    - Combine related concepts
    - Use more concise language
    - Reduce transition time
    - Focus on highest-priority content
    - Eliminate non-essential details

    Return optimized script in same JSON format with updated durations and content.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: compressionPrompt }],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const compressedScript = JSON.parse(response.choices[0].message.content);

    // Validate compression maintains educational quality
    const qualityCheck = await validateCompressionQuality(
      script,
      compressedScript
    );

    return {
      ...compressedScript,
      optimization_metadata: {
        original_duration: calculateScriptDuration(script),
        compressed_duration: calculateScriptDuration(compressedScript),
        compression_ratio:
          calculateScriptDuration(compressedScript) /
          calculateScriptDuration(script),
        quality_assessment: qualityCheck,
        optimization_type: "compression",
      },
    };
  } catch (error) {
    console.error("Script compression error:", error);
    throw new Error(`Failed to compress script: ${error.message}`);
  }
};

/**
 * Expand script when it's too short
 */
const expandScript = async (script, targetDuration, options) => {
  try {
    const expansionPrompt = `
    Expand this CLT-bLM educational script to reach ${targetDuration} seconds while enhancing learning value:

    CURRENT SCRIPT: ${JSON.stringify(script, null, 2)}

    EXPANSION REQUIREMENTS:
    - Maintain CLT-bLM four-phase structure
    - Add educational value, not filler content
    - Include more examples and elaboration
    - Enhance explanations for better understanding
    - Add reflection opportunities
    - Improve transitions between concepts

    EXPANSION STRATEGIES:
    - Add concrete examples
    - Include analogies and metaphors
    - Provide additional context
    - Add checking for understanding
    - Include brief practice opportunities
    - Enhance motivational elements

    Return enhanced script in same JSON format with updated durations and content.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: expansionPrompt }],
      temperature: 0.4,
      max_tokens: 2000,
    });

    const expandedScript = JSON.parse(response.choices[0].message.content);

    // Validate expansion maintains focus and quality
    const qualityCheck = await validateExpansionQuality(script, expandedScript);

    return {
      ...expandedScript,
      optimization_metadata: {
        original_duration: calculateScriptDuration(script),
        expanded_duration: calculateScriptDuration(expandedScript),
        expansion_ratio:
          calculateScriptDuration(expandedScript) /
          calculateScriptDuration(script),
        quality_assessment: qualityCheck,
        optimization_type: "expansion",
      },
    };
  } catch (error) {
    console.error("Script expansion error:", error);
    throw new Error(`Failed to expand script: ${error.message}`);
  }
};

/**
 * Adjust content length based on duration changes
 */
const adjustContentForDuration = (content, newDuration, originalDuration) => {
  if (!content || originalDuration === 0) return content;

  const ratio = newDuration / originalDuration;

  if (ratio < 0.8) {
    // Compress content - remove non-essential words
    return content
      .replace(
        /\b(very|really|quite|rather|somewhat|actually|basically|essentially)\b/gi,
        ""
      )
      .replace(/\s+/g, " ")
      .trim();
  } else if (ratio > 1.2) {
    // Expand content - add pauses and emphasis
    return content
      .replace(/\./g, "... ")
      .replace(/,/g, ", [pause]")
      .replace(/\s+/g, " ")
      .trim();
  }

  return content;
};

/**
 * Assess script quality after optimization
 */
const assessScriptQuality = async (
  optimizedScript,
  originalObjectives
) => {
  try {
    const qualityPrompt = `
    Assess the educational quality of this optimized CLT-bLM script:

    SCRIPT: ${JSON.stringify(optimizedScript, null, 2)}
    
    ORIGINAL OBJECTIVES: ${JSON.stringify(originalObjectives, null, 2)}

    Evaluate on these dimensions:

    Return assessment in JSON format:
    {
      "overall_quality": "excellent|good|fair|poor",
      "quality_metrics": {
        "content_accuracy": 0-100,
        "learning_objective_alignment": 0-100,
        "clt_blm_adherence": 0-100,
        "cognitive_load_balance": 0-100,
        "engagement_level": 0-100,
        "clarity_and_flow": 0-100
      },
      "strengths": ["positive aspects"],
      "weaknesses": ["areas needing improvement"],
      "specific_feedback": {
        "prepare_phase": "feedback on preparation phase",
        "initiate_phase": "feedback on initiation phase", 
        "deliver_phase": "feedback on delivery phase",
        "end_phase": "feedback on conclusion phase"
      },
      "recommendations": ["suggestions for improvement"],
      "micro_video_suitability": "excellent|good|fair|poor"
    }
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: qualityPrompt }],
      temperature: 0.2,
      max_tokens: 1500,
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("Script quality assessment error:", error);
    throw new Error(`Failed to assess script quality: ${error.message}`);
  }
};

/**
 * Validate compression maintains educational quality
 */
const validateCompressionQuality = async (originalScript, compressedScript) => {
  const originalObjectives = extractObjectivesFromScript(originalScript);
  const compressedObjectives = extractObjectivesFromScript(compressedScript);

  return {
    objectives_preserved:
      compressedObjectives.length >= originalObjectives.length * 0.8,
    content_integrity: await checkContentIntegrity(
      originalScript,
      compressedScript
    ),
    clt_blm_structure: validateCLTBLMStructure(compressedScript),
    compression_effectiveness: calculateCompressionEffectiveness(
      originalScript,
      compressedScript
    ),
  };
};

/**
 * Validate expansion maintains focus and quality
 */
const validateExpansionQuality = async (originalScript, expandedScript) => {
  return {
    focus_maintained: await checkFocusMaintenance(
      originalScript,
      expandedScript
    ),
    value_added: await assessAddedValue(originalScript, expandedScript),
    clt_blm_structure: validateCLTBLMStructure(expandedScript),
    expansion_effectiveness: calculateExpansionEffectiveness(
      originalScript,
      expandedScript
    ),
  };
};

/**
 * Extract learning objectives from script content
 */
const extractObjectivesFromScript = (script) => {
  const objectives = [];

  // Look for objectives in initiate phase
  if (script.initiate && script.initiate.objectives) {
    objectives.push(...script.initiate.objectives);
  }

  // Look for objectives in other phases
  Object.values(script).forEach((phase) => {
    if (phase.learning_objectives) {
      objectives.push(...phase.learning_objectives);
    }
  });

  return objectives;
};

/**
 * Check content integrity after compression
 */
const checkContentIntegrity = async (original, compressed) => {
  const originalConcepts = extractKeyConceptsFromScript(original);
  const compressedConcepts = extractKeyConceptsFromScript(compressed);

  const preservedConcepts = originalConcepts.filter((concept) =>
    compressedConcepts.some((comp) =>
      comp.toLowerCase().includes(concept.toLowerCase())
    )
  );

  return {
    concepts_preserved_ratio:
      preservedConcepts.length / originalConcepts.length,
    critical_content_maintained:
      preservedConcepts.length >= originalConcepts.length * 0.8,
  };
};

/**
 * Validate CLT-bLM structure is maintained
 */
const validateCLTBLMStructure = (script) => {
  const requiredPhases = ["prepare", "initiate", "deliver", "end"];
  const presentPhases = Object.keys(script);

  const hasAllPhases = requiredPhases.every((phase) =>
    presentPhases.includes(phase)
  );
  const phaseBalance = checkPhaseBalance(script);

  return {
    structure_complete: hasAllPhases,
    phase_balance: phaseBalance,
    phase_progression: checkPhaseProgression(script),
  };
};

/**
 * Check balance between CLT-bLM phases
 */
const checkPhaseBalance = (script) => {
  const totalDuration = calculateScriptDuration(script);
  const phasePercentages = {};

  Object.keys(script).forEach((phase) => {
    phasePercentages[phase] = (script[phase].duration / totalDuration) * 100;
  });

  // Expected percentages for CLT-bLM
  const expectedRanges = {
    prepare: [10, 20],
    initiate: [15, 25],
    deliver: [45, 65],
    end: [10, 20],
  };

  const balanceScore = Object.keys(expectedRanges).reduce((score, phase) => {
    const percentage = phasePercentages[phase] || 0;
    const [min, max] = expectedRanges[phase];

    if (percentage >= min && percentage <= max) {
      return score + 1;
    } else if (percentage >= min * 0.8 && percentage <= max * 1.2) {
      return score + 0.5;
    }
    return score;
  }, 0);

  return {
    balance_score: balanceScore / 4,
    phase_percentages: phasePercentages,
    within_expected_ranges: balanceScore >= 3,
  };
};

/**
 * Check logical progression between phases
 */
const checkPhaseProgression = (script) => {
  const progressionChecks = {
    prepare_to_initiate: checkContentFlow(
      script.prepare?.content,
      script.initiate?.content
    ),
    initiate_to_deliver: checkContentFlow(
      script.initiate?.content,
      script.deliver?.content
    ),
    deliver_to_end: checkContentFlow(
      script.deliver?.content,
      script.end?.content
    ),
  };

  const progressionScore =
    Object.values(progressionChecks).reduce((sum, check) => sum + check, 0) / 3;

  return {
    progression_score: progressionScore,
    progression_checks: progressionChecks,
    smooth_transitions: progressionScore >= 0.7,
  };
};

/**
 * Check content flow between phases
 */
const checkContentFlow = (fromContent, toContent) => {
  if (!fromContent || !toContent) return 0;

  const fromWords = new Set(fromContent.toLowerCase().split(/\s+/));
  const toWords = new Set(toContent.toLowerCase().split(/\s+/));

  // Calculate overlap in vocabulary (simple heuristic for content connection)
  const commonWords = new Set(
    [...fromWords].filter((word) => toWords.has(word))
  );
  const overlapRatio =
    commonWords.size / Math.min(fromWords.size, toWords.size);

  return Math.min(overlapRatio * 2, 1); // Scale to 0-1 range
};

/**
 * Extract key concepts from script
 */
const extractKeyConceptsFromScript = (script) => {
  const concepts = [];

  Object.values(script).forEach((phase) => {
    if (phase.core_concepts) {
      concepts.push(...phase.core_concepts);
    }
    if (phase.keypoints) {
      concepts.push(...phase.keypoints);
    }
    if (phase.summary_points) {
      concepts.push(...phase.summary_points);
    }
  });

  return [...new Set(concepts)]; // Remove duplicates
};

/**
 * Calculate compression effectiveness
 */
const calculateCompressionEffectiveness = (original, compressed) => {
  const originalDuration = calculateScriptDuration(original);
  const compressedDuration = calculateScriptDuration(compressed);
  const compressionRatio = compressedDuration / originalDuration;

  const originalWordCount = countWordsInScript(original);
  const compressedWordCount = countWordsInScript(compressed);
  const wordCompressionRatio = compressedWordCount / originalWordCount;

  return {
    time_compression_ratio: compressionRatio,
    word_compression_ratio: wordCompressionRatio,
    efficiency_score: (1 - compressionRatio) / (1 - wordCompressionRatio), // How much time saved per word removed
    effective_compression: compressionRatio > 0.7 && compressionRatio < 0.95,
  };
};

/**
 * Calculate expansion effectiveness
 */
const calculateExpansionEffectiveness = (original, expanded) => {
  const originalDuration = calculateScriptDuration(original);
  const expandedDuration = calculateScriptDuration(expanded);
  const expansionRatio = expandedDuration / originalDuration;

  const originalWordCount = countWordsInScript(original);
  const expandedWordCount = countWordsInScript(expanded);
  const wordExpansionRatio = expandedWordCount / originalWordCount;

  return {
    time_expansion_ratio: expansionRatio,
    word_expansion_ratio: wordExpansionRatio,
    content_density: wordExpansionRatio / expansionRatio, // Words added per time unit
    effective_expansion: expansionRatio < 1.5 && wordExpansionRatio > 1.1,
  };
};

/**
 * Count words in script
 */
const countWordsInScript = (script) => {
  let totalWords = 0;

  Object.values(script).forEach((phase) => {
    if (phase.content) {
      totalWords += phase.content.split(/\s+/).length;
    }
  });

  return totalWords;
};

/**
 * Check focus maintenance in expanded script
 */
const checkFocusMaintenance = async (original, expanded) => {
  const originalTopics = extractKeyConceptsFromScript(original);
  const expandedTopics = extractKeyConceptsFromScript(expanded);

  const newTopics = expandedTopics.filter(
    (topic) =>
      !originalTopics.some((orig) =>
        orig.toLowerCase().includes(topic.toLowerCase())
      )
  );

  return {
    new_topics_introduced: newTopics.length,
    focus_drift: newTopics.length > originalTopics.length * 0.3,
    topic_coherence: newTopics.length / expandedTopics.length < 0.2,
  };
};

/**
 * Assess value added by expansion
 */
const assessAddedValue = async (original, expanded) => {
  const addedContent = {
    examples_added: countAddedExamples(original, expanded),
    explanations_enhanced: countEnhancedExplanations(original, expanded),
    practice_opportunities: countPracticeOpportunities(expanded),
    reflection_points: countReflectionPoints(expanded),
  };

  const valueScore =
    Object.values(addedContent).reduce(
      (sum, count) => sum + Math.min(count, 3),
      0
    ) / 12;

  return {
    ...addedContent,
    value_score: valueScore,
    meaningful_addition: valueScore > 0.4,
  };
};

/**
 * Helper functions for content analysis
 */
const countAddedExamples = (original, expanded) => {
  const originalExamples = countExamplesInScript(original);
  const expandedExamples = countExamplesInScript(expanded);
  return Math.max(0, expandedExamples - originalExamples);
};

const countEnhancedExplanations = (original, expanded) => {
  // Simple heuristic: count increased explanation length
  const originalLength = countWordsInScript(original);
  const expandedLength = countWordsInScript(expanded);
  const lengthIncrease = expandedLength - originalLength;

  return Math.floor(lengthIncrease / 50); // Assume 50 words per enhanced explanation
};

const countExamplesInScript = (script) => {
  let exampleCount = 0;

  Object.values(script).forEach((phase) => {
    if (phase.examples) {
      exampleCount += phase.examples.length;
    }
    if (
      phase.content &&
      /\b(example|for instance|such as|like)\b/gi.test(phase.content)
    ) {
      exampleCount += (
        phase.content.match(/\b(example|for instance|such as|like)\b/gi) || []
      ).length;
    }
  });

  return exampleCount;
};

const countPracticeOpportunities = (script) => {
  let practiceCount = 0;

  Object.values(script).forEach((phase) => {
    if (
      phase.content &&
      /\b(practice|try|attempt|exercise|activity)\b/gi.test(phase.content)
    ) {
      practiceCount += (
        phase.content.match(/\b(practice|try|attempt|exercise|activity)\b/gi) ||
        []
      ).length;
    }
  });

  return practiceCount;
};

const countReflectionPoints = (script) => {
  let reflectionCount = 0;

  Object.values(script).forEach((phase) => {
    if (phase.reflection_questions) {
      reflectionCount += phase.reflection_questions.length;
    }
    if (
      phase.content &&
      /\b(think about|consider|reflect|ponder)\b/gi.test(phase.content)
    ) {
      reflectionCount += (
        phase.content.match(/\b(think about|consider|reflect|ponder)\b/gi) || []
      ).length;
    }
  });

  return reflectionCount;
};

module.exports = {
  optimizeScriptDuration,
  assessScriptQuality,
  calculateScriptDuration,
};
