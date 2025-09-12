const OpenAI = require('openai');
const {
  extractKeypoints,
  analyzeContentComplexity,
} = require('./contentAnalysis');
const { calculateCognitiveLoad } = require('../utils/cognitiveLoadCalculator');
const { generateLearningObjectives } = require('../utils/bloomsTaxonomy');

// Initialize OpenAI only if API key is available
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

/**
 * Generate CLT-bLM structured script from video transcript
 */
const generateCLTBLMScript = async (
  transcript,
  userPreferences = {},
  videoMetadata = {}
) => {
  try {
    if (!openai) {
      throw new Error("OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.");
    }

    console.log("Starting CLT-bLM script generation...");

    // Step 1: Analyze transcript content
    const contentAnalysis = await analyzeTranscriptContent(transcript);

    // Step 2: Extract keypoints and concepts
    const keypoints = await extractKeypoints(transcript.segments);

    // Step 3: Determine optimal Bloom's level
    const bloomLevel = determineOptimalBloomLevel(
      contentAnalysis,
      userPreferences
    );

    // Step 4: Generate learning objectives
    const learningObjectives = await generateLearningObjectives(
      keypoints,
      bloomLevel
    );

    // Step 5: Calculate cognitive load requirements
    const cognitiveLoadAnalysis = calculateCognitiveLoad(
      contentAnalysis,
      userPreferences
    );

    // Step 6: Generate CLT-bLM structured script
    const cltBlmScript = await generateStructuredScript({
      transcript,
      contentAnalysis,
      keypoints,
      learningObjectives,
      bloomLevel,
      cognitiveLoadAnalysis,
      userPreferences,
      videoMetadata,
    });

    // Step 7: Optimize script for target duration
    const optimizedScript = await optimizeScriptDuration(
      cltBlmScript,
      userPreferences.targetDuration || 240
    );

    // Step 8: Quality assurance check
    const qualityMetrics = await assessScriptQuality(
      optimizedScript,
      learningObjectives
    );

    console.log("CLT-bLM script generation completed successfully");

    return {
      script: optimizedScript,
      metadata: {
        contentAnalysis,
        keypoints,
        learningObjectives,
        bloomLevel,
        cognitiveLoadAnalysis,
        qualityMetrics,
        generationTimestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("CLT-bLM script generation error:", error);
    throw new Error(`Script generation failed: ${error.message}`);
  }
};

/**
 * Analyze transcript content for educational structure
 */
const analyzeTranscriptContent = async (transcript) => {
  try {
    const fullText =
      transcript.fullText || transcript.segments.map((s) => s.text).join(" ");

    const analysisPrompt = `
    Analyze this educational content for CLT-bLM framework application:

    Content: "${fullText.substring(0, 3000)}..."

    Provide analysis in JSON format:
    {
      "subject_area": "primary academic subject",
      "complexity_level": "beginner|intermediate|advanced",
      "key_concepts": ["concept1", "concept2", "concept3"],
      "prerequisite_knowledge": ["prereq1", "prereq2"],
      "content_type": "lecture|tutorial|explanation|demonstration",
      "cognitive_demands": {
        "memory_load": "low|medium|high",
        "processing_complexity": "low|medium|high",
        "abstract_thinking": "low|medium|high"
      },
      "educational_patterns": {
        "has_examples": true|false,
        "has_definitions": true|false,
        "has_procedures": true|false,
        "has_analogies": true|false
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
    console.error("Content analysis error:", error);
    throw new Error(`Failed to analyze content: ${error.message}`);
  }
};

/**
 * Determine optimal Bloom's taxonomy level based on content and user
 */
const determineOptimalBloomLevel = (contentAnalysis, userPreferences) => {
  const userLevel = userPreferences.bloomPreference || "understand";
  const contentComplexity = contentAnalysis.complexity_level;

  // Map complexity to appropriate Bloom's levels
  const complexityToBloom = {
    beginner: ["remember", "understand"],
    intermediate: ["understand", "apply", "analyze"],
    advanced: ["analyze", "evaluate", "create"],
  };

  const availableLevels = complexityToBloom[contentComplexity] || [
    "understand",
  ];

  // If user preference is available for this complexity, use it
  if (availableLevels.includes(userLevel)) {
    return userLevel;
  }

  // Otherwise, use the middle level for the complexity
  return availableLevels[Math.floor(availableLevels.length / 2)];
};

/**
 * Generate structured CLT-bLM script
 */
const generateStructuredScript = async (params) => {
  const {
    transcript,
    contentAnalysis,
    keypoints,
    learningObjectives,
    bloomLevel,
    cognitiveLoadAnalysis,
    userPreferences,
  } = params;

  try {
    const scriptPrompt = `
    Create a CLT-bLM structured educational script for a micro-video (2-6 minutes) based on this content:

    ORIGINAL CONTENT: "${transcript.fullText.substring(0, 2000)}..."

    EDUCATIONAL CONTEXT:
    - Subject: ${contentAnalysis.subject_area}
    - Complexity: ${contentAnalysis.complexity_level}
    - Bloom's Level: ${bloomLevel}
    - Key Concepts: ${keypoints.slice(0, 5).join(", ")}
    - Learning Objectives: ${learningObjectives.slice(0, 3).join("; ")}

    USER PREFERENCES:
    - Learning Pace: ${userPreferences.pace || "moderate"}
    - Detail Level: ${userPreferences.detailLevel || "balanced"}
    - Include Examples: ${userPreferences.includeExamples !== false}

    COGNITIVE LOAD CONSIDERATIONS:
    - Target Intrinsic Load: ${
      cognitiveLoadAnalysis.targetIntrinsic || "moderate"
    }
    - Minimize Extraneous Load: Keep explanations clear and focused
    - Optimize Germane Load: Build on prior knowledge progressively

    Generate a script following the CLT-bLM four-phase structure:

    {
      "prepare": {
        "content": "Hook and context setting (20-30 seconds)",
        "duration": 25,
        "purpose": "Activate prior knowledge and create interest",
        "cognitive_strategy": "Low cognitive load, familiar concepts",
        "visual_cues": ["suggested visual elements"],
        "prior_knowledge": ["concepts to activate"]
      },
      "initiate": {
        "content": "Learning objectives and roadmap (30-40 seconds)", 
        "duration": 35,
        "purpose": "Set clear expectations and learning goals",
        "cognitive_strategy": "Organize schema, preview structure",
        "objectives": ["specific learning outcomes"],
        "curiosity_hooks": ["questions or intriguing points"]
      },
      "deliver": {
        "content": "Core content delivery (70-80% of video)",
        "duration": 150,
        "purpose": "Main learning content with optimal cognitive load",
        "cognitive_strategy": "Chunked information, examples, progressive complexity",
        "core_concepts": ["main ideas in order"],
        "examples": ["concrete examples or analogies"],
        "transitions": ["smooth connectors between ideas"]
      },
      "end": {
        "content": "Summary and reflection (20-30 seconds)",
        "duration": 30,
        "purpose": "Consolidate learning and encourage reflection", 
        "cognitive_strategy": "Schema integration, knowledge transfer",
        "summary_points": ["key takeaways"],
        "reflection_questions": ["questions for deeper thinking"],
        "next_steps": ["suggested follow-up actions"]
      }
    }

    REQUIREMENTS:
    - Total duration: ${userPreferences.targetDuration || 240} seconds (±10%)
    - Use simple, clear language appropriate for ${
      contentAnalysis.complexity_level
    } level
    - Include specific examples relevant to ${contentAnalysis.subject_area}
    - Maintain ${bloomLevel} cognitive level throughout
    - Ensure smooth transitions between phases
    - Keep content focused and avoid tangents
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: scriptPrompt }],
      temperature: 0.4,
      max_tokens: 2000,
    });

    const generatedScript = JSON.parse(response.choices[0].message.content);

    // Enhance script with CLT-bLM specific elements
    return enhanceScriptWithCLTBLM(generatedScript, params);
  } catch (error) {
    console.error("Structured script generation error:", error);
    throw new Error(`Failed to generate structured script: ${error.message}`);
  }
};

