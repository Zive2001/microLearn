const rateLimit = require('express-rate-limit');

/**
 * Rate limiter configurations for different endpoints
 */
const rateLimiter = {
  // General API requests
  general: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
      success: false,
      message: "Too many requests, please try again later.",
    },
    standardHeaders: true,
    legacyHeaders: false,
  }),

  // Authentication endpoints
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 auth requests per windowMs
    message: {
      success: false,
      message: "Too many authentication attempts, please try again later.",
    },
    standardHeaders: true,
    legacyHeaders: false,
  }),

  // Video upload endpoints
  videoUpload: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 10 uploads per hour
    message: {
      success: false,
      message: "Upload limit exceeded. Maximum 10 uploads per hour.",
    },
    standardHeaders: true,
    legacyHeaders: false,
  }),

  // YouTube processing endpoints
  youtubeProcess: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 15, // Limit each IP to 15 YouTube downloads per hour
    message: {
      success: false,
      message: "YouTube processing limit exceeded. Maximum 15 videos per hour.",
    },
    standardHeaders: true,
    legacyHeaders: false,
  }),

  // Script generation endpoints
  scriptGeneration: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // Limit each IP to 20 script generations per hour
    message: {
      success: false,
      message:
        "Script generation limit exceeded. Maximum 20 generations per hour.",
    },
    standardHeaders: true,
    legacyHeaders: false,
  }),

  // Video processing endpoints (segmentation, etc.)
  videoProcessing: rateLimit({
    windowMs: 30 * 60 * 1000, // 30 minutes
    max: 15, // Limit each IP to 15 processing requests per 30 minutes
    message: {
      success: false,
      message:
        "Video processing limit exceeded. Maximum 15 requests per 30 minutes.",
    },
    standardHeaders: true,
    legacyHeaders: false,
  }),

  // TTS generation endpoints
  ttsGeneration: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // Limit each IP to 50 TTS requests per hour
    message: {
      success: false,
      message: "TTS generation limit exceeded. Maximum 50 requests per hour.",
    },
    standardHeaders: true,
    legacyHeaders: false,
  }),

  // Video rendering endpoints
  videoRendering: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Limit each IP to 5 rendering requests per hour
    message: {
      success: false,
      message: "Video rendering limit exceeded. Maximum 5 renderings per hour.",
    },
    standardHeaders: true,
    legacyHeaders: false,
  }),

  // Download endpoints
  download: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // Limit each IP to 30 downloads per 15 minutes
    message: {
      success: false,
      message: "Download limit exceeded. Maximum 30 downloads per 15 minutes.",
    },
    standardHeaders: true,
    legacyHeaders: false,
  }),

  // Quiz-related endpoints (for future Component 2)
  quizGeneration: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 25, // Limit each IP to 25 quiz generations per hour
    message: {
      success: false,
      message:
        "Quiz generation limit exceeded. Maximum 25 generations per hour.",
    },
    standardHeaders: true,
    legacyHeaders: false,
  }),

  // Quiz taking endpoints
  quizTaking: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Limit each IP to 50 quiz interactions per 15 minutes
    message: {
      success: false,
      message:
        "Quiz interaction limit exceeded. Maximum 50 interactions per 15 minutes.",
    },
    standardHeaders: true,
    legacyHeaders: false,
  }),
};

module.exports = { rateLimiter };
