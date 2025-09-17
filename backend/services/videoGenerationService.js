// services/videoGenerationService.js - Video generation service for micro-learning content
const fs = require('fs').promises;
const path = require('path');
const { createCanvas, loadImage, registerFont } = require('canvas');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class VideoGenerationService {
    constructor() {
        this.outputDir = process.env.VIDEO_OUTPUT_DIR || './generated-videos';
        this.tempDir = process.env.TMP_DIR || './tmp';
        this.framesDir = path.join(this.tempDir, 'frames');

        // Video settings
        this.defaultSettings = {
            width: 1280,
            height: 720,
            fps: 30,
            quality: 'high', // high, medium, low
            format: 'mp4'
        };

        this.initializeDirectories();
    }

    /**
     * Initialize required directories
     */
    async initializeDirectories() {
        try {
            await fs.mkdir(this.outputDir, { recursive: true });
            await fs.mkdir(this.tempDir, { recursive: true });
            await fs.mkdir(this.framesDir, { recursive: true });
            console.log(`✅ Video generation directories initialized`);
        } catch (error) {
            console.error('❌ Error creating video directories:', error);
        }
    }

    /**
     * Check if FFmpeg is available
     */
    async checkFFmpegAvailability() {
        try {
            await execAsync('ffmpeg -version');
            return { available: true, version: 'installed' };
        } catch (error) {
            return {
                available: false,
                error: 'FFmpeg not found. Please install FFmpeg for video generation.',
                installInstructions: {
                    windows: 'Download from https://ffmpeg.org/download.html or use: winget install ffmpeg',
                    linux: 'sudo apt-get install ffmpeg',
                    mac: 'brew install ffmpeg'
                }
            };
        }
    }

    /**
     * Generate video from micro-video segment data
     * @param {Object} microVideo - MicroVideo document
     * @param {Object} options - Video generation options
     */
    async generateVideo(microVideo, options = {}) {
        try {
            console.log(`🎬 Starting video generation for: "${microVideo.title}"`);

            const settings = { ...this.defaultSettings, ...options };
            const timestamp = Date.now();
            const videoId = `micro_${microVideo.sequence}_${timestamp}`;

            // Check FFmpeg availability
            const ffmpegCheck = await this.checkFFmpegAvailability();
            if (!ffmpegCheck.available) {
                console.warn('⚠️ FFmpeg not available, creating slide-based video');
                return await this.generateSlideBasedVideo(microVideo, settings, videoId);
            }

            // Step 1: Generate visual frames
            const frameData = await this.generateFrames(microVideo, settings, videoId);

            // Step 2: Combine with audio using FFmpeg
            const videoResult = await this.combineWithAudio(frameData, microVideo, settings, videoId);

            // Step 3: Cleanup temporary files
            await this.cleanupTempFiles(frameData.frameDir);

            console.log(`✅ Video generated successfully: ${videoResult.filename}`);
            return videoResult;

        } catch (error) {
            console.error('❌ Video generation failed:', error);
            throw error;
        }
    }

    /**
     * Generate visual frames for the video
     */
    async generateFrames(microVideo, settings, videoId) {
        try {
            console.log(`📸 Generating frames for: ${microVideo.title}`);

            const frameDir = path.join(this.framesDir, videoId);
            await fs.mkdir(frameDir, { recursive: true });

            const canvas = createCanvas(settings.width, settings.height);
            const ctx = canvas.getContext('2d');

            // Calculate frame count based on audio duration
            const audioDuration = microVideo.audioDuration || 30; // seconds
            const totalFrames = Math.ceil(audioDuration * settings.fps);

            // Generate educational content frames
            const frames = await this.createEducationalFrames(ctx, microVideo, settings, totalFrames);

            // Save frames to disk
            for (let i = 0; i < frames.length; i++) {
                const filename = path.join(frameDir, `frame_${String(i).padStart(6, '0')}.png`);
                const buffer = frames[i].toBuffer('image/png');
                await fs.writeFile(filename, buffer);
            }

            console.log(`✅ Generated ${frames.length} frames`);

            return {
                frameDir,
                frameCount: frames.length,
                duration: audioDuration,
                fps: settings.fps
            };

        } catch (error) {
            console.error('❌ Frame generation failed:', error);
            throw error;
        }
    }

    /**
     * Create educational frames with CLT-bLM phases: Prepare → Initiate → Deliver → End
     */
    async createEducationalFrames(ctx, microVideo, settings, totalFrames) {
        const frames = [];
        const { width, height } = settings;

        // Parse educational script for CLT-bLM phases
        const phases = this.parseCLTbLMPhases(microVideo.cltBlmScript);

        // Calculate frame distribution for each phase
        const phaseFrameDistribution = this.calculatePhaseFrames(phases, totalFrames);

        // Generate frames for each CLT-bLM phase
        const allPhaseFrames = [];

        // Phase 1: PREPARE (10% of video) - Activate prior knowledge
        if (phases.prepare) {
            const prepareFrames = await this.createPreparePhaseFrames(ctx, phases.prepare, microVideo.title, phaseFrameDistribution.prepare, width, height);
            allPhaseFrames.push(...prepareFrames);
        }

        // Phase 2: INITIATE (15% of video) - Learning objectives + analogy
        if (phases.initiate) {
            const initiateFrames = await this.createInitiatePhaseFrames(ctx, phases.initiate, microVideo.cltBlmScript.learningObjective, phaseFrameDistribution.initiate, width, height);
            allPhaseFrames.push(...initiateFrames);
        }

        // Phase 3: DELIVER (60% of video) - Core educational content
        if (phases.deliver) {
            const deliverFrames = await this.createDeliverPhaseFrames(ctx, phases.deliver, microVideo.cltBlmScript.keypoints, phaseFrameDistribution.deliver, width, height);
            allPhaseFrames.push(...deliverFrames);
        }

        // Phase 4: END (15% of video) - Recap + reflections
        if (phases.end) {
            const endFrames = await this.createEndPhaseFrames(ctx, phases.end, microVideo.title, phaseFrameDistribution.end, width, height);
            allPhaseFrames.push(...endFrames);
        }

        console.log(`📝 Generated ${allPhaseFrames.length} CLT-bLM structured frames (${phaseFrameDistribution.prepare}+${phaseFrameDistribution.initiate}+${phaseFrameDistribution.deliver}+${phaseFrameDistribution.end})`);
        return allPhaseFrames;
    }

    /**
     * Parse educational script into CLT-bLM phases
     */
    parseCLTbLMPhases(cltBlmScript) {
        try {
            // Check if educationalScript is JSON string
            let scriptContent = cltBlmScript.educationalScript;
            if (typeof scriptContent === 'string' && scriptContent.includes('"educationalScript"')) {
                // Parse the JSON string
                const parsed = JSON.parse(scriptContent);
                return {
                    prepare: parsed.engagementHooks?.opening || "Welcome to this educational segment where we'll explore key concepts together.",
                    initiate: `Learning Objective: ${cltBlmScript.learningObjective}`,
                    deliver: parsed.educationalScript || scriptContent,
                    end: parsed.engagementHooks?.closing || "Let's recap what we've learned in this segment."
                };
            } else {
                // Split the script into natural phases
                return {
                    prepare: "Welcome to this educational segment where we'll explore key concepts together.",
                    initiate: `Learning Objective: ${cltBlmScript.learningObjective}`,
                    deliver: scriptContent || "Content delivery phase",
                    end: "Let's recap what we've learned in this segment."
                };
            }
        } catch (error) {
            console.warn('⚠️ Could not parse CLT-bLM phases, using defaults');
            return {
                prepare: "Welcome to this educational segment.",
                initiate: cltBlmScript.learningObjective || "Learning new concepts",
                deliver: cltBlmScript.educationalScript || "Educational content",
                end: "Thank you for watching this segment."
            };
        }
    }

    /**
     * Calculate frame distribution across CLT-bLM phases
     */
    calculatePhaseFrames(phases, totalFrames) {
        return {
            prepare: Math.floor(totalFrames * 0.10),   // 10% - Preparation
            initiate: Math.floor(totalFrames * 0.15),  // 15% - Initiation
            deliver: Math.floor(totalFrames * 0.60),   // 60% - Core delivery
            end: Math.floor(totalFrames * 0.15)        // 15% - Conclusion
        };
    }

    /**
     * Create PREPARE phase frames - Activate prior knowledge
     */
    async createPreparePhaseFrames(ctx, prepareText, title, frameCount, width, height) {
        const frames = [];

        for (let i = 0; i < frameCount; i++) {
            // Clear canvas
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(0, 0, width, height);

            // Add title
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(title, width / 2, height * 0.3);

            // Add prepare text
            ctx.font = '32px Arial';
            ctx.fillStyle = '#e94560';
            const maxWidth = width * 0.8;
            this.wrapText(ctx, prepareText, width / 2, height * 0.6, maxWidth, 40);

            // Add animation effect
            const progress = i / frameCount;
            const opacity = Math.sin(progress * Math.PI) * 0.3 + 0.7;
            ctx.globalAlpha = opacity;

            frames.push(createCanvas(width, height).getContext('2d').canvas);
            frames[frames.length - 1].getContext('2d').drawImage(ctx.canvas, 0, 0);

            ctx.globalAlpha = 1.0;
        }

        return frames;
    }

    /**
     * Create INITIATE phase frames - Learning objectives + setup
     */
    async createInitiatePhaseFrames(ctx, initiateText, objective, frameCount, width, height) {
        const frames = [];

        for (let i = 0; i < frameCount; i++) {
            // Clear canvas with gradient background
            const gradient = ctx.createLinearGradient(0, 0, 0, height);
            gradient.addColorStop(0, '#16213e');
            gradient.addColorStop(1, '#1a1a2e');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);

            // Title: "Learning Objectives"
            ctx.fillStyle = '#f39c12';
            ctx.font = 'bold 42px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Learning Objectives', width / 2, height * 0.25);

            // Main objective
            ctx.fillStyle = '#ffffff';
            ctx.font = '36px Arial';
            const maxWidth = width * 0.8;
            this.wrapText(ctx, objective, width / 2, height * 0.5, maxWidth, 44);

            frames.push(createCanvas(width, height).getContext('2d').canvas);
            frames[frames.length - 1].getContext('2d').drawImage(ctx.canvas, 0, 0);
        }

        return frames;
    }

    /**
     * Create DELIVER phase frames - Core educational content with key points
     */
    async createDeliverPhaseFrames(ctx, deliverText, keypoints, frameCount, width, height) {
        const frames = [];
        const pointsPerSection = Math.ceil(frameCount / Math.max(keypoints.length, 1));

        for (let i = 0; i < frameCount; i++) {
            // Clear canvas
            ctx.fillStyle = '#0f3460';
            ctx.fillRect(0, 0, width, height);

            // Current key point index
            const currentPointIndex = Math.floor(i / pointsPerSection);
            const currentPoint = keypoints[currentPointIndex] || keypoints[0] || "Key concept";

            // Title
            ctx.fillStyle = '#16a085';
            ctx.font = 'bold 36px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`Key Point ${currentPointIndex + 1}`, width / 2, height * 0.2);

            // Current key point
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 32px Arial';
            const maxWidth = width * 0.85;
            this.wrapText(ctx, currentPoint, width / 2, height * 0.4, maxWidth, 40);

            // Progress indicator
            const progress = (i + 1) / frameCount;
            ctx.fillStyle = '#e74c3c';
            ctx.fillRect(50, height - 50, (width - 100) * progress, 8);

            frames.push(createCanvas(width, height).getContext('2d').canvas);
            frames[frames.length - 1].getContext('2d').drawImage(ctx.canvas, 0, 0);
        }

        return frames;
    }

    /**
     * Create END phase frames - Recap and reflections
     */
    async createEndPhaseFrames(ctx, endText, title, frameCount, width, height) {
        const frames = [];

        for (let i = 0; i < frameCount; i++) {
            // Clear canvas with summary background
            const gradient = ctx.createLinearGradient(0, 0, width, height);
            gradient.addColorStop(0, '#2c3e50');
            gradient.addColorStop(1, '#34495e');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);

            // "Summary" title
            ctx.fillStyle = '#f1c40f';
            ctx.font = 'bold 44px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Summary', width / 2, height * 0.25);

            // Recap text
            ctx.fillStyle = '#ecf0f1';
            ctx.font = '30px Arial';
            const maxWidth = width * 0.8;
            this.wrapText(ctx, endText, width / 2, height * 0.5, maxWidth, 36);

            // "Thank you" message
            ctx.fillStyle = '#e67e22';
            ctx.font = 'bold 28px Arial';
            ctx.fillText('Thank you for watching!', width / 2, height * 0.85);

            frames.push(createCanvas(width, height).getContext('2d').canvas);
            frames[frames.length - 1].getContext('2d').drawImage(ctx.canvas, 0, 0);
        }

        return frames;
    }

    /**
     * Utility function to wrap text within specified width
     */
    wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let line = '';
        let currentY = y;

        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;

            if (testWidth > maxWidth && n > 0) {
                ctx.fillText(line, x, currentY);
                line = words[n] + ' ';
                currentY += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, x, currentY);
    }

    /**
     * Combine frames with audio using FFmpeg
     */
    async combineWithAudio(frameData, microVideo, settings, videoId) {
        try {
            console.log(`🎵 Combining frames with audio for: ${microVideo.title}`);

            const outputFilename = `${videoId}_complete.mp4`;
            const outputPath = path.join(this.outputDir, outputFilename);

            // Audio file path
            const audioPath = microVideo.audioFilename ?
                path.join('./generated-audio', microVideo.audioFilename) : null;

            if (!audioPath || !(await this.fileExists(audioPath))) {
                console.warn('⚠️ No audio file found, creating silent video');
                return await this.createSilentVideo(frameData, outputPath, settings);
            }

            // FFmpeg command to combine frames with audio
            const framePattern = path.join(frameData.frameDir, 'frame_%06d.png');
            const command = `ffmpeg -y -r ${frameData.fps} -i "${framePattern}" -i "${audioPath}" -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k -shortest "${outputPath}"`;

            console.log('🔧 Running FFmpeg command:', command);
            await execAsync(command);

            // Get file stats
            const stats = await fs.stat(outputPath);

            return {
                success: true,
                filename: outputFilename,
                path: outputPath,
                fileSize: stats.size,
                duration: frameData.duration,
                hasAudio: true,
                specs: {
                    resolution: `${settings.width}x${settings.height}`,
                    fps: settings.fps,
                    format: 'mp4'
                }
            };

        } catch (error) {
            console.error('❌ Audio-video combination failed:', error);
            throw error;
        }
    }

    /**
     * Create silent video when no audio is available
     */
    async createSilentVideo(frameData, outputPath, settings) {
        try {
            const framePattern = path.join(frameData.frameDir, 'frame_%06d.png');
            const command = `ffmpeg -y -r ${frameData.fps} -i "${framePattern}" -c:v libx264 -preset fast -crf 23 -t ${frameData.duration} "${outputPath}"`;

            await execAsync(command);

            const stats = await fs.stat(outputPath);

            return {
                success: true,
                filename: path.basename(outputPath),
                path: outputPath,
                fileSize: stats.size,
                duration: frameData.duration,
                hasAudio: false,
                specs: {
                    resolution: `${settings.width}x${settings.height}`,
                    fps: settings.fps,
                    format: 'mp4'
                }
            };

        } catch (error) {
            console.error('❌ Silent video creation failed:', error);
            throw error;
        }
    }

    /**
     * Fallback method for environments without FFmpeg
     */
    async generateSlideBasedVideo(microVideo, settings, videoId) {
        try {
            console.log('📸 Creating slide-based video (FFmpeg not available)');

            const canvas = createCanvas(settings.width, settings.height);
            const ctx = canvas.getContext('2d');

            // Create a single enhanced slide
            await this.createEnhancedSlide(ctx, microVideo, settings);

            // Save as PNG
            const filename = `${videoId}_slide.png`;
            const outputPath = path.join(this.outputDir, filename);
            const buffer = canvas.toBuffer('image/png');
            await fs.writeFile(outputPath, buffer);

            const stats = await fs.stat(outputPath);

            return {
                success: true,
                filename: filename,
                path: outputPath,
                fileSize: stats.size,
                duration: 0,
                isImageOnly: true,
                hasAudio: false,
                specs: {
                    resolution: `${settings.width}x${settings.height}`,
                    format: 'png'
                }
            };

        } catch (error) {
            console.error('❌ Slide creation failed:', error);
            throw error;
        }
    }

    /**
     * Create an enhanced educational slide
     */
    async createEnhancedSlide(ctx, microVideo, settings) {
        const { width, height } = settings;

        // Background gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#16213e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 42px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(microVideo.title, width / 2, 100);

        // Learning objective
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 28px Arial';
        ctx.fillText('Learning Objective:', width / 2, 180);

        ctx.fillStyle = '#ffffff';
        ctx.font = '24px Arial';
        const objective = microVideo.cltBlmScript?.learningObjective || 'Educational content';
        this.wrapText(ctx, objective, width / 2, 220, width * 0.8, 30);

        // Key points
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 28px Arial';
        ctx.fillText('Key Points:', width / 2, 350);

        const keypoints = microVideo.cltBlmScript?.keypoints || [];
        let yPos = 390;
        keypoints.slice(0, 3).forEach((point, index) => {
            ctx.fillStyle = '#ffffff';
            ctx.font = '22px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(`${index + 1}. ${point}`, 100, yPos);
            yPos += 40;
        });

        // Difficulty level
        ctx.fillStyle = '#e74c3c';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        const difficulty = microVideo.cltBlmScript?.difficulty || 'Beginner';
        ctx.fillText(`Difficulty: ${difficulty}`, width / 2, height - 50);
    }

    /**
     * Helper method to check if file exists
     */
    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Clean up temporary files
     */
    async cleanupTempFiles(frameDir) {
        try {
            await fs.rmdir(frameDir, { recursive: true });
            console.log('🧹 Cleaned up temporary frames');
        } catch (error) {
            console.warn('⚠️ Could not clean up temporary files:', error.message);
        }
    }
}

module.exports = new VideoGenerationService();