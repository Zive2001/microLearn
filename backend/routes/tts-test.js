// routes/tts-test.js - Standalone TTS testing routes (no database required)
const express = require('express');
const { body, validationResult } = require('express-validator');
const ttsService = require('../services/ttsService');

const router = express.Router();

// @desc    Test TTS service health and available voices (no DB required)
// @route   GET /api/tts-test/health
// @access  Public (for testing)
router.get('/health', async (req, res) => {
    try {
        console.log('🧪 TTS TEST: Checking TTS service health (standalone)');

        const healthCheck = await ttsService.healthCheck();
        const availableVoices = await ttsService.getAvailableVoices();

        res.json({
            success: true,
            message: 'TTS service health check (standalone)',
            data: {
                health: healthCheck,
                availableVoices: availableVoices,
                provider: process.env.TTS_PROVIDER || 'web',
                audioOutputDir: process.env.AUDIO_OUTPUT_DIR || './generated-audio'
            }
        });

    } catch (error) {
        console.error('❌ TTS TEST ERROR:', error);
        res.status(500).json({
            success: false,
            message: 'TTS health check failed',
            error: error.message
        });
    }
});

// @desc    Test TTS with custom text (no DB required)
// @route   POST /api/tts-test/generate
// @access  Public (for testing)
router.post('/generate', [
    body('text').notEmpty().withMessage('Text is required'),
    body('voiceName').optional().isString().withMessage('Voice name must be a string'),
    body('speed').optional().isFloat({ min: 0.5, max: 2.0 }).withMessage('Speed must be between 0.5 and 2.0'),
    body('pitch').optional().isFloat({ min: -20, max: 20 }).withMessage('Pitch must be between -20 and 20')
], async (req, res) => {
    try {
        console.log('🧪 TTS TEST: Generating audio with custom text (standalone)');

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { text, voiceName, speed, pitch } = req.body;

        console.log(`📝 Text length: ${text.length} characters`);
        console.log(`🎵 Voice: ${voiceName || 'default'}, Speed: ${speed || 1.0}, Pitch: ${pitch || 0.0}`);

        const audioResult = await ttsService.generateAudio(text, {
            voiceName: voiceName || 'en-US-Standard-D',
            speed: speed || 1.0,
            pitch: pitch || 0.0,
            languageCode: 'en-US'
        });

        res.json({
            success: true,
            message: 'Audio generated successfully (standalone)',
            data: {
                ...audioResult,
                estimatedCost: calculateEstimatedCost(text.length, audioResult.provider)
            }
        });

    } catch (error) {
        console.error('❌ TTS TEST ERROR:', error);
        res.status(500).json({
            success: false,
            message: 'Audio generation failed',
            error: error.message
        });
    }
});

// @desc    Test different TTS providers (no DB required)
// @route   POST /api/tts-test/compare-providers
// @access  Public (for testing)
router.post('/compare-providers', [
    body('text').notEmpty().withMessage('Text is required')
], async (req, res) => {
    try {
        console.log('🧪 TTS TEST: Comparing different TTS providers');

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { text } = req.body;
        const providers = ['web', 'google', 'azure'];
        const results = {};

        for (const provider of providers) {
            try {
                console.log(`🎵 Testing ${provider} TTS...`);

                // Temporarily change provider
                const originalProvider = process.env.TTS_PROVIDER;
                process.env.TTS_PROVIDER = provider;

                const ttsServiceTemp = require('../services/ttsService');
                const result = await ttsServiceTemp.generateAudio(text, {
                    voiceName: 'en-US-Standard-D',
                    speed: 1.0
                });

                results[provider] = {
                    success: true,
                    ...result,
                    estimatedCost: calculateEstimatedCost(text.length, provider)
                };

                // Restore original provider
                process.env.TTS_PROVIDER = originalProvider;

            } catch (error) {
                results[provider] = {
                    success: false,
                    error: error.message
                };
            }
        }

        res.json({
            success: true,
            message: 'TTS provider comparison completed',
            data: {
                textLength: text.length,
                providers: results,
                recommendation: getProviderRecommendation(results)
            }
        });

    } catch (error) {
        console.error('❌ TTS TEST ERROR:', error);
        res.status(500).json({
            success: false,
            message: 'Provider comparison failed',
            error: error.message
        });
    }
});

// @desc    Test TTS with educational script sample
// @route   POST /api/tts-test/educational-sample
// @access  Public (for testing)
router.post('/educational-sample', async (req, res) => {
    try {
        console.log('🧪 TTS TEST: Testing with educational script sample');

        const educationalScript = `Welcome back to our JavaScript journey! In this segment, we delved into the foundational aspects of JavaScript, exploring its significance in both frontend and backend development. We learned about the role of JavaScript as the 'brain' of web development, its origins in browser execution, and the introduction of Node.js for running JS code outside browsers. Now, we are ready to take our first steps in executing JavaScript code within web browsers and exploring practical examples of how JavaScript interacts with HTML. By the end of this segment, you'll have a clear understanding of how JavaScript operates and its versatility in web development.`;

        const audioResult = await ttsService.generateAudio(educationalScript, {
            voiceName: 'en-US-Standard-D',
            speed: 1.1, // Slightly faster for educational content
            languageCode: 'en-US'
        });

        res.json({
            success: true,
            message: 'Educational script audio generated successfully',
            data: {
                ...audioResult,
                scriptLength: educationalScript.length,
                estimatedViewerTime: Math.ceil(audioResult.duration / 60), // minutes
                estimatedCost: calculateEstimatedCost(educationalScript.length, audioResult.provider)
            }
        });

    } catch (error) {
        console.error('❌ TTS TEST ERROR:', error);
        res.status(500).json({
            success: false,
            message: 'Educational sample generation failed',
            error: error.message
        });
    }
});

/**
 * Calculate estimated cost for TTS generation
 */
function calculateEstimatedCost(textLength, provider) {
    const costs = {
        google: 0.000016, // $16 per 1M characters
        azure: 0.000016,  // $16 per 1M characters
        openai: 0.000015, // $15 per 1M characters
        web: 0,           // Free
        system: 0,        // Free
        'silent-fallback': 0 // Free
    };

    const costPerChar = costs[provider] || 0;
    const estimatedCost = textLength * costPerChar;

    return {
        provider: provider,
        textLength: textLength,
        costPerCharacter: costPerChar,
        estimatedCost: estimatedCost,
        estimatedCostFormatted: `$${estimatedCost.toFixed(4)}`
    };
}

/**
 * Get provider recommendation based on results
 */
function getProviderRecommendation(results) {
    const successfulProviders = Object.keys(results).filter(provider => results[provider].success);

    if (successfulProviders.includes('google')) {
        return {
            recommended: 'google',
            reason: 'Best quality with 1M free characters/month',
            setup: 'Install: npm install @google-cloud/text-to-speech'
        };
    } else if (successfulProviders.includes('azure')) {
        return {
            recommended: 'azure',
            reason: 'Good quality with 500K free characters/month',
            setup: 'Install: npm install microsoft-cognitiveservices-speech-sdk'
        };
    } else if (successfulProviders.includes('web')) {
        return {
            recommended: 'web',
            reason: 'Completely free, uses system TTS',
            setup: 'No additional setup required'
        };
    } else {
        return {
            recommended: 'none',
            reason: 'No providers available',
            setup: 'Check TTS service configuration'
        };
    }
}

module.exports = router;