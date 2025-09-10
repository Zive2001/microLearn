/**
 * Cognitive Load Theory Calculator for CLT-bLM Framework
 *
 * Calculates three types of cognitive load:
 * - Intrinsic Load: inherent complexity of the material
 * - Extraneous Load: poor instructional design elements
 * - Germane Load: processing that contributes to schema construction
 */

/**
 * Calculate comprehensive cognitive load analysis
 */
const calculateCognitiveLoad = (
  contentAnalysis,
  userPreferences = {}
) => {
  try {
    // Calculate individual load components
    const intrinsicLoad = calculateIntrinsicLoad(
      contentAnalysis,
      userPreferences
    );
    const extraneousLoad = calculateExtraneousLoad(
      contentAnalysis,
      userPreferences
    );
    const germaneLoad = calculateGermaneLoad(contentAnalysis, userPreferences);

    // Calculate total cognitive load
    const totalLoad =
      intrinsicLoad.score + extraneousLoad.score + germaneLoad.score;

    // Determine load management strategy
    const managementStrategy = determineLoadManagementStrategy(
      intrinsicLoad,
      extraneousLoad,
      germaneLoad
    );

    // Generate optimization recommendations
    const optimizations = generateLoadOptimizations(
      intrinsicLoad,
      extraneousLoad,
      germaneLoad,
      userPreferences
    );

    return {
      intrinsic: intrinsicLoad,
      extraneous: extraneousLoad,
      germane: germaneLoad,
      total: {
        score: Math.round(totalLoad * 100) / 100,
        level: categorizeLoadLevel(totalLoad),
        capacity_utilization: Math.round((totalLoad / 3) * 100), // Percentage of cognitive capacity
      },
      management_strategy: managementStrategy,
      optimizations: optimizations,
      analysis_metadata: {
        timestamp: new Date().toISOString(),
        version: "1.0",
        framework: "CLT-bLM",
      },
    };
  } catch (error) {
    console.error("Cognitive load calculation error:", error);
    throw new Error(`Failed to calculate cognitive load: ${error.message}`);
  }
};

/**
 * Calculate Intrinsic Cognitive Load
 * Based on the inherent complexity of the learning material
 */
const calculateIntrinsicLoad = (contentAnalysis, userPreferences) => {
  let score = 0.5; // Base score
  const factors = {};

  // Content complexity factor
  const complexityMap = { low: 0.2, medium: 0.5, high: 0.8 };
  const complexityFactor =
    complexityMap[contentAnalysis.overall_complexity] || 0.5;
  factors.content_complexity = complexityFactor;
  score += complexityFactor * 0.3;

  // Conceptual density factor
  const densityFactor = Math.min(contentAnalysis.conceptual_density || 0.5, 1);
  factors.conceptual_density = densityFactor;
  score += densityFactor * 0.25;

  // Abstract concepts factor
  const abstractFactor = Math.min(
    (contentAnalysis.abstract_concepts || 5) / 10,
    1
  );
  factors.abstract_concepts = abstractFactor;
  score += abstractFactor * 0.2;

  // Information elements complexity
  const infoElements = contentAnalysis.information_elements || {};
  const elementComplexity = calculateElementComplexity(infoElements);
  factors.information_elements = elementComplexity;
  score += elementComplexity * 0.15;

  // User expertise adjustment
  const expertiseAdjustment = calculateExpertiseAdjustment(userPreferences);
  factors.expertise_adjustment = expertiseAdjustment;
  score *= expertiseAdjustment;

  // Normalize score to 0-1 range
  score = Math.min(Math.max(score, 0), 1);

  return {
    score: Math.round(score * 100) / 100,
    level: categorizeLoadLevel(score),
    factors: factors,
    description: generateIntrinsicLoadDescription(score, factors),
    recommendations: generateIntrinsicLoadRecommendations(score, factors),
  };
};

/**
 * Calculate Extraneous Cognitive Load
 * Based on instructional design quality and presentation factors
 */
