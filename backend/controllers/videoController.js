const multer = require('multer');
const path = require('path');
const fs = require('fs/promises');
const { validationResult } = require('express-validator');

// Import models
const Video = require('../models/Video');
const Transcript = require('../models/Transcript');
const MicroVideo = require('../models/MicroVideo');

// Import services
const { processYouTubeVideo, getYouTubeVideoInfo, extractVideoId, validateYouTubeURL } = require('../services/youtubeVideoProcessingService');
const { transcribeAudio } = require('../services/transcriptionService');
const { generateCLTBLMScript } = require('../services/cltBlmService');
const { createAlignedVideoSegments } = require('../services/videoSegmentationService');
const { generateScriptAudio } = require('../services/ttsService');
const { renderMicroVideo } = require('../services/videoRenderingService');

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'videos');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `video-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'video/mp4',
    'video/mpeg', 
    'video/quicktime',
    'video/x-msvideo',
    'video/webm'
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only MP4, MOV, AVI, MPEG, and WebM files are allowed'));
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB limit
  }
});

// ============================================================================
// Part 2A: Video Ingestion and Processing
// ============================================================================

/**
 * Process YouTube video URL
 */
const processYouTubeURL = async (req, res) => {
  try {
    console.log('🎬 Starting YouTube video processing...');
    
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { url, title, description } = req.body;
    const userId = req.user._id;

    // Step 1: Validate YouTube URL
    const isValid = await validateYouTubeURL(url);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or inaccessible YouTube URL'
      });
    }

    // Step 2: Extract video info
    const videoInfo = await getYouTubeVideoInfo(url);
    
    // Step 3: Create video record in database
    const video = new Video({
      title: title || videoInfo.title,
      description: description || videoInfo.description,
      sourceUrl: url,
      sourceType: 'youtube',
      originalDuration: videoInfo.duration,
      fileInfo: {
        originalFilename: videoInfo.title,
        filename: `youtube-${extractVideoId(url)}.mp4`,
        size: videoInfo.fileSize,
        mimeType: 'video/mp4',
        resolution: {
          width: videoInfo.width,
          height: videoInfo.height
        }
      },
      subject: 'General', // Will be updated after content analysis
      difficulty: 'intermediate', // Will be updated after analysis
      uploadedBy: userId,
      processingStatus: 'processing'
    });

    await video.save();
    console.log(`✅ Video record created: ${video._id}`);

    // Step 4: Start background processing
    processVideoInBackground(video._id, url);

    // Return immediate response
    res.status(201).json({
      success: true,
      message: 'YouTube video processing started',
      data: {
        videoId: video._id,
        status: 'processing',
        estimatedTime: '5-8 minutes',
        title: video.title
      }
    });

  } catch (error) {
    console.error('❌ YouTube processing error:', error);
    
    if (error.message.includes('Private video') || error.message.includes('not available')) {
      return res.status(400).json({
        success: false,
        message: 'Video is private or not available'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to process YouTube video',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Background video processing pipeline
 */
const processVideoInBackground = async (videoId, youtubeUrl) => {
  try {
    console.log(`🔄 Background processing started for video: ${videoId}`);

    // Step 1: Download and process video
    console.log('📥 Step 1: Downloading video...');
    const downloadResult = await processYouTubeVideo(youtubeUrl);
    
    // Update video with file info
    await Video.findByIdAndUpdate(videoId, {
      'fileInfo.path': downloadResult.videoPath,
      'fileInfo.size': downloadResult.fileSize,
      processingStatus: 'processing'
    });

    // Step 2: Extract transcript
    console.log('📝 Step 2: Extracting transcript...');
    const audioPath = downloadResult.audioPath;
    const transcriptResult = await transcribeAudio(audioPath);
    
    // Create transcript record
    const transcript = new Transcript({
      videoId: videoId,
      extractionMethod: 'whisper',
      language: { code: transcriptResult.language },
      segments: transcriptResult.segments.map(seg => ({
        startTime: seg.start,
        endTime: seg.end,
        text: seg.text,
        confidence: seg.confidence,
        keyTopics: seg.keyPhrases,
        importance: seg.importance,
        cltPhase: 'unclassified'
      })),
      fullText: transcriptResult.fullText,
      processingStatus: 'completed',
      quality: {
        overallConfidence: transcriptResult.quality.overallConfidence,
        wordCount: transcriptResult.statistics.totalWords,
        segmentCount: transcriptResult.segments.length
      }
    });

    await transcript.save();
    console.log(`✅ Transcript created: ${transcript._id}`);

    // Step 3: Generate CLT-bLM script
    console.log('🧠 Step 3: Generating educational script...');
    const cltBlmScript = await generateCLTBLMScript(transcript, {
      targetDuration: 300, // 5 minutes
      learningStyle: 'mixed',
      difficultyLevel: 'intermediate'
    });

    // Step 4: Create micro-videos
    console.log('✂️ Step 4: Creating micro-video segments...');
    const segments = await createAlignedVideoSegments(
      { 
        source: { filePath: downloadResult.videoPath },
        metadata: { duration: downloadResult.duration }
      },
      cltBlmScript,
      transcript
    );

    // Create micro-video records
    const microVideos = [];
    for (let i = 0; i < segments.alignedSegments.length; i++) {
      const segment = segments.alignedSegments[i];
      const phase = segment.cltPhase;
      
      const microVideo = new MicroVideo({
        originalVideoId: videoId,
        transcriptId: transcript._id,
        userId: videoId.uploadedBy,
        title: `${phase.charAt(0).toUpperCase() + phase.slice(1)} Phase - Part ${i + 1}`,
        sequence: i + 1,
        timeRange: {
          startTime: segment.startTime,
          endTime: segment.endTime,
          duration: segment.endTime - segment.startTime
        },
        cltBlmScript: {
          [phase]: cltBlmScript[phase]
        },
        keypoints: segment.keypoints.map(kp => ({
          label: kp.concept,
          description: kp.explanation,
          weight: kp.importance,
          bloomLevel: kp.bloomLevel
        })),
        generatedScript: segment.enhancedScript,
        processingStatus: 'pending'
      });

      await microVideo.save();
      microVideos.push(microVideo);
    }

    console.log(`✅ Created ${microVideos.length} micro-videos`);

    // Update main video status
    await Video.findByIdAndUpdate(videoId, {
      processingStatus: 'completed',
      subject: cltBlmScript.contentAnalysis?.subject || 'General',
      difficulty: cltBlmScript.contentAnalysis?.difficulty || 'intermediate',
      tags: cltBlmScript.contentAnalysis?.keyTopics || []
    });

    console.log(`🎉 Video processing completed: ${videoId}`);

  } catch (error) {
    console.error(`❌ Background processing failed for video ${videoId}:`, error);
    
    // Update video status to failed
    await Video.findByIdAndUpdate(videoId, {
      processingStatus: 'failed',
      processingError: error.message
    });
  }
};

/**
 * Get video processing status
 */
const getVideoStatus = async (req, res) => {
  try {
    const { videoId } = req.params;
    const userId = req.user._id;

    const video = await Video.findOne({ _id: videoId, uploadedBy: userId });
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // Get associated micro-videos if completed
    let microVideos = [];
    if (video.processingStatus === 'completed') {
      microVideos = await MicroVideo.find({ originalVideoId: videoId })
        .select('title sequence timeRange processingStatus')
        .sort({ sequence: 1 });
    }

    res.json({
      success: true,
      data: {
        videoId: video._id,
        title: video.title,
        status: video.processingStatus,
        error: video.processingError,
        progress: getProgressPercentage(video.processingStatus),
        microVideos: microVideos.length,
        microVideosList: microVideos,
        createdAt: video.createdAt
      }
    });

  } catch (error) {
    console.error('Error getting video status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get video status'
    });
  }
};

/**
 * Get user's videos
 */
const getUserVideos = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10, status } = req.query;
    
    const query = { uploadedBy: userId };
    if (status) {
      query.processingStatus = status;
    }

    const videos = await Video.find(query)
      .select('title description sourceUrl processingStatus createdAt analytics')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Video.countDocuments(query);

    res.json({
      success: true,
      data: {
        videos,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });

  } catch (error) {
    console.error('Error getting user videos:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get videos'
    });
  }
};

/**
 * Delete video
 */
const deleteVideo = async (req, res) => {
  try {
    const { videoId } = req.params;
    const userId = req.user._id;

    const video = await Video.findOne({ _id: videoId, uploadedBy: userId });
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // Delete associated records
    await Promise.all([
      Transcript.deleteMany({ videoId }),
      MicroVideo.deleteMany({ originalVideoId: videoId }),
      Video.findByIdAndDelete(videoId)
    ]);

    // TODO: Delete physical files
    
    res.json({
      success: true,
      message: 'Video deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete video'
    });
  }
};

// ============================================================================
// Placeholder functions for remaining endpoints
// ============================================================================

const uploadVideo = async (req, res) => {
  res.json({ 
    success: true, 
    message: 'Video upload endpoint - coming soon',
    data: { videoId: 'upload-placeholder' }
  });
};

const generateCltBlmScriptController = async (req, res) => {
  res.json({ 
    success: true, 
    message: 'CLT-bLM script generation - coming soon'
  });
};

const getCltBlmScript = async (req, res) => {
  res.json({ 
    success: true, 
    message: 'Get CLT-bLM script - coming soon'
  });
};

const createMicroVideoSegmentation = async (req, res) => {
  res.json({ 
    success: true, 
    message: 'Micro-video segmentation - coming soon'
  });
};

const previewTTS = async (req, res) => {
  res.json({ 
    success: true, 
    message: 'TTS preview - coming soon'
  });
};

const getAvailableVoices = async (req, res) => {
  res.json({ 
    success: true, 
    message: 'Get TTS voices - working!',
    data: { voices: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] }
  });
};

const renderMicroVideoController = async (req, res) => {
  res.json({ 
    success: true, 
    message: 'Micro-video rendering - coming soon'
  });
};

const getRenderingStatus = async (req, res) => {
  res.json({ 
    success: true, 
    message: 'Get rendering status - coming soon',
    data: { status: 'processing' }
  });
};

const downloadRenderedVideo = async (req, res) => {
  res.json({ 
    success: true, 
    message: 'Download rendered video - coming soon'
  });
};

// ============================================================================
// Helper functions
// ============================================================================

const getProgressPercentage = (status) => {
  switch (status) {
    case 'pending': return 0;
    case 'processing': return 50;
    case 'completed': return 100;
    case 'failed': return 0;
    default: return 0;
  }
};

module.exports = {
  upload,
  uploadVideo,
  processYouTubeURL,
  getVideoStatus,
  getUserVideos,
  deleteVideo,
  generateCltBlmScriptController,
  getCltBlmScript,
  createMicroVideoSegmentation,
  previewTTS,
  getAvailableVoices,
  renderMicroVideo: renderMicroVideoController,
  getRenderingStatus,
  downloadRenderedVideo
};