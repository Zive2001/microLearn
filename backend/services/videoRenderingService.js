const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs/promises');
const { createCanvas, loadImage } = require('canvas');

/**
 * Render final micro-video combining all components
 */
const renderMicroVideo = async (renderingData, options = {}) => {
  try {
    console.log("Starting micro-video rendering...");

    const {
      videoSegments,
      audioData,
      visualEnhancements,
      timelineMapping,
      cltBlmScript,
    } = renderingData;

    // Create output directory
    const outputDir = options.outputDir || "uploads/rendered";
    await fs.mkdir(outputDir, { recursive: true });

    // Phase 1: Prepare video segments with visual overlays
    const enhancedSegments = await applyVisualEnhancements(
      videoSegments,
      visualEnhancements,
      outputDir
    );

    // Phase 2: Synchronize audio with video segments
    const audioSyncedSegments = await synchronizeAudioWithVideo(
      enhancedSegments,
      audioData,
      timelineMapping,
      outputDir
    );

    // Phase 3: Combine all segments into final video
    const finalVideo = await assembleFinelVideo(
      audioSyncedSegments,
      audioData,
      options,
      outputDir
    );

    // Phase 4: Quality validation and optimization
    const qualityValidation = await validateRenderingQuality(finalVideo);

    // Phase 5: Generate alternative formats if requested
    const alternativeFormats = await generateAlternativeFormats(
      finalVideo,
      options.formats || ["mp4"],
      outputDir
    );

    console.log("Micro-video rendering completed successfully");

    return {
      final_video: finalVideo,
      enhanced_segments: enhancedSegments,
      alternative_formats: alternativeFormats,
      quality_validation: qualityValidation,
      rendering_metadata: {
        total_segments: enhancedSegments.length,
        final_duration: finalVideo.duration,
        file_size: finalVideo.file_size,
        processing_time: Date.now(),
        audio_tracks: Object.keys(audioData.phase_audio_files).length,
      },
    };
  } catch (error) {
    console.error("Video rendering error:", error);
    throw new Error(`Video rendering failed: ${error.message}`);
  }
};

/**
 * Apply visual enhancements to video segments
 */
const applyVisualEnhancements = async (
  videoSegments,
  visualEnhancements,
  outputDir
) => {
  const enhancedSegments = [];

  for (const segment of videoSegments) {
    console.log(`Applying visual enhancements to ${segment.phase} segment...`);

    // Get phase-specific visual cues
    const phaseVisuals = visualEnhancements?.phase_visual_cues?.[segment.phase];
    const relevantKeypoints =
      visualEnhancements?.keypoint_visuals?.filter(
        (kv) => kv.keypoint_data.visual_alignment?.phase === segment.phase
      ) || [];

    // Generate overlay elements for this segment
    const overlayElements = await generateSegmentOverlays(
      segment,
      phaseVisuals,
      relevantKeypoints,
      outputDir
    );

    // Apply overlays to video segment
    const enhancedSegmentPath = await applyOverlaysToSegment(
      segment.file_path,
      overlayElements,
      outputDir,
      segment.phase
    );

    enhancedSegments.push({
      ...segment,
      enhanced_file_path: enhancedSegmentPath,
      overlay_elements: overlayElements,
      enhancement_applied: true,
    });
  }

  return enhancedSegments;
};

/**
 * Generate overlay elements for a video segment
 */
const generateSegmentOverlays = async (
  segment,
  phaseVisuals,
  relevantKeypoints,
  outputDir
) => {
  const overlays = [];

  // Generate phase label overlay
  if (phaseVisuals) {
    const phaseLabelOverlay = await generatePhaseLabelOverlay(
      segment.phase,
      phaseVisuals,
      segment.timing.duration,
      outputDir
    );
    overlays.push(phaseLabelOverlay);
  }

  // Generate keypoint annotations
  for (const keypointVisual of relevantKeypoints) {
    const keypointOverlay = await generateKeypointOverlay(
      keypointVisual,
      segment.timing,
      outputDir
    );
    overlays.push(keypointOverlay);
  }

  // Generate cognitive load indicator if needed
  if (segment.cognitive_load) {
    const loadIndicator = await generateCognitiveLoadIndicator(
      segment.cognitive_load,
      segment.timing.duration,
      outputDir
    );
    overlays.push(loadIndicator);
  }

  return overlays;
};

