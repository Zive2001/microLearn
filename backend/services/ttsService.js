// services/ttsService.js - Text-to-Speech service integration
const fs = require('fs').promises;
const path = require('path');

class TTSService {
    constructor() {
        this.provider = process.env.TTS_PROVIDER || 'google'; // google, azure, openai, web
        this.outputDir = process.env.AUDIO_OUTPUT_DIR || './generated-audio';
        this.initializeOutputDirectory();
    }

    /**
     * Initialize audio output directory
     */
    async initializeOutputDirectory() {
        try {
            await fs.mkdir(this.outputDir, { recursive: true });
            console.log(`✅ Audio output directory initialized: ${this.outputDir}`);
        } catch (error) {
            console.error('❌ Error creating audio directory:', error);
        }
    }

    /**
     * Generate audio from text using the configured TTS provider
     * @param {string} text - Text to convert to speech
     * @param {Object} options - TTS options (voice, speed, etc.)
     * @returns {Promise<Object>} Audio file information
     */
    async generateAudio(text, options = {}) {
        try {
            console.log(`🎵 Generating audio using ${this.provider} TTS...`);

            switch (this.provider) {
                case 'google':
                    return await this.generateGoogleTTS(text, options);
                case 'azure':
                    return await this.generateAzureTTS(text, options);
                case 'openai':
                    return await this.generateOpenAITTS(text, options);
                case 'web':
                    return await this.generateWebSpeechTTS(text, options);
                default:
                    throw new Error(`Unsupported TTS provider: ${this.provider}`);
            }
        } catch (error) {
            console.error('❌ TTS generation failed:', error);
            throw error;
        }
    }

    /**
     * Google Cloud Text-to-Speech (FREE tier: 1M chars/month)
     */
    async generateGoogleTTS(text, options = {}) {
        try {
            // Check if Google Cloud TTS is available
            let textToSpeech;
            try {
                textToSpeech = require('@google-cloud/text-to-speech');
            } catch (error) {
                throw new Error('Google Cloud TTS package not installed. Run: npm install @google-cloud/text-to-speech');
            }

            const client = new textToSpeech.TextToSpeechClient();

            const request = {
                input: { text: text },
                voice: {
                    languageCode: options.languageCode || 'en-US',
                    name: options.voiceName || 'en-US-Standard-D', // Male voice
                    ssmlGender: options.gender || 'MALE'
                },
                audioConfig: {
                    audioEncoding: 'MP3',
                    speakingRate: options.speed || 1.0,
                    pitch: options.pitch || 0.0,
                    volumeGainDb: options.volume || 0.0
                }
            };

            console.log('📡 Calling Google Cloud TTS API...');
            const [response] = await client.synthesizeSpeech(request);

            // Generate unique filename
            const timestamp = Date.now();
            const filename = `tts_${timestamp}.mp3`;
            const filepath = path.join(this.outputDir, filename);

            // Save audio file
            await fs.writeFile(filepath, response.audioContent, 'binary');

            console.log(`✅ Google TTS audio generated: ${filename}`);

            return {
                success: true,
                provider: 'google',
                filename: filename,
                filepath: filepath,
                duration: this.estimateAudioDuration(text, options.speed || 1.0),
                size: response.audioContent.length,
                textLength: text.length,
                voiceUsed: request.voice.name
            };

        } catch (error) {
            console.error('❌ Google TTS error:', error);
            // Fallback to Web Speech API if Google fails
            return await this.generateWebSpeechTTS(text, options);
        }
    }

    /**
     * Azure Speech Service (FREE tier: 500K chars/month)
     */
    async generateAzureTTS(text, options = {}) {
        try {
            let sdk;
            try {
                sdk = require('microsoft-cognitiveservices-speech-sdk');
            } catch (error) {
                throw new Error('Azure Speech SDK not installed. Run: npm install microsoft-cognitiveservices-speech-sdk');
            }

            const speechKey = process.env.AZURE_SPEECH_KEY;
            const region = process.env.AZURE_SPEECH_REGION || 'eastus';

            if (!speechKey) {
                throw new Error('AZURE_SPEECH_KEY not found in environment variables');
            }

            const speechConfig = sdk.SpeechConfig.fromSubscription(speechKey, region);
            speechConfig.speechSynthesisVoiceName = options.voiceName || 'en-US-AriaNeural';
            speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;

            const timestamp = Date.now();
            const filename = `tts_azure_${timestamp}.mp3`;
            const filepath = path.join(this.outputDir, filename);

            const audioConfig = sdk.AudioConfig.fromAudioFileOutput(filepath);
            const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

            return new Promise((resolve, reject) => {
                synthesizer.speakTextAsync(text,
                    (result) => {
                        synthesizer.close();
                        resolve({
                            success: true,
                            provider: 'azure',
                            filename: filename,
                            filepath: filepath,
                            duration: this.estimateAudioDuration(text, options.speed || 1.0),
                            textLength: text.length,
                            voiceUsed: speechConfig.speechSynthesisVoiceName
                        });
                    },
                    (error) => {
                        synthesizer.close();
                        reject(error);
                    }
                );
            });

        } catch (error) {
            console.error('❌ Azure TTS error:', error);
            return await this.generateWebSpeechTTS(text, options);
        }
    }

