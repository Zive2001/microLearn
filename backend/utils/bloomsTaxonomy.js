const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Bloom's Taxonomy levels with detailed descriptors
 */
const BLOOMS_LEVELS = {
  remember: {
    level: 1,
    description: "Retrieving, recognizing, and recalling relevant knowledge",
    action_verbs: [
      "define",
      "list",
      "recall",
      "recognize",
      "retrieve",
      "name",
      "locate",
      "identify",
    ],
    cognitive_processes: ["recognizing", "recalling"],
    examples: [
      "Define key terms",
      "List main components",
      "Recall basic facts",
    ],
  },
  understand: {
    level: 2,
    description: "Constructing meaning from instructional messages",
    action_verbs: [
      "interpret",
      "explain",
      "classify",
      "summarize",
      "compare",
      "translate",
      "paraphrase",
    ],
    cognitive_processes: [
      "interpreting",
      "exemplifying",
      "classifying",
      "summarizing",
      "inferring",
      "comparing",
      "explaining",
    ],
    examples: [
      "Explain concepts in your own words",
      "Compare different approaches",
      "Summarize main ideas",
    ],
  },
  apply: {
    level: 3,
    description: "Carrying out or using a procedure in a given situation",
    action_verbs: [
      "execute",
      "implement",
      "use",
      "demonstrate",
      "operate",
      "schedule",
      "sketch",
    ],
    cognitive_processes: ["executing", "implementing"],
    examples: [
      "Solve problems using learned procedures",
      "Apply rules to new situations",
      "Use knowledge in practice",
    ],
  },
  analyze: {
    level: 4,
    description:
      "Breaking material into constituent parts and detecting relationships",
    action_verbs: [
      "differentiate",
      "organize",
      "attribute",
      "compare",
      "deconstruct",
      "outline",
      "structure",
    ],
    cognitive_processes: ["differentiating", "organizing", "attributing"],
    examples: [
      "Break down complex problems",
      "Identify cause and effect",
      "Compare and contrast concepts",
    ],
  },
  evaluate: {
    level: 5,
    description: "Making judgments based on criteria and standards",
    action_verbs: [
      "check",
      "critique",
      "judge",
      "test",
      "detect",
      "monitor",
      "rank",
      "assess",
    ],
    cognitive_processes: ["checking", "critiquing"],
    examples: [
      "Assess quality of solutions",
      "Critique arguments",
      "Judge effectiveness of approaches",
    ],
  },
  create: {
    level: 6,
    description:
      "Putting elements together to form a coherent whole or original product",
    action_verbs: [
      "generate",
      "plan",
      "produce",
      "design",
      "construct",
      "devise",
      "formulate",
    ],
    cognitive_processes: ["generating", "planning", "producing"],
    examples: [
      "Design new solutions",
      "Create original works",
      "Develop innovative approaches",
    ],
  },
};

/**
 * Generate learning objectives based on keypoints and target Bloom's level
 */