const calculateExtraneousLoad = (contentAnalysis, userPreferences) => {
  let score = 0.3; // Start with low base (good instructional design)
  const factors = {};

  // Technical vocabulary burden
  const vocabFactor = Math.min(
    (contentAnalysis.complexity_factors?.technical_vocabulary || 5) / 10,
    1
  );
  factors.technical_vocabulary = vocabFactor;
  score += vocabFactor * 0.2;

  // Sentence complexity factor
  const sentenceFactor = Math.min(
    (contentAnalysis.complexity_factors?.sentence_complexity || 5) / 10,
    1
  );
  factors.sentence_complexity = sentenceFactor;
  score += sentenceFactor * 0.15;

  // Logical structure clarity
  const structureMap = { simple: 0.1, moderate: 0.3, complex: 0.6 };
  const structureFactor =
    structureMap[contentAnalysis.complexity_factors?.logical_structure] || 0.3;
  factors.logical_structure = structureFactor;
  score += structureFactor * 0.2;

  // Information presentation factors
  const presentationFactor = calculatePresentationLoad(contentAnalysis);
  factors.presentation_quality = presentationFactor;
  score += presentationFactor * 0.2;

  // Cognitive demands mismatch
  const demandsFactor = calculateCognitiveDemandsMismatch(
    contentAnalysis,
    userPreferences
  );
  factors.demands_mismatch = demandsFactor;
  score += demandsFactor * 0.15;

  // Attention splitting factors
  const attentionFactor = calculateAttentionSplitting(contentAnalysis);
  factors.attention_splitting = attentionFactor;
  score += attentionFactor * 0.1;

  // Normalize score to 0-1 range
  score = Math.min(Math.max(score, 0), 1);

  return {
    score: Math.round(score * 100) / 100,
    level: categorizeLoadLevel(score),
    factors: factors,
    description: generateExtraneousLoadDescription(score, factors),
    recommendations: generateExtraneousLoadRecommendations(score, factors),
  };
};

/**
 * Calculate Germane Cognitive Load
 * Based on processing that contributes to learning and schema construction
 */
const calculateGermaneLoad = (contentAnalysis, userPreferences) => {
  let score = 0.4; // Base score for learning-oriented processing
  const factors = {};

  // Schema construction potential
  const schemaFactor = calculateSchemaConstructionPotential(contentAnalysis);
  factors.schema_construction = schemaFactor;
  score += schemaFactor * 0.3;

  // Transfer potential
  const transferFactor = calculateTransferPotential(contentAnalysis);
  factors.transfer_potential = transferFactor;
  score += transferFactor * 0.25;

  // Metacognitive engagement
  const metacognitiveFactor = calculateMetacognitiveEngagement(
    contentAnalysis,
    userPreferences
  );
  factors.metacognitive_engagement = metacognitiveFactor;
  score += metacognitiveFactor * 0.2;

  // Elaboration opportunities
  const elaborationFactor = calculateElaborationOpportunities(contentAnalysis);
  factors.elaboration_opportunities = elaborationFactor;
  score += elaborationFactor * 0.15;

  // Learning goal alignment
  const alignmentFactor = calculateLearningGoalAlignment(
    contentAnalysis,
    userPreferences
  );
  factors.goal_alignment = alignmentFactor;
  score += alignmentFactor * 0.1;

  // Normalize score to 0-1 range
  score = Math.min(Math.max(score, 0), 1);

  return {
    score: Math.round(score * 100) / 100,
    level: categorizeLoadLevel(score),
    factors: factors,
    description: generateGermaneLoadDescription(score, factors),
    recommendations: generateGermaneLoadRecommendations(score, factors),
  };
};

/**
 * Helper functions for load calculations
 */