/**
 * Generate phase label overlay
 */
const generatePhaseLabelOverlay = async (
  phaseName,
  phaseVisuals,
  duration,
  outputDir
) => {
  const canvas = createCanvas(300, 60);
  const ctx = canvas.getContext("2d");

  // Set styling based on phase visuals
  const backgroundColor =
    phaseVisuals.background_elements?.color_scheme || "#3498db";
  const textColor = phaseVisuals.text_presentation?.text_color || "#ffffff";

  // Draw background
  ctx.fillStyle = backgroundColor;
  ctx.roundRect(0, 0, 300, 60, 8);
  ctx.fill();

  // Draw text
  ctx.fillStyle = textColor;
  ctx.font = "bold 16px Arial";
  ctx.textAlign = "center";
  ctx.fillText(getPhaseDisplayName(phaseName), 150, 35);

  // Save overlay image
  const overlayPath = path.join(outputDir, `overlay_phase_${phaseName}.png`);
  const buffer = canvas.toBuffer("image/png");
  await fs.writeFile(overlayPath, buffer);

  return {
    type: "phase_label",
    file_path: overlayPath,
    position: "top_left",
    start_time: 0,
    duration: Math.min(3, duration), // Show for 3 seconds or segment duration
    z_index: 10,
  };
};

/**
 * Generate keypoint overlay
 */
const generateKeypointOverlay = async (
  keypointVisual,
  segmentTiming,
  outputDir
) => {
  const keypoint = keypointVisual.keypoint_data;
  const visual = keypointVisual.visual_enhancement;

  const canvas = createCanvas(400, 80);
  const ctx = canvas.getContext("2d");

  // Background based on Bloom's level
  const bloomColors = {
    remember: "#9b59b6",
    understand: "#3498db",
    apply: "#2ecc71",
    analyze: "#f39c12",
    evaluate: "#e74c3c",
    create: "#1abc9c",
  };

  const backgroundColor = bloomColors[keypoint.bloom_level] || "#34495e";

  // Draw background with rounded corners
  ctx.fillStyle = backgroundColor;
  ctx.roundRect(0, 0, 400, 80, 12);
  ctx.fill();

  // Draw keypoint text
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 14px Arial";
  ctx.textAlign = "left";
  ctx.fillText(keypoint.concept, 15, 25);

  // Draw description
  ctx.font = "12px Arial";
  ctx.fillText(keypoint.description.substring(0, 50) + "...", 15, 45);

  // Draw Bloom's level indicator
  ctx.font = "bold 10px Arial";
  ctx.textAlign = "right";
  ctx.fillText(keypoint.bloom_level.toUpperCase(), 385, 70);

  // Save overlay
  const overlayPath = path.join(
    outputDir,
    `overlay_keypoint_${keypoint.concept.replace(/\s+/g, "_")}.png`
  );
  const buffer = canvas.toBuffer("image/png");
  await fs.writeFile(overlayPath, buffer);

  return {
    type: "keypoint_annotation",
    file_path: overlayPath,
    position: "bottom_center",
    start_time: Math.max(0, segmentTiming.duration * 0.2), // Show after 20% of segment
    duration: 4,
    z_index: 20,
    keypoint_id: keypoint.concept,
  };
};

/**
 * Generate cognitive load indicator
 */
