const express = require('express');
const { body } = require('express-validator');
const {
  testProcessYouTubeURL,
  testGetVideoStatus,
  testGetMicroVideo,
  testPreviewTTS,
  // Phase 1A Test Controllers
  testUploadVideo,
  testGenerateCltBlmScript,
  testGetCltBlmScript,
  testCreateMicroVideoSegmentation,
  testRenderMicroVideo,
  testGetRenderingStatus,
  testDownloadRenderedVideo
} = require('../controllers/testVideoController');

const router = express.Router();

// ============================================================================
// 🧪 TEST ROUTES FOR MICRO-LEARNING SHORTS DEVELOPMENT
// ============================================================================
// These routes bypass authentication for direct testing
// WARNING: Only use in development environment!

/**
 * @route   POST /api/test-videos/youtube
 * @desc    TEST: Process YouTube video directly (no auth)
 * @access  Public (TEST ONLY)
 */
router.post('/youtube', [
  body('url')
    .isURL()
    .withMessage('Must be a valid URL')
    .custom((value) => {
      const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)/;
      if (!youtubeRegex.test(value)) {
        throw new Error('Must be a valid YouTube URL');
      }
      return true;
    }),
  body('testUserId')
    .optional()
    .isString()
    .withMessage('Test User ID must be a string')
], testProcessYouTubeURL);

/**
 * @route   GET /api/test-videos/:videoId/status
 * @desc    TEST: Get video processing status (no auth)
 * @access  Public (TEST ONLY)
 */
router.get('/:videoId/status', testGetVideoStatus);

/**
 * @route   GET /api/test-videos/micro-videos/:microVideoId
 * @desc    TEST: Get micro-video details (no auth)
 * @access  Public (TEST ONLY)
 */
router.get('/micro-videos/:microVideoId', testGetMicroVideo);

/**
 * @route   POST /api/test-videos/micro-videos/:microVideoId/preview-tts
 * @desc    TEST: Preview TTS audio (no auth)
 * @access  Public (TEST ONLY)
 */