const generateLearningObjectives = async (
  keypoints,
  targetBloomLevel = "understand",
  options = {}
) => {
  try {
    const bloomsData = BLOOMS_LEVELS[targetBloomLevel];
    if (!bloomsData) {
      throw new Error(`Invalid Bloom's level: ${targetBloomLevel}`);
    }

    const objectivePrompt = `
    Generate specific, measurable learning objectives for educational content about these keypoints:

    KEYPOINTS: ${keypoints
      .slice(0, 8)
      .map((k) => (typeof k === "object" ? k.concept : k))
      .join(", ")}

    TARGET BLOOM'S LEVEL: ${targetBloomLevel} (${bloomsData.description})
    ACTION VERBS TO USE: ${bloomsData.action_verbs.slice(0, 6).join(", ")}

    REQUIREMENTS:
    - Create 3-5 specific learning objectives
    - Use appropriate action verbs for ${targetBloomLevel} level
    - Make objectives measurable and achievable in 2-6 minutes
    - Focus on most important concepts
    - Align with micro-video format

    Return JSON format:
    {
      "objectives": [
        {
          "statement": "By the end of this video, you will be able to [action verb] [specific content]",
          "bloom_level": "${targetBloomLevel}",
          "action_verb": "primary action verb used",
          "content_focus": "main concept addressed",
          "assessment_method": "how this could be assessed",
          "time_estimate": "estimated seconds needed"
        }
      ],
      "cognitive_progression": "how objectives build on each other",
      "prerequisites": ["prerequisite knowledge needed"],
      "extensions": ["how learning could be extended beyond this video"]
    }
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: objectivePrompt }],
      temperature: 0.4,
      max_tokens: 1200,
    });

    const objectives = JSON.parse(response.choices[0].message.content);

    // Enhance objectives with additional analysis
    const enhancedObjectives = enhanceObjectives(
      objectives,
      keypoints,
      targetBloomLevel
    );

    return enhancedObjectives;
  } catch (error) {
    console.error("Learning objectives generation error:", error);
    throw new Error(`Failed to generate learning objectives: ${error.message}`);
  }
};

/**
 * Analyze content and determine appropriate Bloom's level
 */
const determineContentBloomLevel = async (
  content,
  userLevel = "intermediate"
) => {
  try {
    const analysisPrompt = `
    Analyze this educational content and determine the most appropriate Bloom's Taxonomy level:

    CONTENT: "${content.substring(0, 2000)}..."
    USER LEVEL: ${userLevel}

    BLOOM'S TAXONOMY LEVELS:
    1. Remember: Recall facts, terms, basic concepts
    2. Understand: Explain ideas, compare, interpret
    3. Apply: Use information in new situations  
    4. Analyze: Draw connections, examine components
    5. Evaluate: Justify decisions, critique
    6. Create: Produce new or original work

    Return analysis in JSON format:
    {
      "primary_level": "remember|understand|apply|analyze|evaluate|create",
      "secondary_levels": ["levels also present in content"],
      "rationale": "why this level is most appropriate",
      "content_indicators": ["specific evidence supporting this level"],
      "cognitive_demands": {
        "complexity": "low|medium|high",
        "abstraction": "concrete|mixed|abstract",
        "prior_knowledge": "minimal|moderate|extensive"
      },
      "recommendations": {
        "optimal_level": "best level for micro-video",
        "adjustments": ["how to optimize for target level"]
      }
    }
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: analysisPrompt }],
      temperature: 0.3,
      max_tokens: 1000,
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("Bloom's level analysis error:", error);
    throw new Error(`Failed to analyze Bloom's level: ${error.message}`);
  }
};

/**
 * Create Bloom's progression pathway for complex content
 */
const createBloomsProgression = async (
  keypoints,
  userPreferences = {}
) => {
  try {
    const progressionPrompt = `
    Create a Bloom's Taxonomy progression pathway for these educational concepts:

    KEYPOINTS: ${JSON.stringify(keypoints.slice(0, 6), null, 2)}
    
    USER PREFERENCES: ${JSON.stringify(userPreferences, null, 2)}

    Design a logical progression through Bloom's levels that could be used across multiple micro-videos:

    Return JSON format:
    {
      "progression_pathway": [
        {
          "level": "bloom_level",
          "video_sequence": 1,
          "focus_concepts": ["concepts for this level"],
          "learning_objectives": ["objectives for this video"],
          "activities": ["suggested learning activities"],
          "duration_estimate": "estimated minutes",
          "prerequisites": ["what learner needs before this"],
          "success_indicators": ["signs of mastery"]
        }
      ],
      "total_sequence": "number of videos needed",
      "branching_options": {
        "fast_track": ["condensed pathway for advanced learners"],
        "detailed_track": ["expanded pathway for beginners"],
        "specialized_tracks": ["alternative focuses"]
      },
      "assessment_strategy": "how to measure progression",
      "personalization_factors": ["what could be customized"]
    }
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: progressionPrompt }],
      temperature: 0.4,
      max_tokens: 1500,
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("Bloom's progression creation error:", error);
    throw new Error(`Failed to create Bloom\'s progression: ${error.message}`);
  }
};

/**
 * Validate learning objectives against Bloom's taxonomy
 */