/**
 * Enhance script with additional CLT-bLM elements
 */
const enhanceScriptWithCLTBLM = (script, params) => {
  const { cognitiveLoadAnalysis, contentAnalysis, bloomLevel } = params;

  // Add cognitive load indicators
  Object.keys(script).forEach((phase) => {
    script[phase].cognitive_load = {
      intrinsic: calculatePhaseIntrinsicLoad(script[phase], contentAnalysis),
      extraneous: calculatePhaseExtraneousLoad(script[phase]),
      germane: calculatePhaseGermaneLoad(script[phase], bloomLevel),
    };

    // Add phase-specific CLT-bLM enhancements
    script[phase] = enhancePhaseForCLTBLM(script[phase], phase, params);
  });

  return script;
};

/**
 * Enhance individual phase for CLT-bLM principles
 */
const enhancePhaseForCLTBLM = (phaseScript, phaseName, params) => {
  const { userPreferences, contentAnalysis } = params;

  switch (phaseName) {
    case "prepare":
      return {
        ...phaseScript,
        activation_strategies: generateActivationStrategies(
          contentAnalysis,
          userPreferences
        ),
        context_bridge: generateContextBridge(contentAnalysis),
        attention_grabber: generateAttentionGrabber(
          contentAnalysis.key_concepts[0]
        ),
      };

    case "initiate":
      return {
        ...phaseScript,
        advance_organizer: generateAdvanceOrganizer(contentAnalysis),
        expectation_setting: generateExpectationSetting(phaseScript.objectives),
        motivation_elements: generateMotivationElements(
          contentAnalysis.subject_area
        ),
      };

    case "deliver":
      return {
        ...phaseScript,
        chunking_strategy: generateChunkingStrategy(phaseScript.core_concepts),
        worked_examples: generateWorkedExamples(
          contentAnalysis,
          userPreferences
        ),
        cognitive_scaffolds: generateCognitiveScaffolds(
          phaseScript.core_concepts
        ),
      };

    case "end":
      return {
        ...phaseScript,
        elaborative_questioning: generateElaborativeQuestions(
          contentAnalysis.key_concepts
        ),
        transfer_opportunities: generateTransferOpportunities(
          contentAnalysis.subject_area
        ),
        consolidation_techniques: generateConsolidationTechniques(
          phaseScript.summary_points
        ),
      };

    default:
      return phaseScript;
  }
};

