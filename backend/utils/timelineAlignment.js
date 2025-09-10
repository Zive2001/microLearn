/**
 * Timeline alignment utilities for synchronizing CLT-bLM scripts with video content
 */

/**
 * Align script content with video timeline based on transcript and keypoints
 */
const alignContentWithTimeline = async (
  cltBlmScript,
  transcript,
  videoMetadata,
  options = {}
) => {
  try {
    console.log("Starting content-timeline alignment...");

    // Calculate optimal phase timing based on content analysis
    const phaseTimings = calculateOptimalPhaseTimings(
      cltBlmScript,
      videoMetadata.duration
    );

    // Map transcript segments to script phases
    const segmentMapping = mapTranscriptSegmentsToPhases(
      transcript.segments,
      phaseTimings
    );

    // Identify anchor points for precise alignment
    const anchorPoints = identifyAlignmentAnchorPoints(
      segmentMapping,
      cltBlmScript
    );

    // Refine timing based on content importance and flow
    const refinedTimings = refineTimingBasedOnContent(
      phaseTimings,
      segmentMapping,
      anchorPoints
    );

    // Generate transition points between phases
    const transitionPoints = generateTransitionPoints(
      refinedTimings,
      segmentMapping
    );

    // Validate alignment quality
    const alignmentQuality = validateAlignmentQuality(
      refinedTimings,
      segmentMapping,
      cltBlmScript
    );

    return {
      phase_timings: refinedTimings,
      segment_mapping: segmentMapping,
      anchor_points: anchorPoints,
      transition_points: transitionPoints,
      alignment_quality: alignmentQuality,
      total_duration: videoMetadata.duration,
      script_duration: calculateTotalScriptDuration(cltBlmScript),
    };
  } catch (error) {
    console.error("Timeline alignment error:", error);
    throw new Error(`Failed to align content with timeline: ${error.message}`);
  }
};

/**
 * Calculate optimal timing for each CLT-bLM phase
 */
const calculateOptimalPhaseTimings = (cltBlmScript, videoDuration) => {
  const phases = ["prepare", "initiate", "deliver", "end"];
  const timings = {};

  // Get script durations for each phase
  const scriptDurations = {};
  let totalScriptDuration = 0;

  phases.forEach((phase) => {
    const duration = cltBlmScript[phase]?.duration || 0;
    scriptDurations[phase] = duration;
    totalScriptDuration += duration;
  });

  // Calculate proportional video timing
  let currentTime = 0;

  phases.forEach((phase) => {
    const proportion = scriptDurations[phase] / totalScriptDuration;
    const videoDurationForPhase = proportion * videoDuration;

    timings[phase] = {
      start_time: Math.round(currentTime),
      end_time: Math.round(currentTime + videoDurationForPhase),
      duration: Math.round(videoDurationForPhase),
      script_duration: scriptDurations[phase],
      proportion: Math.round(proportion * 100) / 100,
    };

    currentTime += videoDurationForPhase;
  });

  return timings;
};

/**
 * Map transcript segments to CLT-bLM phases
 */
const mapTranscriptSegmentsToPhases = (segments, phaseTimings) => {
  const mapping = {
    prepare: [],
    initiate: [],
    deliver: [],
    end: [],
    unmapped: [],
  };

  segments.forEach((segment) => {
    const segmentStartTime = segment.start / 1000; // Convert to seconds
    const segmentEndTime = segment.end / 1000;

    // Find which phase this segment belongs to
    let assignedPhase = null;
    let maxOverlap = 0;

    Object.entries(phaseTimings).forEach(([phase, timing]) => {
      const overlap = calculateTimeOverlap(
        segmentStartTime,
        segmentEndTime,
        timing.start_time,
        timing.end_time
      );

      if (overlap > maxOverlap) {
        maxOverlap = overlap;
        assignedPhase = phase;
      }
    });

    if (assignedPhase && maxOverlap > 0) {
      mapping[assignedPhase].push({
        ...segment,
        overlap_duration: maxOverlap,
        overlap_percentage: maxOverlap / (segmentEndTime - segmentStartTime),
        phase_assignment_confidence: calculateAssignmentConfidence(
          segment,
          assignedPhase
        ),
      });
    } else {
      mapping.unmapped.push(segment);
    }
  });

  return mapping;
};

/**
 * Calculate time overlap between two time ranges
 */