const validateBloomsAlignment = (objectives, targetLevel) => {
  const validation = {
    is_aligned: true,
    issues: [],
    suggestions: [],
    alignment_score: 0,
  };

  const targetData = BLOOMS_LEVELS[targetLevel];
  if (!targetData) {
    validation.is_aligned = false;
    validation.issues.push(`Invalid target Bloom's level: ${targetLevel}`);
    return validation;
  }

  let totalScore = 0;
  const objectivesList = Array.isArray(objectives)
    ? objectives
    : objectives.objectives || [];

  objectivesList.forEach((objective, index) => {
    let objectiveScore = 0;
    const statement = objective.statement || objective;
    const lowerStatement = statement.toLowerCase();

    // Check for appropriate action verbs
    const hasCorrectVerb = targetData.action_verbs.some((verb) =>
      lowerStatement.includes(verb.toLowerCase())
    );

    if (hasCorrectVerb) {
      objectiveScore += 0.4;
    } else {
      validation.issues.push(
        `Objective ${
          index + 1
        }: Uses action verb not aligned with ${targetLevel} level`
      );
      validation.suggestions.push(
        `Objective ${
          index + 1
        }: Consider using verbs like: ${targetData.action_verbs
          .slice(0, 3)
          .join(", ")}`
      );
    }

    // Check for measurability
    const isMeasurable =
      /\b(able to|will|can|demonstrate|show|identify|explain|analyze|create|evaluate)\b/i.test(
        statement
      );
    if (isMeasurable) {
      objectiveScore += 0.3;
    } else {
      validation.issues.push(`Objective ${index + 1}: Not clearly measurable`);
      validation.suggestions.push(
        `Objective ${
          index + 1
        }: Start with "By the end, you will be able to..."`
      );
    }

    // Check for specificity
    const isSpecific = statement.length > 20 && statement.length < 150;
    if (isSpecific) {
      objectiveScore += 0.3;
    } else {
      validation.issues.push(
        `Objective ${index + 1}: Too vague or too detailed`
      );
    }

    totalScore += objectiveScore;
  });

  validation.alignment_score = Math.round(
    (totalScore / objectivesList.length) * 100
  );
  validation.is_aligned = validation.alignment_score >= 70;

  if (!validation.is_aligned) {
    validation.suggestions.push(
      `Overall alignment score (${validation.alignment_score}%) is below 70% threshold`
    );
  }

  return validation;
};

/**
 * Generate assessment questions for Bloom's level
 */
