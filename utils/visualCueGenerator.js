const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate visual cues and enhancements for aligned keypoints
 */
const generateVisualCues = async (
  alignedKeypoints,
  cltBlmScript,
  visualStyle = "educational"
) => {
  try {
    console.log("Generating visual cues and enhancements...");

    // Generate cues for each phase
    const phaseVisualCues = await generatePhaseVisualCues(
      cltBlmScript,
      visualStyle
    );

    // Generate keypoint-specific visual elements
    const keypointVisuals = await generateKeypointVisuals(
      alignedKeypoints,
      visualStyle
    );

    // Generate transition effects
    const transitionEffects = await generateTransitionEffects(
      cltBlmScript,
      visualStyle
    );

    // Generate text overlays and annotations
    const textOverlays = await generateTextOverlays(
      alignedKeypoints,
      cltBlmScript
    );

    // Generate cognitive load indicators
    const cognitiveLoadIndicators = await generateCognitiveLoadIndicators(
      cltBlmScript
    );

    // Generate engagement elements
    const engagementElements = await generateEngagementElements(
      alignedKeypoints,
      cltBlmScript
    );

    return {
      phase_visual_cues: phaseVisualCues,
      keypoint_visuals: keypointVisuals,
      transition_effects: transitionEffects,
      text_overlays: textOverlays,
      cognitive_load_indicators: cognitiveLoadIndicators,
      engagement_elements: engagementElements,
      style_configuration: getStyleConfiguration(visualStyle),
      generation_metadata: {
        total_cues:
          Object.keys(phaseVisualCues).length + keypointVisuals.length,
        style_used: visualStyle,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("Visual cue generation error:", error);
    throw new Error(`Failed to generate visual cues: ${error.message}`);
  }
};

/**
 * Generate visual cues for each CLT-bLM phase
 */
const generatePhaseVisualCues = async (cltBlmScript, visualStyle) => {
  const phaseVisualCues = {};
  const phases = ["prepare", "initiate", "deliver", "end"];

  for (const phaseName of phases) {
    const phase = cltBlmScript[phaseName];
    if (!phase) continue;

    console.log(`Generating visual cues for ${phaseName} phase...`);

    const cuePrompt = `
    Generate visual cue recommendations for the ${phaseName.toUpperCase()} phase of a CLT-bLM educational micro-video:

    PHASE PURPOSE: ${phase.purpose}
    PHASE CONTENT: "${phase.content}"
    COGNITIVE STRATEGY: ${phase.cognitive_strategy}
    DURATION: ${phase.duration} seconds
    VISUAL STYLE: ${visualStyle}

    Generate specific visual cue recommendations in JSON format:
    {
      "background_elements": {
        "color_scheme": "primary and accent colors",
        "gradient_direction": "direction if applicable",
        "opacity": "background opacity level",
        "animation": "subtle background animation if any"
      },
      "text_presentation": {
        "font_weight": "normal|bold|light",
        "text_size": "relative size scaling",
        "text_color": "main text color",
        "highlight_color": "color for emphasis",
        "animation_type": "fade_in|slide_in|typewriter|none"
      },
      "visual_elements": [
        {
          "type": "icon|shape|graphic|animation",
          "element": "specific element description",
          "position": "top_left|center|bottom_right|etc",
          "timing": "when to show (start|middle|end)",
          "duration": "how long to show",
          "purpose": "why this element helps learning"
        }
      ],
      "cognitive_support": {
        "attention_direction": "how to guide viewer attention",
        "load_management": "how visuals manage cognitive load",
        "schema_activation": "how visuals activate prior knowledge"
      },
      "educational_rationale": "why these visual choices support the phase purpose"
    }

    Consider CLT-bLM principles:
    - Prepare: Simple, welcoming, attention-getting
    - Initiate: Clear structure, goal-oriented, motivating  
    - Deliver: Information-rich but not overwhelming, examples-focused
    - End: Consolidating, reflective, closure-oriented
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: cuePrompt }],
      temperature: 0.4,
      max_tokens: 1000,
    });

    const visualCues = JSON.parse(response.choices[0].message.content);

    phaseVisualCues[phaseName] = {
      ...visualCues,
      phase_duration: phase.duration,
      cognitive_load: phase.cognitive_load,
      implementation_priority: calculateImplementationPriority(
        phaseName,
        visualCues
      ),
    };
  }

  return phaseVisualCues;
};

/**
 * Generate visuals for specific keypoints
 */
const generateKeypointVisuals = async (alignedKeypoints, visualStyle) => {
  const keypointVisuals = [];

  for (const keypoint of alignedKeypoints) {
    if (keypoint.alignment_confidence < 0.6) continue; // Skip low-confidence alignments

    console.log(`Generating visuals for keypoint: ${keypoint.concept}`);

    const visual = await generateSingleKeypointVisual(keypoint, visualStyle);
    keypointVisuals.push(visual);
  }

  return keypointVisuals;
};

/**
 * Generate visual for a single keypoint
 */
const generateSingleKeypointVisual = async (keypoint, visualStyle) => {
  const visualPrompt = `
  Create visual enhancement for this educational keypoint:

  CONCEPT: ${keypoint.concept}
  DESCRIPTION: ${keypoint.description}
  BLOOM'S LEVEL: ${keypoint.bloom_level}
  DIFFICULTY: ${keypoint.difficulty}
  IMPORTANCE: ${keypoint.importance}
  ALIGNMENT CONFIDENCE: ${keypoint.alignment_confidence}

  Generate visual enhancement in JSON format:
  {
    "primary_visual": {
      "type": "text_highlight|concept_diagram|icon|animation|chart",
      "description": "main visual element",
      "size": "small|medium|large",
      "position": "overlay position",
      "appearance_timing": "when to show relative to keypoint mention"
    },
    "supporting_elements": [
      {
        "type": "bullet_point|arrow|frame|glow|underline",
        "purpose": "emphasize|connect|highlight|direct_attention",
        "style": "visual style details",
        "duration": "seconds to display"
      }
    ],
    "color_coding": {
      "primary_color": "main color for this concept",
      "secondary_color": "accent color",
      "rationale": "why these colors support learning"
    },
    "animation_sequence": [
      {
        "step": 1,
        "action": "fade_in|slide_in|zoom_in|highlight",
        "element": "what animates",
        "timing": "start time in seconds",
        "duration": "animation duration"
      }
    ],
    "cognitive_design": {
      "attention_strategy": "how this visual guides attention",
      "memory_aid": "how this helps retention",
      "comprehension_support": "how this aids understanding"
    }
  }

  Design principles:
  - Support ${keypoint.bloom_level} level thinking
  - Match ${keypoint.difficulty} difficulty level
  - Use ${visualStyle} visual style
  - Enhance learning without distracting
  `;

  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: visualPrompt }],
    temperature: 0.4,
    max_tokens: 800,
  });

  const visual = JSON.parse(response.choices[0].message.content);

  return {
    keypoint_id: keypoint.concept,
    keypoint_data: keypoint,
    visual_enhancement: visual,
    implementation_complexity: assessImplementationComplexity(visual),
    educational_impact: assessEducationalImpact(visual, keypoint),
  };
};

/**
 * Generate transition effects between phases
 */
const generateTransitionEffects = async (cltBlmScript, visualStyle) => {
  const transitions = [];
  const phases = ["prepare", "initiate", "deliver", "end"];

  for (let i = 0; i < phases.length - 1; i++) {
    const fromPhase = phases[i];
    const toPhase = phases[i + 1];

    const transition = await generatePhaseTransition(
      cltBlmScript[fromPhase],
      cltBlmScript[toPhase],
      fromPhase,
      toPhase,
      visualStyle
    );

    transitions.push(transition);
  }

  return transitions;
};

/**
 * Generate transition between two specific phases
 */
const generatePhaseTransition = async (
  fromPhase,
  toPhase,
  fromPhaseName,
  toPhaseName,
  visualStyle
) => {
  const transitionTypes = {
    prepare_to_initiate: {
      type: "reveal_structure",
      description: "Smoothly reveal learning objectives and structure",
      duration: 2,
    },
    initiate_to_deliver: {
      type: "focus_shift",
      description: "Shift focus from objectives to main content",
      duration: 1.5,
    },
    deliver_to_end: {
      type: "consolidate",
      description: "Gather main points for summary",
      duration: 2,
    },
  };

  const transitionKey = `${fromPhaseName}_to_${toPhaseName}`;
  const baseTransition = transitionTypes[transitionKey] || {
    type: "fade",
    description: "Simple fade transition",
    duration: 1,
  };

  return {
    from_phase: fromPhaseName,
    to_phase: toPhaseName,
    transition_type: baseTransition.type,
    description: baseTransition.description,
    duration: baseTransition.duration,
    visual_effect: {
      effect_name: baseTransition.type,
      parameters: generateTransitionParameters(
        baseTransition.type,
        visualStyle
      ),
      cognitive_purpose: getTransitionCognitivePurpose(
        fromPhaseName,
        toPhaseName
      ),
    },
  };
};

/**
 * Generate parameters for transition effects
 */
const generateTransitionParameters = (effectType, visualStyle) => {
  const parameters = {
    reveal_structure: {
      animation: "slide_down",
      speed: "medium",
      overlay_color: "rgba(0,0,0,0.1)",
      text_highlight: true,
    },
    focus_shift: {
      animation: "zoom_in",
      speed: "fast",
      blur_background: true,
      spotlight_effect: true,
    },
    consolidate: {
      animation: "gather",
      speed: "slow",
      particle_effect: "collect",
      summary_highlight: true,
    },
    fade: {
      animation: "cross_fade",
      speed: "medium",
      opacity_curve: "ease_in_out",
    },
  };

  return parameters[effectType] || parameters.fade;
};

/**
 * Get cognitive purpose of transition
 */
const getTransitionCognitivePurpose = (fromPhase, toPhase) => {
  const purposes = {
    prepare_to_initiate:
      "Signal shift from activation to goal-setting, prepare learner for structured content",
    initiate_to_deliver:
      "Signal start of main learning content, focus attention on delivery",
    deliver_to_end:
      "Signal completion of main content, prepare for consolidation and reflection",
  };

  return (
    purposes[`${fromPhase}_to_${toPhase}`] ||
    "Smooth phase transition to maintain learning flow"
  );
};

/**
 * Generate text overlays and annotations
 */
const generateTextOverlays = async (alignedKeypoints, cltBlmScript) => {
  const textOverlays = [];

  // Generate phase labels
  Object.entries(cltBlmScript).forEach(([phaseName, phase]) => {
    if (phase.duration && phase.duration > 0) {
      textOverlays.push({
        type: "phase_label",
        text: getPhaseDisplayName(phaseName),
        position: "top_left",
        timing: {
          start: 0, // Relative to phase start
          duration: 3,
        },
        style: {
          font_size: "small",
          color: "rgba(255,255,255,0.8)",
          background: "rgba(0,0,0,0.3)",
          border_radius: 4,
        },
        phase: phaseName,
      });
    }
  });

  // Generate keypoint annotations
  alignedKeypoints.forEach((keypoint) => {
    if (keypoint.alignment_confidence > 0.7) {
      textOverlays.push({
        type: "keypoint_annotation",
        text: keypoint.concept,
        position: "bottom_center",
        timing: {
          start: 0, // Will be adjusted based on keypoint timing
          duration: 4,
        },
        style: {
          font_size: "medium",
          color: "#ffffff",
          background: getKeypointColor(keypoint.bloom_level),
          border_radius: 8,
          padding: 8,
        },
        keypoint_data: {
          concept: keypoint.concept,
          bloom_level: keypoint.bloom_level,
          importance: keypoint.importance,
        },
      });
    }
  });

  // Generate learning objective overlays
  Object.entries(cltBlmScript).forEach(([phaseName, phase]) => {
    if (phase.objectives && phase.objectives.length > 0) {
      textOverlays.push({
        type: "learning_objective",
        text: `Objective: ${phase.objectives[0]}`,
        position: "center",
        timing: {
          start: phaseName === "initiate" ? 5 : 0,
          duration: 6,
        },
        style: {
          font_size: "large",
          color: "#2c3e50",
          background: "rgba(255,255,255,0.9)",
          border: "2px solid #3498db",
          border_radius: 12,
          text_align: "center",
        },
        phase: phaseName,
      });
    }
  });

  return textOverlays;
};

/**
 * Get display name for phase
 */
const getPhaseDisplayName = (phaseName) => {
  const displayNames = {
    prepare: "Introduction",
    initiate: "Learning Goals",
    deliver: "Main Content",
    end: "Summary",
  };

  return (
    displayNames[phaseName] ||
    phaseName.charAt(0).toUpperCase() + phaseName.slice(1)
  );
};

/**
 * Get color for keypoint based on Bloom's level
 */
const getKeypointColor = (bloomLevel) => {
  const colors = {
    remember: "#9b59b6", // Purple
    understand: "#3498db", // Blue
    apply: "#2ecc71", // Green
    analyze: "#f39c12", // Orange
    evaluate: "#e74c3c", // Red
    create: "#1abc9c", // Teal
  };

  return colors[bloomLevel] || "#34495e"; // Default gray
};

/**
 * Generate cognitive load indicators
 */
const generateCognitiveLoadIndicators = async (cltBlmScript) => {
  const indicators = [];

  Object.entries(cltBlmScript).forEach(([phaseName, phase]) => {
    if (phase.cognitive_load) {
      const load = phase.cognitive_load;

      // Generate load level indicator
      const totalLoad = load.intrinsic + load.extraneous + load.germane;
      const loadLevel = categorizeLoadLevel(totalLoad);

      indicators.push({
        type: "load_indicator",
        phase: phaseName,
        load_data: load,
        total_load: totalLoad,
        load_level: loadLevel,
        visual_representation: {
          type: "progress_bar",
          position: "top_right",
          size: "small",
          colors: {
            intrinsic: "#3498db",
            extraneous: "#e74c3c",
            germane: "#2ecc71",
          },
          display_duration: phase.duration,
        },
        warning_threshold: totalLoad > 2.0,
        recommendations: generateLoadRecommendations(load, totalLoad),
      });
    }
  });

  return indicators;
};

/**
 * Categorize cognitive load level
 */
const categorizeLoadLevel = (totalLoad) => {
  if (totalLoad < 1.5) return "low";
  if (totalLoad < 2.0) return "moderate";
  if (totalLoad < 2.5) return "high";
  return "very_high";
};

/**
 * Generate load management recommendations
 */
const generateLoadRecommendations = (load, totalLoad) => {
  const recommendations = [];

  if (load.extraneous > 0.6) {
    recommendations.push("Reduce visual complexity to lower extraneous load");
  }

  if (load.intrinsic > 0.8) {
    recommendations.push("Break content into smaller chunks");
  }

  if (load.germane < 0.3) {
    recommendations.push("Add more reflection opportunities");
  }

  if (totalLoad > 2.5) {
    recommendations.push(
      "Overall cognitive load is too high - simplify presentation"
    );
  }

  return recommendations;
};

/**
 * Generate engagement elements
 */
const generateEngagementElements = async (alignedKeypoints, cltBlmScript) => {
  const engagementElements = [];

  // Generate attention-grabbing elements for prepare phase
  if (cltBlmScript.prepare) {
    engagementElements.push({
      type: "attention_grabber",
      phase: "prepare",
      element: {
        type: "animated_title",
        animation: "typewriter_effect",
        text: "Welcome to Your Learning Journey",
        duration: 3,
        style: {
          font_size: "extra_large",
          color: "#2c3e50",
          animation_speed: "medium",
        },
      },
      purpose: "Create initial engagement and focus attention",
    });
  }

  // Generate progress indicators
  const totalPhases = Object.keys(cltBlmScript).length;
  Object.entries(cltBlmScript).forEach(([phaseName, phase], index) => {
    engagementElements.push({
      type: "progress_indicator",
      phase: phaseName,
      element: {
        type: "progress_dots",
        current_step: index + 1,
        total_steps: totalPhases,
        position: "bottom_center",
        style: {
          active_color: "#3498db",
          inactive_color: "#bdc3c7",
          size: "small",
        },
      },
      purpose: "Show learning progress and maintain engagement",
    });
  });

  // Generate curiosity hooks for high-importance keypoints
  alignedKeypoints
    .filter((kp) => kp.importance > 0.8)
    .slice(0, 3) // Top 3 most important
    .forEach((keypoint, index) => {
      engagementElements.push({
        type: "curiosity_hook",
        phase: keypoint.visual_alignment?.phase || "deliver",
        element: {
          type: "question_popup",
          text: `How does ${keypoint.concept} work?`,
          timing: "before_explanation",
          duration: 2,
          style: {
            background: "rgba(52, 152, 219, 0.9)",
            color: "#ffffff",
            border_radius: 8,
          },
        },
        purpose: "Generate curiosity before explaining key concepts",
      });
    });

  // Generate summary elements for end phase
  if (cltBlmScript.end) {
    engagementElements.push({
      type: "achievement_celebration",
      phase: "end",
      element: {
        type: "completion_animation",
        animation: "confetti_burst",
        duration: 2,
        text: "Well Done! Learning Complete",
        style: {
          celebration_color: "#f39c12",
          text_color: "#2c3e50",
        },
      },
      purpose: "Celebrate learning completion and create positive closure",
    });
  }

  return engagementElements;
};

/**
 * Get style configuration for visual elements
 */
const getStyleConfiguration = (visualStyle) => {
  const configurations = {
    educational: {
      primary_colors: ["#3498db", "#2ecc71", "#9b59b6"],
      accent_colors: ["#f39c12", "#e74c3c"],
      background_style: "clean_minimal",
      typography: {
        primary_font: "Open Sans",
        heading_font: "Montserrat",
        font_weights: ["400", "600", "700"],
      },
      animation_style: "subtle_professional",
      contrast_ratio: "high",
      accessibility_features: true,
    },
    modern: {
      primary_colors: ["#667eea", "#764ba2", "#f093fb"],
      accent_colors: ["#4facfe", "#00f2fe"],
      background_style: "gradient_dynamic",
      typography: {
        primary_font: "Inter",
        heading_font: "Poppins",
        font_weights: ["300", "500", "700"],
      },
      animation_style: "smooth_contemporary",
      contrast_ratio: "medium_high",
      accessibility_features: true,
    },
    minimalist: {
      primary_colors: ["#2c3e50", "#34495e"],
      accent_colors: ["#3498db"],
      background_style: "clean_white",
      typography: {
        primary_font: "system-ui",
        heading_font: "system-ui",
        font_weights: ["400", "600"],
      },
      animation_style: "minimal_functional",
      contrast_ratio: "very_high",
      accessibility_features: true,
    },
  };

  return configurations[visualStyle] || configurations.educational;
};

/**
 * Calculate implementation priority for visual cues
 */
const calculateImplementationPriority = (phaseName, visualCues) => {
  let priority = 0.5; // Base priority

  // Higher priority for deliver phase (main content)
  if (phaseName === "deliver") priority += 0.2;

  // Higher priority for initiate phase (learning objectives)
  if (phaseName === "initiate") priority += 0.15;

  // Adjust based on cognitive support features
  if (visualCues.cognitive_support?.attention_direction) priority += 0.1;
  if (visualCues.cognitive_support?.load_management) priority += 0.1;

  // Adjust based on number of visual elements
  const elementCount = visualCues.visual_elements?.length || 0;
  if (elementCount > 3) priority += 0.05; // More elements = higher complexity

  return Math.min(priority, 1);
};

/**
 * Assess implementation complexity of visual enhancement
 */
const assessImplementationComplexity = (visual) => {
  let complexity = 0.3; // Base complexity

  // Animation complexity
  const animationSteps = visual.animation_sequence?.length || 0;
  complexity += animationSteps * 0.1;

  // Supporting elements complexity
  const supportingElements = visual.supporting_elements?.length || 0;
  complexity += supportingElements * 0.05;

  // Color coding complexity
  if (
    visual.color_coding?.primary_color &&
    visual.color_coding?.secondary_color
  ) {
    complexity += 0.1;
  }

  return Math.min(complexity, 1);
};

/**
 * Assess educational impact of visual enhancement
 */
const assessEducationalImpact = (visual, keypoint) => {
  let impact = 0.5; // Base impact

  // Higher impact for higher-importance keypoints
  impact += (keypoint.importance || 0.5) * 0.3;

  // Cognitive design features increase impact
  if (visual.cognitive_design?.attention_strategy) impact += 0.1;
  if (visual.cognitive_design?.memory_aid) impact += 0.1;
  if (visual.cognitive_design?.comprehension_support) impact += 0.1;

  // Bloom's level adjustment
  const bloomImpact = {
    remember: 0.05,
    understand: 0.1,
    apply: 0.15,
    analyze: 0.1,
    evaluate: 0.05,
    create: 0.05,
  };

  impact += bloomImpact[keypoint.bloom_level] || 0.1;

  return Math.min(impact, 1);
};

/**
 * Generate comprehensive visual timeline
 */
const generateVisualTimeline = (visualCues, alignmentResult) => {
  const timeline = [];

  // Add phase visual cues
  Object.entries(visualCues.phase_visual_cues).forEach(([phase, cues]) => {
    const phaseTiming = alignmentResult.phase_timings[phase];
    if (phaseTiming) {
      timeline.push({
        start_time: phaseTiming.start_time,
        end_time: phaseTiming.end_time,
        type: "phase_visuals",
        phase: phase,
        visual_cues: cues,
        priority: cues.implementation_priority || 0.5,
      });
    }
  });

  // Add keypoint visuals
  visualCues.keypoint_visuals.forEach((kpVisual) => {
    const keypoint = kpVisual.keypoint_data;
    if (keypoint.visual_alignment?.best_timestamp) {
      timeline.push({
        start_time: keypoint.visual_alignment.best_timestamp,
        end_time: keypoint.visual_alignment.best_timestamp + 4, // 4 second default
        type: "keypoint_visual",
        keypoint: keypoint.concept,
        visual_enhancement: kpVisual.visual_enhancement,
        priority: kpVisual.educational_impact || 0.5,
      });
    }
  });

  // Add transitions
  visualCues.transition_effects.forEach((transition) => {
    const fromPhaseTiming =
      alignmentResult.phase_timings[transition.from_phase];
    if (fromPhaseTiming) {
      timeline.push({
        start_time: fromPhaseTiming.end_time - 0.5, // Start 0.5s before phase end
        end_time: fromPhaseTiming.end_time + transition.duration,
        type: "transition",
        from_phase: transition.from_phase,
        to_phase: transition.to_phase,
        visual_effect: transition.visual_effect,
        priority: 0.8, // High priority for transitions
      });
    }
  });

  // Sort by start time and priority
  return timeline.sort((a, b) => {
    if (a.start_time !== b.start_time) {
      return a.start_time - b.start_time;
    }
    return b.priority - a.priority; // Higher priority first for same time
  });
};

module.exports = {
  generateVisualCues,
  generateVisualTimeline,
  generatePhaseVisualCues,
  generateKeypointVisuals,
  generateTransitionEffects,
};
