const ffmpeg = require('fluent-ffmpeg');
const { promisify } = require('util');
const fs = require('fs/promises');

/**
 * Extract comprehensive metadata from video file
 */
const extractVideoMetadata = async (videoPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(new Error(`Failed to extract metadata: ${err.message}`));
        return;
      }

      try {
        const videoStream = metadata.streams.find(
          (stream) => stream.codec_type === "video"
        );
        const audioStream = metadata.streams.find(
          (stream) => stream.codec_type === "audio"
        );

        if (!videoStream) {
          reject(new Error("No video stream found in file"));
          return;
        }

        const result = {
          duration: parseFloat(metadata.format.duration) || 0,
          bitrate: parseInt(metadata.format.bit_rate) || 0,
          size: parseInt(metadata.format.size) || 0,

          // Video properties
          resolution: {
            width: videoStream.width || 0,
            height: videoStream.height || 0,
          },
          frameRate: eval(videoStream.r_frame_rate) || 0,
          codec: videoStream.codec_name || "unknown",
          pixelFormat: videoStream.pix_fmt || "unknown",

          // Audio properties
          audioCodec: audioStream?.codec_name || "none",
          audioSampleRate: audioStream?.sample_rate || 0,
          audioChannels: audioStream?.channels || 0,

          // Additional metadata
          formatName: metadata.format.format_name || "unknown",
          formatLongName: metadata.format.format_long_name || "unknown",
          creationTime: metadata.format.tags?.creation_time || null,
        };

        resolve(result);
      } catch (parseError) {
        reject(new Error(`Failed to parse metadata: ${parseError.message}`));
      }
    });
  });
};

/**
 * Validate video file
 */
const validateVideoFile = async (videoPath) => {
  try {
    // Check if file exists
    await fs.access(videoPath);

    // Get file stats
    const stats = await fs.stat(videoPath);

    // Check file size (max 500MB)
    const maxSize = 500 * 1024 * 1024;
    if (stats.size > maxSize) {
      return {
        isValid: false,
        error: "File size exceeds 500MB limit",
      };
    }

    // Extract and validate metadata
    const metadata = await extractVideoMetadata(videoPath);

    // Validate duration (max 4 hours)
    if (metadata.duration > 14400) {
      return {
        isValid: false,
        error: "Video duration exceeds 4 hours limit",
      };
    }

    // Validate minimum duration (10 seconds)
    if (metadata.duration < 10) {
      return {
        isValid: false,
        error: "Video must be at least 10 seconds long",
      };
    }

    // Validate resolution (minimum 240p)
    if (metadata.resolution.width < 320 || metadata.resolution.height < 240) {
      return {
        isValid: false,
        error: "Video resolution must be at least 320x240",
      };
    }

    // Check for video stream
    if (!metadata.codec || metadata.codec === "unknown") {
      return {
        isValid: false,
        error: "Invalid or unsupported video format",
      };
    }

    return {
      isValid: true,
      metadata,
    };
  } catch (error) {
    return {
      isValid: false,
      error: `Video validation failed: ${error.message}`,
    };
  }
};

/**
 * Generate video thumbnail
 */
const generateThumbnail = async (
  videoPath,
  outputPath,
  timeInSeconds = 10
) => {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({
        timestamps: [timeInSeconds],
        filename: "thumbnail.jpg",
        folder: outputPath,
        size: "320x240",
      })
      .on("end", () => {
        resolve(`${outputPath}/thumbnail.jpg`);
      })
      .on("error", (err) => {
        reject(new Error(`Thumbnail generation failed: ${err.message}`));
      });
  });
};

/**
 * Extract multiple frames from video
 */