const generateCognitiveLoadIndicator = async (
  cognitiveLoad,
  duration,
  outputDir
) => {
  const canvas = createCanvas(200, 30);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.roundRect(0, 0, 200, 30, 4);
  ctx.fill();

  // Draw load bars
  const barWidth = 50;
  const barHeight = 20;
  const spacing = 5;

  const loads = [
    { type: "intrinsic", value: cognitiveLoad.intrinsic, color: "#3498db" },
    { type: "extraneous", value: cognitiveLoad.extraneous, color: "#e74c3c" },
    { type: "germane", value: cognitiveLoad.germane, color: "#2ecc71" },
  ];

  loads.forEach((load, index) => {
    const x = 10 + (barWidth + spacing) * index;
    const y = 5;

    // Background bar
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.fillRect(x, y, barWidth, barHeight);

    // Load level bar
    ctx.fillStyle = load.color;
    const fillWidth = barWidth * Math.min(load.value, 1);
    ctx.fillRect(x, y, fillWidth, barHeight);
  });

  // Save indicator
  const overlayPath = path.join(outputDir, "overlay_cognitive_load.png");
  const buffer = canvas.toBuffer("image/png");
  await fs.writeFile(overlayPath, buffer);

  return {
    type: "cognitive_load_indicator",
    file_path: overlayPath,
    position: "top_right",
    start_time: 0,
    duration: duration,
    z_index: 5,
  };
};

/**
 * Apply overlays to video segment using FFmpeg
 */
const applyOverlaysToSegment = async (
  inputVideoPath,
  overlayElements,
  outputDir,
  phaseName
) => {
  if (overlayElements.length === 0) {
    return inputVideoPath; // No overlays to apply
  }

  const outputPath = path.join(outputDir, `enhanced_${phaseName}_segment.mp4`);

  return new Promise((resolve, reject) => {
    let command = ffmpeg(inputVideoPath);

    // Add overlay images as inputs
    overlayElements.forEach((overlay) => {
      command = command.input(overlay.file_path);
    });

    // Build filter complex for overlays
    let filterComplex = "[0:v]";

    overlayElements.forEach((overlay, index) => {
      const inputIndex = index + 1; // Video is input 0, overlays start at 1
      const position = getOverlayPosition(overlay.position);

      filterComplex += `[${inputIndex}:v]overlay=${position}:enable='between(t,${
        overlay.start_time
      },${overlay.start_time + overlay.duration})'`;

      if (index < overlayElements.length - 1) {
        filterComplex += `[tmp${index}];[tmp${index}]`;
      }
    });

    command
      .complexFilter(filterComplex)
      .outputOptions(["-c:v libx264", "-c:a copy", "-preset fast", "-crf 23"])
      .output(outputPath)
      .on("progress", (progress) => {
        console.log(`Overlay progress for ${phaseName}: ${progress.percent}%`);
      })
      .on("end", () => {
        console.log(`Overlays applied to ${phaseName} segment`);
        resolve(outputPath);
      })
      .on("error", (err) => {
        console.error(`Overlay application error for ${phaseName}:`, err);
        reject(new Error(`Failed to apply overlays: ${err.message}`));
      })
      .run();
  });
};

/**
 * Get overlay position coordinates
 */
const getOverlayPosition = (position) => {
  const positions = {
    top_left: "10:10",
    top_center: "(main_w-overlay_w)/2:10",
    top_right: "main_w-overlay_w-10:10",
    center: "(main_w-overlay_w)/2:(main_h-overlay_h)/2",
    bottom_left: "10:main_h-overlay_h-10",
    bottom_center: "(main_w-overlay_w)/2:main_h-overlay_h-10",
    bottom_right: "main_w-overlay_w-10:main_h-overlay_h-10",
  };

  return positions[position] || positions.center;
};

/**
 * Synchronize audio with video segments
 */
