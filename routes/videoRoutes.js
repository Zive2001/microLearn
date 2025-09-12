const express = require('express');
const {
  uploadVideo,
  processYouTubeURL,
  getVideoStatus,
  getUserVideos,
  deleteVideo,
  upload,
  // Part 2B: CLT-bLM Script Generation
  generateCltBlmScriptController,
  getCltBlmScript,
  // Part 2C: Video Segmentation and Keypoint Alignment
  createMicroVideoSegmentation,
  // Part 2D: TTS Integration and Video Rendering
  previewTTS,
  getAvailableVoices,
  renderMicroVideo,
  getRenderingStatus,
  downloadRenderedVideo,
} = require('../controllers/videoController');
const { protect: authenticateUser } = require('../middleware/auth');
const {
  validateVideoUpload,
  validateYouTubeURL,
  validateCltBlmGeneration,
  validateTTSPreview,
  validateRenderConfig,
} = require('../middleware/validation');
const { rateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// ============================================================================
// Part 2A: Video Ingestion and Transcript Extraction Routes
// ============================================================================

/**
 * @route   POST /api/videos/upload
 * @desc    Upload video file
 * @access  Private
 */
router.post(
  "/upload",
  authenticateUser,
  rateLimiter.videoUpload,
  upload.single("video"),
  validateVideoUpload,
  uploadVideo
);

/**
 * @route   POST /api/videos/youtube
 * @desc    Process YouTube video URL
 * @access  Private
 */
router.post(
  "/youtube",
  authenticateUser,
  rateLimiter.youtubeProcess,
  validateYouTubeURL,
  processYouTubeURL
);

/**
 * @route   GET /api/videos
 * @desc    Get user's videos
 * @access  Private
 */
router.get("/", authenticateUser, rateLimiter.general, getUserVideos);

/**
 * @route   GET /api/videos/:videoId/status
 * @desc    Get video processing status
 * @access  Private
 */
router.get(
  "/:videoId/status",
  authenticateUser,
  rateLimiter.general,
  getVideoStatus
);

/**
 * @route   DELETE /api/videos/:videoId
 * @desc    Delete video
 * @access  Private
 */
router.delete("/:videoId", authenticateUser, rateLimiter.general, deleteVideo);

// ============================================================================
// Part 2B: CLT-bLM Script Generation Routes
// ============================================================================

/**
 * @route   POST /api/videos/:videoId/generate-script
 * @desc    Generate CLT-bLM educational script from video transcript
 * @access  Private
 */
router.post(
  "/:videoId/generate-script",
  authenticateUser,
  rateLimiter.scriptGeneration,
  validateCltBlmGeneration,
  generateCltBlmScriptController
);

/**
 * @route   GET /api/videos/:videoId/script
 * @desc    Get generated CLT-bLM script
 * @access  Private
 */
router.get(
  "/:videoId/script",
  authenticateUser,
  rateLimiter.general,
  getCltBlmScript
);

// ============================================================================
// Part 2C: Video Segmentation and Keypoint Alignment Routes
// ============================================================================

/**
 * @route   POST /api/videos/:videoId/create-microvideo
 * @desc    Create micro-video with segmentation and keypoint alignment
 * @access  Private
 */
router.post(
  "/:videoId/create-microvideo",
  authenticateUser,
  rateLimiter.videoProcessing,
  createMicroVideoSegmentation
);

// ============================================================================
// Part 2D: TTS Integration and Video Rendering Routes
// ============================================================================

/**
 * @route   GET /api/videos/tts/voices
 * @desc    Get available TTS voices
 * @access  Private
 */
router.get(
  "/tts/voices",
  authenticateUser,
  rateLimiter.general,
  getAvailableVoices
);

/**
 * @route   POST /api/videos/microvideo/:microVideoId/preview-tts
 * @desc    Preview TTS audio for CLT-bLM script phase
 * @access  Private
 */
router.post(
  "/microvideo/:microVideoId/preview-tts",
  authenticateUser,
  rateLimiter.ttsGeneration,
  validateTTSPreview,
  previewTTS
);

/**
 * @route   POST /api/videos/microvideo/:microVideoId/render
 * @desc    Render final micro-video with TTS and visual overlays
 * @access  Private
 */
router.post(
  "/microvideo/:microVideoId/render",
  authenticateUser,
  rateLimiter.videoRendering,
  validateRenderConfig,
  renderMicroVideo
);

/**
 * @route   GET /api/videos/microvideo/:microVideoId/status
 * @desc    Get micro-video rendering status
 * @access  Private
 */
router.get(
  "/microvideo/:microVideoId/status",
  authenticateUser,
  rateLimiter.general,
  getRenderingStatus
);

/**
 * @route   GET /api/videos/microvideo/:microVideoId/download
 * @desc    Download rendered micro-video
 * @access  Private
 */
router.get(
  "/microvideo/:microVideoId/download",
  authenticateUser,
  rateLimiter.download,
  downloadRenderedVideo
);

module.exports = router;