const calculateTimeOverlap = (start1, end1, start2, end2) => {
  const overlapStart = Math.max(start1, start2);
  const overlapEnd = Math.min(end1, end2);
  return Math.max(0, overlapEnd - overlapStart);
};

/**
 * Calculate confidence of segment assignment to phase
 */
const calculateAssignmentConfidence = (segment, phase) => {
  let confidence = 0.5; // Base confidence

  // Check for phase-specific keywords
  const phaseKeywords = {
    prepare: ["welcome", "introduction", "today", "begin", "start"],
    initiate: ["objective", "goal", "learn", "will", "going to", "plan"],
    deliver: ["now", "first", "next", "important", "concept", "example"],
    end: ["conclusion", "summary", "recap", "remember", "finally"],
  };

  const keywords = phaseKeywords[phase] || [];
  const segmentText = segment.text.toLowerCase();

  keywords.forEach((keyword) => {
    if (segmentText.includes(keyword)) {
      confidence += 0.1;
    }
  });

  // Higher importance segments get higher confidence
  confidence += (segment.importance || 0.5) * 0.3;

  // High confidence segments get bonus
  confidence += (segment.confidence || 0.5) * 0.2;

  return Math.min(confidence, 1);
};

/**
 * Identify anchor points for precise alignment
 */
const identifyAlignmentAnchorPoints = (segmentMapping, cltBlmScript) => {
  const anchorPoints = [];

  Object.entries(segmentMapping).forEach(([phase, segments]) => {
    if (segments.length === 0) return;

    const scriptPhase = cltBlmScript[phase];
    if (!scriptPhase) return;

    // Find segments with high confidence and importance
    const highConfidenceSegments = segments.filter(
      (segment) =>
        segment.phase_assignment_confidence > 0.7 && segment.importance > 0.6
    );

    highConfidenceSegments.forEach((segment) => {
      // Check if segment content aligns with script content
      const contentAlignment = calculateContentAlignment(segment, scriptPhase);

      if (contentAlignment > 0.6) {
        anchorPoints.push({
          timestamp: segment.start / 1000,
          phase: phase,
          segment_id: segment.id,
          confidence: segment.phase_assignment_confidence,
          importance: segment.importance,
          content_alignment: contentAlignment,
          anchor_type: determineAnchorType(segment, scriptPhase),
          description: generateAnchorDescription(segment, scriptPhase),
        });
      }
    });
  });

  // Sort anchor points by timestamp
  return anchorPoints.sort((a, b) => a.timestamp - b.timestamp);
};

/**
 * Calculate content alignment between segment and script phase
 */
const calculateContentAlignment = (segment, scriptPhase) => {
  let alignment = 0;

  const segmentWords = new Set(segment.text.toLowerCase().split(/\s+/));
  const scriptWords = new Set(
    (scriptPhase.content || "").toLowerCase().split(/\s+/)
  );

  // Calculate word overlap
  const commonWords = new Set(
    [...segmentWords].filter((word) => scriptWords.has(word))
  );
  const wordOverlap =
    commonWords.size / Math.min(segmentWords.size, scriptWords.size);
  alignment += wordOverlap * 0.4;

  // Check for concept alignment
  const segmentConcepts = segment.keyPhrases || [];
  const scriptConcepts =
    scriptPhase.core_concepts || scriptPhase.keypoints || [];

  let conceptOverlap = 0;
  segmentConcepts.forEach((segmentConcept) => {
    scriptConcepts.forEach((scriptConcept) => {
      if (
        segmentConcept.toLowerCase().includes(scriptConcept.toLowerCase()) ||
        scriptConcept.toLowerCase().includes(segmentConcept.toLowerCase())
      ) {
        conceptOverlap += 0.1;
      }
    });
  });

  alignment += Math.min(conceptOverlap, 0.4);

  // Check for purpose alignment
  if (scriptPhase.purpose && segment.type) {
    const purposeAlignment = checkPurposeAlignment(
      segment.type,
      scriptPhase.purpose
    );
    alignment += purposeAlignment * 0.2;
  }

  return Math.min(alignment, 1);
};

/**
 * Check alignment between segment type and script purpose
 */