const synchronizeAudioWithVideo = async (
  enhancedSegments,
  audioData,
  timelineMapping,
  outputDir
) => {
  const syncedSegments = [];

  for (const segment of enhancedSegments) {
    console.log(`Synchronizing audio for ${segment.phase} segment...`);

    const phaseAudio = audioData.phase_audio_files[segment.phase];
    if (!phaseAudio) {
      console.warn(`No audio found for ${segment.phase} phase`);
      syncedSegments.push(segment);
      continue;
    }

    // Calculate audio-video sync parameters
    const syncParams = calculateSyncParameters(
      segment,
      phaseAudio,
      timelineMapping
    );

    // Apply audio synchronization
    const syncedSegmentPath = await applySynchronizedAudio(
      segment.enhanced_file_path || segment.file_path,
      phaseAudio.file_path,
      syncParams,
      outputDir,
      segment.phase
    );

    syncedSegments.push({
      ...segment,
      synced_file_path: syncedSegmentPath,
      audio_sync_applied: true,
      sync_parameters: syncParams,
    });
  }

  return syncedSegments;
};

/**
 * Calculate synchronization parameters
 */
const calculateSyncParameters = (segment, phaseAudio, timelineMapping) => {
  const videoLength = segment.timing.duration;
  const audioLength = phaseAudio.duration;

  // Determine if audio needs stretching/compression
  const audioVideoRatio = audioLength / videoLength;

  return {
    video_duration: videoLength,
    audio_duration: audioLength,
    audio_video_ratio: audioVideoRatio,
    needs_audio_adjustment: Math.abs(audioVideoRatio - 1) > 0.05, // 5% tolerance
    tempo_adjustment: audioVideoRatio > 1.05 ? audioVideoRatio : null,
    padding_needed: audioVideoRatio < 0.95 ? videoLength - audioLength : null,
    sync_method: determineSyncMethod(audioVideoRatio),
  };
};

/**
 * Determine synchronization method
 */
const determineSyncMethod = (audioVideoRatio) => {
  if (audioVideoRatio > 1.1) return "compress_audio";
  if (audioVideoRatio < 0.9) return "extend_audio";
  if (audioVideoRatio > 1.05) return "speed_up_audio";
  if (audioVideoRatio < 0.95) return "add_padding";
  return "direct_overlay";
};

/**
 * Apply synchronized audio to video segment
 */
const applySynchronizedAudio = async (
  videoPath,
  audioPath,
  syncParams,
  outputDir,
  phaseName
) => {
  const outputPath = path.join(outputDir, `synced_${phaseName}_segment.mp4`);

  return new Promise((resolve, reject) => {
    let command = ffmpeg().input(videoPath).input(audioPath);

    let audioFilter = "[1:a]";

    // Apply audio adjustments based on sync method
    switch (syncParams.sync_method) {
      case "speed_up_audio":
        audioFilter += `atempo=${1 / syncParams.audio_video_ratio}`;
        break;

      case "compress_audio":
        audioFilter += `atempo=${1 / syncParams.audio_video_ratio}`;
        break;

      case "add_padding":
        audioFilter += `apad=pad_dur=${syncParams.padding_needed}`;
        break;

      case "extend_audio":
        audioFilter += `aloop=loop=-1:size=2048,atrim=duration=${syncParams.video_duration}`;
        break;

      default:
        audioFilter += "anull"; // No adjustment needed
    }

    audioFilter += "[synced_audio]";

    command
      .complexFilter([audioFilter])
      .outputOptions([
        "-map",
        "0:v",
        "-map",
        "[synced_audio]",
        "-c:v",
        "copy",
        "-c:a",
        "aac",
        "-shortest",
      ])
      .output(outputPath)
      .on("progress", (progress) => {
        console.log(
          `Audio sync progress for ${phaseName}: ${progress.percent}%`
        );
      })
      .on("end", () => {
        console.log(`Audio synchronized for ${phaseName} segment`);
        resolve(outputPath);
      })
      .on("error", (err) => {
        console.error(`Audio sync error for ${phaseName}:`, err);
        reject(new Error(`Audio synchronization failed: ${err.message}`));
      })
      .run();
  });
};

