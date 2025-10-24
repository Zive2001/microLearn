// controllers/avatarTtsController.js
// Controller for Avatar TTS generation using Azure Speech Services

const azureTtsService = require('../services/azureTtsService');

class AvatarTtsController {
  /**
   * Generate TTS audio with visemes for avatar lip-sync
   * @route POST /api/avatar-tts/generate
   */
  async generateTTSWithVisemes(req, res) {
    try {
      const { text, teacher = 'Ava', speechRate = 0.9 } = req.body;

      // Validation
      if (!text || typeof text !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Text is required and must be a string'
        });
      }

      if (text.length > 10000) {
        return res.status(400).json({
          success: false,
          message: 'Text is too long (max 10000 characters)'
        });
      }

      console.log(`🎤 Generating TTS for teacher: ${teacher}, text length: ${text.length}`);

      // Generate TTS with visemes using Azure
      const result = await azureTtsService.generateTTSWithVisemes(text, teacher, speechRate);

      res.json({
        success: true,
        message: 'TTS generated successfully',
        data: {
          audioPath: result.audioPath,
          audioBase64: result.audioBase64,
          visemes: result.visemes,
          duration: result.duration,
          provider: result.provider,
          voiceUsed: result.voiceUsed,
          textLength: result.textLength,
          speechRate: result.speechRate
        }
      });

    } catch (error) {
      console.error('❌ Error generating TTS:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate TTS',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Generate TTS for multiple segments (batch processing)
   * @route POST /api/avatar-tts/generate-segments
   */
  async generateTTSForSegments(req, res) {
    try {
      const { segments, teacher = 'Ava', speechRate = 0.9 } = req.body;

      // Validation
      if (!Array.isArray(segments) || segments.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Segments array is required'
        });
      }

      console.log(`🎤 Generating TTS for ${segments.length} segments`);

      // Generate TTS for all segments
      const results = await azureTtsService.generateTTSForSegments(
        segments.map((segment, index) => ({
          text: segment.text || segment.educationalScript,
          teacher: segment.teacher || teacher,
          speechRate: segment.speechRate || speechRate,
          index
        }))
      );

      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;

      res.json({
        success: true,
        message: `Generated TTS for ${successCount}/${results.length} segments`,
        data: {
          results,
          summary: {
            total: results.length,
            successful: successCount,
            failed: failCount
          }
        }
      });

    } catch (error) {
      console.error('❌ Error generating TTS segments:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate TTS segments',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get available avatar voices
   * @route GET /api/avatar-tts/voices
   */
  async getAvailableVoices(req, res) {
    try {
      const voices = azureTtsService.getAvailableVoices();

      res.json({
        success: true,
        data: {
          voices,
          provider: 'Azure Neural TTS',
          count: voices.length
        }
      });

    } catch (error) {
      console.error('❌ Error getting voices:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get available voices',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Test TTS functionality
   * @route POST /api/avatar-tts/test
   */
  async testTTS(req, res) {
    try {
      const { teacher = 'Ava' } = req.body;

      const testText = "Hello! This is a test of the text-to-speech system with avatar lip-sync support.";

      console.log(`🧪 Testing TTS with teacher: ${teacher}`);

      const result = await azureTtsService.generateTTSWithVisemes(testText, teacher);

      res.json({
        success: true,
        message: 'TTS test successful',
        data: {
          teacher,
          testText,
          visemeCount: result.visemes.length,
          duration: result.duration,
          provider: result.provider,
          audioBase64: result.audioBase64.substring(0, 50) + '...' // Just show preview
        }
      });

    } catch (error) {
      console.error('❌ TTS test failed:', error);
      res.status(500).json({
        success: false,
        message: 'TTS test failed',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
}

module.exports = new AvatarTtsController();