const checkPurposeAlignment = (segmentType, scriptPurpose) => {
  const alignments = {
    introduction: ["Activate prior knowledge", "create interest"],
    definition: ["Main learning content"],
    example: ["Main learning content", "optimal cognitive load"],
    conclusion: ["Consolidate learning", "encourage reflection"],
    question: ["Set clear expectations", "learning goals"],
  };

  const purposeKeywords = alignments[segmentType] || [];
  let alignment = 0;

  purposeKeywords.forEach((keyword) => {
    if (scriptPurpose.toLowerCase().includes(keyword.toLowerCase())) {
      alignment += 0.5;
    }
  });

  return Math.min(alignment, 1);
};

/**
 * Determine type of anchor point
 */
const determineAnchorType = (segment, scriptPhase) => {
  const segmentText = segment.text.toLowerCase();

  if (segmentText.includes("objective") || segmentText.includes("goal")) {
    return "learning_objective";
  } else if (
    segmentText.includes("example") ||
    segmentText.includes("instance")
  ) {
    return "example_illustration";
  } else if (
    segmentText.includes("definition") ||
    segmentText.includes("means")
  ) {
    return "concept_definition";
  } else if (
    segmentText.includes("summary") ||
    segmentText.includes("conclude")
  ) {
    return "summary_point";
  } else if (segment.importance > 0.8) {
    return "key_concept";
  } else {
    return "content_marker";
  }
};

/**
 * Generate description for anchor point
 */
const generateAnchorDescription = (segment, scriptPhase) => {
  const segmentText =
    segment.text.substring(0, 100) + (segment.text.length > 100 ? "..." : "");
  return `${scriptPhase.purpose}: "${segmentText}"`;
};

/**
 * Refine timing based on content analysis
 */
const refineTimingBasedOnContent = (
  phaseTimings,
  segmentMapping,
  anchorPoints
) => {
  const refinedTimings = { ...phaseTimings };

  // Use anchor points to adjust phase boundaries
  anchorPoints.forEach((anchor, index) => {
    const phase = anchor.phase;
    const nextAnchor = anchorPoints[index + 1];

    // Adjust phase timing based on high-confidence anchor points
    if (anchor.confidence > 0.8 && anchor.content_alignment > 0.7) {
      // If this is the first anchor in a phase, consider moving phase start
      const phaseAnchors = anchorPoints.filter((a) => a.phase === phase);
      if (phaseAnchors[0] === anchor) {
        const currentStart = refinedTimings[phase].start_time;
        const anchorTime = anchor.timestamp;

        // Don't move more than 20% of phase duration
        const maxAdjustment = refinedTimings[phase].duration * 0.2;
        const adjustment = Math.max(
          -maxAdjustment,
          Math.min(maxAdjustment, anchorTime - currentStart)
        );

        if (Math.abs(adjustment) > 5) {
          // Only adjust if significant (>5 seconds)
          refinedTimings[phase].start_time += adjustment;
          refinedTimings[phase].end_time += adjustment;

          // Adjust adjacent phases
          adjustAdjacentPhases(refinedTimings, phase, adjustment);
        }
      }
    }
  });

  // Ensure no overlaps and maintain total duration
  normalizePhaseTimings(refinedTimings);

  return refinedTimings;
};

/**
 * Adjust adjacent phases when one phase is modified
 */
const adjustAdjacentPhases = (timings, modifiedPhase, adjustment) => {
  const phases = ["prepare", "initiate", "deliver", "end"];
  const phaseIndex = phases.indexOf(modifiedPhase);

  if (phaseIndex > 0) {
    // Adjust previous phase end time
    const prevPhase = phases[phaseIndex - 1];
    timings[prevPhase].end_time += adjustment;
    timings[prevPhase].duration =
      timings[prevPhase].end_time - timings[prevPhase].start_time;
  }

  if (phaseIndex < phases.length - 1) {
    // Adjust next phase start time
    const nextPhase = phases[phaseIndex + 1];
    timings[nextPhase].start_time += adjustment;
    timings[nextPhase].duration =
      timings[nextPhase].end_time - timings[nextPhase].start_time;
  }
};

/**
 * Normalize phase timings to avoid overlaps
 */
const normalizePhaseTimings = (timings) => {
  const phases = ["prepare", "initiate", "deliver", "end"];

  // Ensure sequential order and no gaps
  for (let i = 1; i < phases.length; i++) {
    const currentPhase = phases[i];
    const prevPhase = phases[i - 1];

    // Ensure current phase starts where previous ends
    const gap = timings[currentPhase].start_time - timings[prevPhase].end_time;
    if (Math.abs(gap) > 1) {
      // More than 1 second gap/overlap
      timings[currentPhase].start_time = timings[prevPhase].end_time;
      timings[currentPhase].duration =
        timings[currentPhase].end_time - timings[currentPhase].start_time;
    }
  }
};

