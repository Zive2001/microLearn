const ffmpeg = require('fluent-ffmpeg');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs/promises');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Analyze visual content of entire video
 */
const analyzeVisualContent = async (videoPath) => {
  try {
    console.log("Starting visual content analysis...");

    // Extract sample frames for analysis
    const sampleFrames = await extractSampleFrames(videoPath, 10);

    // Analyze visual characteristics
    const visualCharacteristics = await analyzeVisualCharacteristics(
      sampleFrames
    );

    // Detect visual content types
    const contentTypes = await detectVisualContentTypes(sampleFrames);

    // Assess educational visual elements
    const educationalElements = await assessEducationalVisualElements(
      sampleFrames
    );

    // Calculate visual complexity metrics
    const complexityMetrics = await calculateVisualComplexity(sampleFrames);

    return {
      visual_characteristics: visualCharacteristics,
      content_types: contentTypes,
      educational_elements: educationalElements,
      complexity_metrics: complexityMetrics,
      sample_frame_count: sampleFrames.length,
      analysis_timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Visual content analysis error:", error);
    throw new Error(`Failed to analyze visual content: ${error.message}`);
  }
};

/**
 * Extract keyframes at specific times
 */
const extractKeyframes = async (videoPath, times, options = {}) => {
  try {
    const keyframes = [];
    const outputDir = options.outputDir || "uploads/keyframes";
    await fs.mkdir(outputDir, { recursive: true });

    for (let i = 0; i < times.length; i++) {
      const time = times[i];
      const filename = `keyframe_${options.phase || "frame"}_${i}_${Math.round(
        time
      )}s.jpg`;
      const outputPath = path.join(outputDir, filename);

      // Extract frame at specific time
      await extractFrameAtTime(videoPath, time, outputPath);

      // Analyze the extracted frame
      const frameAnalysis = await analyzeFrame(outputPath, {
        ...options,
        timestamp: time,
      });

      keyframes.push({
        id: `keyframe_${i}`,
        timestamp: time,
        file_path: outputPath,
        filename: filename,
        analysis: frameAnalysis,
        extraction_options: options,
      });
    }

    return keyframes;
  } catch (error) {
    console.error("Keyframe extraction error:", error);
    throw new Error(`Failed to extract keyframes: ${error.message}`);
  }
};

/**
 * Extract sample frames from video for analysis
 */
const extractSampleFrames = async (videoPath, count = 10) => {
  try {
    const outputDir = "uploads/temp/analysis";
    await fs.mkdir(outputDir, { recursive: true });

    // Get video duration first
    const metadata = await getVideoMetadata(videoPath);
    const duration = metadata.duration;

    const frames = [];
    const interval = duration / (count + 1);

    for (let i = 1; i <= count; i++) {
      const time = interval * i;
      const filename = `sample_${i}_${Math.round(time)}s.jpg`;
      const outputPath = path.join(outputDir, filename);

      await extractFrameAtTime(videoPath, time, outputPath);
      frames.push({
        timestamp: time,
        file_path: outputPath,
        sequence: i,
      });
    }

    return frames;
  } catch (error) {
    console.error("Sample frame extraction error:", error);
    throw new Error(`Failed to extract sample frames: ${error.message}`);
  }
};

/**
 * Extract single frame at specific time
 */
const extractFrameAtTime = async (videoPath, time, outputPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .seekInput(time)
      .frames(1)
      .output(outputPath)
      .on("end", () => resolve(outputPath))
      .on("error", (err) =>
        reject(new Error(`Frame extraction failed: ${err.message}`))
      )
      .run();
  });
};

/**
 * Get video metadata using FFmpeg
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
      resolve({
        duration: parseFloat(metadata.format.duration),
        width: videoStream.width,
        height: videoStream.height,
        frameRate: eval(videoStream.r_frame_rate) || 30,
      });
    });
  });
};

/**
 * Analyze individual frame
 */
const analyzeFrame = async (framePath, options = {}) => {
  try {
    // Get basic image properties
    const imageStats = await getImageStatistics(framePath);

    // Detect text content
    const textContent = await detectTextInFrame(framePath);

    // Analyze visual elements
    const visualElements = await analyzeVisualElements(framePath);

    // Assess educational value
    const educationalValue = await assessFrameEducationalValue(
      framePath,
      textContent,
      options
    );

    return {
      image_properties: imageStats,
      text_content: textContent,
      visual_elements: visualElements,
      educational_value: educationalValue,
      timestamp: options.timestamp,
      phase: options.phase,
      educational_context: options.educational_context,
    };
  } catch (error) {
    console.error("Frame analysis error:", error);
    throw new Error(`Failed to analyze frame: ${error.message}`);
  }
};

