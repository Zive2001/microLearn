const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs/promises');
const {
  extractKeyframes,
  analyzeVisualContent,
} = require('../utils/visualAnalysis');
const { alignContentWithTimeline } = require('../utils/timelineAlignment');
const { generateVisualCues } = require('../utils/visualCueGenerator');

/**
 * Create video segments aligned with CLT-bLM script phases
 */
const createAlignedVideoSegments = async (
  video,
  cltBlmScript,
  transcript,
  options = {}
) => {
  try {
    console.log("Starting video segmentation and keypoint alignment...");

    // Step 1: Analyze original video for visual content
    const visualAnalysis = await analyzeVisualContent(video.source.filePath);

    // Step 2: Map script phases to video timeline
    const timelineMapping = await mapScriptToTimeline(
      cltBlmScript,
      transcript,
      video.metadata.duration
    );

    // Step 3: Extract keyframes for each phase
    const keyframesByPhase = await extractPhaseKeyframes(
      video.source.filePath,
      timelineMapping,
      cltBlmScript
    );

    // Step 4: Align keypoints with visual content
    const alignedKeypoints = await alignKeypointsWithVisuals(
      cltBlmScript.metadata.keypoints,
      keyframesByPhase,
      transcript.segments
    );

    // Step 5: Generate visual segments for each CLT-bLM phase
    const videoSegments = await generatePhaseSegments(
      video.source.filePath,
      timelineMapping,
      keyframesByPhase,
      cltBlmScript,
      options
    );

    // Step 6: Create visual cues and enhancements
    const visualEnhancements = await generateVisualCues(
      alignedKeypoints,
      cltBlmScript,
      options.visualStyle || "educational"
    );

    // Step 7: Quality assessment of segmentation
    const segmentationQuality = await assessSegmentationQuality(
      videoSegments,
      cltBlmScript,
      alignedKeypoints
    );

    console.log("Video segmentation and alignment completed successfully");

    return {
      video_segments: videoSegments,
      keyframe_alignment: keyframesByPhase,
      keypoint_mapping: alignedKeypoints,
      timeline_mapping: timelineMapping,
      visual_enhancements: visualEnhancements,
      quality_assessment: segmentationQuality,
      metadata: {
        original_duration: video.metadata.duration,
        total_segments: videoSegments.length,
        keyframes_extracted: Object.values(keyframesByPhase).flat().length,
        processing_timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("Video segmentation error:", error);
    throw new Error(`Video segmentation failed: ${error.message}`);
  }
};

/**
 * Map CLT-bLM script phases to video timeline
 */
const mapScriptToTimeline = async (cltBlmScript, transcript, videoDuration) => {
  try {
    const phases = ["prepare", "initiate", "deliver", "end"];
    const timelineMapping = {};

    // Calculate total script duration
    const totalScriptDuration = Object.values(cltBlmScript).reduce(
      (sum, phase) => sum + phase.duration,
      0
    );

    // Map each phase to video timeline
    let currentTime = 0;

    for (const phaseName of phases) {
      const phase = cltBlmScript[phaseName];
      if (!phase) continue;

      // Calculate phase timing as percentage of total script
      const phasePercentage = phase.duration / totalScriptDuration;
      const phaseStartTime = currentTime;
      const phaseEndTime = currentTime + phasePercentage * videoDuration;

      // Find relevant transcript segments for this time range
      const relevantSegments = findSegmentsInTimeRange(
        transcript.segments,
        phaseStartTime,
        phaseEndTime
      );

      // Identify key moments within the phase
      const keyMoments = identifyKeyMoments(relevantSegments, phase);

      timelineMapping[phaseName] = {
        start_time: Math.round(phaseStartTime),
        end_time: Math.round(phaseEndTime),
        duration: Math.round(phaseEndTime - phaseStartTime),
        script_duration: phase.duration,
        relevant_segments: relevantSegments.map((s) => s.id),
        key_moments: keyMoments,
        content_density: calculateContentDensity(relevantSegments),
        visual_complexity: assessVisualComplexity(relevantSegments),
      };

      currentTime = phaseEndTime;
    }

    return timelineMapping;
  } catch (error) {
    console.error("Timeline mapping error:", error);
    throw new Error(`Failed to map script to timeline: ${error.message}`);
  }
};

/**
 * Extract keyframes for each CLT-bLM phase
 */
const extractPhaseKeyframes = async (
  videoPath,
  timelineMapping,
  cltBlmScript
) => {
  try {
    const keyframesByPhase = {};

    for (const [phaseName, timing] of Object.entries(timelineMapping)) {
      console.log(`Extracting keyframes for ${phaseName} phase...`);

      const phase = cltBlmScript[phaseName];
      const keyframeCount = determineKeyframeCount(phase, timing.duration);

      // Extract keyframes at strategic points in the phase
      const keyframeTimes = calculateKeyframeTimes(
        timing.start_time,
        timing.end_time,
        keyframeCount,
        timing.key_moments
      );

      const keyframes = await extractKeyframes(videoPath, keyframeTimes, {
        phase: phaseName,
        educational_context: phase.purpose,
        cognitive_load: phase.cognitive_load,
      });

      // Analyze each keyframe for educational relevance
      const analyzedKeyframes = await analyzeKeyframesForEducation(
        keyframes,
        phase
      );

      keyframesByPhase[phaseName] = analyzedKeyframes;
    }

    return keyframesByPhase;
  } catch (error) {
    console.error("Keyframe extraction error:", error);
    throw new Error(`Failed to extract keyframes: ${error.message}`);
  }
};

/**
 * Align keypoints with visual content
 */
const alignKeypointsWithVisuals = async (
  keypoints,
  keyframesByPhase,
  transcriptSegments
) => {
  try {
    const alignedKeypoints = [];

    for (const keypoint of keypoints) {
      console.log(`Aligning keypoint: ${keypoint.concept}`);

      // Find the best visual representation for this keypoint
      const visualAlignment = await findBestVisualAlignment(
        keypoint,
        keyframesByPhase,
        transcriptSegments
      );

      // Calculate alignment confidence
      const alignmentConfidence = calculateAlignmentConfidence(
        keypoint,
        visualAlignment
      );

      // Generate visual learning enhancements
      const visualEnhancements = await generateKeypointVisualEnhancements(
        keypoint,
        visualAlignment
      );

      alignedKeypoints.push({
        ...keypoint,
        visual_alignment: visualAlignment,
        alignment_confidence: alignmentConfidence,
        visual_enhancements: visualEnhancements,
        educational_impact: assessEducationalImpact(keypoint, visualAlignment),
      });
    }

    return alignedKeypoints;
  } catch (error) {
    console.error("Keypoint alignment error:", error);
    throw new Error(`Failed to align keypoints: ${error.message}`);
  }
};

/**
 * Generate video segments for each CLT-bLM phase
 */
const generatePhaseSegments = async (
  videoPath,
  timelineMapping,
  keyframesByPhase,
  cltBlmScript,
  options
) => {
  try {
    const videoSegments = [];
    const outputDir = options.outputDir || "uploads/segments";
    await fs.mkdir(outputDir, { recursive: true });

    for (const [phaseName, timing] of Object.entries(timelineMapping)) {
      console.log(`Generating segment for ${phaseName} phase...`);

      const phase = cltBlmScript[phaseName];
      const keyframes = keyframesByPhase[phaseName];

      // Determine segment characteristics based on CLT-bLM principles
      const segmentConfig = determineSegmentConfiguration(
        phase,
        timing,
        options
      );

      // Extract video segment
      const segmentPath = path.join(outputDir, `segment_${phaseName}.mp4`);
      await extractVideoSegment(
        videoPath,
        timing.start_time,
        timing.end_time,
        segmentPath,
        segmentConfig
      );

      // Create segment metadata
      const segmentMetadata = await createSegmentMetadata(
        segmentPath,
        phase,
        timing,
        keyframes,
        segmentConfig
      );

      videoSegments.push({
        phase: phaseName,
        file_path: segmentPath,
        timing: timing,
        keyframes: keyframes,
        configuration: segmentConfig,
        metadata: segmentMetadata,
        educational_purpose: phase.purpose,
        cognitive_strategy: phase.cognitive_strategy,
      });
    }

    return videoSegments;
  } catch (error) {
    console.error("Phase segment generation error:", error);
    throw new Error(`Failed to generate phase segments: ${error.message}`);
  }
};

/**
 * Helper functions for video segmentation
 */

const findSegmentsInTimeRange = (segments, startTime, endTime) => {
  return segments.filter((segment) => {
    const segmentStart = segment.start / 1000; // Convert to seconds
    const segmentEnd = segment.end / 1000;

    // Include segments that overlap with the time range
    return segmentStart < endTime && segmentEnd > startTime;
  });
};

const identifyKeyMoments = (segments, phase) => {
  const keyMoments = [];

  // Identify moments based on content importance and phase characteristics
  segments.forEach((segment) => {
    if (segment.importance > 0.7) {
      keyMoments.push({
        time: segment.start / 1000,
        reason: "high_importance_content",
        content: segment.text,
        confidence: segment.confidence,
      });
    }

    // Look for phase-specific indicators
    const phaseIndicators = getPhaseIndicators(phase.purpose);
    phaseIndicators.forEach((indicator) => {
      if (segment.text.toLowerCase().includes(indicator)) {
        keyMoments.push({
          time: segment.start / 1000,
          reason: `phase_indicator_${indicator}`,
          content: segment.text,
          relevance: calculateRelevance(segment.text, indicator),
        });
      }
    });
  });

  // Sort by time and remove duplicates
  return keyMoments
    .sort((a, b) => a.time - b.time)
    .filter(
      (moment, index, array) =>
        index === 0 || Math.abs(moment.time - array[index - 1].time) > 5 // 5 second minimum gap
    );
};

const getPhaseIndicators = (phasePurpose) => {
  const indicators = {
    "Activate prior knowledge and create interest": [
      "welcome",
      "today",
      "introduction",
      "begin",
    ],
    "Set clear expectations and learning goals": [
      "objective",
      "goal",
      "learn",
      "will",
      "able",
    ],
    "Main learning content with optimal cognitive load": [
      "concept",
      "principle",
      "example",
      "important",
    ],
    "Consolidate learning and encourage reflection": [
      "summary",
      "conclude",
      "remember",
      "recap",
    ],
  };

  return indicators[phasePurpose] || [];
};

const calculateContentDensity = (segments) => {
  if (segments.length === 0) return 0;

  const totalWords = segments.reduce(
    (sum, segment) => sum + segment.wordCount,
    0
  );
  const totalDuration = segments.reduce(
    (sum, segment) => sum + segment.duration,
    0
  );

  return totalWords / (totalDuration / 1000); // Words per second
};

const assessVisualComplexity = (segments) => {
  // Simple heuristic based on content characteristics
  let complexity = 0.5; // Base complexity

  segments.forEach((segment) => {
    if (segment.conceptualDensity > 0.7) complexity += 0.1;
    if (segment.hasNumbers) complexity += 0.05;
    if (segment.type === "definition") complexity += 0.1;
  });

  return Math.min(complexity, 1);
};

const determineKeyframeCount = (phase, duration) => {
  // Base keyframe count on duration and phase type
  let baseCount = Math.ceil(duration / 30); // One every 30 seconds

  // Adjust based on phase characteristics
  const phaseMultipliers = {
    prepare: 0.8, // Fewer keyframes for introduction
    initiate: 1.0, // Standard count
    deliver: 1.5, // More keyframes for main content
    end: 0.7, // Fewer keyframes for conclusion
  };

  const phaseName = phase.purpose
    ? Object.keys(phaseMultipliers).find((key) =>
        phase.purpose.toLowerCase().includes(key)
      )
    : "deliver";

  return Math.max(
    2,
    Math.ceil(baseCount * (phaseMultipliers[phaseName] || 1.0))
  );
};

const calculateKeyframeTimes = (
  startTime,
  endTime,
  keyframeCount,
  keyMoments
) => {
  const times = [];
  const duration = endTime - startTime;

  // Always include start and end
  times.push(startTime);
  if (keyframeCount > 1) times.push(endTime - 1);

  // Add key moments if available
  keyMoments.forEach((moment) => {
    if (moment.time >= startTime && moment.time <= endTime) {
      times.push(moment.time);
    }
  });

  // Fill remaining slots with evenly distributed times
  const remainingSlots = keyframeCount - times.length;
  for (let i = 1; i <= remainingSlots; i++) {
    const time = startTime + (duration * i) / (remainingSlots + 1);
    times.push(time);
  }

  // Sort and ensure minimum 2-second gaps
  return times
    .sort((a, b) => a - b)
    .filter((time, index, array) => index === 0 || time - array[index - 1] >= 2)
    .slice(0, keyframeCount);
};

const analyzeKeyframesForEducation = async (keyframes, phase) => {
  return keyframes.map((keyframe) => ({
    ...keyframe,
    educational_relevance: assessEducationalRelevance(keyframe, phase),
    visual_clarity: assessVisualClarity(keyframe),
    learning_support: assessLearningSupport(keyframe, phase),
    cognitive_load_impact: assessCognitiveLoadImpact(keyframe, phase),
  }));
};

const assessEducationalRelevance = (keyframe, phase) => {
  let relevance = 0.5; // Base relevance

  // Check if keyframe contains text or diagrams (simplified heuristic)
  if (keyframe.metadata?.hasText) relevance += 0.2;
  if (keyframe.metadata?.hasDiagrams) relevance += 0.3;

  // Adjust based on phase type
  if (phase.purpose?.includes("Main learning content")) {
    relevance += 0.1; // Higher relevance for deliver phase
  }

  return Math.min(relevance, 1);
};

const assessVisualClarity = (keyframe) => {
  // Simplified assessment based on image properties
  let clarity = 0.7; // Base clarity assumption

  if (
    keyframe.metadata?.brightness > 0.3 &&
    keyframe.metadata?.brightness < 0.8
  ) {
    clarity += 0.1; // Good brightness
  }

  if (keyframe.metadata?.contrast > 0.5) {
    clarity += 0.1; // Good contrast
  }

  return Math.min(clarity, 1);
};

const assessLearningSupport = (keyframe, phase) => {
  let support = 0.4; // Base support

  // Higher support for keyframes that align with learning objectives
  if (phase.objectives && keyframe.metadata?.content) {
    const contentWords = keyframe.metadata.content.toLowerCase().split(" ");
    phase.objectives.forEach((objective) => {
      const objectiveWords = objective.toLowerCase().split(" ");
      const overlap = contentWords.filter((word) =>
        objectiveWords.includes(word)
      );
      support += overlap.length * 0.05;
    });
  }

  return Math.min(support, 1);
};

const assessCognitiveLoadImpact = (keyframe, phase) => {
  const phaseLoad = phase.cognitive_load || {
    intrinsic: 0.5,
    extraneous: 0.3,
    germane: 0.4,
  };

  // Visual complexity affects extraneous load
  let impact = {
    intrinsic: phaseLoad.intrinsic,
    extraneous:
      phaseLoad.extraneous + (keyframe.metadata?.complexity || 0) * 0.1,
    germane: phaseLoad.germane + (keyframe.educational_relevance || 0) * 0.1,
  };

  // Ensure values stay within bounds
  Object.keys(impact).forEach((key) => {
    impact[key] = Math.min(Math.max(impact[key], 0), 1);
  });

  return impact;
};

/**
 * Extract video segment using FFmpeg
 */
const extractVideoSegment = async (
  inputPath,
  startTime,
  endTime,
  outputPath,
  config = {}
) => {
  return new Promise((resolve, reject) => {
    let command = ffmpeg(inputPath)
      .seekInput(startTime)
      .duration(endTime - startTime)
      .output(outputPath);

    // Apply configuration options
    if (config.resolution) {
      command = command.size(config.resolution);
    }

    if (config.quality) {
      const qualityMap = {
        high: ["-crf", "18"],
        medium: ["-crf", "23"],
        low: ["-crf", "28"],
      };
      command = command.outputOptions(
        qualityMap[config.quality] || qualityMap.medium
      );
    }

    if (config.frameRate) {
      command = command.fps(config.frameRate);
    }

    command
      .on("progress", (progress) => {
        console.log(`Segment extraction progress: ${progress.percent}%`);
      })
      .on("end", () => {
        console.log("Segment extraction completed");
        resolve(outputPath);
      })
      .on("error", (err) => {
        console.error("Segment extraction error:", err);
        reject(new Error(`Segment extraction failed: ${err.message}`));
      })
      .run();
  });
};

const determineSegmentConfiguration = (phase, timing, options) => {
  const config = {
    resolution: options.resolution || "1280x720",
    quality: options.quality || "medium",
    frameRate: options.frameRate || 30,
  };

  // Adjust based on phase characteristics
  if (phase.cognitive_load?.extraneous > 0.6) {
    config.quality = "high"; // Better quality for complex content
  }

  if (timing.duration < 30) {
    config.frameRate = 24; // Lower frame rate for short segments
  }

  return config;
};

const createSegmentMetadata = async (
  segmentPath,
  phase,
  timing,
  keyframes,
  config
) => {
  const stats = await fs.stat(segmentPath);

  return {
    file_size: stats.size,
    duration: timing.duration,
    keyframe_count: keyframes.length,
    educational_purpose: phase.purpose,
    cognitive_strategy: phase.cognitive_strategy,
    quality_config: config,
    creation_timestamp: new Date().toISOString(),
  };
};

module.exports = {
  createAlignedVideoSegments,
  mapScriptToTimeline,
  extractPhaseKeyframes,
  alignKeypointsWithVisuals,
};