const generateAssessmentQuestions = async (objectives, bloomLevel) => {
  try {
    const bloomsData = BLOOMS_LEVELS[bloomLevel];

    const assessmentPrompt = `
    Generate assessment questions to measure these learning objectives at the ${bloomLevel} level:

    OBJECTIVES: ${JSON.stringify(objectives, null, 2)}
    
    BLOOM'S LEVEL: ${bloomLevel} (${bloomsData.description})
    ACTION VERBS: ${bloomsData.action_verbs.join(", ")}

    Create diverse question types appropriate for micro-video assessment:

    Return JSON format:
    {
      "questions": [
        {
          "type": "multiple_choice|true_false|short_answer|practical_task",
          "question": "the assessment question",
          "bloom_level": "${bloomLevel}",
          "action_verb": "primary cognitive action required",
          "options": ["for multiple choice questions"],
          "correct_answer": "correct response",
          "explanation": "why this answer is correct",
          "difficulty": "easy|medium|hard",
          "time_estimate": "seconds to complete",
          "objective_alignment": "which objective this assesses"
        }
      ],
      "rubric_criteria": ["criteria for evaluating responses"],
      "formative_checks": ["quick checks during video"],
      "summative_assessment": "comprehensive assessment strategy"
    }
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: assessmentPrompt }],
      temperature: 0.4,
      max_tokens: 1500,
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("Assessment question generation error:", error);
    throw new Error(
      `Failed to generate assessment questions: ${error.message}`
    );
  }
};

/**
 * Enhance objectives with additional metadata
 */
const enhanceObjectives = (objectives, keypoints, targetBloomLevel) => {
  const bloomsData = BLOOMS_LEVELS[targetBloomLevel];

  return {
    ...objectives,
    bloom_metadata: {
      target_level: targetBloomLevel,
      level_number: bloomsData.level,
      cognitive_complexity: getCognitiveComplexity(targetBloomLevel),
      expected_duration: calculateExpectedDuration(objectives.objectives),
      prerequisite_levels: getPrerequisiteLevels(targetBloomLevel),
    },
    enhanced_objectives: objectives.objectives.map((obj, index) => ({
      ...obj,
      id: `obj_${index + 1}`,
      priority: calculateObjectivePriority(obj, keypoints),
      complexity_score: assessObjectiveComplexity(obj.statement),
      verb_classification: classifyActionVerb(obj.action_verb),
      micro_video_suitability: assessMicroVideoSuitability(obj),
    })),
    validation: validateBloomsAlignment(
      objectives.objectives,
      targetBloomLevel
    ),
    personalization_options: generatePersonalizationOptions(
      objectives,
      targetBloomLevel
    ),
  };
};

/**
 * Helper functions for objective enhancement
 */
const getCognitiveComplexity = (bloomLevel) => {
  const complexityMap = {
    remember: "low",
    understand: "low-medium",
    apply: "medium",
    analyze: "medium-high",
    evaluate: "high",
    create: "very high",
  };
  return complexityMap[bloomLevel] || "medium";
};

const calculateExpectedDuration = (objectives) => {
  // Estimate time needed based on number and complexity of objectives
  const baseTime = 30; // seconds per objective
  const complexityMultiplier = objectives.length > 3 ? 1.2 : 1.0;
  return Math.round(baseTime * objectives.length * complexityMultiplier);
};

const getPrerequisiteLevels = (targetLevel) => {
  const levelOrder = [
    "remember",
    "understand",
    "apply",
    "analyze",
    "evaluate",
    "create",
  ];
  const targetIndex = levelOrder.indexOf(targetLevel);
  return targetIndex > 0 ? levelOrder.slice(0, targetIndex) : [];
};

const calculateObjectivePriority = (objective, keypoints) => {
  // Higher priority for objectives that match high-importance keypoints
  const contentFocus = objective.content_focus?.toLowerCase() || "";
  const matchingKeypoints = keypoints.filter((kp) => {
    const concept = (typeof kp === "object" ? kp.concept : kp).toLowerCase();
    return contentFocus.includes(concept) || concept.includes(contentFocus);
  });

  if (matchingKeypoints.length > 0) {
    const avgImportance =
      matchingKeypoints.reduce(
        (sum, kp) => sum + (typeof kp === "object" ? kp.importance || 5 : 5),
        0
      ) / matchingKeypoints.length;
    return Math.round(avgImportance);
  }

  return 5; // Medium priority if no clear match
};

const assessObjectiveComplexity = (statement) => {
  const complexWords = statement
    .split(" ")
    .filter((word) => word.length > 8).length;
  const totalWords = statement.split(" ").length;
  const complexityRatio = complexWords / totalWords;

  if (complexityRatio > 0.3) return "high";
  if (complexityRatio > 0.15) return "medium";
  return "low";
};

const classifyActionVerb = (actionVerb) => {
  const verbClassifications = {
    cognitive: ["analyze", "evaluate", "understand", "remember"],
    psychomotor: ["demonstrate", "execute", "operate", "perform"],
    affective: ["appreciate", "value", "respond", "organize"],
  };

  for (const [domain, verbs] of Object.entries(verbClassifications)) {
    if (verbs.includes(actionVerb?.toLowerCase())) {
      return domain;
    }
  }

  return "cognitive"; // Default
};

const assessMicroVideoSuitability = (objective) => {
  const timeEstimate = parseInt(objective.time_estimate) || 60;
  const statement = objective.statement || "";

  let suitability = "medium";

  if (timeEstimate <= 30 && statement.length < 100) {
    suitability = "high";
  } else if (timeEstimate > 90 || statement.length > 200) {
    suitability = "low";
  }

  return suitability;
};

const generatePersonalizationOptions = (objectives, bloomLevel) => {
  return {
    difficulty_adaptations: {
      easier: `Adjust to lower Bloom's level (e.g., ${getPreviousLevel(
        bloomLevel
      )})`,
      harder: `Adjust to higher Bloom's level (e.g., ${getNextLevel(
        bloomLevel
      )})`,
    },
    pace_adaptations: {
      slower: "Break objectives into smaller sub-objectives",
      faster: "Combine related objectives for efficiency",
    },
    style_adaptations: {
      visual: "Add visual demonstration requirements",
      verbal: "Emphasize explanation and discussion",
      kinesthetic: "Include hands-on practice components",
    },
  };
};

const getPreviousLevel = (currentLevel) => {
  const levels = [
    "remember",
    "understand",
    "apply",
    "analyze",
    "evaluate",
    "create",
  ];
  const index = levels.indexOf(currentLevel);
  return index > 0 ? levels[index - 1] : currentLevel;
};

const getNextLevel = (currentLevel) => {
  const levels = [
    "remember",
    "understand",
    "apply",
    "analyze",
    "evaluate",
    "create",
  ];
  const index = levels.indexOf(currentLevel);
  return index < levels.length - 1 ? levels[index + 1] : currentLevel;
};

module.exports = {
  generateLearningObjectives,
  determineContentBloomLevel,
  createBloomsProgression,
  validateBloomsAlignment,
  generateAssessmentQuestions,
  BLOOMS_LEVELS,
};