/**
 * Get image statistics using Sharp
 */
const getImageStatistics = async (imagePath) => {
  try {
    const image = sharp(imagePath);
    const metadata = await image.metadata();
    const stats = await image.stats();

    // Calculate brightness and contrast
    const brightness =
      stats.channels.reduce((sum, channel) => sum + channel.mean, 0) /
      stats.channels.length /
      255;
    const contrast =
      stats.channels.reduce((sum, channel) => sum + channel.stdev, 0) /
      stats.channels.length /
      255;

    return {
      width: metadata.width,
      height: metadata.height,
      channels: metadata.channels,
      brightness: Math.round(brightness * 100) / 100,
      contrast: Math.round(contrast * 100) / 100,
      has_alpha: metadata.hasAlpha,
      format: metadata.format,
      file_size: metadata.size,
    };
  } catch (error) {
    console.error("Image statistics error:", error);
    return {
      error: "Failed to analyze image statistics",
      message: error.message,
    };
  }
};

/**
 * Detect text content in frame using OCR
 */
const detectTextInFrame = async (framePath) => {
  try {
    // For production, you would integrate with OCR service like Tesseract or Google Vision
    // This is a simplified implementation

    // Check if frame likely contains text based on visual patterns
    const hasTextLikelihood = await assessTextLikelihood(framePath);

    return {
      has_text: hasTextLikelihood > 0.6,
      text_likelihood: hasTextLikelihood,
      detected_text: "", // Would contain actual OCR results
      text_regions: [], // Would contain bounding boxes
      text_confidence: hasTextLikelihood,
      language_detected: "en", // Would be detected by OCR
    };
  } catch (error) {
    console.error("Text detection error:", error);
    return {
      has_text: false,
      error: "Text detection failed",
    };
  }
};

/**
 * Assess likelihood of text presence in frame
 */
const assessTextLikelihood = async (framePath) => {
  try {
    const image = sharp(framePath);

    // Convert to grayscale and get statistics
    const grayImage = image.grayscale();
    const stats = await grayImage.stats();

    // High contrast often indicates text
    const contrast = stats.channels[0].stdev / 255;

    // Edge detection would be more accurate but this is a simple heuristic
    let textLikelihood = 0;

    if (contrast > 0.3) textLikelihood += 0.4;
    if (contrast > 0.5) textLikelihood += 0.3;
    if (stats.channels[0].mean > 100 && stats.channels[0].mean < 200)
      textLikelihood += 0.2;

    return Math.min(textLikelihood, 1);
  } catch (error) {
    console.error("Text likelihood assessment error:", error);
    return 0;
  }
};

/**
 * Analyze visual elements in frame
 */
const analyzeVisualElements = async (framePath) => {
  try {
    const imageStats = await getImageStatistics(framePath);

    // Detect visual element types based on image characteristics
    const elements = {
      has_diagrams: await detectDiagrams(framePath, imageStats),
      has_charts: await detectCharts(framePath, imageStats),
      has_people: await detectPeople(framePath),
      has_slides: await detectSlides(framePath, imageStats),
      has_whiteboard: await detectWhiteboard(framePath, imageStats),
      has_computer_screen: await detectComputerScreen(framePath, imageStats),
      dominant_colors: await getDominantColors(framePath),
      visual_complexity: calculateFrameComplexity(imageStats),
    };

    return elements;
  } catch (error) {
    console.error("Visual elements analysis error:", error);
    return {
      error: "Failed to analyze visual elements",
    };
  }
};

/**
 * Detect diagrams in frame
 */
const detectDiagrams = async (framePath, imageStats) => {
  // Simple heuristic: diagrams often have geometric shapes and high contrast
  let diagramLikelihood = 0;

  if (imageStats.contrast > 0.4) diagramLikelihood += 0.3;
  if (imageStats.brightness > 0.7) diagramLikelihood += 0.2; // Often on white background

  // Would use computer vision for actual shape detection
  return diagramLikelihood > 0.4;
};

