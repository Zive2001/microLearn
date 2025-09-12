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
  try {
    console.log('🎬 Starting video file upload...');

    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No video file uploaded'
      });
    }

    const { title, description } = req.body;
    const userId = req.user._id;
    const uploadedFile = req.file;

    console.log(`📁 File uploaded: ${uploadedFile.originalname} (${uploadedFile.size} bytes)`);

    // Get video metadata using ffmpeg
    const getVideoMetadata = require('util').promisify(require('fluent-ffmpeg').ffprobe);
    const videoMetadata = await getVideoMetadata(uploadedFile.path);
    
    const videoStream = videoMetadata.streams.find(stream => stream.codec_type === 'video');
    const duration = parseFloat(videoMetadata.format.duration) || 0;

    // Create video record in database
    const video = new Video({
      title: title || uploadedFile.originalname.replace(/\.[^/.]+$/, ""),
      description: description || 'Uploaded video file',
      sourceType: 'upload',
      originalDuration: duration,
      fileInfo: {
        originalFilename: uploadedFile.originalname,
        filename: uploadedFile.filename,
        path: uploadedFile.path,
        size: uploadedFile.size,
        mimeType: uploadedFile.mimetype,
        resolution: {
          width: videoStream?.width || 0,
          height: videoStream?.height || 0
        }
      },
      subject: 'General',
      difficulty: 'intermediate', 
      uploadedBy: userId,
      processingStatus: 'uploaded'
    });

    await video.save();
    console.log(`✅ Video record created: ${video._id}`);

    // Start background processing
    processVideoInBackground(video._id);

    res.status(201).json({
      success: true,
      message: 'Video uploaded successfully',
      data: {
        videoId: video._id,
        title: video.title,
        filename: video.fileInfo.filename,
        size: video.fileInfo.size,
        duration: video.originalDuration,
        status: 'uploaded',
        estimatedProcessingTime: '5-8 minutes'
      }
    });

  } catch (error) {
    console.error('❌ Video upload error:', error);
    
    // Clean up uploaded file if there was an error
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.error('File cleanup error:', cleanupError);
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to upload video',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

const generateCltBlmScriptController = async (req, res) => {
  try {
    console.log('🧠 Starting CLT-bLM script generation...');

    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { videoId } = req.params;
    const userId = req.user._id;
    const { 
      targetDuration = 300, 
      learningObjectives = [], 
      difficultyLevel = 'intermediate',
      personalizations = {}
    } = req.body;

    // Find video and transcript
    const video = await Video.findOne({ _id: videoId, uploadedBy: userId });
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    const transcript = await Transcript.findOne({ videoId });
    if (!transcript) {
      return res.status(404).json({
        success: false,
        message: 'Video transcript not found. Please ensure video processing is complete.'
      });
    }

    console.log(`📝 Generating CLT-bLM script for video: ${video.title}`);

    // Configure script generation options
    const scriptOptions = {
      targetDuration,
      learningObjectives,
      difficultyLevel,
      personalizations: {
        learningStyle: personalizations.learningStyle || 'mixed',
        pace: personalizations.pace || 'normal',
        ...personalizations
      }
    };

    // Generate CLT-bLM script using service
    const cltBlmScript = await generateCLTBLMScript(transcript, scriptOptions);

    // Update video with generated script
    await Video.findByIdAndUpdate(videoId, {
      subject: cltBlmScript.contentAnalysis?.subject || video.subject,
      difficulty: difficultyLevel,
      tags: cltBlmScript.contentAnalysis?.keyTopics || video.tags,
      'analytics.scriptGenerated': true,
      'analytics.lastScriptGeneration': new Date()
    });

    // Create or update micro-videos with new script
    const existingMicroVideos = await MicroVideo.find({ originalVideoId: videoId });
    
    if (existingMicroVideos.length > 0) {
      // Update existing micro-videos with new script
      for (const microVideo of existingMicroVideos) {
        const phase = Object.keys(microVideo.cltBlmScript)[0] || 'deliver';
        microVideo.cltBlmScript = {
          [phase]: cltBlmScript[phase] || cltBlmScript.deliver
        };
        microVideo.processingStatus = 'script_updated';
        await microVideo.save();
      }
    }

    console.log(`✅ CLT-bLM script generated successfully for video: ${videoId}`);

    res.json({
      success: true,
      message: 'CLT-bLM script generated successfully',
      data: {
        videoId,
        script: cltBlmScript,
        scriptMetadata: {
          phases: Object.keys(cltBlmScript).filter(key => 
            ['prepare', 'initiate', 'deliver', 'end'].includes(key)
          ),
          totalWords: calculateTotalWords(cltBlmScript),
          estimatedDuration: targetDuration,
          difficultyLevel,
          learningObjectives,
          contentAnalysis: cltBlmScript.contentAnalysis
        },
        microVideosUpdated: existingMicroVideos.length
      }
    });

  } catch (error) {
    console.error('❌ CLT-bLM script generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate CLT-bLM script',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

const getCltBlmScript = async (req, res) => {
  try {
    console.log('📖 Retrieving CLT-bLM script...');

    const { videoId } = req.params;
    const userId = req.user._id;

    // Find video
    const video = await Video.findOne({ _id: videoId, uploadedBy: userId });
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // Get micro-videos with scripts
    const microVideos = await MicroVideo.find({ originalVideoId: videoId })
      .select('title sequence cltBlmScript keypoints processingStatus createdAt')
      .sort({ sequence: 1 });

    if (microVideos.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No CLT-bLM scripts found for this video. Please generate scripts first.',
        hint: `POST /api/videos/${videoId}/generate-script`
      });
    }

    // Consolidate all phase scripts
    const consolidatedScript = {
      prepare: null,
      initiate: null,
      deliver: null,
      end: null
    };

    const scriptMetadata = {
      totalSegments: microVideos.length,
      phases: [],
      totalWords: 0,
      lastUpdated: null,
      segmentDetails: []
    };

    microVideos.forEach((microVideo, index) => {
      const phase = Object.keys(microVideo.cltBlmScript)[0];
      const phaseScript = microVideo.cltBlmScript[phase];

      if (phase && phaseScript) {
        consolidatedScript[phase] = phaseScript;
        scriptMetadata.phases.push(phase);
        
        // Calculate words for this phase
        const wordCount = phaseScript.content ? phaseScript.content.split(/\s+/).length : 0;
        scriptMetadata.totalWords += wordCount;

        // Track segment details
        scriptMetadata.segmentDetails.push({
          segmentId: microVideo._id,
          title: microVideo.title,
          sequence: microVideo.sequence,
          phase: phase,
          wordCount: wordCount,
          keypoints: microVideo.keypoints.length,
          status: microVideo.processingStatus,
          lastUpdated: microVideo.createdAt
        });

        // Update last modified time
        if (!scriptMetadata.lastUpdated || microVideo.createdAt > scriptMetadata.lastUpdated) {
          scriptMetadata.lastUpdated = microVideo.createdAt;
        }
      }
    });

    // Remove phases that are still null
    const finalScript = Object.fromEntries(
      Object.entries(consolidatedScript).filter(([_, value]) => value !== null)
    );

    console.log(`✅ Retrieved CLT-bLM script for video: ${videoId}`);

    res.json({
      success: true,
      message: 'CLT-bLM script retrieved successfully',
      data: {
        videoId,
        videoTitle: video.title,
        script: finalScript,
        metadata: scriptMetadata,
        availablePhases: Object.keys(finalScript),
        generationInfo: {
          canRegenerate: true,
          regenerateEndpoint: `/api/videos/${videoId}/generate-script`,
          lastGenerated: scriptMetadata.lastUpdated
        }
      }
    });

  } catch (error) {
    console.error('❌ Get CLT-bLM script error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve CLT-bLM script',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

const createMicroVideoSegmentation = async (req, res) => {
  try {
    console.log('✂️ Starting manual micro-video segmentation...');

    const { videoId } = req.params;
    const userId = req.user._id;
    const { 
      segmentationMethod = 'auto',
      customSegments = [],
      targetSegmentDuration = 60,
      phases = ['prepare', 'initiate', 'deliver', 'end']
    } = req.body;

    // Find video and transcript
    const video = await Video.findOne({ _id: videoId, uploadedBy: userId });
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    const transcript = await Transcript.findOne({ videoId });
    if (!transcript) {
      return res.status(404).json({
        success: false,
        message: 'Video transcript not found. Please ensure video processing is complete.'
      });
    }

    console.log(`🎬 Creating micro-video segments for: ${video.title}`);

    // Check if micro-videos already exist
    const existingMicroVideos = await MicroVideo.find({ originalVideoId: videoId });
    if (existingMicroVideos.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Micro-videos already exist for this video',
        data: {
          existingCount: existingMicroVideos.length,
          hint: 'Delete existing micro-videos first or use the update endpoint'
        }
      });
    }

    let segmentationResult;
    
    if (segmentationMethod === 'custom' && customSegments.length > 0) {
      // Use custom segmentation provided by user
      segmentationResult = await createCustomSegmentation(video, transcript, customSegments);
    } else {
      // Use automatic segmentation
      segmentationResult = await createAlignedVideoSegments(
        { 
          source: { filePath: video.fileInfo.path },
          metadata: { duration: video.originalDuration }
        },
        null, // Will generate CLT-bLM script inside service
        transcript,
        { 
          targetSegmentDuration,
          phases 
        }
      );
    }

    // Create micro-video records
    const microVideos = [];
    for (let i = 0; i < segmentationResult.alignedSegments.length; i++) {
      const segment = segmentationResult.alignedSegments[i];
      const phase = segment.cltPhase || phases[i % phases.length];
      
      const microVideo = new MicroVideo({
        originalVideoId: videoId,
        transcriptId: transcript._id,
        userId: userId,
        title: `${video.title} - ${phase.charAt(0).toUpperCase() + phase.slice(1)} (${i + 1})`,
        sequence: i + 1,
        timeRange: {
          startTime: segment.startTime,
          endTime: segment.endTime,
          duration: segment.endTime - segment.startTime
        },
        cltBlmScript: {
          [phase]: {
            content: segment.enhancedScript || segment.originalText,
            purpose: `${phase} phase content`,
            keyObjectives: segment.keypoints?.map(kp => kp.concept) || [],
            estimatedDuration: segment.endTime - segment.startTime
          }
        },
        keypoints: segment.keypoints?.map(kp => ({
          label: kp.concept,
          description: kp.explanation,
          weight: kp.importance || 0.5,
          bloomLevel: kp.bloomLevel || 'understand'
        })) || [],
        generatedScript: segment.enhancedScript,
        processingStatus: 'segmented',
        segmentationMethod: segmentationMethod,
        segmentMetadata: {
          originalSegmentIndex: i,
          phase: phase,
          keywordDensity: segment.keywordDensity,
          cognitiveLoad: segment.cognitiveLoad
        }
      });

      await microVideo.save();
      microVideos.push(microVideo);
    }

    console.log(`✅ Created ${microVideos.length} micro-video segments`);

    // Update main video status
    await Video.findByIdAndUpdate(videoId, {
      processingStatus: 'segmented',
      'analytics.microVideosCreated': microVideos.length,
      'analytics.lastSegmentation': new Date()
    });

    res.json({
      success: true,
      message: 'Micro-video segmentation completed successfully',
      data: {
        videoId,
        videoTitle: video.title,
        microVideos: microVideos.map(mv => ({
          id: mv._id,
          title: mv.title,
          sequence: mv.sequence,
          phase: Object.keys(mv.cltBlmScript)[0],
          duration: mv.timeRange.duration,
          keypoints: mv.keypoints.length,
          timeRange: mv.timeRange
        })),
        segmentationMetadata: {
          totalSegments: microVideos.length,
          method: segmentationMethod,
          targetDuration: targetSegmentDuration,
          phases: phases,
          totalOriginalDuration: video.originalDuration,
          averageSegmentDuration: microVideos.reduce((sum, mv) => sum + mv.timeRange.duration, 0) / microVideos.length
        },
        nextSteps: {
          previewTTS: `/api/videos/microvideo/{microVideoId}/preview-tts`,
          renderVideo: `/api/videos/microvideo/{microVideoId}/render`
        }
      }
    });

  } catch (error) {
    console.error('❌ Micro-video segmentation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create micro-video segmentation',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

const previewTTS = async (req, res) => {
  try {
    const { microVideoId } = req.params;
    const { voice = 'alloy', phase = 'deliver', speed = 1.0 } = req.body;
    const userId = req.user._id;

    // Get micro-video record
    const microVideo = await MicroVideo.findOne({ 
      _id: microVideoId,
      userId: userId 
    });

    if (!microVideo) {
      return res.status(404).json({
        success: false,
        message: 'Micro-video not found'
      });
    }

    // Get enhanced script for the specified phase
    const scriptContent = microVideo.generatedScript || 
                         microVideo.cltBlmScript[phase]?.content ||
                         'No script content available for preview';

    // Generate TTS audio
    const { generateTTSAudio } = require('../services/ttsService');
    const ttsSettings = {
      voice,
      speed,
      model: 'tts-1-hd',
      response_format: 'mp3'
    };

    console.log(`🎵 Generating TTS preview for micro-video: ${microVideoId}`);
    
    // Generate audio buffer
    const audioBuffer = await generateTTSAudio(
      { plain_text: scriptContent },
      ttsSettings
    );

    // Create preview audio file
    const fs = require('fs/promises');
    const path = require('path');
    const previewDir = path.join(process.cwd(), 'uploads', 'audio', 'previews');
    await fs.mkdir(previewDir, { recursive: true });
    
    const previewFilename = `preview_${microVideoId}_${Date.now()}.mp3`;
    const previewPath = path.join(previewDir, previewFilename);
    await fs.writeFile(previewPath, audioBuffer);

    // Get audio metadata
    const { getAudioMetadata } = require('../services/ttsService');
    const audioMetadata = await getAudioMetadata(previewPath);

    res.json({
      success: true,
      message: 'TTS preview generated successfully',
      data: {
        microVideoId,
        previewUrl: `/uploads/audio/previews/${previewFilename}`,
        previewPath,
        audioMetadata: {
          duration: audioMetadata.duration,
          size: audioMetadata.size,
          voice: voice,
          speed: speed
        },
        scriptContent: scriptContent.substring(0, 200) + '...',
        phase: phase
      }
    });

  } catch (error) {
    console.error('❌ TTS preview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate TTS preview',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

const getAvailableVoices = async (req, res) => {
  res.json({ 
    success: true, 
    message: 'Get TTS voices - working!',
    data: { voices: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] }
  });
};

const renderMicroVideoController = async (req, res) => {
  try {
    console.log('🎬 Starting micro-video rendering...');

    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { microVideoId } = req.params;
    const userId = req.user._id;
    const {
      voice = 'alloy',
      outputFormat = 'mp4',
      quality = 'high',
      includeSubtitles = true,
      customizations = {}
    } = req.body;

    // Find micro-video
    const microVideo = await MicroVideo.findOne({
      _id: microVideoId,
      userId: userId
    }).populate('originalVideoId').populate('transcriptId');

    if (!microVideo) {
      return res.status(404).json({
        success: false,
        message: 'Micro-video not found'
      });
    }

    // Check if already rendering
    if (microVideo.processingStatus === 'rendering') {
      return res.status(409).json({
        success: false,
        message: 'Micro-video is already being rendered',
        data: {
          status: 'rendering',
          hint: `Check status at /api/videos/microvideo/${microVideoId}/status`
        }
      });
    }

    console.log(`🎥 Rendering micro-video: ${microVideo.title}`);

    // Update status to rendering
    microVideo.processingStatus = 'rendering';
    microVideo.renderingStarted = new Date();
    await microVideo.save();

    // Start background rendering
    renderMicroVideoInBackground(microVideoId, {
      voice,
      outputFormat,
      quality,
      includeSubtitles,
      customizations
    });

    res.json({
      success: true,
      message: 'Micro-video rendering started',
      data: {
        microVideoId,
        title: microVideo.title,
        status: 'rendering',
        estimatedTime: '2-5 minutes',
        renderConfig: {
          voice,
          outputFormat,
          quality,
          includeSubtitles,
          customizations
        },
        statusEndpoint: `/api/videos/microvideo/${microVideoId}/status`,
        downloadEndpoint: `/api/videos/microvideo/${microVideoId}/download`
      }
    });

  } catch (error) {
    console.error('❌ Micro-video rendering error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start micro-video rendering',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

const getRenderingStatus = async (req, res) => {
  try {
    console.log('📊 Getting micro-video rendering status...');

    const { microVideoId } = req.params;
    const userId = req.user._id;

    // Find micro-video
    const microVideo = await MicroVideo.findOne({
      _id: microVideoId,
      userId: userId
    });

    if (!microVideo) {
      return res.status(404).json({
        success: false,
        message: 'Micro-video not found'
      });
    }

    // Calculate progress percentage
    const getProgressPercentage = (status) => {
      switch (status) {
        case 'pending': return 0;
        case 'segmented': return 10;
        case 'script_updated': return 20;
        case 'rendering': return 50;
        case 'rendered': return 100;
        case 'failed': return 0;
        default: return 0;
      }
    };

    // Calculate estimated time remaining
    const getEstimatedTimeRemaining = (status, startTime) => {
      if (status === 'rendered') return 0;
      if (status === 'failed') return 0;
      if (!startTime) return 300; // 5 minutes default

      const elapsed = (Date.now() - startTime.getTime()) / 1000; // seconds
      const totalEstimated = 300; // 5 minutes total
      const remaining = Math.max(0, totalEstimated - elapsed);
      return Math.round(remaining);
    };

    const progress = getProgressPercentage(microVideo.processingStatus);
    const timeRemaining = getEstimatedTimeRemaining(
      microVideo.processingStatus, 
      microVideo.renderingStarted
    );

    // Get rendering logs if available
    const renderingLogs = microVideo.renderingLogs || [];

    res.json({
      success: true,
      message: 'Rendering status retrieved successfully',
      data: {
        microVideoId,
        title: microVideo.title,
        status: microVideo.processingStatus,
        progress: progress,
        progressText: getProgressText(microVideo.processingStatus),
        timeRemaining: timeRemaining,
        timeRemainingText: formatTime(timeRemaining),
        renderingStarted: microVideo.renderingStarted,
        renderingCompleted: microVideo.renderingCompleted,
        totalElapsed: microVideo.renderingStarted ? 
          Math.round((Date.now() - microVideo.renderingStarted.getTime()) / 1000) : 0,
        renderingDetails: {
          phase: getCurrentRenderingPhase(microVideo.processingStatus),
          lastUpdate: microVideo.updatedAt,
          error: microVideo.renderingError || null,
          logs: renderingLogs.slice(-5), // Last 5 log entries
          outputFiles: microVideo.outputFiles || []
        },
        actions: {
          canCancel: ['rendering'].includes(microVideo.processingStatus),
          canRetry: microVideo.processingStatus === 'failed',
          canDownload: microVideo.processingStatus === 'rendered',
          downloadUrl: microVideo.processingStatus === 'rendered' ? 
            `/api/videos/microvideo/${microVideoId}/download` : null
        }
      }
    });

  } catch (error) {
    console.error('❌ Get rendering status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get rendering status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

const downloadRenderedVideo = async (req, res) => {
  try {
    console.log('⬇️ Starting video download...');

    const { microVideoId } = req.params;
    const userId = req.user._id;
    const { format = 'mp4' } = req.query;

    // Find micro-video
    const microVideo = await MicroVideo.findOne({
      _id: microVideoId,
      userId: userId
    });

    if (!microVideo) {
      return res.status(404).json({
        success: false,
        message: 'Micro-video not found'
      });
    }

    // Check if rendering is complete
    if (microVideo.processingStatus !== 'rendered') {
      return res.status(400).json({
        success: false,
        message: 'Video is not ready for download',
        data: {
          status: microVideo.processingStatus,
          hint: microVideo.processingStatus === 'rendering' ? 
            'Video is still being rendered. Please wait.' :
            'Video needs to be rendered first.'
        }
      });
    }

    // Get output files
    const outputFiles = microVideo.outputFiles || [];
    const requestedFile = outputFiles.find(file => file.format === format);

    if (!requestedFile) {
      const availableFormats = outputFiles.map(f => f.format);
      return res.status(404).json({
        success: false,
        message: `Video format '${format}' not available`,
        data: {
          availableFormats,
          hint: `Use format parameter: ?format=${availableFormats[0] || 'mp4'}`
        }
      });
    }

    // Check if file exists
    const fs = require('fs');
    if (!fs.existsSync(requestedFile.filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Video file not found on server',
        error: 'File may have been moved or deleted'
      });
    }

    console.log(`📹 Serving video file: ${requestedFile.fileName}`);

    // Update download analytics
    if (!microVideo.analytics) microVideo.analytics = {};
    microVideo.analytics.downloadCount = (microVideo.analytics.downloadCount || 0) + 1;
    microVideo.analytics.lastDownload = new Date();
    await microVideo.save();

    // Set appropriate headers
    const stat = fs.statSync(requestedFile.filePath);
    const fileSize = stat.size;
    
    res.setHeader('Content-Type', getMimeType(format));
    res.setHeader('Content-Length', fileSize);
    res.setHeader('Content-Disposition', 
      `attachment; filename="${requestedFile.fileName}"`);
    res.setHeader('Cache-Control', 'no-cache');
    
    // Handle range requests for video streaming
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      
      const stream = fs.createReadStream(requestedFile.filePath, { start, end });
      
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Length', chunksize);
      
      stream.pipe(res);
    } else {
      // Full file download
      const stream = fs.createReadStream(requestedFile.filePath);
      stream.pipe(res);
    }

    console.log(`✅ Video download started: ${requestedFile.fileName}`);

  } catch (error) {
    console.error('❌ Video download error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download video',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
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

const calculateTotalWords = (cltBlmScript) => {
  const phases = ['prepare', 'initiate', 'deliver', 'end'];
  return phases.reduce((total, phase) => {
    const content = cltBlmScript[phase]?.content || '';
    return total + content.split(/\s+/).length;
  }, 0);
};

const createCustomSegmentation = async (video, transcript, customSegments) => {
  // Create segments based on user-defined time ranges
  const alignedSegments = customSegments.map((segment, index) => ({
    startTime: segment.startTime,
    endTime: segment.endTime,
    originalText: getTranscriptTextForTimeRange(transcript, segment.startTime, segment.endTime),
    enhancedScript: segment.customScript || null,
    cltPhase: segment.phase || 'deliver',
    keypoints: segment.keypoints || [],
    keywordDensity: 0.5,
    cognitiveLoad: { intrinsic: 0.5, extraneous: 0.3, germane: 0.7 }
  }));

  return { alignedSegments };
};

const getTranscriptTextForTimeRange = (transcript, startTime, endTime) => {
  return transcript.segments
    .filter(seg => seg.startTime >= startTime && seg.endTime <= endTime)
    .map(seg => seg.text)
    .join(' ');
};

const getProgressText = (status) => {
  const statusTexts = {
    'pending': 'Waiting to start',
    'segmented': 'Video segmented',
    'script_updated': 'Script prepared',
    'rendering': 'Rendering in progress...',
    'rendered': 'Rendering complete',
    'failed': 'Rendering failed'
  };
  return statusTexts[status] || 'Unknown status';
};

const getCurrentRenderingPhase = (status) => {
  const phases = {
    'pending': 'Waiting',
    'segmented': 'Preparation',
    'script_updated': 'Script Processing',
    'rendering': 'Video Rendering',
    'rendered': 'Complete',
    'failed': 'Error'
  };
  return phases[status] || 'Unknown';
};

const formatTime = (seconds) => {
  if (seconds === 0) return 'Complete';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const getMimeType = (format) => {
  const mimeTypes = {
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo'
  };
  return mimeTypes[format] || 'video/mp4';
};

const renderMicroVideoInBackground = async (microVideoId, renderConfig) => {
  try {
    console.log(`🎬 Background rendering started for micro-video: ${microVideoId}`);
    
    // Get micro-video with populated data
    const microVideo = await MicroVideo.findById(microVideoId)
      .populate('originalVideoId')
      .populate('transcriptId');

    if (!microVideo) {
      throw new Error('Micro-video not found');
    }

    // Step 1: Generate TTS audio
    console.log('🎵 Step 1: Generating TTS audio...');
    const { generateScriptAudio } = require('../services/ttsService');
    
    const phase = Object.keys(microVideo.cltBlmScript)[0];
    const phaseScript = microVideo.cltBlmScript[phase];
    
    const ttsResult = await generateScriptAudio({
      [phase]: phaseScript
    }, {
      voice: renderConfig.voice,
      speed: 1.0,
      model: 'tts-1-hd'
    }, {
      outputDir: `uploads/audio/${microVideoId}`
    });

    // Step 2: Prepare video rendering data
    console.log('🎥 Step 2: Preparing video segments...');
    const renderingData = {
      videoSegments: [{
        phase: phase,
        file_path: microVideo.originalVideoId.fileInfo.path,
        timing: {
          startTime: microVideo.timeRange.startTime,
          endTime: microVideo.timeRange.endTime,
          duration: microVideo.timeRange.duration
        },
        cognitive_load: microVideo.segmentMetadata?.cognitiveLoad || {
          intrinsic: 0.5, extraneous: 0.3, germane: 0.7
        }
      }],
      audioData: ttsResult,
      visualEnhancements: {
        phase_visual_cues: {
          [phase]: {
            background_elements: { color_scheme: '#3498db' },
            text_presentation: { text_color: '#ffffff' }
          }
        },
        keypoint_visuals: microVideo.keypoints.map(kp => ({
          keypoint_data: {
            concept: kp.label,
            description: kp.description,
            bloom_level: kp.bloomLevel,
            visual_alignment: { phase: phase }
          },
          visual_enhancement: {}
        }))
      },
      timelineMapping: {},
      cltBlmScript: microVideo.cltBlmScript
    };

    // Step 3: Render video using service
    console.log('🎬 Step 3: Rendering final video...');
    const { renderMicroVideo } = require('../services/videoRenderingService');
    
    const renderResult = await renderMicroVideo(renderingData, {
      outputDir: `uploads/rendered/${microVideoId}`,
      outputFilename: `${microVideo.title.replace(/\s+/g, '_')}.${renderConfig.outputFormat}`,
      formats: [renderConfig.outputFormat],
      includeSubtitles: renderConfig.includeSubtitles
    });

    // Step 4: Update micro-video with results
    microVideo.processingStatus = 'rendered';
    microVideo.renderingCompleted = new Date();
    microVideo.outputFiles = [{
      format: renderConfig.outputFormat,
      filePath: renderResult.final_video.file_path,
      fileName: renderResult.final_video.filename,
      fileSize: renderResult.final_video.file_size,
      duration: renderResult.final_video.duration,
      createdAt: new Date()
    }];
    
    await microVideo.save();

    console.log(`✅ Background rendering completed for micro-video: ${microVideoId}`);

  } catch (error) {
    console.error(`❌ Background rendering failed for micro-video ${microVideoId}:`, error);
    
    // Update micro-video status to failed
    await MicroVideo.findByIdAndUpdate(microVideoId, {
      processingStatus: 'failed',
      renderingError: error.message,
      renderingCompleted: new Date()
    });
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