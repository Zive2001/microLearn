const { body, param, query, validationResult } = require('express-validator');

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }
  next();
};

// Part 2A: Video Upload and Processing Validations

/**
 * Validate video upload
 */
const validateVideoUpload = [
  body("title")
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage("Title must be 1-200 characters"),
  body("description")
    .optional()
    .isLength({ max: 1000 })
    .withMessage("Description must be less than 1000 characters"),
  handleValidationErrors,
];

/**
 * Validate YouTube URL processing
 */
const validateYouTubeURL = [
  body("url")
    .isURL()
    .withMessage("Must be a valid URL")
    .custom((value) => {
      const youtubeRegex =
        /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)/;
      if (!youtubeRegex.test(value)) {
        throw new Error("Must be a valid YouTube URL");
      }
      return true;
    }),
  body("title")
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage("Title must be 1-200 characters"),
  body("description")
    .optional()
    .isLength({ max: 1000 })
    .withMessage("Description must be less than 1000 characters"),
  handleValidationErrors,
];

// Part 2B: CLT-bLM Script Generation Validations

/**
 * Validate CLT-bLM script generation
 */
const validateCltBlmGeneration = [
  body("targetDuration")
    .optional()
    .isInt({ min: 120, max: 600 })
    .withMessage(
      "Target duration must be between 2-10 minutes (120-600 seconds)"
    ),
  body("learningObjectives")
    .optional()
    .isArray({ max: 10 })
    .withMessage("Learning objectives must be an array with maximum 10 items"),
  body("learningObjectives.*")
    .optional()
    .isLength({ min: 10, max: 200 })
    .withMessage("Each learning objective must be 10-200 characters"),
  body("difficultyLevel")
    .optional()
    .isIn(["beginner", "intermediate", "advanced"])
    .withMessage(
      "Difficulty level must be beginner, intermediate, or advanced"
    ),
  body("personalizations")
    .optional()
    .isObject()
    .withMessage("Personalizations must be an object"),
  body("personalizations.learningStyle")
    .optional()
    .isIn(["visual", "auditory", "kinesthetic", "reading"])
    .withMessage(
      "Learning style must be visual, auditory, kinesthetic, or reading"
    ),
  body("personalizations.pace")
    .optional()
    .isIn(["slow", "normal", "fast"])
    .withMessage("Pace must be slow, normal, or fast"),
  param("videoId").isMongoId().withMessage("Invalid video ID"),
  handleValidationErrors,
];

// Part 2D: TTS and Rendering Validations

/**
 * Validate TTS preview request
 */
const validateTTSPreview = [
  param("microVideoId").isMongoId().withMessage("Invalid micro-video ID"),
  body("voice")
    .optional()
    .isIn(["alloy", "echo", "fable", "onyx", "nova", "shimmer"])
    .withMessage(
      "Voice must be one of: alloy, echo, fable, onyx, nova, shimmer"
    ),
  body("phase")
    .optional()
    .isIn(["prepare", "initiate", "deliver", "end"])
    .withMessage("Phase must be one of: prepare, initiate, deliver, end"),
  body("speed")
    .optional()
    .isFloat({ min: 0.25, max: 4.0 })
    .withMessage("Speed must be between 0.25 and 4.0"),
  handleValidationErrors,
];

/**
 * Validate video rendering configuration
 */
const validateRenderConfig = [
  param("microVideoId").isMongoId().withMessage("Invalid micro-video ID"),
  body("voice")
    .optional()
    .isIn(["alloy", "echo", "fable", "onyx", "nova", "shimmer"])
    .withMessage(
      "Voice must be one of: alloy, echo, fable, onyx, nova, shimmer"
    ),
  body("outputFormat")
    .optional()
    .isIn(["mp4", "webm", "mov"])
    .withMessage("Output format must be mp4, webm, or mov"),
  body("quality")
    .optional()
    .isIn(["low", "medium", "high", "ultra"])
    .withMessage("Quality must be low, medium, high, or ultra"),
  body("includeSubtitles")
    .optional()
    .isBoolean()
    .withMessage("Include subtitles must be a boolean"),
  body("customizations")
    .optional()
    .isObject()
    .withMessage("Customizations must be an object"),
  body("customizations.backgroundColor")
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage("Background color must be a valid hex color"),
  body("customizations.textColor")
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage("Text color must be a valid hex color"),
  body("customizations.fontFamily")
    .optional()
    .isIn(["Arial", "Helvetica", "Times", "Courier", "Roboto", "Open Sans"])
    .withMessage("Font family must be a supported font"),
  body("customizations.overlayOpacity")
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage("Overlay opacity must be between 0 and 1"),
  handleValidationErrors,
];

// General Parameter Validations

/**
 * Validate MongoDB ObjectId parameters
 */
const validateObjectId = (paramName) => [
  param(paramName).isMongoId().withMessage(`Invalid ${paramName}`),
  handleValidationErrors,
];

/**
 * Validate pagination query parameters
 */
const validatePagination = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Limit must be between 1 and 50"),
  query("search")
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage("Search term must be 1-100 characters"),
  query("status")
    .optional()
    .isIn(["uploaded", "processing", "completed", "failed"])
    .withMessage("Status must be uploaded, processing, completed, or failed"),
  handleValidationErrors,
];

/**
 * Validate file upload size and type
 */
const validateFileUpload = (req, res, next) => {
  if (req.file) {
    // Check file size (500MB limit)
    const maxSize = 500 * 1024 * 1024;
    if (req.file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: "File size too large. Maximum size is 500MB",
      });
    }

    // Check file type
    const allowedTypes = [
      "video/mp4",
      "video/mpeg",
      "video/quicktime",
      "video/x-msvideo",
      "video/webm",
    ];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid file type. Only MP4, MOV, AVI, MPEG, and WebM files are allowed",
      });
    }
  }
  next();
};

module.exports = {
  validateVideoUpload,
  validateYouTubeURL,
  validateCltBlmGeneration,
  validateTTSPreview,
  validateRenderConfig,
  validateObjectId,
  validatePagination,
  validateFileUpload
};
