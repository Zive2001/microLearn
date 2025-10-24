const express = require('express');
const router = express.Router();
const ttsController = require('../controllers/ttsController');

// TTS Routes for Real-time Avatar System

// Generate TTS with viseme data (SoloScholar approach)
router.post('/generate', ttsController.generateTTSWithVisemes);

// Health check
router.get('/health', ttsController.healthCheck);

// Test endpoint for quick testing
router.post('/test', async (req, res) => {
  try {
    const testText = req.body.text || "Hello! This is a test of the real-time avatar TTS system. Welcome to microLearn!";

    req.body = {
      text: testText,
      teacher: req.body.teacher || 'Ava'
    };

    await ttsController.generateTTSWithVisemes(req, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Test endpoint failed',
      details: error.message
    });
  }
});

module.exports = router;