/**
 * Generate transition points between phases
 */
const generateTransitionPoints = (refinedTimings, segmentMapping) => {
  const transitions = [];
  const phases = ["prepare", "initiate", "deliver", "end"];

  for (let i = 0; i < phases.length - 1; i++) {
    const fromPhase = phases[i];
    const toPhase = phases[i + 1];

    const transitionTime = refinedTimings[fromPhase].end_time;

    // Find segments around transition time
    const nearbySegments = findSegmentsNearTime(
      segmentMapping,
      transitionTime,
      10
    ); // 10 second window

    // Determine transition characteristics
    const transitionCharacteristics = analyzeTransitionCharacteristics(
      nearbySegments,
      fromPhase,
      toPhase
    );

    transitions.push({
      from_phase: fromPhase,
      to_phase: toPhase,
      timestamp: transitionTime,
      characteristics: transitionCharacteristics,
      nearby_segments: nearbySegments.map((s) => s.id),
      transition_type: determineTransitionType(fromPhase, toPhase),
      suggested_duration: calculateSuggestedTransitionDuration(
        transitionCharacteristics
      ),
    });
  }

  return transitions;
};

/**
 * Find segments near a specific time
 */
const findSegmentsNearTime = (segmentMapping, targetTime, windowSeconds) => {
  const nearbySegments = [];

  Object.values(segmentMapping).forEach((segments) => {
    if (Array.isArray(segments)) {
      segments.forEach((segment) => {
        const segmentTime = segment.start / 1000;
        if (Math.abs(segmentTime - targetTime) <= windowSeconds) {
          nearbySegments.push(segment);
        }
      });
    }
  });

  return nearbySegments.sort((a, b) => a.start - b.start);
};

/**
 * Analyze characteristics of phase transition
 */
const analyzeTransitionCharacteristics = (
  nearbySegments,
  fromPhase,
  toPhase
) => {
  const characteristics = {
    content_continuity: 0,
    speaker_change: false,
    topic_shift: false,
    pacing_change: false,
    visual_change_likely: false,
  };

  if (nearbySegments.length >= 2) {
    const beforeSegments = nearbySegments.filter(
      (s) => s.start / 1000 < nearbySegments[0].start / 1000 + 5
    );
    const afterSegments = nearbySegments.filter(
      (s) => s.start / 1000 > nearbySegments[0].start / 1000 + 5
    );

    // Analyze content continuity
    if (beforeSegments.length > 0 && afterSegments.length > 0) {
      characteristics.content_continuity = calculateContentContinuity(
        beforeSegments,
        afterSegments
      );
    }

    // Detect pacing changes
    const beforePacing = calculateAveragePacing(beforeSegments);
    const afterPacing = calculateAveragePacing(afterSegments);
    characteristics.pacing_change = Math.abs(beforePacing - afterPacing) > 20; // words per minute

    // Predict visual changes based on phase transition
    characteristics.visual_change_likely = predictVisualChange(
      fromPhase,
      toPhase
    );
  }

  return characteristics;
};

/**
 * Calculate content continuity between segment groups
 */
const calculateContentContinuity = (beforeSegments, afterSegments) => {
  const beforeText = beforeSegments
    .map((s) => s.text)
    .join(" ")
    .toLowerCase();
  const afterText = afterSegments
    .map((s) => s.text)
    .join(" ")
    .toLowerCase();

  const beforeWords = new Set(beforeText.split(/\s+/));
  const afterWords = new Set(afterText.split(/\s+/));

  const commonWords = new Set(
    [...beforeWords].filter((word) => afterWords.has(word))
  );
  const totalUniqueWords = new Set([...beforeWords, ...afterWords]).size;

  return commonWords.size / totalUniqueWords;
};

/**
 * Calculate average speaking pace for segments
 */
const calculateAveragePacing = (segments) => {
  if (segments.length === 0) return 0;

  const totalWords = segments.reduce(
    (sum, segment) => sum + (segment.wordCount || 0),
    0
  );
  const totalDuration =
    segments.reduce((sum, segment) => sum + (segment.duration || 0), 0) / 1000; // Convert to seconds

  return totalDuration > 0 ? (totalWords / totalDuration) * 60 : 0; // Words per minute
};

