// controllers/videoController.js
const Video = require('../models/Video');
const MicroVideo = require('../models/MicroVideo');
const transcriptService = require('../services/transcriptService');
const openaiService = require('../services/openaiService');

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

            // Update video with transcript and duration
            video.transcript = transcriptData.fullText;
            video.originalDuration = transcriptData.estimatedDuration;
            video.formattedDuration = transcriptService.formatDuration(transcriptData.estimatedDuration);
            await video.save();

            console.log(`✅ Transcript extracted: ${transcriptData.wordCount} words, ${transcriptData.estimatedDuration}s duration`);

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

            // Step 4: Mark as completed
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

                processingStatus: 'ready_for_generation',
                createdAt: new Date()
            });

            await microVideo.save();
            microVideos.push(microVideo);
        }

        return microVideos;
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