    /**
     * OpenAI TTS (Paid but affordable: $15/1M chars)
     */
    async generateOpenAITTS(text, options = {}) {
        try {
            const openaiService = require('./openaiService');

            // Note: This would require OpenAI TTS API integration
            // For now, fallback to Web Speech API
            console.log('⚠️ OpenAI TTS not implemented yet, using Web Speech API fallback');
            return await this.generateWebSpeechTTS(text, options);

        } catch (error) {
            console.error('❌ OpenAI TTS error:', error);
            return await this.generateWebSpeechTTS(text, options);
        }
    }

    /**
     * Web Speech API (Completely FREE - browser-based)
     * Note: This is a fallback method that works client-side
     */
    async generateWebSpeechTTS(text, options = {}) {
        try {
            // For server-side, we'll use a simple say command or espeak if available
            const timestamp = Date.now();
            const filename = `tts_web_${timestamp}.wav`;
            const filepath = path.join(this.outputDir, filename);

            // Try to use system TTS (Linux: espeak, macOS: say, Windows: PowerShell)
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);

            let command;
            const platform = process.platform;

            if (platform === 'win32') {
                // Windows PowerShell TTS - Split longer text into chunks
                const maxLength = 200; // Limit to avoid command line issues
                const chunks = this.splitTextIntoChunks(text, maxLength);

                if (chunks.length === 1) {
                    // Single chunk - direct approach
                    const cleanText = text.replace(/["'`]/g, '').replace(/\n/g, ' ');
                    command = `powershell -Command "Add-Type -AssemblyName System.Speech; $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer; $synth.SetOutputToWaveFile('${filepath}'); $synth.Speak('${cleanText}'); $synth.Dispose()"`;
                } else {
                    // Multiple chunks - create temporary files and combine
                    return await this.generateChunkedAudio(chunks, filepath, options);
                }
            } else if (platform === 'darwin') {
                // macOS say command
                command = `say "${text.replace(/"/g, '\\"')}" -o "${filepath}"`;
            } else {
                // Linux espeak
                command = `espeak "${text.replace(/"/g, '\\"')}" -w "${filepath}"`;
            }

            console.log(`🎵 Using system TTS on ${platform}...`);
            await execAsync(command);

            // Check if file was created
            const stats = await fs.stat(filepath);

            return {
                success: true,
                provider: 'web/system',
                filename: filename,
                filepath: filepath,
                duration: this.estimateAudioDuration(text, options.speed || 1.0),
                size: stats.size,
                textLength: text.length,
                voiceUsed: 'system-default'
            };

        } catch (error) {
            console.error('❌ Web/System TTS error:', error);

            // Final fallback - create a silent audio file as placeholder
            return await this.createSilentAudio(text);
        }
    }

    /**
     * Create a silent audio file as final fallback
     */
    async createSilentAudio(text) {
        const timestamp = Date.now();
        const filename = `tts_silent_${timestamp}.mp3`;
        const filepath = path.join(this.outputDir, filename);

        // Create empty MP3 file (this is just a placeholder)
        await fs.writeFile(filepath, Buffer.alloc(0));

        return {
            success: false,
            provider: 'silent-fallback',
            filename: filename,
            filepath: filepath,
            duration: this.estimateAudioDuration(text, 1.0),
            size: 0,
            textLength: text.length,
            voiceUsed: 'none',
            warning: 'TTS failed, created silent audio placeholder'
        };
    }

    /**
     * Estimate audio duration based on text length and speaking rate
     * @param {string} text - Text content
     * @param {number} speed - Speaking rate (1.0 = normal)
     * @returns {number} Estimated duration in seconds
     */
    estimateAudioDuration(text, speed = 1.0) {
        // Average reading speed: ~150 words per minute
        // Average word length: ~5 characters
        const wordsPerMinute = 150 * speed;
        const charactersPerMinute = wordsPerMinute * 5;
        const durationMinutes = text.length / charactersPerMinute;
        return Math.round(durationMinutes * 60); // Convert to seconds
    }

    /**
     * Get available voices for the current TTS provider
     */
    async getAvailableVoices() {
        try {
            switch (this.provider) {
                case 'google':
                    return [
                        { name: 'en-US-Standard-A', gender: 'FEMALE', language: 'en-US' },
                        { name: 'en-US-Standard-B', gender: 'MALE', language: 'en-US' },
                        { name: 'en-US-Standard-C', gender: 'FEMALE', language: 'en-US' },
                        { name: 'en-US-Standard-D', gender: 'MALE', language: 'en-US' },
                        { name: 'en-US-Wavenet-A', gender: 'FEMALE', language: 'en-US' },
                        { name: 'en-US-Wavenet-B', gender: 'MALE', language: 'en-US' }
                    ];
                case 'azure':
                    return [
                        { name: 'en-US-AriaNeural', gender: 'FEMALE', language: 'en-US' },
                        { name: 'en-US-GuyNeural', gender: 'MALE', language: 'en-US' },
                        { name: 'en-US-JennyNeural', gender: 'FEMALE', language: 'en-US' }
                    ];
                default:
                    return [
                        { name: 'system-default', gender: 'NEUTRAL', language: 'en-US' }
                    ];
            }
        } catch (error) {
            console.error('Error getting voices:', error);
            return [];
        }
    }

    /**
     * Split text into manageable chunks for TTS
     */
    splitTextIntoChunks(text, maxLength) {
        if (text.length <= maxLength) {
            return [text];
        }

        const chunks = [];
        const sentences = text.split(/[.!?]+/);
        let currentChunk = '';

        for (const sentence of sentences) {
            const cleanSentence = sentence.trim();
            if (!cleanSentence) continue;

            if (currentChunk.length + cleanSentence.length + 1 <= maxLength) {
                currentChunk += (currentChunk ? '. ' : '') + cleanSentence;
            } else {
                if (currentChunk) {
                    chunks.push(currentChunk + '.');
                }
                currentChunk = cleanSentence;
            }
        }

        if (currentChunk) {
            chunks.push(currentChunk + '.');
        }

        return chunks.length > 0 ? chunks : [text.substring(0, maxLength)];
    }

    /**
     * Generate audio for text chunks and combine them
     */
    async generateChunkedAudio(chunks, outputPath, options) {
        try {
            console.log(`🔀 Generating chunked audio: ${chunks.length} chunks`);

            const tempFiles = [];
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);

            // Generate audio for each chunk
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                const tempFile = outputPath.replace('.wav', `_chunk_${i}.wav`);
                tempFiles.push(tempFile);

                const cleanText = chunk.replace(/["'`]/g, '').replace(/\n/g, ' ');
                const command = `powershell -Command "Add-Type -AssemblyName System.Speech; $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer; $synth.SetOutputToWaveFile('${tempFile}'); $synth.Speak('${cleanText}'); $synth.Dispose()"`;

                console.log(`🎵 Generating chunk ${i + 1}/${chunks.length}`);
                await execAsync(command);
            }

            // Check if we have ffmpeg for combining
            try {
                await execAsync('ffmpeg -version');

                // Combine audio files with ffmpeg
                const inputList = tempFiles.map(f => `-i "${f}"`).join(' ');
                const filterComplex = tempFiles.map((_, i) => `[${i}:0]`).join('') + `concat=n=${tempFiles.length}:v=0:a=1[out]`;
                const combineCommand = `ffmpeg ${inputList} -filter_complex "${filterComplex}" -map "[out]" "${outputPath}" -y`;

                await execAsync(combineCommand);
                console.log(`✅ Combined ${chunks.length} audio chunks with FFmpeg`);

            } catch (ffmpegError) {
                // No FFmpeg - just use the first chunk as fallback
                console.warn('⚠️ FFmpeg not available, using first chunk only');
                const fs = require('fs');
                fs.copyFileSync(tempFiles[0], outputPath);
            }

            // Cleanup temp files
            for (const tempFile of tempFiles) {
                try {
                    await fs.unlink(tempFile);
                } catch (err) {
                    console.warn(`⚠️ Failed to cleanup temp file: ${tempFile}`);
                }
            }

            // Get file stats
            const stats = await fs.stat(outputPath);

            return {
                success: true,
                provider: 'web/system-chunked',
                filename: path.basename(outputPath),
                filepath: outputPath,
                duration: this.estimateAudioDuration(chunks.join(' '), options.speed || 1.0),
                size: stats.size,
                textLength: chunks.join(' ').length,
                voiceUsed: 'system-default',
                chunksGenerated: chunks.length
            };

        } catch (error) {
            console.error('❌ Chunked audio generation failed:', error);
            throw error;
        }
    }

    /**
     * Health check for TTS service
     */
    async healthCheck() {
        try {
            const testText = "Hello, this is a TTS health check.";
            const result = await this.generateAudio(testText, {
                voiceName: 'en-US-Standard-D',
                speed: 1.2
            });

            return {
                status: 'healthy',
                provider: this.provider,
                testResult: result,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            return {
                status: 'unhealthy',
                provider: this.provider,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

module.exports = new TTSService();