const ytdl = require('ytdl-core');
const fs = require('fs/promises');
const { createWriteStream } = require('fs');
const path = require('path');
const { extractVideoMetadata } = require('../utils/videoUtils');

/**
 * Process YouTube video by URL
 */
const processYouTubeVideo = async (url) => {
  try {
    console.log(`Processing YouTube URL: ${url}`);

    // Validate YouTube URL
    if (!ytdl.validateURL(url)) {
      throw new Error("Invalid YouTube URL");
    }

    // Get video info
    const info = await ytdl.getInfo(url);
    const videoDetails = info.videoDetails;

    // Check video availability
    if (videoDetails.isPrivate) {
      throw new Error("Cannot process private videos");
    }

    if (videoDetails.isLiveContent) {
      throw new Error("Cannot process live streams");
    }

    // Check duration (max 4 hours)
    const duration = parseInt(videoDetails.lengthSeconds);
    if (duration > 14400) {
      throw new Error("Video duration exceeds 4 hours limit");
    }

    if (duration < 10) {
      throw new Error("Video must be at least 10 seconds long");
    }

    // Create download directory
    const downloadDir = "uploads/youtube";
    await fs.mkdir(downloadDir, { recursive: true });

    // Generate filename
    const sanitizedTitle = videoDetails.title
      .replace(/[^a-zA-Z0-9\s-_]/g, "")
      .substring(0, 50);
    const filename = `youtube-${Date.now()}-${sanitizedTitle}.mp4`;
    const outputPath = path.join(downloadDir, filename);

    // Download video
    console.log("Starting YouTube video download...");
    await downloadVideo(url, outputPath);

    // Extract metadata from downloaded file
    const metadata = await extractVideoMetadata(outputPath);

    // Get file stats
    const stats = await fs.stat(outputPath);

    console.log("YouTube video processed successfully");

    return {
      filePath: outputPath,
      fileSize: stats.size,
      metadata: {
        ...metadata,
        youtubeId: videoDetails.videoId,
        originalTitle: videoDetails.title,
        originalDescription: videoDetails.description,
        uploadDate: videoDetails.uploadDate,
        author: videoDetails.author?.name || "Unknown",
        viewCount: parseInt(videoDetails.viewCount) || 0,
        likeCount: parseInt(videoDetails.likes) || 0,
        category: videoDetails.category,
        keywords: videoDetails.keywords || [],
      },
    };
  } catch (error) {
    console.error("YouTube processing error:", error);
    throw new Error(`YouTube processing failed: ${error.message}`);
  }
};

/**
 * Download YouTube video
 */
const downloadVideo = async (url, outputPath) => {
  return new Promise((resolve, reject) => {
    try {
      // Get the best quality video+audio format
      const stream = ytdl(url, {
        quality: "highest",
        filter: (format) =>
          format.container === "mp4" && format.hasVideo && format.hasAudio,
      });

      const writeStream = createWriteStream(outputPath);

      stream.pipe(writeStream);

      stream.on("progress", (chunkLength, downloaded, total) => {
        const percent = Math.round((downloaded / total) * 100);
        console.log(`Download progress: ${percent}%`);
      });

      writeStream.on("finish", () => {
        console.log("YouTube download completed");
        resolve(outputPath);
      });

      stream.on("error", (error) => {
        console.error("Download stream error:", error);
        reject(new Error(`Download failed: ${error.message}`));
      });

      writeStream.on("error", (error) => {
        console.error("Write stream error:", error);
        reject(new Error(`File write failed: ${error.message}`));
      });
    } catch (error) {
      reject(new Error(`Download setup failed: ${error.message}`));
    }
  });
};

/**
 * Get YouTube video information without downloading
 */
const getYouTubeVideoInfo = async (url) => {
  try {
    if (!ytdl.validateURL(url)) {
      throw new Error("Invalid YouTube URL");
    }

    const info = await ytdl.getInfo(url);
    const videoDetails = info.videoDetails;

    return {
      videoId: videoDetails.videoId,
      title: videoDetails.title,
      description: videoDetails.description,
      duration: parseInt(videoDetails.lengthSeconds),
      uploadDate: videoDetails.uploadDate,
      author: videoDetails.author?.name || "Unknown",
      viewCount: parseInt(videoDetails.viewCount) || 0,
      likeCount: parseInt(videoDetails.likes) || 0,
      category: videoDetails.category,
      keywords: videoDetails.keywords || [],
      thumbnails: videoDetails.thumbnails || [],
      isPrivate: videoDetails.isPrivate,
      isLiveContent: videoDetails.isLiveContent,

      // Processing feasibility
      canProcess:
        !videoDetails.isPrivate &&
        !videoDetails.isLiveContent &&
        parseInt(videoDetails.lengthSeconds) >= 10 &&
        parseInt(videoDetails.lengthSeconds) <= 14400,

      // Available formats
      availableFormats: info.formats
        .filter((format) => format.hasVideo && format.hasAudio)
        .map((format) => ({
          itag: format.itag,
          quality: format.quality,
          container: format.container,
          videoCodec: format.videoCodec,
          audioCodec: format.audioCodec,
          filesize: format.contentLength,
        }))
        .slice(0, 5), // Limit to top 5 formats
    };
  } catch (error) {
    console.error("YouTube info error:", error);
    throw new Error(`Failed to get YouTube video info: ${error.message}`);
  }
};

/**
 * Download YouTube video with specific quality
 */