const extractFrames = async (videoPath, outputDir, count = 5) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Get video duration first
      const metadata = await extractVideoMetadata(videoPath);
      const duration = metadata.duration;

      // Calculate timestamps for evenly distributed frames
      const timestamps = [];
      for (let i = 1; i <= count; i++) {
        timestamps.push((duration / (count + 1)) * i);
      }

      ffmpeg(videoPath)
        .screenshots({
          timestamps: timestamps,
          filename: "frame_%i.jpg",
          folder: outputDir,
          size: "640x480",
        })
        .on("end", () => {
          const framePaths = timestamps.map(
            (_, index) => `${outputDir}/frame_${index + 1}.jpg`
          );
          resolve(framePaths);
        })
        .on("error", (err) => {
          reject(new Error(`Frame extraction failed: ${err.message}`));
        });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Convert video to different format
 */
const convertVideo = async (inputPath, outputPath, options = {}) => {
  return new Promise((resolve, reject) => {
    let command = ffmpeg(inputPath);

    // Apply options
    if (options.codec) {
      command = command.videoCodec(options.codec);
    }

    if (options.audioCodec) {
      command = command.audioCodec(options.audioCodec);
    }

    if (options.bitrate) {
      command = command.videoBitrate(options.bitrate);
    }

    if (options.resolution) {
      command = command.size(options.resolution);
    }

    if (options.frameRate) {
      command = command.fps(options.frameRate);
    }

    command
      .output(outputPath)
      .on("progress", (progress) => {
        console.log(`Conversion progress: ${progress.percent}%`);
      })
      .on("end", () => {
        resolve(outputPath);
      })
      .on("error", (err) => {
        reject(new Error(`Video conversion failed: ${err.message}`));
      })
      .run();
  });
};

/**
 * Extract video segment
 */
const extractSegment = async (
  inputPath,
  outputPath,
  startTime,
  duration
) => {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .seekInput(startTime)
      .duration(duration)
      .output(outputPath)
      .videoCodec("copy")
      .audioCodec("copy")
      .on("end", () => {
        resolve(outputPath);
      })
      .on("error", (err) => {
        reject(new Error(`Segment extraction failed: ${err.message}`));
      })
      .run();
  });
};

/**
 * Get video file information
 */
const getVideoInfo = async (videoPath) => {
  try {
    const metadata = await extractVideoMetadata(videoPath);
    const stats = await fs.stat(videoPath);

    return {
      file: {
        path: videoPath,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
      },
      video: metadata,
      analysis: {
        isValidForProcessing:
          metadata.duration > 10 && metadata.duration < 14400,
        estimatedProcessingTime: Math.ceil(metadata.duration / 60) * 2, // rough estimate in minutes
        recommendedSegments: Math.ceil(metadata.duration / 300), // 5-minute segments
        qualityLevel: getQualityLevel(metadata.resolution),
      },
    };
  } catch (error) {
    throw new Error(`Failed to get video info: ${error.message}`);
  }
};

/**
 * Determine video quality level
 */
const getQualityLevel = (resolution) => {
  const { width, height } = resolution;
  const pixels = width * height;

  if (pixels >= 3840 * 2160) return "4K";
  if (pixels >= 1920 * 1080) return "1080p";
  if (pixels >= 1280 * 720) return "720p";
  if (pixels >= 854 * 480) return "480p";
  if (pixels >= 640 * 360) return "360p";
  return "240p";
};

/**
 * Optimize video for web playback
 */
const optimizeForWeb = async (inputPath, outputPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoCodec("libx264")
      .audioCodec("aac")
      .videoBitrate("1000k")
      .audioBitrate("128k")
      .fps(30)
      .size("1280x720")
      .format("mp4")
      .outputOptions([
        "-preset fast",
        "-crf 23",
        "-movflags +faststart", // Enable progressive download
      ])
      .output(outputPath)
      .on("progress", (progress) => {
        console.log(`Web optimization progress: ${progress.percent}%`);
      })
      .on("end", () => {
        resolve(outputPath);
      })
      .on("error", (err) => {
        reject(new Error(`Web optimization failed: ${err.message}`));
      })
      .run();
  });
};

module.exports = {
  extractVideoMetadata,
  validateVideoFile,
  generateThumbnail,
  extractFrames,
  convertVideo,
  extractSegment,
  getVideoInfo,
  optimizeForWeb,
};