router.post('/micro-videos/:microVideoId/preview-tts', [
  body('voice')
    .optional()
    .isIn(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'])
    .withMessage('Voice must be one of: alloy, echo, fable, onyx, nova, shimmer'),
  body('phase')
    .optional()
    .isIn(['prepare', 'initiate', 'deliver', 'end'])
    .withMessage('Phase must be one of: prepare, initiate, deliver, end'),
  body('speed')
    .optional()
    .isFloat({ min: 0.25, max: 4.0 })
    .withMessage('Speed must be between 0.25 and 4.0')
], testPreviewTTS);

// ============================================================================
// 🧪 PHASE 1A TEST ROUTES - Complete Controller Testing
// ============================================================================

/**
 * @route   POST /api/test-videos/upload
 * @desc    TEST: Upload video file (simulated - no auth)
 * @access  Public (TEST ONLY)
 */
router.post('/upload', [
  body('filename')
    .notEmpty()
    .withMessage('Filename is required for simulation'),
  body('title')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be 1-200 characters'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('simulateFileSize')
    .optional()
    .isInt({ min: 1000 })
    .withMessage('Simulated file size must be at least 1000 bytes'),
  body('simulateDuration')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('Simulated duration must be at least 1 second')
], testUploadVideo);

/**
 * @route   POST /api/test-videos/:videoId/generate-script
 * @desc    TEST: Generate CLT-bLM script (no auth)
 * @access  Public (TEST ONLY)
 */
router.post('/:videoId/generate-script', [
  body('targetDuration')
    .optional()
    .isInt({ min: 120, max: 600 })
    .withMessage('Target duration must be between 2-10 minutes (120-600 seconds)'),
  body('difficultyLevel')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Difficulty level must be beginner, intermediate, or advanced'),
  body('learningObjectives')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Learning objectives must be an array with maximum 10 items'),
  body('personalizations')
    .optional()
    .isObject()
    .withMessage('Personalizations must be an object')
], testGenerateCltBlmScript);

/**
 * @route   GET /api/test-videos/:videoId/script
 * @desc    TEST: Get CLT-bLM script (no auth)
 * @access  Public (TEST ONLY)
 */
router.get('/:videoId/script', testGetCltBlmScript);

/**
 * @route   POST /api/test-videos/:videoId/create-microvideo
 * @desc    TEST: Create micro-video segmentation (no auth)
 * @access  Public (TEST ONLY)
 */
router.post('/:videoId/create-microvideo', [
  body('segmentationMethod')
    .optional()
    .isIn(['auto', 'custom'])
    .withMessage('Segmentation method must be auto or custom'),
  body('targetSegmentDuration')
    .optional()
    .isInt({ min: 30, max: 300 })
    .withMessage('Target segment duration must be between 30-300 seconds'),
  body('phases')
    .optional()
    .isArray()
    .custom((value) => {
      const validPhases = ['prepare', 'initiate', 'deliver', 'end'];
      return value.every(phase => validPhases.includes(phase));
    })
    .withMessage('Phases must be an array of valid phase names'),
  body('customSegments')
    .optional()
    .isArray()
    .withMessage('Custom segments must be an array')
], testCreateMicroVideoSegmentation);

/**
 * @route   POST /api/test-videos/microvideo/:microVideoId/render
 * @desc    TEST: Render micro-video (no auth)
 * @access  Public (TEST ONLY)
 */
router.post('/microvideo/:microVideoId/render', [
  body('voice')
    .optional()
    .isIn(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'])
    .withMessage('Voice must be one of: alloy, echo, fable, onyx, nova, shimmer'),
  body('outputFormat')
    .optional()
    .isIn(['mp4', 'webm', 'mov'])
    .withMessage('Output format must be mp4, webm, or mov'),
  body('quality')
    .optional()
    .isIn(['low', 'medium', 'high', 'ultra'])
    .withMessage('Quality must be low, medium, high, or ultra'),
  body('includeSubtitles')
    .optional()
    .isBoolean()
    .withMessage('Include subtitles must be a boolean'),
  body('customizations')
    .optional()
    .isObject()
    .withMessage('Customizations must be an object')
], testRenderMicroVideo);

/**
 * @route   GET /api/test-videos/microvideo/:microVideoId/status
 * @desc    TEST: Get rendering status (no auth)
 * @access  Public (TEST ONLY)
 */
router.get('/microvideo/:microVideoId/status', testGetRenderingStatus);

/**
 * @route   GET /api/test-videos/microvideo/:microVideoId/download
 * @desc    TEST: Download rendered video (no auth)
 * @access  Public (TEST ONLY)
 */
router.get('/microvideo/:microVideoId/download', testDownloadRenderedVideo);

// ============================================================================
// 🧪 TEST UTILITY ROUTES
// ============================================================================

/**
 * @route   GET /api/test-videos/info
 * @desc    Get test environment info
 * @access  Public
 */
router.get('/info', (req, res) => {
  res.json({
    success: true,
    message: '🧪 Test Routes Active',
    environment: process.env.NODE_ENV,
    available_routes: {
      phase_1a_controller_tests: [
        {
          method: 'POST',
          path: '/api/test-videos/upload',
          description: '1. Test video upload (simulated)',
          example: {
            filename: 'test-video.mp4',
            title: 'Test Video Upload',
            description: 'Testing upload functionality',
            simulateFileSize: 15728640,
            simulateDuration: 120.5
          }
        },
        {
          method: 'POST',
          path: '/api/test-videos/:videoId/generate-script',
          description: '2. Test CLT-bLM script generation',
          example: {
            targetDuration: 300,
            difficultyLevel: 'intermediate',
            learningObjectives: ['Understand concepts', 'Apply principles'],
            personalizations: { learningStyle: 'visual', pace: 'normal' }
          }
        },
        {
          method: 'GET',
          path: '/api/test-videos/:videoId/script',
          description: '3. Test get CLT-bLM script',
          example: 'No body required'
        },
        {
          method: 'POST',
          path: '/api/test-videos/:videoId/create-microvideo',
          description: '4. Test micro-video segmentation',
          example: {
            segmentationMethod: 'auto',
            targetSegmentDuration: 60,
            phases: ['prepare', 'initiate', 'deliver', 'end']
          }
        },
        {
          method: 'POST',
          path: '/api/test-videos/microvideo/:microVideoId/preview-tts',
          description: '5. Test TTS preview (already working)',
          example: {
            voice: 'alloy',
            phase: 'deliver',
            speed: 1.0
          }
        },
        {
          method: 'POST',
          path: '/api/test-videos/microvideo/:microVideoId/render',
          description: '6. Test micro-video rendering',
          example: {
            voice: 'alloy',
            outputFormat: 'mp4',
            quality: 'high',
            includeSubtitles: true,
            customizations: { backgroundColor: '#3498db' }
          }
        },
        {
          method: 'GET',
          path: '/api/test-videos/microvideo/:microVideoId/status',
          description: '7. Test rendering status',
          example: 'No body required'
        },
        {
          method: 'GET',
          path: '/api/test-videos/microvideo/:microVideoId/download',
          description: '8. Test video download',
          example: 'Query params: ?format=mp4'
        }
      ],
      existing_routes: [
        {
          method: 'POST',
          path: '/api/test-videos/youtube',
          description: 'Process YouTube video directly',
          example: {
            url: 'https://www.youtube.com/watch?v=VIDEO_ID',
            testUserId: 'test-user-123'
          }
        },
        {
          method: 'GET',
          path: '/api/test-videos/:videoId/status',
          description: 'Get video processing status'
        },
        {
          method: 'GET',
          path: '/api/test-videos/micro-videos/:microVideoId',
          description: 'Get micro-video details'
        }
      ],
      utilities: [
        {
          method: 'GET',
          path: '/api/test-videos/info',
          description: 'Get this info page'
        },
        {
          method: 'GET',
          path: '/api/test-videos/voices',
          description: 'Get available TTS voices and options'
        }
      ]
    },
    warning: '⚠️ These routes bypass authentication - USE ONLY IN DEVELOPMENT!'
  });
});

/**
 * @route   GET /api/test-videos/voices
 * @desc    Get available TTS voices for testing
 * @access  Public
 */
router.get('/voices', (req, res) => {
  res.json({
    success: true,
    message: 'Available TTS voices for testing',
    data: {
      voices: [
        { id: 'alloy', name: 'Alloy', description: 'Neutral, balanced voice' },
        { id: 'echo', name: 'Echo', description: 'Clear, professional voice' },
        { id: 'fable', name: 'Fable', description: 'Warm, storytelling voice' },
        { id: 'onyx', name: 'Onyx', description: 'Deep, authoritative voice' },
        { id: 'nova', name: 'Nova', description: 'Energetic, engaging voice' },
        { id: 'shimmer', name: 'Shimmer', description: 'Bright, cheerful voice' }
      ],
      phases: [
        { id: 'prepare', name: 'Prepare', description: 'Introduction and context setting' },
        { id: 'initiate', name: 'Initiate', description: 'Learning objectives and goals' },
        { id: 'deliver', name: 'Deliver', description: 'Main content delivery' },
        { id: 'end', name: 'End', description: 'Summary and conclusion' }
      ],
      speed_range: {
        min: 0.25,
        max: 4.0,
        default: 1.0,
        recommended: {
          slow: 0.8,
          normal: 1.0,
          fast: 1.2
        }
      }
    }
  });
});

module.exports = router;