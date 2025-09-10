const OpenAI = require('openai');
const fs = require('fs/promises');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');

// Initialize OpenAI only if API key is available
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

/**
 * Generate Text-to-Speech audio for CLT-bLM script phases
 */
const generateScriptAudio = async (
  cltBlmScript,
  ttsConfig = {},
  options = {}
) => {
  try {
    if (!openai) {
      throw new Error("OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.");
    }

    console.log("Starting TTS generation for CLT-bLM script...");

    // Create output directory
    const outputDir = options.outputDir || "uploads/audio";
    await fs.mkdir(outputDir, { recursive: true });

    // Configure TTS settings
    const ttsSettings = configureTTSSettings(ttsConfig);

    // Generate audio for each phase
    const phaseAudioFiles = await generatePhaseAudio(
      cltBlmScript,
      ttsSettings,
      outputDir
    );

    // Create timing information for each phase
    const audioTiming = await calculateAudioTiming(phaseAudioFiles);

    // Generate transition audio elements
    const transitionAudio = await generateTransitionAudio(
      cltBlmScript,
      ttsSettings,
      outputDir
    );

    // Validate audio quality
    const qualityAssessment = await assessAudioQuality(phaseAudioFiles);

    // Create master audio file (optional - combined phases)
    const masterAudioFile = await createMasterAudioFile(
      phaseAudioFiles,
      transitionAudio,
      outputDir
    );

    console.log("TTS generation completed successfully");

    return {
      phase_audio_files: phaseAudioFiles,
      transition_audio: transitionAudio,
      master_audio_file: masterAudioFile,
      audio_timing: audioTiming,
      tts_settings: ttsSettings,
      quality_assessment: qualityAssessment,
      total_duration: audioTiming.total_duration,
      generation_metadata: {
        phases_generated: Object.keys(phaseAudioFiles).length,
        total_characters: calculateTotalCharacters(cltBlmScript),
        voice_used: ttsSettings.voice,
        generation_timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("TTS generation error:", error);
    throw new Error(`TTS generation failed: ${error.message}`);
  }
};

/**
 * Configure TTS settings based on user preferences and content analysis
 */
const configureTTSSettings = (ttsConfig) => {
  const defaultSettings = {
    voice: "alloy", // OpenAI TTS voice
    speed: 1.0, // Speaking speed
    model: "tts-1-hd", // High-definition model
    response_format: "mp3",
    quality: "high",
  };

  const settings = { ...defaultSettings, ...ttsConfig };

  // Optimize settings for educational content
  settings.educational_optimizations = {
    pause_after_keypoints: true,
    emphasis_on_objectives: true,
    slower_complex_content: true,
    clear_transitions: true,
  };

  // Adjust speed based on content complexity
  if (settings.content_complexity === "high") {
    settings.speed = Math.max(0.8, settings.speed - 0.1);
  } else if (settings.content_complexity === "low") {
    settings.speed = Math.min(1.2, settings.speed + 0.1);
  }

  return settings;
};

/**
 * Generate audio for each CLT-bLM phase
 */
const generatePhaseAudio = async (cltBlmScript, ttsSettings, outputDir) => {
  const phaseAudioFiles = {};
  const phases = ["prepare", "initiate", "deliver", "end"];

  for (const phaseName of phases) {
    const phase = cltBlmScript[phaseName];
    if (!phase || !phase.content) {
      console.warn(`No content found for ${phaseName} phase`);
      continue;
    }

    console.log(`Generating audio for ${phaseName} phase...`);

    // Optimize script content for TTS
    const optimizedScript = optimizeScriptForTTS(phase, phaseName, ttsSettings);

    // Generate audio using OpenAI TTS
    const audioBuffer = await generateTTSAudio(optimizedScript, ttsSettings);

    // Save audio file
    const filename = `phase_${phaseName}_audio.mp3`;
    const filePath = path.join(outputDir, filename);
    await fs.writeFile(filePath, audioBuffer);

    // Get audio duration and metadata
    const audioMetadata = await getAudioMetadata(filePath);

    phaseAudioFiles[phaseName] = {
      file_path: filePath,
      filename: filename,
      script_content: optimizedScript,
      original_content: phase.content,
      duration: audioMetadata.duration,
      file_size: audioMetadata.size,
      phase_purpose: phase.purpose,
      cognitive_load: phase.cognitive_load,
      tts_optimizations: optimizedScript.optimizations_applied,
    };
  }

  return phaseAudioFiles;
};

/**
 * Optimize script content for Text-to-Speech
 */
const optimizeScriptForTTS = (phase, phaseName, ttsSettings) => {
  let optimizedContent = phase.content;
  const optimizations = [];

  // Add pauses for better comprehension
  if (ttsSettings.educational_optimizations.pause_after_keypoints) {
    // Add pauses after important concepts
    optimizedContent = optimizedContent.replace(
      /\b(important|key|concept|principle|remember)\b/gi,
      "$1... "
    );
    optimizations.push("added_conceptual_pauses");
  }

  // Slow down complex terminology
  if (ttsSettings.educational_optimizations.slower_complex_content) {
    // Add pauses before technical terms (8+ characters)
    optimizedContent = optimizedContent.replace(
      /\b([A-Za-z]{8,})\b/g,
      "... $1"
    );
    optimizations.push("added_terminology_pauses");
  }

  // Emphasize learning objectives
  if (
    phaseName === "initiate" &&
    ttsSettings.educational_optimizations.emphasis_on_objectives
  ) {
    optimizedContent = optimizedContent.replace(
      /\b(you will|you'll be able to|objective|goal)\b/gi,
      "**$1**"
    );
    optimizations.push("emphasized_objectives");
  }

  // Add clear phase transitions
  if (ttsSettings.educational_optimizations.clear_transitions) {
    const phaseIntros = {
      prepare: "Welcome... ",
      initiate: "Now, let's set our learning goals... ",
      deliver: "Let's dive into the main content... ",
      end: "To wrap up... ",
    };

    if (phaseIntros[phaseName]) {
      optimizedContent = phaseIntros[phaseName] + optimizedContent;
      optimizations.push("added_phase_introduction");
    }
  }

  // Format for SSML if needed (Speech Synthesis Markup Language)
  const ssmlContent = convertToSSML(optimizedContent, phaseName, ttsSettings);

  return {
    plain_text: optimizedContent,
    ssml_content: ssmlContent,
    optimizations_applied: optimizations,
    character_count: optimizedContent.length,
    estimated_duration: estimateSpeechDuration(
      optimizedContent,
      ttsSettings.speed
    ),
  };
};

/**
 * Convert text to SSML for enhanced TTS control
 */
const convertToSSML = (text, phaseName, ttsSettings) => {
  let ssml = text;

  // Add emphasis markers
  ssml = ssml.replace(
    /\*\*(.*?)\*\*/g,
    '<emphasis level="strong">$1</emphasis>'
  );

  // Add pauses
  ssml = ssml.replace(/\.\.\./g, '<break time="0.5s"/>');

  // Add prosody adjustments for different phases
  const prosodySettings = {
    prepare: 'rate="medium" pitch="medium"',
    initiate: 'rate="slow" pitch="medium" volume="loud"',
    deliver: 'rate="medium" pitch="medium"',
    end: 'rate="slow" pitch="low"',
  };

  const prosody = prosodySettings[phaseName] || 'rate="medium" pitch="medium"';
  ssml = `<prosody ${prosody}>${ssml}</prosody>`;

  // Wrap in SSML speak tag
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">${ssml}</speak>`;
};

/**
 * Generate TTS audio using OpenAI API
 */
const generateTTSAudio = async (optimizedScript, ttsSettings) => {
  try {
    // Use SSML content if available, otherwise plain text
    const textToSynthesize =
      optimizedScript.ssml_content || optimizedScript.plain_text;

    console.log(
      `Generating TTS audio: ${textToSynthesize.substring(0, 100)}...`
    );

    const response = await openai.audio.speech.create({
      model: ttsSettings.model,
      voice: ttsSettings.voice,
      input: textToSynthesize,
      speed: ttsSettings.speed,
      response_format: ttsSettings.response_format,
    });

    // Convert response to buffer
    const audioBuffer = Buffer.from(await response.arrayBuffer());

    return audioBuffer;
  } catch (error) {
    console.error("OpenAI TTS error:", error);
    throw new Error(`TTS generation failed: ${error.message}`);
  }
};

/**
 * Get audio file metadata using FFmpeg
 */
const getAudioMetadata = async (audioPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(audioPath, (err, metadata) => {
      if (err) {
        reject(new Error(`Failed to get audio metadata: ${err.message}`));
        return;
      }

      const audioStream = metadata.streams.find(
        (stream) => stream.codec_type === "audio"
      );
      const format = metadata.format;

      resolve({
        duration: parseFloat(format.duration) || 0,
        size: parseInt(format.size) || 0,
        bitrate: parseInt(format.bit_rate) || 0,
        sample_rate: audioStream?.sample_rate || 0,
        channels: audioStream?.channels || 0,
        codec: audioStream?.codec_name || "unknown",
      });
    });
  });
};

/**
 * Calculate audio timing for all phases
 */
const calculateAudioTiming = async (phaseAudioFiles) => {
  const timing = {
    phases: {},
    total_duration: 0,
    cumulative_times: {},
  };

  let currentTime = 0;

  Object.entries(phaseAudioFiles).forEach(([phaseName, audioData]) => {
    const duration = audioData.duration;

    timing.phases[phaseName] = {
      start_time: currentTime,
      end_time: currentTime + duration,
      duration: duration,
      file_path: audioData.file_path,
    };

    timing.cumulative_times[phaseName] = currentTime + duration;
    currentTime += duration;
  });

  timing.total_duration = currentTime;

  return timing;
};

/**
 * Generate transition audio elements between phases
 */
const generateTransitionAudio = async (
  cltBlmScript,
  ttsSettings,
  outputDir
) => {
  const transitionAudio = {};
  const phases = ["prepare", "initiate", "deliver", "end"];

  for (let i = 0; i < phases.length - 1; i++) {
    const fromPhase = phases[i];
    const toPhase = phases[i + 1];

    // Generate transition audio content
    const transitionContent = generateTransitionContent(fromPhase, toPhase);

    if (transitionContent) {
      console.log(`Generating transition audio: ${fromPhase} to ${toPhase}`);

      const audioBuffer = await generateTTSAudio(
        { plain_text: transitionContent },
        { ...ttsSettings, speed: ttsSettings.speed * 0.9 } // Slightly slower for transitions
      );

      const filename = `transition_${fromPhase}_to_${toPhase}.mp3`;
      const filePath = path.join(outputDir, filename);
      await fs.writeFile(filePath, audioBuffer);

      const metadata = await getAudioMetadata(filePath);

      transitionAudio[`${fromPhase}_to_${toPhase}`] = {
        file_path: filePath,
        filename: filename,
        content: transitionContent,
        duration: metadata.duration,
        from_phase: fromPhase,
        to_phase: toPhase,
      };
    }
  }

  return transitionAudio;
};

/**
 * Generate content for phase transitions
 */
const generateTransitionContent = (fromPhase, toPhase) => {
  const transitions = {
    prepare_to_initiate:
      "Now that we've set the stage... let's establish our learning objectives.",
    initiate_to_deliver:
      "With our goals clear... let's dive into the main content.",
    deliver_to_end:
      "Having covered the key concepts... let's summarize what we've learned.",
  };

  return transitions[`${fromPhase}_to_${toPhase}`] || null;
};

/**
 * Create master audio file combining all phases
 */
const createMasterAudioFile = async (
  phaseAudioFiles,
  transitionAudio,
  outputDir
) => {
  try {
    console.log("Creating master audio file...");

    const masterFilePath = path.join(outputDir, "master_audio.mp3");
    const phases = ["prepare", "initiate", "deliver", "end"];

    return new Promise((resolve, reject) => {
      let ffmpegCommand = ffmpeg();

      // Add phase audio files in order
      phases.forEach((phase) => {
        if (phaseAudioFiles[phase]) {
          ffmpegCommand = ffmpegCommand.input(phaseAudioFiles[phase].file_path);
        }
      });

      // Create filter complex for concatenation
      let filterComplex = "";
      let inputCount = 0;

      phases.forEach((phase, index) => {
        if (phaseAudioFiles[phase]) {
          if (inputCount > 0) filterComplex += ";";
          filterComplex += `[${inputCount}:0]`;
          inputCount++;
        }
      });

      filterComplex += `concat=n=${inputCount}:v=0:a=1[out]`;

      ffmpegCommand
        .complexFilter(filterComplex)
        .outputOptions(["-map", "[out]"])
        .output(masterFilePath)
        .on("progress", (progress) => {
          console.log(`Master audio progress: ${progress.percent}%`);
        })
        .on("end", async () => {
          try {
            const metadata = await getAudioMetadata(masterFilePath);
            resolve({
              file_path: masterFilePath,
              filename: "master_audio.mp3",
              duration: metadata.duration,
              file_size: metadata.size,
              phases_included: phases.filter((phase) => phaseAudioFiles[phase]),
            });
          } catch (metadataError) {
            reject(metadataError);
          }
        })
        .on("error", (err) => {
          console.error("Master audio creation error:", err);
          reject(new Error(`Master audio creation failed: ${err.message}`));
        })
        .run();
    });
  } catch (error) {
    console.error("Master audio file creation error:", error);
    return null; // Non-critical failure
  }
};

/**
 * Assess audio quality
 */
const assessAudioQuality = async (phaseAudioFiles) => {
  const assessment = {
    overall_quality: 0,
    phase_quality: {},
    issues: [],
    recommendations: [],
  };

  let totalQuality = 0;
  let phaseCount = 0;

  for (const [phaseName, audioData] of Object.entries(phaseAudioFiles)) {
    const phaseQuality = await assessPhaseAudioQuality(audioData);
    assessment.phase_quality[phaseName] = phaseQuality;

    totalQuality += phaseQuality.score;
    phaseCount++;

    // Collect issues
    if (phaseQuality.issues.length > 0) {
      assessment.issues.push(
        ...phaseQuality.issues.map((issue) => `${phaseName}: ${issue}`)
      );
    }
  }

  assessment.overall_quality = phaseCount > 0 ? totalQuality / phaseCount : 0;

  // Generate recommendations
  if (assessment.overall_quality < 0.7) {
    assessment.recommendations.push(
      "Consider adjusting TTS settings for better quality"
    );
  }

  if (assessment.issues.length > 0) {
    assessment.recommendations.push(
      "Review and regenerate audio files with issues"
    );
  }

  return assessment;
};

/**
 * Assess quality of individual phase audio
 */
const assessPhaseAudioQuality = async (audioData) => {
  const quality = {
    score: 0.8, // Base quality score
    duration_accuracy: 0,
    file_integrity: true,
    issues: [],
  };

  try {
    // Check duration accuracy vs estimated
    const estimatedDuration = audioData.estimated_duration || 0;
    const actualDuration = audioData.duration;

    if (estimatedDuration > 0) {
      const durationRatio = actualDuration / estimatedDuration;
      quality.duration_accuracy = 1 - Math.abs(1 - durationRatio);

      if (Math.abs(1 - durationRatio) > 0.2) {
        quality.issues.push("Duration significantly different from estimated");
      }
    }

    // Check file size reasonableness
    const expectedSizePerSecond = 8000; // Rough estimate for MP3
    const expectedSize = actualDuration * expectedSizePerSecond;
    const sizeRatio = audioData.file_size / expectedSize;

    if (sizeRatio < 0.3) {
      quality.issues.push(
        "File size unusually small, may indicate quality issues"
      );
      quality.score -= 0.2;
    }

    // Calculate final score
    quality.score = Math.max(0, quality.score - quality.issues.length * 0.1);
  } catch (error) {
    quality.file_integrity = false;
    quality.issues.push("Failed to analyze audio file");
    quality.score = 0.3;
  }

  return quality;
};

/**
 * Estimate speech duration based on text and speed
 */
const estimateSpeechDuration = (text, speed = 1.0) => {
  // Average speaking rate: ~150 words per minute
  const wordsPerMinute = 150 * speed;
  const wordCount = text.split(/\s+/).length;
  const estimatedMinutes = wordCount / wordsPerMinute;
  return estimatedMinutes * 60; // Convert to seconds
};

/**
 * Calculate total character count across all phases
 */
const calculateTotalCharacters = (cltBlmScript) => {
  return Object.values(cltBlmScript).reduce((total, phase) => {
    return total + (phase.content?.length || 0);
  }, 0);
};

module.exports = {
  generateScriptAudio,
  configureTTSSettings,
  generatePhaseAudio,
  optimizeScriptForTTS,
  generateTTSAudio,
  getAudioMetadata,
};