/**
 * Detect charts/graphs in frame
 */
const detectCharts = async (framePath, imageStats) => {
  // Charts often have regular patterns and distinct color regions
  let chartLikelihood = 0;

  if (imageStats.contrast > 0.3) chartLikelihood += 0.2;
  if (imageStats.channels >= 3) chartLikelihood += 0.2; // Color charts

  return chartLikelihood > 0.3;
};

/**
 * Detect people in frame
 */
const detectPeople = async (framePath) => {
  // Simplified detection - would use computer vision APIs in production
  const imageStats = await getImageStatistics(framePath);

  // Heuristic: people often create varied brightness patterns
  return (
    imageStats.contrast > 0.2 &&
    imageStats.brightness > 0.3 &&
    imageStats.brightness < 0.8
  );
};

/**
 * Detect presentation slides
 */
const detectSlides = async (framePath, imageStats) => {
  // Slides often have high brightness (white background) and text
  const textLikelihood = await assessTextLikelihood(framePath);

  return imageStats.brightness > 0.7 && textLikelihood > 0.5;
};

/**
 * Detect whiteboard content
 */
const detectWhiteboard = async (framePath, imageStats) => {
  // Whiteboards: high brightness, high contrast (dark writing on white)
  return imageStats.brightness > 0.8 && imageStats.contrast > 0.4;
};

/**
 * Detect computer screen content
 */
const detectComputerScreen = async (framePath, imageStats) => {
  // Computer screens often have specific aspect ratios and brightness levels
  const aspectRatio = imageStats.width / imageStats.height;

  return (
    aspectRatio > 1.2 &&
    imageStats.brightness > 0.4 &&
    imageStats.brightness < 0.9
  );
};

/**
 * Get dominant colors from image
 */
const getDominantColors = async (framePath) => {
  try {
    const image = sharp(framePath);

    // Resize to small size for faster processing
    const smallImage = await image.resize(50, 50).raw().toBuffer();

    // Simple color analysis (would use more sophisticated algorithms in production)
    const colors = [];
    let r = 0,
      g = 0,
      b = 0;
    const pixelCount = smallImage.length / 3;

    for (let i = 0; i < smallImage.length; i += 3) {
      r += smallImage[i];
      g += smallImage[i + 1];
      b += smallImage[i + 2];
    }

    const avgColor = {
      r: Math.round(r / pixelCount),
      g: Math.round(g / pixelCount),
      b: Math.round(b / pixelCount),
      hex: `#${Math.round(r / pixelCount)
        .toString(16)
        .padStart(2, "0")}${Math.round(g / pixelCount)
        .toString(16)
        .padStart(2, "0")}${Math.round(b / pixelCount)
        .toString(16)
        .padStart(2, "0")}`,
    };

    colors.push(avgColor);

    return colors;
  } catch (error) {
    console.error("Color analysis error:", error);
    return [];
  }
};

/**
 * Calculate visual complexity of frame
 */
const calculateFrameComplexity = (imageStats) => {
  let complexity = 0.5; // Base complexity

  // High contrast increases complexity
  complexity += imageStats.contrast * 0.3;

  // Very bright or very dark images are simpler
  if (imageStats.brightness < 0.2 || imageStats.brightness > 0.9) {
    complexity -= 0.2;
  }

  return Math.min(Math.max(complexity, 0), 1);
};

/**
 * Assess frame's educational value
 */
const assessFrameEducationalValue = async (
  framePath,
  textContent,
  options = {}
) => {
  try {
    let educationalValue = 0.5; // Base value

    // Text content increases educational value
    if (textContent.has_text) {
      educationalValue += 0.2;
    }

    // High text likelihood suggests informational content
    educationalValue += textContent.text_likelihood * 0.15;

    // Context-based adjustments
    if (options.educational_context === "Main learning content") {
      educationalValue += 0.1;
    }

    // Phase-based adjustments
    const phaseAdjustments = {
      prepare: 0.05, // Introduction frames are moderately valuable
      initiate: 0.1, // Objective-setting frames are valuable
      deliver: 0.15, // Main content frames are most valuable
      end: 0.08, // Summary frames are moderately valuable
    };

    if (options.phase && phaseAdjustments[options.phase]) {
      educationalValue += phaseAdjustments[options.phase];
    }

    return {
      overall_score: Math.min(Math.max(educationalValue, 0), 1),
      text_contribution: textContent.has_text ? 0.2 : 0,
      context_contribution: phaseAdjustments[options.phase] || 0,
      clarity_score: assessVisualClarity(framePath),
      relevance_score: assessContentRelevance(textContent, options),
    };
  } catch (error) {
    console.error("Educational value assessment error:", error);
    return {
      overall_score: 0.5,
      error: "Assessment failed",
    };
  }
};

