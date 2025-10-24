// services/supadataTranscriptService.js
const axios = require("axios");

class SupadataTranscriptService {
  constructor() {
    this.apiUrl = "https://api.supadata.ai/v1/transcript";
    this.apiKey = "sd_d0ea7beee3bc61a2a2b3f0fc8330d8f8";
    this.timeout = 30000; // 30 seconds timeout
  }

  /**
   * Extract transcript from YouTube video using Supadata API
   * @param {string} youtubeVideoId - YouTube video ID
   * @returns {Promise<Object>} Processed transcript data
   */
  async extractTranscript(youtubeVideoId) {
    try {
      console.log(
        `🔥 SUPADATA: Starting real transcript extraction for video: ${youtubeVideoId}`
      );

      const youtubeUrl = `https://www.youtube.com/watch?v=${youtubeVideoId}`;

      console.log(
        `📡 Making API request to Supadata for video: ${youtubeVideoId}`
      );
      console.log(
        `🌐 Request URL: ${this.apiUrl}?url=${encodeURIComponent(youtubeUrl)}`
      );

      const response = await axios.get(this.apiUrl, {
        params: {
          url: youtubeUrl,
        },
        headers: {
          "x-api-key": this.apiKey,
        },
        timeout: this.timeout,
      });

      console.log(`✅ SUPADATA: Received response for video ${youtubeVideoId}`);
      console.log(`📊 Response data keys:`, Object.keys(response.data || {}));

      if (
        response.data &&
        response.data.content &&
        Array.isArray(response.data.content)
      ) {
        const processedTranscript = this.processSupadataTranscript(
          response.data,
          youtubeVideoId
        );
        console.log(
          `🎉 SUCCESS: Real transcript extracted with ${processedTranscript.segments.length} segments!`
        );
        return processedTranscript;
      } else {
        console.log(`❌ SUPADATA: Unexpected response format`, response.data);
        throw new Error("No transcript content received from Supadata API");
      }
    } catch (error) {
      console.error(
        `❌ SUPADATA ERROR for video ${youtubeVideoId}:`,
        error.message
      );

      if (error.response) {
        console.error(`📊 API Response Status: ${error.response.status}`);
        console.error(`📋 API Response Data:`, error.response.data);
      }

      throw new Error(
        `Supadata transcript extraction failed: ${error.message}`
      );
    }
  }

  /**
   * Process Supadata transcript response into our standard format
   * @param {Object} supadataResponse - Raw response from Supadata API
   * @param {string} youtubeVideoId - YouTube video ID
   * @returns {Object} Processed transcript data
   */
  processSupadataTranscript(supadataResponse, youtubeVideoId) {
    const transcriptContent = supadataResponse.content; // Array of transcript segments
    let segments = [];
    let fullText = "";
    let totalDuration = 0;

    console.log(
      `🔧 Processing ${transcriptContent.length} Supadata transcript segments`
    );

    // Process Supadata content format: {text, offset, duration, lang}
    segments = transcriptContent.map((segment, index) => {
      const cleanedText = this.cleanTranscriptText(segment.text || "");
      fullText += (index > 0 ? " " : "") + cleanedText;

      // Supadata provides offset in milliseconds, convert to seconds
      const startTime = Math.floor((segment.offset || 0) / 1000);
      const duration = Math.floor((segment.duration || 5000) / 1000); // Default 5 seconds if no duration
      totalDuration = Math.max(totalDuration, startTime + duration);

      return {
        index: index,
        startTime: startTime,
        duration: duration,
        text: cleanedText,
        originalText: segment.text || "",
        language: segment.lang || supadataResponse.lang || "en",
      };
    });

    const cleanedFullText = this.cleanFullText(fullText);

    return {
      fullText: cleanedFullText,
      segments: segments,
      totalSegments: segments.length,
      estimatedDuration: Math.floor(totalDuration),
      wordCount: cleanedFullText.split(/\s+/).length,
      extractedAt: new Date(),
      language: supadataResponse.lang || "en",
      availableLanguages: supadataResponse.availableLangs || [],
      isMock: false, // This is REAL transcript data
      source: "supadata",
      videoId: youtubeVideoId,
      metadata: {
        originalResponse: supadataResponse,
        extractionMethod: "Supadata AI API",
        segmentCount: transcriptContent.length,
      },
    };
  }

  /**
   * Clean individual transcript text
   * @param {string} text - Raw transcript text
   * @returns {string} Cleaned text
   */
  cleanTranscriptText(text) {
    if (!text) return "";

    return text
      .replace(/\[.*?\]/g, "") // Remove [Music], [Applause] etc.
      .replace(/\(.*?\)/g, "") // Remove (background noise) etc.
      .replace(/&nbsp;/g, " ") // Replace HTML entities
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ") // Multiple spaces to single space
      .trim();
  }

  /**
   * Clean the full transcript text
   * @param {string} fullText - Complete transcript text
   * @returns {string} Cleaned full text
   */
  cleanFullText(fullText) {
    return fullText
      .replace(/\s+/g, " ") // Multiple spaces to single
      .replace(/([.!?])\s*([a-z])/g, "$1 $2") // Fix sentence spacing
      .trim();
  }

  /**
   * Split text into sentences for segment creation
   * @param {string} text - Full text to split
   * @returns {Array} Array of sentences
   */
  splitIntoSentences(text) {
    // Split by sentence endings but keep reasonable segment lengths
    const sentences = text.match(/[^\.!?]+[\.!?]+/g) || [];
    const segments = [];
    let currentSegment = "";

    for (const sentence of sentences) {
      if (currentSegment.length + sentence.length < 200) {
        currentSegment += sentence;
      } else {
        if (currentSegment) segments.push(currentSegment.trim());
        currentSegment = sentence;
      }
    }

    if (currentSegment) segments.push(currentSegment.trim());

    return segments.length > 0 ? segments : [text]; // Fallback to full text
  }

  /**
   * Format duration from seconds to readable format
   * @param {number} seconds - Duration in seconds
   * @returns {string} Formatted duration
   */
  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  }
}

module.exports = new SupadataTranscriptService();