const calculateElementComplexity = (infoElements) => {
  const {
    facts = 0,
    concepts = 0,
    procedures = 0,
    principles = 0,
  } = infoElements;

  // Weight different element types by cognitive complexity
  const weightedComplexity =
    facts * 0.2 + concepts * 0.4 + procedures * 0.6 + principles * 0.8;
  const totalElements = facts + concepts + procedures + principles;

  return totalElements > 0
    ? Math.min(weightedComplexity / totalElements, 1)
    : 0.3;
};

const calculateExpertiseAdjustment = (userPreferences) => {
  const experienceLevel = userPreferences.experienceLevel || "intermediate";

  const adjustmentMap = {
    novice: 1.3, // Higher intrinsic load for novices
    beginner: 1.2,
    intermediate: 1.0, // Baseline
    advanced: 0.8, // Lower intrinsic load for experts
    expert: 0.6,
  };

  return adjustmentMap[experienceLevel] || 1.0;
};

const calculatePresentationLoad = (contentAnalysis) => {
  let presentationLoad = 0.2; // Base good presentation

  // Higher load if content is not novice-friendly
  if (!contentAnalysis.learner_considerations?.novice_friendly) {
    presentationLoad += 0.2;
  }

  // Higher load if scaffolding is needed but not provided
  if (contentAnalysis.learner_considerations?.scaffolding_needed) {
    presentationLoad += 0.15;
  }

  // Adjust for logical structure complexity
  const structureMap = { simple: 0, moderate: 0.1, complex: 0.25 };
  const structureComplexity =
    contentAnalysis.complexity_factors?.logical_structure || "moderate";
  presentationLoad += structureMap[structureComplexity] || 0.1;

  return Math.min(presentationLoad, 1);
};

const calculateCognitiveDemandsMismatch = (
  contentAnalysis,
  userPreferences
) => {
  const demands = contentAnalysis.cognitive_demands || {};
  const userPace = userPreferences.pace || "moderate";

  let mismatch = 0;

  // Processing speed mismatch
  if (demands.processing_speed === "fast" && userPace === "slow") {
    mismatch += 0.3;
  } else if (demands.processing_speed === "slow" && userPace === "fast") {
    mismatch += 0.2;
  }

  // Working memory load vs user capacity
  const memoryLoadMap = { low: 0.2, medium: 0.5, high: 0.8 };
  const memoryLoad = memoryLoadMap[demands.working_memory_load] || 0.5;
  const userCapacity = userPreferences.workingMemoryCapacity || 0.7;

  if (memoryLoad > userCapacity) {
    mismatch += (memoryLoad - userCapacity) * 0.5;
  }

  return Math.min(mismatch, 1);
};

const calculateAttentionSplitting = (contentAnalysis) => {
  const attentionReq =
    contentAnalysis.cognitive_demands?.attention_requirements || "focused";

  const splittingMap = {
    focused: 0.1, // Low splitting
    sustained: 0.2, // Moderate splitting
    divided: 0.4, // High splitting
  };

  return splittingMap[attentionReq] || 0.2;
};

const calculateSchemaConstructionPotential = (contentAnalysis) => {
  let potential = 0.3;

  // Higher potential if content has clear conceptual structure
  if (contentAnalysis.complexity_factors?.logical_structure === "simple") {
    potential += 0.2;
  }

  // Higher potential if principles are present (help build schemas)
  const principles = contentAnalysis.information_elements?.principles || 0;
  potential += Math.min(principles / 5, 0.3);

  // Educational patterns that support schema construction
  const patterns = contentAnalysis.educational_patterns || {};
  if (patterns.has_examples) potential += 0.1;
  if (patterns.has_analogies) potential += 0.1;

  return Math.min(potential, 1);
};

const calculateTransferPotential = (contentAnalysis) => {
  let potential = 0.2;

  // Higher transfer potential for principles and concepts
  const principles = contentAnalysis.information_elements?.principles || 0;
  const concepts = contentAnalysis.information_elements?.concepts || 0;

  potential += Math.min((principles + concepts) / 10, 0.4);

  // Abstract concepts have higher transfer potential
  potential += Math.min(contentAnalysis.abstract_concepts / 20, 0.3);

  return Math.min(potential, 1);
};