/**
 * Assess visual clarity of frame
 */
const assessVisualClarity = async (framePath) => {
  try {
    const imageStats = await getImageStatistics(framePath);

    let clarity = 0.5;

    // Good contrast improves clarity
    if (imageStats.contrast > 0.3) clarity += 0.2;
    if (imageStats.contrast > 0.5) clarity += 0.1;

    // Optimal brightness range
    if (imageStats.brightness > 0.3 && imageStats.brightness < 0.8) {
      clarity += 0.2;
    }

    return Math.min(clarity, 1);
  } catch (error) {
    return 0.5; // Default clarity
  }
};

/**
 * Assess content relevance based on context
 */
const assessContentRelevance = (textContent, options) => {
  let relevance = 0.5;

  // High text confidence suggests relevant content
  relevance += textContent.text_confidence * 0.3;

  // Educational context boosts relevance
  if (options.educational_context) {
    relevance += 0.2;
  }

  return Math.min(relevance, 1);
};

/**
 * Analyze visual characteristics across multiple frames
 */
const analyzeVisualCharacteristics = async (frames) => {
  const characteristics = {
    average_brightness: 0,
    average_contrast: 0,
    dominant_aspect_ratio: 0,
    color_variance: 0,
    text_frequency: 0,
    visual_consistency: 0,
  };

  let totalBrightness = 0;
  let totalContrast = 0;
  let textFrames = 0;

  for (const frame of frames) {
    const stats = await getImageStatistics(frame.file_path);
    const textContent = await detectTextInFrame(frame.file_path);

    totalBrightness += stats.brightness;
    totalContrast += stats.contrast;
    if (textContent.has_text) textFrames++;
  }

  characteristics.average_brightness = totalBrightness / frames.length;
  characteristics.average_contrast = totalContrast / frames.length;
  characteristics.text_frequency = textFrames / frames.length;
  characteristics.visual_consistency = calculateVisualConsistency(frames);

  return characteristics;
};

/**
 * Calculate visual consistency across frames
 */
const calculateVisualConsistency = async (frames) => {
  if (frames.length < 2) return 1;

  let brightnessVariance = 0;
  let contrastVariance = 0;

  const stats = [];
  for (const frame of frames) {
    const frameStat = await getImageStatistics(frame.file_path);
    stats.push(frameStat);
  }

  const avgBrightness =
    stats.reduce((sum, stat) => sum + stat.brightness, 0) / stats.length;
  const avgContrast =
    stats.reduce((sum, stat) => sum + stat.contrast, 0) / stats.length;

  brightnessVariance =
    stats.reduce(
      (sum, stat) => sum + Math.pow(stat.brightness - avgBrightness, 2),
      0
    ) / stats.length;
  contrastVariance =
    stats.reduce(
      (sum, stat) => sum + Math.pow(stat.contrast - avgContrast, 2),
      0
    ) / stats.length;

  // Lower variance = higher consistency
  const consistency = 1 - Math.min(brightnessVariance + contrastVariance, 1);
  return Math.max(consistency, 0);
};

/**
 * Detect visual content types across video
 */
const detectVisualContentTypes = async (frames) => {
  const contentTypes = {
    presentation_slides: 0,
    whiteboard_content: 0,
    computer_screen: 0,
    people_speaking: 0,
    diagrams_charts: 0,
    mixed_content: 0,
  };

  for (const frame of frames) {
    const elements = await analyzeVisualElements(frame.file_path);

    if (elements.has_slides) contentTypes.presentation_slides++;
    if (elements.has_whiteboard) contentTypes.whiteboard_content++;
    if (elements.has_computer_screen) contentTypes.computer_screen++;
    if (elements.has_people) contentTypes.people_speaking++;
    if (elements.has_diagrams || elements.has_charts)
      contentTypes.diagrams_charts++;
  }

  // Calculate percentages
  Object.keys(contentTypes).forEach((key) => {
    contentTypes[key] = Math.round((contentTypes[key] / frames.length) * 100);
  });

  // Determine primary content type
  const primaryType = Object.entries(contentTypes).reduce(
    (max, [type, percentage]) =>
      percentage > max.percentage ? { type, percentage } : max,
    { type: "mixed_content", percentage: 0 }
  );

  return {
    ...contentTypes,
    primary_content_type: primaryType.type,
    primary_percentage: primaryType.percentage,
  };
};