const downloadYouTubeVideoWithQuality = async (
  url,
  outputPath,
  quality = "highest"
) => {
  return new Promise((resolve, reject) => {
    try {
      let format;

      // Define quality options
      switch (quality) {
        case "highest":
          format = "highest";
          break;
        case "lowest":
          format = "lowest";
          break;
        case "720p":
          format = (format) =>
            format.height === 720 && format.hasVideo && format.hasAudio;
          break;
        case "480p":
          format = (format) =>
            format.height === 480 && format.hasVideo && format.hasAudio;
          break;
        case "360p":
          format = (format) =>
            format.height === 360 && format.hasVideo && format.hasAudio;
          break;
        default:
          format = "highest";
      }

      const stream = ytdl(url, {
        quality: format,
        filter: typeof format === "string" ? "audioandvideo" : format,
      });

      const writeStream = createWriteStream(outputPath);

      let totalSize = 0;
      let downloadedSize = 0;

      stream.on("response", (response) => {
        totalSize = parseInt(response.headers["content-length"]) || 0;
      });

      stream.on("data", (chunk) => {
        downloadedSize += chunk.length;
        if (totalSize > 0) {
          const percent = Math.round((downloadedSize / totalSize) * 100);
          console.log(`Download progress: ${percent}%`);
        }
      });

      stream.pipe(writeStream);

      writeStream.on("finish", () => {
        console.log("YouTube download completed");
        resolve(outputPath);
      });

      stream.on("error", (error) => {
        console.error("Download stream error:", error);
        reject(new Error(`Download failed: ${error.message}`));
      });

      writeStream.on("error", (error) => {
        console.error("Write stream error:", error);
        reject(new Error(`File write failed: ${error.message}`));
      });
    } catch (error) {
      reject(new Error(`Download setup failed: ${error.message}`));
    }
  });
};

/**
 * Extract YouTube video ID from URL
 */
const extractVideoId = (url) => {
  try {
    return ytdl.getVideoID(url);
  } catch (error) {
    throw new Error("Invalid YouTube URL");
  }
};

/**
 * Check if YouTube URL is valid and accessible
 */
const validateYouTubeURL = async (url) => {
  try {
    if (!ytdl.validateURL(url)) {
      return {
        isValid: false,
        error: "Invalid YouTube URL format",
      };
    }

    const info = await getYouTubeVideoInfo(url);

    if (info.isPrivate) {
      return {
        isValid: false,
        error: "Video is private and cannot be processed",
      };
    }

    if (info.isLiveContent) {
      return {
        isValid: false,
        error: "Live streams cannot be processed",
      };
    }

    if (info.duration > 14400) {
      return {
        isValid: false,
        error: "Video duration exceeds 4 hours limit",
      };
    }

    if (info.duration < 10) {
      return {
        isValid: false,
        error: "Video must be at least 10 seconds long",
      };
    }

    return {
      isValid: true,
      videoInfo: info,
    };
  } catch (error) {
    return {
      isValid: false,
      error: error.message,
    };
  }
};

/**
 * Get available subtitles/captions for YouTube video
 */
const getYouTubeSubtitles = async (url) => {
  try {
    const info = await ytdl.getInfo(url);
    const captions =
      info.player_response?.captions?.playerCaptionsTracklistRenderer
        ?.captionTracks || [];

    return captions.map((caption) => ({
      language: caption.languageCode,
      languageName: caption.name?.simpleText || caption.languageCode,
      isAutoGenerated: caption.kind === "asr",
      url: caption.baseUrl,
    }));
  } catch (error) {
    console.error("Subtitle extraction error:", error);
    return [];
  }
};

/**
 * Download YouTube subtitles
 */
const downloadYouTubeSubtitles = async (url, language = "en") => {
  try {
    const subtitles = await getYouTubeSubtitles(url);
    const targetSubtitle = subtitles.find((sub) => sub.language === language);

    if (!targetSubtitle) {
      throw new Error(`Subtitles not available for language: ${language}`);
    }

    // Download subtitle content
    const response = await fetch(targetSubtitle.url);
    const subtitleXML = await response.text();

    // Parse XML to extract text and timestamps
    const subtitleSegments = parseYouTubeSubtitles(subtitleXML);

    return {
      language: targetSubtitle.language,
      languageName: targetSubtitle.languageName,
      isAutoGenerated: targetSubtitle.isAutoGenerated,
      segments: subtitleSegments,
    };
  } catch (error) {
    console.error("Subtitle download error:", error);
    throw new Error(`Failed to download subtitles: ${error.message}`);
  }
};

/**
 * Parse YouTube subtitle XML format
 */
const parseYouTubeSubtitles = (xml) => {
  const segments = [];

  // Simple XML parsing for subtitle segments
  const textMatches = xml.match(/<text[^>]*>(.*?)<\/text>/g) || [];

  textMatches.forEach((match, index) => {
    const startMatch = match.match(/start="([^"]*)"/);
    const durMatch = match.match(/dur="([^"]*)"/);
    const textMatch = match.match(/<text[^>]*>(.*?)<\/text>/);

    if (startMatch && textMatch) {
      const start = parseFloat(startMatch[1]) * 1000; // Convert to milliseconds
      const duration = durMatch ? parseFloat(durMatch[1]) * 1000 : 3000; // Default 3 seconds
      const text = textMatch[1]
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      segments.push({
        id: index,
        start: Math.round(start),
        end: Math.round(start + duration),
        duration: Math.round(duration),
        text: text.trim(),
        confidence: 0.9, // YouTube captions are generally reliable
      });
    }
  });

  return segments;
};

module.exports = {
  processYouTubeVideo,
  getYouTubeVideoInfo,
  downloadYouTubeVideoWithQuality,
  extractVideoId,
  validateYouTubeURL,
  getYouTubeSubtitles,
  downloadYouTubeSubtitles,
};