const calculateMetacognitiveEngagement = (contentAnalysis, userPreferences) => {
  let engagement = 0.3;

  // User's metacognitive preference
  if (userPreferences.metacognitiveSupport) {
    engagement += 0.2;
  }

  // Content complexity encourages metacognitive engagement
  const complexityMap = { low: 0.1, medium: 0.2, high: 0.3 };
  engagement += complexityMap[contentAnalysis.overall_complexity] || 0.2;

  return Math.min(engagement, 1);
};

const calculateElaborationOpportunities = (contentAnalysis) => {
  let opportunities = 0.2;

  // Examples and analogies provide elaboration opportunities
  const patterns = contentAnalysis.educational_patterns || {};
  if (patterns.has_examples) opportunities += 0.2;
  if (patterns.has_analogies) opportunities += 0.2;
  if (patterns.has_definitions) opportunities += 0.1;

  // Higher-level concepts provide more elaboration opportunities
  opportunities += Math.min(contentAnalysis.abstract_concepts / 20, 0.3);

  return Math.min(opportunities, 1);
};

const calculateLearningGoalAlignment = (contentAnalysis, userPreferences) => {
  let alignment = 0.5; // Base alignment

  // Alignment with user's preferred Bloom's level
  const userBloom = userPreferences.bloomPreference || "understand";
  const contentBloom = contentAnalysis.dominant_bloom_level || "understand";

  if (userBloom === contentBloom) {
    alignment += 0.2;
  } else {
    // Penalize misalignment
    alignment -= 0.1;
  }

  // Alignment with user's subject interest
  if (
    userPreferences.preferredSubjects?.includes(contentAnalysis.subject_area)
  ) {
    alignment += 0.2;
  }

  return Math.min(Math.max(alignment, 0), 1);
};

/**
 * Categorize load levels
 */
const categorizeLoadLevel = (score) => {
  if (score < 0.3) return "low";
  if (score < 0.6) return "moderate";
  if (score < 0.8) return "high";
  return "very_high";
};

/**
 * Determine load management strategy
 */
const determineLoadManagementStrategy = (intrinsic, extraneous, germane) => {
  const strategy = {
    primary_focus: "",
    actions: [],
    rationale: "",
  };

  if (extraneous.score > 0.6) {
    strategy.primary_focus = "reduce_extraneous";
    strategy.actions = [
      "Simplify presentation format",
      "Improve logical structure",
      "Reduce unnecessary complexity",
    ];
    strategy.rationale = "High extraneous load is impeding learning efficiency";
  } else if (intrinsic.score > 0.7) {
    strategy.primary_focus = "manage_intrinsic";
    strategy.actions = [
      "Break content into smaller chunks",
      "Provide additional scaffolding",
      "Use worked examples",
    ];
    strategy.rationale = "Content complexity requires careful management";
  } else if (germane.score < 0.4) {
    strategy.primary_focus = "enhance_germane";
    strategy.actions = [
      "Add reflection opportunities",
      "Include elaboration prompts",
      "Connect to prior knowledge",
    ];
    strategy.rationale = "Insufficient processing for schema construction";
  } else {
    strategy.primary_focus = "maintain_balance";
    strategy.actions = [
      "Maintain current approach",
      "Monitor for cognitive overload",
      "Fine-tune as needed",
    ];
    strategy.rationale = "Cognitive load is well-balanced";
  }

  return strategy;
};

/**
 * Generate load optimization recommendations
 */