/**
 * Assemble final video from all segments
 */
const assembleFinelVideo = async (
  audioSyncedSegments,
  audioData,
  options,
  outputDir
) => {
  console.log("Assembling final micro-video...");

  const finalOutputPath = path.join(
    outputDir,
    options.outputFilename || "final_microvideo.mp4"
  );

  return new Promise((resolve, reject) => {
    let command = ffmpeg();

    // Add all synced segments as inputs
    const validSegments = audioSyncedSegments.filter(
      (segment) =>
        segment.synced_file_path ||
        segment.enhanced_file_path ||
        segment.file_path
    );

    validSegments.forEach((segment) => {
      const inputPath =
        segment.synced_file_path ||
        segment.enhanced_file_path ||
        segment.file_path;
      command = command.input(inputPath);
    });

    // Create concatenation filter
    let filterComplex = "";
    validSegments.forEach((segment, index) => {
      filterComplex += `[${index}:v] [${index}:a] `;
    });
    filterComplex += `concat=n=${validSegments.length}:v=1:a=1 [v] [a]`;

    // Add fade transitions between segments
    if (options.includeFadeTransitions !== false) {
      filterComplex = addFadeTransitions(filterComplex, validSegments);
    }

    command
      .complexFilter(filterComplex)
      .outputOptions([
        "-map",
        "[v]",
        "-map",
        "[a]",
        "-c:v",
        "libx264",
        "-c:a",
        "aac",
        "-preset",
        "medium",
        "-crf",
        "20",
        "-movflags",
        "+faststart", // Optimize for web streaming
      ])
      .output(finalOutputPath)
      .on("progress", (progress) => {
        console.log(`Final assembly progress: ${progress.percent}%`);
      })
      .on("end", async () => {
        try {
          // Get final video metadata
          const finalMetadata = await getVideoMetadata(finalOutputPath);

          console.log("Final micro-video assembly completed");
          resolve({
            file_path: finalOutputPath,
            filename: path.basename(finalOutputPath),
            duration: finalMetadata.duration,
            file_size: finalMetadata.size,
            resolution: `${finalMetadata.width}x${finalMetadata.height}`,
            segments_included: validSegments.length,
            transitions_applied: options.includeFadeTransitions !== false,
          });
        } catch (metadataError) {
          reject(metadataError);
        }
      })
      .on("error", (err) => {
        console.error("Final assembly error:", err);
        reject(new Error(`Final video assembly failed: ${err.message}`));
      })
      .run();
  });
};

/**
 * Add fade transitions between segments
 */
const addFadeTransitions = (filterComplex, segments) => {
  // This is a simplified version - full implementation would be more complex
  // For now, we'll add basic crossfade between segments
  let enhancedFilter = filterComplex;

  if (segments.length > 1) {
    // Add crossfade transitions (simplified)
    enhancedFilter = enhancedFilter.replace(
      "concat=n=",
      "xfade=transition=fade:duration=0.5:offset=0,concat=n="
    );
  }

  return enhancedFilter;
};

/**
 * Get video metadata
 */
const getVideoMetadata = async (videoPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(new Error(`Failed to get video metadata: ${err.message}`));
        return;
      }

      const videoStream = metadata.streams.find(
        (stream) => stream.codec_type === "video"
      );
      const format = metadata.format;

      resolve({
        duration: parseFloat(format.duration) || 0,
        size: parseInt(format.size) || 0,
        width: videoStream?.width || 0,
        height: videoStream?.height || 0,
        bitrate: parseInt(format.bit_rate) || 0,
        codec: videoStream?.codec_name || "unknown",
      });
    });
  });
};

/**
 * Validate rendering quality
 */