/**
 * Predict if visual change is likely between phases
 */
const predictVisualChange = (fromPhase, toPhase) => {
  const visualChangeMap = {
    prepare_to_initiate: 0.6, // Likely to show objectives/agenda
    initiate_to_deliver: 0.8, // Likely to show main content
    deliver_to_end: 0.5, // May show summary slides
  };

  const transitionKey = `${fromPhase}_to_${toPhase}`;
  return visualChangeMap[transitionKey] > 0.6;
};

/**
 * Determine type of transition
 */
const determineTransitionType = (fromPhase, toPhase) => {
  const transitionTypes = {
    prepare_to_initiate: "orientation_to_objectives",
    initiate_to_deliver: "objectives_to_content",
    deliver_to_end: "content_to_summary",
  };

  return transitionTypes[`${fromPhase}_to_${toPhase}`] || "phase_change";
};

/**
 * Calculate suggested transition duration
 */
const calculateSuggestedTransitionDuration = (characteristics) => {
  let duration = 2; // Base 2 seconds

  // Longer transitions for big topic shifts
  if (characteristics.topic_shift) duration += 1;

  // Longer for visual changes
  if (characteristics.visual_change_likely) duration += 1;

  // Shorter for high content continuity
  if (characteristics.content_continuity > 0.7) duration -= 0.5;

  return Math.max(1, Math.min(duration, 4)); // Between 1-4 seconds
};

/**
 * Validate alignment quality
 */
const validateAlignmentQuality = (
  refinedTimings,
  segmentMapping,
  cltBlmScript
) => {
  const quality = {
    overall_score: 0,
    phase_coverage: {},
    content_alignment: {},
    timing_accuracy: {},
    issues: [],
    recommendations: [],
  };

  const phases = ["prepare", "initiate", "deliver", "end"];
  let totalScore = 0;

  phases.forEach((phase) => {
    const phaseSegments = segmentMapping[phase] || [];
    const phaseTiming = refinedTimings[phase];
    const scriptPhase = cltBlmScript[phase];

    if (!phaseTiming || !scriptPhase) {
      quality.issues.push(`Missing data for ${phase} phase`);
      return;
    }

    // Check phase coverage
    const coverage = phaseSegments.length > 0 ? 1 : 0;
    quality.phase_coverage[phase] = coverage;

    // Check content alignment
    const alignment = calculatePhaseContentAlignment(
      phaseSegments,
      scriptPhase
    );
    quality.content_alignment[phase] = alignment;

    // Check timing accuracy
    const timingAccuracy = calculateTimingAccuracy(phaseTiming, scriptPhase);
    quality.timing_accuracy[phase] = timingAccuracy;

    // Calculate phase score
    const phaseScore = (coverage + alignment + timingAccuracy) / 3;
    totalScore += phaseScore;

    // Generate recommendations
    if (phaseScore < 0.7) {
      quality.recommendations.push(
        `Improve ${phase} phase alignment (score: ${Math.round(
          phaseScore * 100
        )}%)`
      );
    }
  });

  quality.overall_score = totalScore / phases.length;

  // Overall quality assessment
  if (quality.overall_score > 0.8) {
    quality.assessment = "excellent";
  } else if (quality.overall_score > 0.6) {
    quality.assessment = "good";
  } else if (quality.overall_score > 0.4) {
    quality.assessment = "fair";
  } else {
    quality.assessment = "poor";
    quality.issues.push("Significant alignment issues detected");
  }

  return quality;
};

/**
 * Calculate content alignment for a phase
 */
const calculatePhaseContentAlignment = (phaseSegments, scriptPhase) => {
  if (phaseSegments.length === 0) return 0;

  const alignmentScores = phaseSegments.map(
    (segment) =>
      segment.content_alignment ||
      calculateContentAlignment(segment, scriptPhase)
  );

  return (
    alignmentScores.reduce((sum, score) => sum + score, 0) /
    alignmentScores.length
  );
};

/**
 * Calculate timing accuracy for a phase
 */
const calculateTimingAccuracy = (phaseTiming, scriptPhase) => {
  const actualDuration = phaseTiming.duration;
  const scriptDuration = scriptPhase.duration;

  if (scriptDuration === 0) return 0;

  const ratio = actualDuration / scriptDuration;

  // Accuracy is highest when ratio is close to 1
  if (ratio >= 0.8 && ratio <= 1.2) return 1;
  if (ratio >= 0.6 && ratio <= 1.4) return 0.8;
  if (ratio >= 0.4 && ratio <= 1.6) return 0.6;
  return 0.4;
};