const generateLoadOptimizations = (
  intrinsic,
  extraneous,
  germane,
  userPreferences
) => {
  const optimizations = {
    immediate: [],
    content_design: [],
    delivery_method: [],
    user_support: [],
  };

  // Immediate optimizations
  if (extraneous.score > 0.5) {
    optimizations.immediate.push("Simplify technical language");
    optimizations.immediate.push("Improve content organization");
  }

  if (intrinsic.score > 0.6) {
    optimizations.immediate.push("Reduce content scope");
    optimizations.immediate.push("Add prerequisite review");
  }

  // Content design optimizations
  if (germane.score < 0.5) {
    optimizations.content_design.push("Add practice opportunities");
    optimizations.content_design.push("Include real-world connections");
  }

  // Delivery method optimizations
  if (userPreferences.pace === "slow" && intrinsic.score > 0.5) {
    optimizations.delivery_method.push("Extend video duration");
    optimizations.delivery_method.push("Add pauses for processing");
  }

  // User support optimizations
  if (extraneous.score > 0.4) {
    optimizations.user_support.push("Provide concept glossary");
    optimizations.user_support.push("Add visual aids");
  }

  return optimizations;
};

/**
 * Description generators for each load type
 */
const generateIntrinsicLoadDescription = (score, factors) => {
  if (score < 0.3)
    return "Content has low inherent complexity, suitable for quick learning";
  if (score < 0.6)
    return "Content has moderate complexity requiring focused attention";
  if (score < 0.8)
    return "Content is complex and may require additional support";
  return "Content is highly complex and needs careful instructional design";
};

const generateExtraneousLoadDescription = (score, factors) => {
  if (score < 0.3)
    return "Well-designed presentation with minimal cognitive interference";
  if (score < 0.6) return "Some presentation issues that could be improved";
  if (score < 0.8) return "Presentation creates significant cognitive burden";
  return "Poor presentation design severely impedes learning";
};

const generateGermaneLoadDescription = (score, factors) => {
  if (score < 0.3)
    return "Limited opportunities for deep learning and schema construction";
  if (score < 0.6) return "Moderate support for meaningful learning processes";
  if (score < 0.8)
    return "Good opportunities for knowledge construction and transfer";
  return "Excellent support for deep learning and understanding";
};

/**
 * Recommendation generators for each load type
 */
const generateIntrinsicLoadRecommendations = (score, factors) => {
  const recommendations = [];

  if (score > 0.6) {
    recommendations.push("Consider breaking into multiple micro-videos");
    recommendations.push("Add worked examples to reduce cognitive burden");
  }

  if (factors.abstract_concepts > 0.6) {
    recommendations.push("Use concrete analogies for abstract concepts");
  }

  if (factors.conceptual_density > 0.7) {
    recommendations.push("Reduce information density per minute");
  }

  return recommendations;
};

const generateExtraneousLoadRecommendations = (score, factors) => {
  const recommendations = [];

  if (factors.technical_vocabulary > 0.5) {
    recommendations.push("Define technical terms clearly");
    recommendations.push("Use simpler language where possible");
  }

  if (factors.logical_structure > 0.4) {
    recommendations.push("Improve content organization and flow");
    recommendations.push("Add clear transitions between topics");
  }

  if (factors.presentation_quality > 0.4) {
    recommendations.push("Enhance visual design and clarity");
  }

  return recommendations;
};

const generateGermaneLoadRecommendations = (score, factors) => {
  const recommendations = [];

  if (score < 0.5) {
    recommendations.push("Add reflection questions to promote deeper thinking");
    recommendations.push("Include opportunities for learner elaboration");
    recommendations.push("Connect new concepts to prior knowledge");
  }

  if (factors.schema_construction < 0.4) {
    recommendations.push("Provide conceptual frameworks and organizers");
    recommendations.push("Use examples that show underlying patterns");
  }

  if (factors.transfer_potential < 0.4) {
    recommendations.push("Highlight applications in different contexts");
    recommendations.push("Discuss generalizable principles");
  }

  return recommendations;
};

/**
 * Calculate optimal cognitive load distribution for CLT-bLM phases
 */
