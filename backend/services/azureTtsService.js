const sdk = require("microsoft-cognitiveservices-speech-sdk");
const fs = require('fs');
const path = require('path');

class AzureTTSService {
  constructor() {
    this.speechKey = process.env.AZURE_SPEECH_KEY;
    this.speechRegion = process.env.AZURE_SPEECH_REGION;
    this.audioOutputDir = process.env.AUDIO_OUTPUT_DIR || './generated-audio';

    this.initializeService();
  }

  initializeService() {
    if (!this.speechKey || !this.speechRegion) {
      console.warn('⚠️ Azure Speech credentials not found. TTS with visemes will not be available.');
      this.isConfigured = false;
      return;
    }

    this.isConfigured = true;
    console.log('✅ Azure TTS Service initialized');
  }

  async generateTTSWithVisemes(text, teacher = "Ava", speechRate = 0.9) {
    if (!this.isConfigured) {
      throw new Error('Azure Speech SDK not configured. Please set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION in .env');
    }

    if (!text || typeof text !== 'string') {
      throw new Error('Text is required and must be a string');
    }

    console.log(`🎤 Generating Azure TTS for teacher: ${teacher} with speech rate: ${speechRate}`);

    try {
      // Create a fresh speech config for each request to avoid state issues
      const speechConfig = sdk.SpeechConfig.fromSubscription(this.speechKey, this.speechRegion);
      speechConfig.speechSynthesisVoiceName = `en-US-${teacher}Neural`;

      // Set audio format to WAV PCM 16kHz
      speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;

      // Create SSML with speech rate for better control
      const ssml = `
        <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"
               xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="en-US">
            <voice name="en-US-${teacher}Neural">
                <prosody rate="${speechRate}">
                    ${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
                </prosody>
            </voice>
        </speak>
      `;

      const speechSynthesizer = new sdk.SpeechSynthesizer(speechConfig);
      const visemes = [];

      // Collect visemes for lip-sync
      speechSynthesizer.visemeReceived = function (s, e) {
        visemes.push([e.audioOffset / 10000, e.visemeId]);
      };

      const result = await new Promise((resolve, reject) => {
        speechSynthesizer.speakSsmlAsync(
          ssml,
          (result) => {
            speechSynthesizer.close();
            resolve(result);
          },
          (error) => {
            console.error('❌ Azure TTS Synthesis Error:', error);
            speechSynthesizer.close();
            reject(error);
          }
        );
      });

      // Check result status
      if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
        const { audioData } = result;

        if (!audioData || audioData.byteLength === 0) {
          throw new Error('No audio data received from Azure TTS');
        }

        // Save audio to file
        const timestamp = Date.now();
        const audioFilename = `tts_web_${timestamp}.wav`;
        const audioPath = path.join(this.audioOutputDir, audioFilename);

        // Ensure directory exists
        if (!fs.existsSync(this.audioOutputDir)) {
          fs.mkdirSync(this.audioOutputDir, { recursive: true });
        }

        // Write audio data to file
        fs.writeFileSync(audioPath, Buffer.from(audioData));

        // Calculate estimated duration (rough estimate based on text length and speech rate)
        const estimatedDuration = Math.ceil((text.length / 15) / speechRate);

        console.log(`✅ Azure TTS generated: ${visemes.length} visemes, ${estimatedDuration}s estimated duration`);
        console.log(`💾 Audio saved: ${audioPath}`);

        return {
          audioPath: audioPath,
          audioBase64: Buffer.from(audioData).toString('base64'),
          visemes,
          duration: estimatedDuration,
          provider: 'azure-neural',
          voiceUsed: `en-US-${teacher}Neural`,
          textLength: text.length,
          speechRate
        };

      } else if (result.reason === sdk.ResultReason.Canceled) {
        const cancellation = sdk.CancellationDetails.fromResult(result);
        let errorMessage = `Speech synthesis was canceled: ${cancellation.reason}`;

        if (cancellation.reason === sdk.CancellationReason.Error) {
          errorMessage += `. Error: ${cancellation.errorDetails}`;
          console.error(`❌ Azure TTS Cancellation Error: ${cancellation.errorDetails}`);
        }

        throw new Error(errorMessage);
      } else {
        throw new Error(`Speech synthesis failed. Reason: ${result.reason} (${sdk.ResultReason[result.reason]})`);
      }

    } catch (error) {
      console.error('❌ Azure TTS Error:', error.message);
      throw error;
    }
  }

  // Helper method to get available voices
  getAvailableVoices() {
    return ['Ava', 'Andrew', 'Emma', 'Brian', 'Jenny', 'Guy', 'Aria', 'Davis'];
  }

  /**
   * Validate voice name
   * @param {string} teacher - Voice name to validate
   * @returns {boolean} True if valid
   */
  isValidVoice(teacher) {
    return this.getAvailableVoices().includes(teacher);
  }

  /**
   * Generate TTS for multiple segments (for micro-videos)
   * @param {Array} segments - Array of {text, teacher, speechRate} objects
   * @returns {Array} Array of TTS results
   */
  async generateTTSForSegments(segments) {
    const results = [];

    for (const segment of segments) {
      try {
        const ttsResult = await this.generateTTSWithVisemes(
          segment.text,
          segment.teacher || 'Ava',
          segment.speechRate || 0.9
        );

        results.push({
          ...ttsResult,
          segmentIndex: segment.index || results.length,
          success: true
        });
      } catch (error) {
        console.error(`❌ TTS failed for segment ${segment.index || results.length}:`, error);
        results.push({
          segmentIndex: segment.index || results.length,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  isAvailable() {
    return this.isConfigured;
  }
}

module.exports = new AzureTTSService();