/**
 * Assess educational visual elements
 */
const assessEducationalVisualElements = async (frames) => {
  const elements = {
    text_based_content: 0,
    visual_aids: 0,
    demonstrations: 0,
    examples: 0,
    interactive_elements: 0,
    professional_quality: 0,
  };

  let totalEducationalValue = 0;

  for (const frame of frames) {
    const textContent = await detectTextInFrame(frame.file_path);
    const visualElements = await analyzeVisualElements(frame.file_path);
    const imageStats = await getImageStatistics(frame.file_path);

    // Text-based content
    if (textContent.has_text) elements.text_based_content++;

    // Visual aids (diagrams, charts)
    if (visualElements.has_diagrams || visualElements.has_charts)
      elements.visual_aids++;

    // Professional quality (good brightness, contrast)
    if (
      imageStats.brightness > 0.3 &&
      imageStats.brightness < 0.8 &&
      imageStats.contrast > 0.3
    ) {
      elements.professional_quality++;
    }

    // Educational value assessment
    const educValue = await assessFrameEducationalValue(
      frame.file_path,
      textContent
    );
    totalEducationalValue += educValue.overall_score;
  }

  // Calculate percentages and averages
  Object.keys(elements).forEach((key) => {
    if (key !== "average_educational_value") {
      elements[key] = Math.round((elements[key] / frames.length) * 100);
    }
  });

  elements.average_educational_value = Math.round(
    (totalEducationalValue / frames.length) * 100
  );

  return elements;
};

/**
 * Calculate visual complexity metrics
 */
const calculateVisualComplexity = async (frames) => {
  const complexities = [];

  for (const frame of frames) {
    const imageStats = await getImageStatistics(frame.file_path);
    const complexity = calculateFrameComplexity(imageStats);
    complexities.push(complexity);
  }

  const avgComplexity =
    complexities.reduce((sum, c) => sum + c, 0) / complexities.length;
  const maxComplexity = Math.max(...complexities);
  const minComplexity = Math.min(...complexities);
  const variance =
    complexities.reduce((sum, c) => sum + Math.pow(c - avgComplexity, 2), 0) /
    complexities.length;

  return {
    average_complexity: Math.round(avgComplexity * 100) / 100,
    max_complexity: Math.round(maxComplexity * 100) / 100,
    min_complexity: Math.round(minComplexity * 100) / 100,
    complexity_variance: Math.round(variance * 100) / 100,
    complexity_distribution: categorizeComplexity(avgComplexity),
    cognitive_load_impact: assessComplexityCognitiveImpact(
      avgComplexity,
      variance
    ),
  };
};

/**
 * Categorize complexity level
 */
const categorizeComplexity = (complexity) => {
  if (complexity < 0.3) return "low";
  if (complexity < 0.6) return "medium";
  if (complexity < 0.8) return "high";
  return "very_high";
};

/**
 * Assess cognitive load impact of visual complexity
 */
const assessComplexityCognitiveImpact = (avgComplexity, variance) => {
  let impact = {
    extraneous_load: avgComplexity * 0.6, // Higher complexity increases extraneous load
    attention_demand: avgComplexity * 0.8,
    processing_difficulty: Math.min(avgComplexity + variance, 1),
    recommendation: "",
  };

  if (avgComplexity > 0.7) {
    impact.recommendation =
      "Consider simplifying visual elements to reduce cognitive load";
  } else if (avgComplexity < 0.3) {
    impact.recommendation =
      "Visual content is simple and should not overload learners";
  } else {
    impact.recommendation =
      "Visual complexity is appropriate for educational content";
  }

  return impact;
};

module.exports = {
  analyzeVisualContent,
  extractKeyframes,
  analyzeVisualCharacteristics,
  detectVisualContentTypes,
  assessEducationalVisualElements,
  calculateVisualComplexity,
};