const calculateOptimalPhaseDistribution = (
  totalCognitiveLoad,
  userPreferences = {}
) => {
  const { intrinsic, extraneous, germane } = totalCognitiveLoad;

  // Base distribution for CLT-bLM phases
  const baseDistribution = {
    prepare: { intrinsic: 0.2, extraneous: 0.1, germane: 0.3 },
    initiate: { intrinsic: 0.3, extraneous: 0.2, germane: 0.4 },
    deliver: { intrinsic: 0.8, extraneous: 0.3, germane: 0.7 },
    end: { intrinsic: 0.2, extraneous: 0.1, germane: 0.5 },
  };

  // Adjust distribution based on content characteristics
  const adjustedDistribution = {};

  Object.keys(baseDistribution).forEach((phase) => {
    adjustedDistribution[phase] = {
      intrinsic: adjustPhaseLoad(
        baseDistribution[phase].intrinsic,
        intrinsic.score,
        phase,
        "intrinsic"
      ),
      extraneous: adjustPhaseLoad(
        baseDistribution[phase].extraneous,
        extraneous.score,
        phase,
        "extraneous"
      ),
      germane: adjustPhaseLoad(
        baseDistribution[phase].germane,
        germane.score,
        phase,
        "germane"
      ),
    };

    // Calculate total load for this phase
    const phaseTotal =
      adjustedDistribution[phase].intrinsic +
      adjustedDistribution[phase].extraneous +
      adjustedDistribution[phase].germane;

    adjustedDistribution[phase].total = Math.round(phaseTotal * 100) / 100;
    adjustedDistribution[phase].level = categorizeLoadLevel(phaseTotal / 3);
  });

  return {
    phase_distribution: adjustedDistribution,
    recommendations: generatePhaseRecommendations(adjustedDistribution),
    optimal_duration_allocation:
      calculateOptimalDurationAllocation(adjustedDistribution),
  };
};

/**
 * Adjust phase load based on overall content characteristics
 */
const adjustPhaseLoad = (baseLoad, overallScore, phase, loadType) => {
  let adjusted = baseLoad;

  // Adjust based on overall score
  if (overallScore > 0.7) {
    // High overall load - reduce load in non-critical phases
    if (phase === "prepare" || phase === "end") {
      adjusted *= 0.8;
    }
  } else if (overallScore < 0.3) {
    // Low overall load - can increase germane load for better learning
    if (loadType === "germane") {
      adjusted *= 1.2;
    }
  }

  // Phase-specific adjustments
  if (phase === "deliver") {
    // Deliver phase should handle most intrinsic load
    if (loadType === "intrinsic") {
      adjusted = Math.min(adjusted * overallScore, 1);
    }
  }

  return Math.round(adjusted * 100) / 100;
};

/**
 * Generate recommendations for phase optimization
 */
const generatePhaseRecommendations = (phaseDistribution) => {
  const recommendations = {};

  Object.keys(phaseDistribution).forEach((phase) => {
    const phaseData = phaseDistribution[phase];
    recommendations[phase] = [];

    if (phaseData.total > 2.0) {
      recommendations[phase].push(`Reduce cognitive load in ${phase} phase`);

      if (phaseData.extraneous > 0.4) {
        recommendations[phase].push(
          "Simplify presentation and reduce distractions"
        );
      }

      if (phaseData.intrinsic > 0.6 && phase !== "deliver") {
        recommendations[phase].push("Move complex content to deliver phase");
      }
    }

    if (phaseData.germane < 0.3 && (phase === "deliver" || phase === "end")) {
      recommendations[phase].push("Add opportunities for deeper processing");
    }

    // Phase-specific recommendations
    switch (phase) {
      case "prepare":
        if (phaseData.intrinsic > 0.3) {
          recommendations[phase].push(
            "Keep preparation simple and focused on activation"
          );
        }
        break;

      case "initiate":
        if (phaseData.total > 1.0) {
          recommendations[phase].push("Streamline objective presentation");
        }
        break;

      case "deliver":
        if (phaseData.total > 2.5) {
          recommendations[phase].push(
            "Consider breaking into multiple segments"
          );
        }
        break;

      case "end":
        if (phaseData.germane < 0.4) {
          recommendations[phase].push(
            "Enhance reflection and consolidation activities"
          );
        }
        break;
    }
  });

  return recommendations;
};