/**
 * Calculate total script duration
 */
const calculateTotalScriptDuration = (cltBlmScript) => {
  return Object.values(cltBlmScript).reduce((total, phase) => {
    return total + (phase.duration || 0);
  }, 0);
};

/**
 * Generate synchronization points for video editing
 */
const generateSynchronizationPoints = (alignmentResult, keypoints) => {
  const syncPoints = [];

  // Add phase transition points
  alignmentResult.transition_points.forEach((transition) => {
    syncPoints.push({
      timestamp: transition.timestamp,
      type: "phase_transition",
      from_phase: transition.from_phase,
      to_phase: transition.to_phase,
      action: "fade_transition",
      duration: transition.suggested_duration,
    });
  });

  // Add keypoint emphasis points
  alignmentResult.anchor_points.forEach((anchor) => {
    if (
      anchor.anchor_type === "key_concept" ||
      anchor.anchor_type === "learning_objective"
    ) {
      syncPoints.push({
        timestamp: anchor.timestamp,
        type: "keypoint_emphasis",
        phase: anchor.phase,
        action: "highlight_text",
        duration: 3,
        content: anchor.description,
      });
    }
  });

  // Add visual cue points based on content
  keypoints.forEach((keypoint) => {
    if (keypoint.visual_alignment && keypoint.alignment_confidence > 0.7) {
      syncPoints.push({
        timestamp: keypoint.visual_alignment.best_timestamp,
        type: "visual_cue",
        phase: keypoint.visual_alignment.phase,
        action: "show_concept_highlight",
        duration: 2,
        concept: keypoint.concept,
      });
    }
  });

  // Sort by timestamp
  return syncPoints.sort((a, b) => a.timestamp - b.timestamp);
};

/**
 * Optimize alignment for specific learning objectives
 */
const optimizeAlignmentForObjectives = (
  alignmentResult,
  learningObjectives
) => {
  const optimizedAlignment = { ...alignmentResult };

  learningObjectives.forEach((objective) => {
    // Find segments that relate to this objective
    const relatedSegments = findSegmentsForObjective(
      alignmentResult,
      objective
    );

    if (relatedSegments.length > 0) {
      // Ensure these segments are properly highlighted in the timeline
      relatedSegments.forEach((segment) => {
        const existingAnchor = optimizedAlignment.anchor_points.find(
          (anchor) => anchor.segment_id === segment.id
        );

        if (!existingAnchor) {
          optimizedAlignment.anchor_points.push({
            timestamp: segment.start / 1000,
            phase: segment.phase,
            segment_id: segment.id,
            confidence: 0.8,
            importance: 0.9,
            content_alignment: 0.8,
            anchor_type: "learning_objective",
            description: `Objective: ${objective.statement}`,
            learning_objective: objective,
          });
        }
      });
    }
  });

  // Re-sort anchor points
  optimizedAlignment.anchor_points.sort((a, b) => a.timestamp - b.timestamp);

  return optimizedAlignment;
};

/**
 * Find segments that relate to a learning objective
 */
const findSegmentsForObjective = (alignmentResult, objective) => {
  const relatedSegments = [];
  const objectiveWords = new Set(
    objective.statement.toLowerCase().split(/\s+/)
  );

  Object.values(alignmentResult.segment_mapping).forEach((segments) => {
    if (Array.isArray(segments)) {
      segments.forEach((segment) => {
        const segmentWords = new Set(segment.text.toLowerCase().split(/\s+/));
        const commonWords = new Set(
          [...objectiveWords].filter((word) => segmentWords.has(word))
        );

        if (commonWords.size >= 2) {
          // At least 2 words in common
          relatedSegments.push({
            ...segment,
            objective_relevance: commonWords.size / objectiveWords.size,
          });
        }
      });
    }
  });

  return relatedSegments.sort(
    (a, b) => b.objective_relevance - a.objective_relevance
  );
};

module.exports = {
  alignContentWithTimeline,
  generateSynchronizationPoints,
  optimizeAlignmentForObjectives,
  calculateOptimalPhaseTimings,
  mapTranscriptSegmentsToPhases,
};