const validateRenderingQuality = async (finalVideo) => {
  const validation = {
    overall_quality: 0,
    video_quality: {},
    audio_quality: {},
    issues: [],
    recommendations: [],
  };

  try {
    // Check video file integrity
    const metadata = await getVideoMetadata(finalVideo.file_path);

    // Video quality checks
    validation.video_quality = {
      resolution_acceptable: metadata.width >= 640 && metadata.height >= 480,
      duration_reasonable: metadata.duration > 60 && metadata.duration < 600, // 1-10 minutes
      file_size_appropriate: metadata.size > 1000000, // At least 1MB
      bitrate_adequate: metadata.bitrate > 500000, // At least 500kbps
    };

    // Calculate video quality score
    const videoScore =
      Object.values(validation.video_quality).filter(Boolean).length /
      Object.keys(validation.video_quality).length;

    // Overall quality assessment
    validation.overall_quality = videoScore;

    // Generate issues and recommendations
    if (!validation.video_quality.resolution_acceptable) {
      validation.issues.push("Video resolution below recommended minimum");
      validation.recommendations.push(
        "Increase video resolution to at least 640x480"
      );
    }

    if (!validation.video_quality.duration_reasonable) {
      validation.issues.push("Video duration outside optimal range");
      validation.recommendations.push(
        "Adjust video length to 1-10 minutes for optimal learning"
      );
    }

    if (validation.overall_quality < 0.7) {
      validation.recommendations.push(
        "Consider regenerating video with higher quality settings"
      );
    }
  } catch (error) {
    validation.issues.push(`Quality validation failed: ${error.message}`);
    validation.overall_quality = 0.5;
  }

  return validation;
};

/**
 * Generate alternative formats
 */
const generateAlternativeFormats = async (finalVideo, formats, outputDir) => {
  const alternativeFormats = [];

  for (const format of formats) {
    if (format === "mp4") continue; // Already generated

    try {
      console.log(`Generating ${format} format...`);

      const altFormatPath = await convertToFormat(
        finalVideo.file_path,
        format,
        outputDir
      );

      const metadata = await getVideoMetadata(altFormatPath);

      alternativeFormats.push({
        format: format,
        file_path: altFormatPath,
        filename: path.basename(altFormatPath),
        file_size: metadata.size,
        duration: metadata.duration,
      });
    } catch (error) {
      console.warn(`Failed to generate ${format} format:`, error.message);
    }
  }

  return alternativeFormats;
};

/**
 * Convert video to specific format
 */
const convertToFormat = async (inputPath, format, outputDir) => {
  const outputPath = path.join(outputDir, `final_microvideo.${format}`);

  return new Promise((resolve, reject) => {
    let command = ffmpeg(inputPath);

    // Format-specific settings
    switch (format) {
      case "webm":
        command = command
          .videoCodec("libvpx-vp9")
          .audioCodec("libopus")
          .outputOptions(["-crf", "30", "-b:v", "0"]);
        break;

      case "mov":
        command = command
          .videoCodec("libx264")
          .audioCodec("aac")
          .outputOptions(["-preset", "fast", "-crf", "20"]);
        break;

      default:
        reject(new Error(`Unsupported format: ${format}`));
        return;
    }

    command
      .output(outputPath)
      .on("progress", (progress) => {
        console.log(
          `${format.toUpperCase()} conversion progress: ${progress.percent}%`
        );
      })
      .on("end", () => {
        console.log(`${format.toUpperCase()} conversion completed`);
        resolve(outputPath);
      })
      .on("error", (err) => {
        reject(
          new Error(`${format.toUpperCase()} conversion failed: ${err.message}`)
        );
      })
      .run();
  });
};

/**
 * Get phase display name
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

module.exports = {
  renderMicroVideo,
  applyVisualEnhancements,
  synchronizeAudioWithVideo,
  assembleFinelVideo,
  validateRenderingQuality,
  generateAlternativeFormats,
};