/**
 * Calculate optimal duration allocation based on cognitive load
 */
const calculateOptimalDurationAllocation = (phaseDistribution) => {
  const totalLoad = Object.values(phaseDistribution).reduce(
    (sum, phase) => sum + phase.total,
    0
  );

  // Base duration percentages for CLT-bLM
  const baseDurations = {
    prepare: 0.15, // 15%
    initiate: 0.2, // 20%
    deliver: 0.5, // 50%
    end: 0.15, // 15%
  };

  // Adjust based on cognitive load distribution
  const adjustedDurations = {};
  let totalAdjustment = 0;

  Object.keys(baseDurations).forEach((phase) => {
    const loadRatio = phaseDistribution[phase].total / totalLoad;
    const adjustment = (loadRatio - baseDurations[phase]) * 0.3; // 30% max adjustment
    adjustedDurations[phase] = Math.max(
      0.05,
      baseDurations[phase] + adjustment
    );
    totalAdjustment += adjustedDurations[phase];
  });

  // Normalize to ensure total equals 1
  Object.keys(adjustedDurations).forEach((phase) => {
    adjustedDurations[phase] =
      Math.round((adjustedDurations[phase] / totalAdjustment) * 100) / 100;
  });

  return {
    percentages: adjustedDurations,
    seconds_240: calculateSecondsAllocation(adjustedDurations, 240),
    seconds_300: calculateSecondsAllocation(adjustedDurations, 300),
    seconds_360: calculateSecondsAllocation(adjustedDurations, 360),
  };
};

/**
 * Calculate seconds allocation for given total duration
 */
const calculateSecondsAllocation = (percentages, totalSeconds) => {
  const allocation = {};
  Object.keys(percentages).forEach((phase) => {
    allocation[phase] = Math.round(percentages[phase] * totalSeconds);
  });
  return allocation;
};

/**
 * Validate cognitive load configuration
 */
const validateCognitiveLoadConfiguration = (
  loadAnalysis,
  targetAudience = "general"
) => {
  const validation = {
    is_valid: true,
    warnings: [],
    errors: [],
    recommendations: [],
  };

  const { intrinsic, extraneous, germane, total } = loadAnalysis;

  // Check for cognitive overload
  if (total.score > 2.5) {
    validation.errors.push("Total cognitive load exceeds recommended limits");
    validation.is_valid = false;
  }

  if (total.score > 2.0) {
    validation.warnings.push(
      "High cognitive load may impact learning effectiveness"
    );
  }

  // Check extraneous load
  if (extraneous.score > 0.6) {
    validation.warnings.push(
      "High extraneous load indicates poor instructional design"
    );
    validation.recommendations.push(
      "Improve content presentation and organization"
    );
  }

  // Check germane load
  if (germane.score < 0.3) {
    validation.warnings.push("Low germane load may limit deep learning");
    validation.recommendations.push(
      "Add opportunities for elaboration and reflection"
    );
  }

  // Target audience specific validation
  if (targetAudience === "novice" && intrinsic.score > 0.6) {
    validation.warnings.push("Content may be too complex for novice learners");
    validation.recommendations.push(
      "Consider additional scaffolding or prerequisite content"
    );
  }

  if (targetAudience === "expert" && intrinsic.score < 0.3) {
    validation.warnings.push("Content may be too simple for expert learners");
    validation.recommendations.push(
      "Increase complexity or focus on advanced applications"
    );
  }

  return validation;
};

module.exports = {
  calculateCognitiveLoad,
  calculateOptimalPhaseDistribution,
  validateCognitiveLoadConfiguration,
};