/**
 * Generate activation strategies for Prepare phase
 */
const generateActivationStrategies = (contentAnalysis, userPreferences) => {
  const strategies = [
    `Connect to everyday experience in ${contentAnalysis.subject_area}`,
    `Review prerequisite: ${
      contentAnalysis.prerequisite_knowledge[0] || "basic concepts"
    }`,
    `Activate relevant schema through familiar examples`,
  ];

  if (userPreferences.includePersonalExamples) {
    strategies.push("Include relatable personal scenarios");
  }

  return strategies;
};

/**
 * Generate context bridge for smooth knowledge integration
 */
const generateContextBridge = (contentAnalysis) => {
  return `Bridge from ${
    contentAnalysis.prerequisite_knowledge[0] || "prior knowledge"
  } to ${contentAnalysis.key_concepts[0]} using progressive disclosure`;
};

/**
 * Generate attention-grabbing opening
 */
const generateAttentionGrabber = (keyConcept) => {
  return `Open with intriguing question or surprising fact about ${keyConcept}`;
};

/**
 * Calculate phase-specific cognitive loads
 */
const calculatePhaseIntrinsicLoad = (phaseScript, contentAnalysis) => {
  // Intrinsic load based on concept complexity and phase purpose
  const complexityMap = { beginner: 0.3, intermediate: 0.6, advanced: 0.8 };
  const baseLoad = complexityMap[contentAnalysis.complexity_level] || 0.5;

  // Prepare and End phases have lower intrinsic load
  const phaseMultiplier = ["prepare", "end"].includes(phaseScript.purpose)
    ? 0.7
    : 1.0;

  return Math.round(baseLoad * phaseMultiplier * 10) / 10;
};

const calculatePhaseExtraneousLoad = (phaseScript) => {
  // Lower extraneous load indicates better instructional design
  const contentLength = phaseScript.content?.length || 0;
  const baseLoad = Math.min(contentLength / 500, 1); // Longer content = potentially higher extraneous load

  return Math.round((1 - baseLoad) * 10) / 10; // Invert so lower is better
};

const calculatePhaseGermaneLoad = (phaseScript, bloomLevel) => {
  // Higher germane load for higher-order thinking
  const bloomMap = {
    remember: 0.3,
    understand: 0.5,
    apply: 0.6,
    analyze: 0.7,
    evaluate: 0.8,
    create: 0.9,
  };

  return bloomMap[bloomLevel] || 0.5;
};

/**
 * Additional helper functions for enhanced script generation
 */
const generateAdvanceOrganizer = (contentAnalysis) => {
  return `Provide conceptual framework for ${contentAnalysis.key_concepts
    .slice(0, 3)
    .join(", ")}`;
};

const generateExpectationSetting = (objectives) => {
  return `By the end, you'll be able to: ${objectives
    .slice(0, 2)
    .join(" and ")}`;
};

const generateMotivationElements = (subjectArea) => {
  return [
    `Highlight real-world applications in ${subjectArea}`,
    "Connect to learner goals and interests",
  ];
};

const generateChunkingStrategy = (coreConcepts) => {
  return coreConcepts.map((concept, index) => `Chunk ${index + 1}: ${concept}`);
};

const generateWorkedExamples = (contentAnalysis, userPreferences) => {
  const exampleTypes = contentAnalysis.educational_patterns.has_examples
    ? ["Step-by-step demonstration", "Real-world application"]
    : ["Concrete illustration", "Practical scenario"];

  return userPreferences.includeExamples !== false ? exampleTypes : [];
};

const generateCognitiveScaffolds = (coreConcepts) => {
  return coreConcepts.map((concept) => `Visual aid or mnemonic for ${concept}`);
};

const generateElaborativeQuestions = (keyConcepts) => {
  return keyConcepts
    .slice(0, 2)
    .map((concept) => `How does ${concept} relate to what you already know?`);
};

const generateTransferOpportunities = (subjectArea) => {
  return [
    `Apply these concepts in other ${subjectArea} contexts`,
    "Consider variations and adaptations",
  ];
};

const generateConsolidationTechniques = (summaryPoints) => {
  return [
    `Recap: ${summaryPoints.slice(0, 2).join(" and ")}`,
    "Self-assessment opportunity",
  ];
};

module.exports = {
  generateCLTBLMScript,
  analyzeTranscriptContent,
  determineOptimalBloomLevel,
};
