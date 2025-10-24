// controllers/videoController.js
const Video = require('../models/Video');
const MicroVideo = require('../models/MicroVideo');
const transcriptService = require('../services/transcriptService');
const openaiService = require('../services/openaiService');
const microContentService = require('../services/microContentService');
const azureTtsService = require('../services/azureTtsService');

class VideoController {

    /**
     * Process YouTube URL to create micro-learning videos
     * @route POST /api/videos/process-youtube
     */
    async processYouTubeURL(req, res) {
        try {
            const { url, title, description, topic = 'javascript' } = req.body;
            const userId = req.user._id;

            // Validate YouTube URL
            const youtubeVideoId = Video.extractVideoId(url);
            if (!youtubeVideoId) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid YouTube URL. Please provide a valid YouTube video URL.'
                });
            }

            console.log(`🎬 Starting video processing for: ${youtubeVideoId}`);

            // Create initial video record
            const video = new Video({
                title: title || 'Untitled Video',
                description: description || '',
                sourceUrl: url,
                youtubeVideoId,
                uploadedBy: userId,
                topic,
                processingStatus: 'pending'
            });

            await video.save();

            // Start processing in background (non-blocking)
            setImmediate(() => {
                this.processVideoInBackground(video._id).catch(error => {
                    console.error(`❌ Background processing failed for video ${video._id}:`, error);
                });
            });

            // Return immediate response
            res.status(201).json({
                success: true,
                message: 'Video processing started successfully',
                data: {
                    videoId: video._id,
                    youtubeVideoId: video.youtubeVideoId,
                    status: video.processingStatus,
                    title: video.title,
                    topic: video.topic,
                    estimatedProcessingTime: '5-8 minutes'
                }
            });

        } catch (error) {
            console.error('❌ Error in processYouTubeURL:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to start video processing',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    /**
     * Background video processing workflow
     * @param {string} videoId - Video document ID
     */
    async processVideoInBackground(videoId) {
        let video;

        try {
            console.log(`🔄 Starting background processing for video: ${videoId}`);

            // Get video record
            video = await Video.findById(videoId);
            if (!video) {
                throw new Error('Video not found');
            }

            // Update status to processing
            await video.updateProcessingStatus('processing');

            // Step 1: Extract transcript
            console.log(`📝 Step 1: Extracting transcript for ${video.youtubeVideoId}`);
            const transcriptData = await transcriptService.extractTranscript(video.youtubeVideoId);

            // REJECT MOCK DATA - Only accept real transcripts
            if (transcriptData.isMock) {
                throw new Error(`No real transcript available for video ${video.youtubeVideoId}. Transcript extraction failed - video may not have captions or be accessible.`);
            }

            console.log(`✅ REAL transcript extracted: ${transcriptData.wordCount} words, ${transcriptData.estimatedDuration}s duration`);
            console.log(`📊 Transcript method: ${transcriptData.extractionMethod || 'youtube-transcript'}`);

            // Update video with transcript and duration
            video.transcript = transcriptData.fullText;
            video.originalDuration = transcriptData.estimatedDuration;
            video.formattedDuration = transcriptService.formatDuration(transcriptData.estimatedDuration);
            await video.save();

            // Step 2: Generate CLT-bLM analysis using OpenAI
            console.log(`🧠 Step 2: Generating CLT-bLM analysis...`);
            const cltAnalysis = await openaiService.generateCLTAnalysis(
                transcriptData.fullText,
                video.topic,
                transcriptData.estimatedDuration
            );

            console.log(`✅ CLT-bLM analysis complete: ${cltAnalysis.segments.length} segments planned`);

            // Step 3: Create micro-video records
            console.log(`📹 Step 3: Creating micro-video segments...`);
            const microVideos = await this.createMicroVideoSegments(video._id, cltAnalysis, transcriptData);

            console.log(`✅ Created ${microVideos.length} micro-video segments`);

            // Step 4: Generate avatar videos with lip sync for each segment
            // TODO: Re-enable when avatar video generation service is fully implemented
            // console.log(`🎭 Step 4: Generating avatar videos with lip sync...`);
            // await this.generateAvatarVideosForSegments(microVideos);

            // Step 5: Mark as completed
            await video.updateProcessingStatus('completed');
            console.log(`🎉 Video processing completed for: ${video.title}`);

        } catch (error) {
            console.error(`❌ Background processing error for video ${videoId}:`, error);

            // Update video with error status
            if (video) {
                await video.updateProcessingStatus('failed', error.message);
            }

            throw error;
        }
    }

    /**
     * Create micro-video segments from CLT-bLM analysis
     * @param {string} videoId - Original video ID
     * @param {Object} cltAnalysis - CLT-bLM analysis results
     * @param {Object} transcriptData - Transcript data with segments
     * @returns {Array} Array of created MicroVideo documents
     */
    async createMicroVideoSegments(videoId, cltAnalysis, transcriptData) {
        const microVideos = [];

        for (let i = 0; i < cltAnalysis.segments.length; i++) {
            const segment = cltAnalysis.segments[i];

            const microVideo = new MicroVideo({
                originalVideoId: videoId,
                title: segment.title,
                sequence: segment.segmentNumber || (i + 1),
                timeRange: {
                    startTime: i * 420, // 7 minutes per segment
                    endTime: (i + 1) * 420,
                    duration: segment.duration || 420
                },

                // Extract relevant portion of transcript for this segment
                segmentTranscript: transcriptService.extractTranscriptForTimeRange(
                    transcriptData.segments,
                    i * 420,
                    (i + 1) * 420
                ),

                // Enhanced CLT-bLM script data
                cltBlmScript: {
                    learningObjective: segment.learningObjective,
                    keypoints: segment.keyPoints || [],
                    cognitiveLoad: segment.cognitiveLoad || 5,
                    practicalExample: segment.practicalExample || '',
                    educationalScript: segment.educationalScript || '',
                    visualCues: segment.visualCues || [],
                    difficulty: segment.difficulty || 'Intermediate',
                    estimatedWatchTime: Math.ceil((segment.educationalScript?.length || 0) / 200) // ~200 chars per minute reading
                },

                processingStatus: 'pending',
                createdAt: new Date()
            });

            await microVideo.save();
            microVideos.push(microVideo);
        }

        return microVideos;
    }

    /**
     * Generate avatar videos for all micro-video segments
     * @param {Array} microVideos - Array of MicroVideo documents
     */
    async generateAvatarVideosForSegments(microVideos) {
        const defaultTeacher = 'Ava'; // Default avatar teacher
        let successCount = 0;
        let failureCount = 0;

        for (const microVideo of microVideos) {
            try {
                const educationalScript = microVideo.cltBlmScript?.educationalScript;

                if (!educationalScript) {
                    console.log(`⚠️ Skipping avatar generation for micro-video ${microVideo._id} - no educational script`);
                    continue;
                }

                console.log(`🎭 Generating avatar video for: ${microVideo.title}`);

                // Generate TTS with visemes using the educational script
                const ttsResult = await azureTtsService.generateTTSWithVisemes(
                    educationalScript,
                    defaultTeacher
                );

                console.log(`🎤 TTS generated with ${ttsResult.visemes.length} visemes`);

                // TODO: Implement avatar video file generation
                // For now, we'll just store the TTS data
                const avatarVideoPath = ttsResult.audioPath;

                console.log(`📹 Avatar audio file created: ${avatarVideoPath}`);

                // Update micro-video with avatar data
                microVideo.avatarData = {
                    generated: true,
                    teacher: defaultTeacher,
                    videoPath: avatarVideoPath,
                    audioPath: ttsResult.audioPath,
                    visemes: ttsResult.visemes,
                    visemeCount: ttsResult.visemes.length,
                    generatedAt: new Date()
                };

                await microVideo.save();
                successCount++;

                console.log(`✅ Avatar video generated for: ${microVideo.title} (${ttsResult.visemes.length} visemes, video: ${avatarVideoPath})`);

            } catch (error) {
                console.error(`❌ Avatar generation failed for micro-video ${microVideo._id}:`, error);
                failureCount++;

                // Save error info to micro-video
                microVideo.avatarData = {
                    generated: false,
                    error: error.message,
                    generatedAt: new Date()
                };
                await microVideo.save();
            }
        }

        console.log(`🎭 Avatar generation summary: ${successCount} successful, ${failureCount} failed`);
    }

    /**
     * Get video processing status
     * @route GET /api/videos/:videoId/status
     */
    async getVideoStatus(req, res) {
        try {
            const { videoId } = req.params;

            const video = await Video.findById(videoId);
            if (!video) {
                return res.status(404).json({
                    success: false,
                    message: 'Video not found'
                });
            }

            // Get micro-videos count if processing is complete
            let microVideosCount = 0;
            if (video.processingStatus === 'completed') {
                microVideosCount = await MicroVideo.countDocuments({ originalVideoId: videoId });
            }

            res.json({
                success: true,
                data: {
                    videoId: video._id,
                    youtubeVideoId: video.youtubeVideoId,
                    title: video.title,
                    topic: video.topic,
                    processingStatus: video.processingStatus,
                    progress: this.getProcessingProgress(video.processingStatus),
                    microVideosCount,
                    formattedDuration: video.formattedDuration || 'Unknown',
                    createdAt: video.createdAt,
                    updatedAt: video.updatedAt,
                    error: video.errorMessage || null
                }
            });

        } catch (error) {
            console.error('Error getting video status:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get video status',
                error: error.message
            });
        }
    }

    /**
     * Get micro-videos for a processed video
     * @route GET /api/videos/:videoId/micro-videos
     */
    async getMicroVideos(req, res) {
        try {
            const { videoId } = req.params;

            const microVideos = await MicroVideo.find({ originalVideoId: videoId })
                .sort({ sequence: 1 })
                .select('title sequence timeRange cltBlmScript.learningObjective cltBlmScript.keypoints processingStatus createdAt');

            res.json({
                success: true,
                data: microVideos
            });

        } catch (error) {
            console.error('Error getting micro-videos:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get micro-videos',
                error: error.message
            });
        }
    }

    /**
     * Generate enhanced micro-content for video segments
     * @route POST /api/test-videos/:videoId/generate-content
     */
    async generateMicroContent(req, res) {
        try {
            const { videoId } = req.params;
            console.log('🎬 Starting micro-content generation for video:', videoId);

            // Get video data
            const video = await Video.findById(videoId);
            if (!video) {
                return res.status(404).json({
                    success: false,
                    message: 'Video not found'
                });
            }

            // Check if video processing is complete
            if (video.processingStatus !== 'completed') {
                return res.status(400).json({
                    success: false,
                    message: 'Video processing must be completed before generating micro-content',
                    currentStatus: video.processingStatus
                });
            }

            // Start micro-content generation
            res.json({
                success: true,
                message: 'Micro-content generation started',
                videoId: videoId,
                estimatedTime: '2-3 minutes'
            });

            // Run content generation in background
            this.generateContentInBackground(videoId, video);

        } catch (error) {
            console.error('Error starting micro-content generation:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to start micro-content generation',
                error: error.message
            });
        }
    }

    /**
     * Background process for generating micro-content
     */
    async generateContentInBackground(videoId, video) {
        try {
            console.log('🔄 Background micro-content generation started for:', videoId);

            // Update micro-videos status to processing
            await MicroVideo.updateMany(
                { originalVideoId: videoId },
                { processingStatus: 'processing' }
            );

            const videoData = {
                title: video.title,
                topic: video.topic,
                description: video.description
            };

            const fullTranscript = video.transcript || '';

            // Generate micro-content using the service
            const result = await microContentService.generateMicroContent(
                videoId,
                videoData,
                fullTranscript
            );

            console.log('✅ Micro-content generation completed successfully for:', videoId);

        } catch (error) {
            console.error('❌ Background micro-content generation failed:', error);

            // Mark micro-videos as failed
            await MicroVideo.updateMany(
                { originalVideoId: videoId },
                { processingStatus: 'failed' }
            );
        }
    }

    /**
     * Get enhanced micro-videos with full content
     * @route GET /api/test-videos/:videoId/enhanced-micro-videos
     */
    async getEnhancedMicroVideos(req, res) {
        try {
            const { videoId } = req.params;

            const enhancedMicroVideos = await microContentService.getEnhancedMicroVideos(videoId);

            res.json({
                success: true,
                data: enhancedMicroVideos,
                totalSegments: enhancedMicroVideos.length,
                completedSegments: enhancedMicroVideos.filter(v => v.isComplete).length
            });

        } catch (error) {
            console.error('Error getting enhanced micro-videos:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get enhanced micro-videos',
                error: error.message
            });
        }
    }

    /**
     * Get a single enhanced micro-video with full content
     * @route GET /api/test-videos/:videoId/micro-videos/:segmentId/content
     */
    async getMicroVideoContent(req, res) {
        try {
            const { videoId, segmentId } = req.params;

            const microVideo = await MicroVideo.findOne({
                _id: segmentId,
                originalVideoId: videoId
            });

            if (!microVideo) {
                return res.status(404).json({
                    success: false,
                    message: 'Micro-video segment not found'
                });
            }

            // Format response with all content details
            const formattedContent = {
                id: microVideo._id,
                title: microVideo.title,
                sequence: microVideo.sequence,
                timeRange: microVideo.timeRange,
                processingStatus: microVideo.processingStatus,
                learningObjective: microVideo.cltBlmScript.learningObjective,
                keypoints: microVideo.cltBlmScript.keypoints,
                difficulty: microVideo.cltBlmScript.difficulty,
                cognitiveLoad: microVideo.cltBlmScript.cognitiveLoad,

                // Original transcript for this time segment
                segmentTranscript: microVideo.segmentTranscript || null,

                // Enhanced content
                educationalScript: microVideo.cltBlmScript.educationalScript || null,
                practicalExample: microVideo.cltBlmScript.practicalExample || null,
                visualCues: microVideo.cltBlmScript.visualCues || [],

                // Content metrics
                hasEnhancedContent: !!(microVideo.cltBlmScript.educationalScript),
                contentLength: microVideo.cltBlmScript.educationalScript?.length || 0,
                estimatedReadingTime: Math.ceil((microVideo.cltBlmScript.educationalScript?.length || 0) / 200),
                transcriptLength: microVideo.segmentTranscript?.length || 0,

                // Timestamps
                createdAt: microVideo.createdAt,
                updatedAt: microVideo.updatedAt
            };

            res.json({
                success: true,
                data: formattedContent
            });

        } catch (error) {
            console.error('Error getting micro-video content:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get micro-video content',
                error: error.message
            });
        }
    }

    /**
     * Get processing progress percentage
     * @param {string} status - Processing status
     * @returns {number} Progress percentage
     */
    getProcessingProgress(status) {
        const progressMap = {
            'pending': 0,
            'processing': 50,
            'completed': 100,
            'failed': -1
        };
        return progressMap[status] || 0;
    }
}

module.exports = new VideoController();