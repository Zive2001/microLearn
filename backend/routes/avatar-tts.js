const express = require('express');
const router = express.Router();
const avatarTtsController = require('../controllers/avatarTtsController');

/**
 * @route POST /api/avatar-tts/generate
 * @desc Generate TTS audio with visemes for avatar lip-sync (SoloScholar style)
 * @access Public
 */
router.post('/generate', avatarTtsController.generateTTSWithVisemes);

/**
 * @route POST /api/avatar-tts/generate-segments
 * @desc Generate TTS for multiple segments (for micro-videos)
 * @access Public
 */
router.post('/generate-segments', avatarTtsController.generateTTSForSegments);

/**
 * @route GET /api/avatar-tts/voices
 * @desc Get available avatar voices
 * @access Public
 */
router.get('/voices', avatarTtsController.getAvailableVoices);

/**
 * @route POST /api/avatar-tts/test
 * @desc Test TTS functionality
 * @access Public
 */
router.post('/test', avatarTtsController.testTTS);

module.exports = router;