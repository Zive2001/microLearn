const { validationResult } = require('express-validator');
const Video = require('../models/Video');
const Transcript = require('../models/Transcript');
const MicroVideo = require('../models/MicroVideo');

// Import services
const { processYouTubeVideo, getYouTubeVideoInfo, extractVideoId, validateYouTubeURL } = require('../services/youtubeVideoProcessingService');
const { transcribeAudio } = require('../services/transcriptionService');
const { generateCLTBLMScript } = require('../services/cltBlmService');
const { createAlignedVideoSegments } = require('../services/videoSegmentationService');

/**
 * TEST ROUTE: Quick YouTube processing for testing
 * Bypasses user authentication and processes video directly
 */
const testProcessYouTubeURL = async (req, res) => {
  try {
    console.log('🧪 TEST: Starting YouTube video processing...');
    
    const { url, testUserId = 'test-user-123' } = req.body;

    // Quick validation
    if (!url || !url.includes('youtube.com/watch') && !url.includes('youtu.be/')) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid YouTube URL'
      });
    }

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
    
    // Step 3: Create test video record
    const video = new Video({
      title: `TEST: ${videoInfo.title}`,
      description: `Test processing of ${videoInfo.description || 'YouTube video'}`,
      sourceUrl: url,
      sourceType: 'youtube',
      originalDuration: videoInfo.duration,
      fileInfo: {
        originalFilename: videoInfo.title,
        filename: `test-youtube-${extractVideoId(url)}.mp4`,
        size: videoInfo.fileSize,
        mimeType: 'video/mp4',
        resolution: {
          width: videoInfo.width,
          height: videoInfo.height
        }
      },
      subject: 'Test',
      difficulty: 'intermediate',
      uploadedBy: testUserId, // Test user ID
      processingStatus: 'processing'
    });

    await video.save();
    console.log(`✅ TEST: Video record created: ${video._id}`);

    // Step 4: Start background processing immediately
    testProcessVideoInBackground(video._id, url);

    // Return immediate response
    res.status(201).json({
      success: true,
      message: '🧪 TEST: YouTube video processing started',
      data: {
        videoId: video._id,
        status: 'processing',
        estimatedTime: '3-5 minutes',
        title: video.title,
        testMode: true
      }
    });

  } catch (error) {
    console.error('❌ TEST: YouTube processing error:', error);
    res.status(500).json({
      success: false,
      message: 'TEST: Failed to process YouTube video',
      error: error.message
    });
  }
};

/**
 * TEST: Background processing pipeline
 */
const testProcessVideoInBackground = async (videoId, youtubeUrl) => {
  try {
    console.log(`🧪 TEST: Background processing started for video: ${videoId}`);

    // Step 1: Download and process video
    console.log('📥 TEST: Step 1 - Downloading video...');
    const downloadResult = await processYouTubeVideo(youtubeUrl);
    
    await Video.findByIdAndUpdate(videoId, {
      'fileInfo.path': downloadResult.videoPath,
      'fileInfo.size': downloadResult.fileSize,
      processingStatus: 'processing'
    });

    // Step 2: Extract transcript
    console.log('📝 TEST: Step 2 - Extracting transcript...');
    const audioPath = downloadResult.audioPath;
    const transcriptResult = await transcribeAudio(audioPath);
    
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
    console.log(`✅ TEST: Transcript created: ${transcript._id}`);

    // Step 3: Generate CLT-bLM script
    console.log('🧠 TEST: Step 3 - Generating educational script...');
    const cltBlmScript = await generateCLTBLMScript(transcript, {
      targetDuration: 300,
      learningStyle: 'mixed',
      difficultyLevel: 'intermediate'
    });

    // Step 4: Create micro-videos
    console.log('✂️ TEST: Step 4 - Creating micro-video segments...');
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
        userId: 'test-user-123', // Test user
        title: `TEST: ${phase.charAt(0).toUpperCase() + phase.slice(1)} Phase - Part ${i + 1}`,
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
        processingStatus: 'completed' // Mark as completed for testing
      });

      await microVideo.save();
      microVideos.push(microVideo);
    }

    console.log(`✅ TEST: Created ${microVideos.length} micro-videos`);

    // Update main video status
    await Video.findByIdAndUpdate(videoId, {
      processingStatus: 'completed',
      subject: cltBlmScript.contentAnalysis?.subject || 'Test',
      difficulty: cltBlmScript.contentAnalysis?.difficulty || 'intermediate',
      tags: cltBlmScript.contentAnalysis?.keyTopics || []
    });

    console.log(`🎉 TEST: Video processing completed: ${videoId}`);

  } catch (error) {
    console.error(`❌ TEST: Background processing failed for video ${videoId}:`, error);
    
    await Video.findByIdAndUpdate(videoId, {
      processingStatus: 'failed',
      processingError: error.message
    });
  }
};

/**
 * TEST ROUTE: Get test video status
 */
const testGetVideoStatus = async (req, res) => {
  try {
    const { videoId } = req.params;

    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Test video not found'
      });
    }

    // Get associated micro-videos
    let microVideos = [];
    if (video.processingStatus === 'completed') {
      microVideos = await MicroVideo.find({ originalVideoId: videoId })
        .select('_id title sequence timeRange processingStatus generatedScript')
        .sort({ sequence: 1 });
    }

    res.json({
      success: true,
      message: '🧪 TEST: Video status retrieved',
      data: {
        videoId: video._id,
        title: video.title,
        status: video.processingStatus,
        error: video.processingError,
        progress: getProgressPercentage(video.processingStatus),
        microVideos: microVideos.length,
        microVideosList: microVideos,
        createdAt: video.createdAt,
        testMode: true
      }
    });

  } catch (error) {
    console.error('❌ TEST: Error getting video status:', error);
    res.status(500).json({
      success: false,
      message: 'TEST: Failed to get video status',
      error: error.message
    });
  }
};

/**
 * TEST ROUTE: Get test micro-video details
 */
const testGetMicroVideo = async (req, res) => {
  try {
    const { microVideoId } = req.params;

    const microVideo = await MicroVideo.findById(microVideoId)
      .populate('originalVideoId', 'title sourceUrl')
      .populate('transcriptId', 'segments');

    if (!microVideo) {
      return res.status(404).json({
        success: false,
        message: 'TEST: Micro-video not found'
      });
    }

    res.json({
      success: true,
      message: '🧪 TEST: Micro-video details retrieved',
      data: {
        microVideoId: microVideo._id,
        title: microVideo.title,
        sequence: microVideo.sequence,
        timeRange: microVideo.timeRange,
        cltBlmScript: microVideo.cltBlmScript,
        keypoints: microVideo.keypoints,
        generatedScript: microVideo.generatedScript,
        processingStatus: microVideo.processingStatus,
        originalVideo: {
          id: microVideo.originalVideoId._id,
          title: microVideo.originalVideoId.title,
          sourceUrl: microVideo.originalVideoId.sourceUrl
        },
        transcriptSegments: microVideo.transcriptId?.segments?.filter(seg => 
          seg.startTime >= microVideo.timeRange.startTime && 
          seg.endTime <= microVideo.timeRange.endTime
        ),
        testMode: true
      }
    });

  } catch (error) {
    console.error('❌ TEST: Error getting micro-video:', error);
    res.status(500).json({
      success: false,
      message: 'TEST: Failed to get micro-video details',
      error: error.message
    });
  }
};

/**
 * TEST ROUTE: Preview TTS (no auth required)
 */
const testPreviewTTS = async (req, res) => {
  try {
    const { microVideoId } = req.params;
    const { voice = 'alloy', phase = 'deliver', speed = 1.0 } = req.body;

    console.log(`🧪 TEST: TTS preview for micro-video: ${microVideoId}`);

    // Get micro-video record (no user validation for test)
    const microVideo = await MicroVideo.findById(microVideoId);

    if (!microVideo) {
      return res.status(404).json({
        success: false,
        message: 'TEST: Micro-video not found'
      });
    }

    // Get enhanced script content
    const scriptContent = microVideo.generatedScript || 
                         microVideo.cltBlmScript[phase]?.content ||
                         'Test script content for TTS preview.';

    // Generate TTS audio
    const { generateTTSAudio } = require('../services/ttsService');
    const ttsSettings = {
      voice,
      speed,
      model: 'tts-1-hd',
      response_format: 'mp3'
    };
    
    const audioBuffer = await generateTTSAudio(
      { plain_text: scriptContent },
      ttsSettings
    );

    // Create preview audio file
    const fs = require('fs/promises');
    const path = require('path');
    const previewDir = path.join(process.cwd(), 'uploads', 'audio', 'test-previews');
    await fs.mkdir(previewDir, { recursive: true });
    
    const previewFilename = `test-preview_${microVideoId}_${Date.now()}.mp3`;
    const previewPath = path.join(previewDir, previewFilename);
    await fs.writeFile(previewPath, audioBuffer);

    // Get audio metadata
    const { getAudioMetadata } = require('../services/ttsService');
    const audioMetadata = await getAudioMetadata(previewPath);

    res.json({
      success: true,
      message: '🧪 TEST: TTS preview generated successfully',
      data: {
        microVideoId,
        previewUrl: `/uploads/audio/test-previews/${previewFilename}`,
        previewPath,
        audioMetadata: {
          duration: audioMetadata.duration,
          size: audioMetadata.size,
          voice: voice,
          speed: speed
        },
        scriptContent: scriptContent.substring(0, 200) + '...',
        phase: phase,
        testMode: true
      }
    });

  } catch (error) {
    console.error('❌ TEST: TTS preview error:', error);
    res.status(500).json({
      success: false,
      message: 'TEST: Failed to generate TTS preview',
      error: error.message
    });
  }
};

// Helper function
const getProgressPercentage = (status) => {
  switch (status) {
    case 'pending': return 0;
    case 'processing': return 50;
    case 'completed': return 100;
    case 'failed': return 0;
    default: return 0;
  }
};

// ============================================================================
// 🧪 PHASE 1A TEST CONTROLLERS - Direct Testing Without Authentication
// ============================================================================

/**
 * TEST ROUTE: Upload video (simulated - no file handling)
 */
const testUploadVideo = async (req, res) => {
  try {
    console.log('🧪 TEST: Simulating video upload...');

    const { 
      filename, 
      title, 
      description, 
      simulateFileSize = 15728640, 
      simulateDuration = 120.5 
    } = req.body;

    // Simulate file upload by creating a test video record
    const video = new Video({
      title: title || filename.replace(/\.[^/.]+$/, ""),
      description: description || 'TEST: Simulated video upload',
      sourceType: 'upload',
      originalDuration: simulateDuration,
      fileInfo: {
        originalFilename: filename,
        filename: `test-upload-${Date.now()}-${filename}`,
        path: `/test/uploads/videos/test-upload-${Date.now()}-${filename}`,
        size: simulateFileSize,
        mimeType: 'video/mp4',
        resolution: {
          width: 1920,
          height: 1080
        }
      },
      subject: 'Test Subject',
      difficulty: 'intermediate',
      uploadedBy: 'test-user-123',
      processingStatus: 'uploaded'
    });

    await video.save();
    console.log(`✅ TEST: Video record created: ${video._id}`);

    // Simulate quick processing for testing
    setTimeout(async () => {
      await testCreateMockTranscriptAndMicroVideos(video._id);
    }, 2000);

    res.status(201).json({
      success: true,
      message: '🧪 TEST: Video upload simulated successfully',
      data: {
        videoId: video._id,
        title: video.title,
        filename: video.fileInfo.filename,
        size: video.fileInfo.size,
        duration: video.originalDuration,
        status: 'uploaded',
        estimatedProcessingTime: '2-3 seconds (simulated)',
        testMode: true
      }
    });

  } catch (error) {
    console.error('❌ TEST: Video upload error:', error);
    res.status(500).json({
      success: false,
      message: 'TEST: Failed to simulate video upload',
      error: error.message
    });
  }
};

/**
 * TEST ROUTE: Generate CLT-bLM script (with mock data)
 */
const testGenerateCltBlmScript = async (req, res) => {
  try {
    console.log('🧪 TEST: Generating CLT-bLM script...');

    const { videoId } = req.params;
    const { 
      targetDuration = 300, 
      difficultyLevel = 'intermediate',
      learningObjectives = [],
      personalizations = {}
    } = req.body;

    // Find video
    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'TEST: Video not found'
      });
    }

    // Create or find transcript
    let transcript = await Transcript.findOne({ videoId });
    if (!transcript) {
      // Create mock transcript for testing
      transcript = await createMockTranscript(videoId);
    }

    // Generate mock CLT-bLM script
    const mockCltBlmScript = generateMockCLTBLMScript(video.title, targetDuration, difficultyLevel);

    // Update existing micro-videos or create new ones with the script
    const existingMicroVideos = await MicroVideo.find({ originalVideoId: videoId });
    
    if (existingMicroVideos.length > 0) {
      for (const microVideo of existingMicroVideos) {
        const phase = Object.keys(microVideo.cltBlmScript)[0] || 'deliver';
        microVideo.cltBlmScript = {
          [phase]: mockCltBlmScript[phase] || mockCltBlmScript.deliver
        };
        microVideo.processingStatus = 'script_updated';
        await microVideo.save();
      }
    }

    // Update video
    await Video.findByIdAndUpdate(videoId, {
      subject: mockCltBlmScript.contentAnalysis?.subject || video.subject,
      difficulty: difficultyLevel,
      processingStatus: 'script_generated'
    });

    console.log(`✅ TEST: CLT-bLM script generated for video: ${videoId}`);

    res.json({
      success: true,
      message: '🧪 TEST: CLT-bLM script generated successfully',
      data: {
        videoId,
        script: mockCltBlmScript,
        scriptMetadata: {
          phases: Object.keys(mockCltBlmScript).filter(key => 
            ['prepare', 'initiate', 'deliver', 'end'].includes(key)
          ),
          totalWords: calculateTotalWords(mockCltBlmScript),
          estimatedDuration: targetDuration,
          difficultyLevel,
          learningObjectives
        },
        microVideosUpdated: existingMicroVideos.length,
        testMode: true
      }
    });

  } catch (error) {
    console.error('❌ TEST: CLT-bLM script generation error:', error);
    res.status(500).json({
      success: false,
      message: 'TEST: Failed to generate CLT-bLM script',
      error: error.message
    });
  }
};

/**
 * TEST ROUTE: Get CLT-bLM script
 */
const testGetCltBlmScript = async (req, res) => {
  try {
    console.log('🧪 TEST: Retrieving CLT-bLM script...');

    const { videoId } = req.params;

    // Find video
    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'TEST: Video not found'
      });
    }

    // Get micro-videos with scripts
    const microVideos = await MicroVideo.find({ originalVideoId: videoId })
      .select('title sequence cltBlmScript keypoints processingStatus createdAt')
      .sort({ sequence: 1 });

    if (microVideos.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'TEST: No CLT-bLM scripts found. Generate scripts first.',
        hint: `POST /api/test-videos/${videoId}/generate-script`,
        testMode: true
      });
    }

    // Consolidate scripts (same logic as real controller)
    const consolidatedScript = { prepare: null, initiate: null, deliver: null, end: null };
    const scriptMetadata = {
      totalSegments: microVideos.length,
      phases: [],
      totalWords: 0,
      lastUpdated: null,
      segmentDetails: []
    };

    microVideos.forEach((microVideo) => {
      const phase = Object.keys(microVideo.cltBlmScript)[0];
      const phaseScript = microVideo.cltBlmScript[phase];

      if (phase && phaseScript) {
        consolidatedScript[phase] = phaseScript;
        scriptMetadata.phases.push(phase);
        
        const wordCount = phaseScript.content ? phaseScript.content.split(/\s+/).length : 0;
        scriptMetadata.totalWords += wordCount;

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

        if (!scriptMetadata.lastUpdated || microVideo.createdAt > scriptMetadata.lastUpdated) {
          scriptMetadata.lastUpdated = microVideo.createdAt;
        }
      }
    });

    const finalScript = Object.fromEntries(
      Object.entries(consolidatedScript).filter(([_, value]) => value !== null)
    );

    res.json({
      success: true,
      message: '🧪 TEST: CLT-bLM script retrieved successfully',
      data: {
        videoId,
        videoTitle: video.title,
        script: finalScript,
        metadata: scriptMetadata,
        availablePhases: Object.keys(finalScript),
        testMode: true
      }
    });

  } catch (error) {
    console.error('❌ TEST: Get CLT-bLM script error:', error);
    res.status(500).json({
      success: false,
      message: 'TEST: Failed to retrieve CLT-bLM script',
      error: error.message
    });
  }
};

/**
 * TEST ROUTE: Create micro-video segmentation
 */
const testCreateMicroVideoSegmentation = async (req, res) => {
  try {
    console.log('🧪 TEST: Creating micro-video segmentation...');

    const { videoId } = req.params;
    const { 
      segmentationMethod = 'auto',
      targetSegmentDuration = 60,
      phases = ['prepare', 'initiate', 'deliver', 'end']
    } = req.body;

    // Find video
    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'TEST: Video not found'
      });
    }

    // Check if micro-videos already exist
    const existingMicroVideos = await MicroVideo.find({ originalVideoId: videoId });
    if (existingMicroVideos.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'TEST: Micro-videos already exist',
        data: {
          existingCount: existingMicroVideos.length,
          hint: 'Delete existing micro-videos first'
        },
        testMode: true
      });
    }

    // Create or ensure transcript exists
    let transcript = await Transcript.findOne({ videoId });
    if (!transcript) {
      transcript = await createMockTranscript(videoId);
    }

    // Create mock micro-video segments
    const totalDuration = video.originalDuration;
    const segmentCount = Math.min(phases.length, Math.ceil(totalDuration / targetSegmentDuration));
    const microVideos = [];

    for (let i = 0; i < segmentCount; i++) {
      const phase = phases[i % phases.length];
      const startTime = (totalDuration / segmentCount) * i;
      const endTime = (totalDuration / segmentCount) * (i + 1);
      const duration = endTime - startTime;

      const microVideo = new MicroVideo({
        originalVideoId: videoId,
        transcriptId: transcript._id,
        userId: 'test-user-123',
        title: `TEST: ${video.title} - ${phase.charAt(0).toUpperCase() + phase.slice(1)} (${i + 1})`,
        sequence: i + 1,
        timeRange: {
          startTime,
          endTime,
          duration
        },
        cltBlmScript: {
          [phase]: {
            content: `Mock ${phase} phase content for testing. This is segment ${i + 1} covering ${phase} learning objectives.`,
            purpose: `${phase} phase content`,
            keyObjectives: [`Test objective ${i + 1}`, `${phase} learning goal`],
            estimatedDuration: duration
          }
        },
        keypoints: [
          {
            label: `Key Point ${i + 1}`,
            description: `Test keypoint for ${phase} phase`,
            weight: 0.8,
            bloomLevel: ['remember', 'understand', 'apply', 'analyze'][i % 4]
          },
          {
            label: `Secondary Point ${i + 1}`,
            description: `Additional concept for ${phase}`,
            weight: 0.6,
            bloomLevel: ['understand', 'apply', 'analyze', 'evaluate'][i % 4]
          }
        ],
        generatedScript: `Enhanced script for ${phase} phase. This contains the educational content optimized for micro-learning.`,
        processingStatus: 'segmented',
        segmentationMethod: segmentationMethod
      });

      await microVideo.save();
      microVideos.push(microVideo);
    }

    // Update video status
    await Video.findByIdAndUpdate(videoId, {
      processingStatus: 'segmented'
    });

    console.log(`✅ TEST: Created ${microVideos.length} micro-video segments`);

    res.json({
      success: true,
      message: '🧪 TEST: Micro-video segmentation completed successfully',
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
        testMode: true
      }
    });

  } catch (error) {
    console.error('❌ TEST: Micro-video segmentation error:', error);
    res.status(500).json({
      success: false,
      message: 'TEST: Failed to create micro-video segmentation',
      error: error.message
    });
  }
};

/**
 * TEST ROUTE: Render micro-video (simulated)
 */
const testRenderMicroVideo = async (req, res) => {
  try {
    console.log('🧪 TEST: Starting micro-video rendering...');

    const { microVideoId } = req.params;
    const {
      voice = 'alloy',
      outputFormat = 'mp4',
      quality = 'high',
      includeSubtitles = true,
      customizations = {}
    } = req.body;

    // Find micro-video
    const microVideo = await MicroVideo.findById(microVideoId);
    if (!microVideo) {
      return res.status(404).json({
        success: false,
        message: 'TEST: Micro-video not found'
      });
    }

    // Check if already rendering
    if (microVideo.processingStatus === 'rendering') {
      return res.status(409).json({
        success: false,
        message: 'TEST: Micro-video is already being rendered',
        testMode: true
      });
    }

    // Update status to rendering
    microVideo.processingStatus = 'rendering';
    microVideo.renderingStarted = new Date();
    await microVideo.save();

    // Simulate rendering process
    setTimeout(async () => {
      try {
        await MicroVideo.findByIdAndUpdate(microVideoId, {
          processingStatus: 'rendered',
          renderingCompleted: new Date(),
          outputFiles: [{
            format: outputFormat,
            filePath: `/test/uploads/rendered/test_${microVideoId}.${outputFormat}`,
            fileName: `test_micro_video_${microVideoId}.${outputFormat}`,
            fileSize: 5242880, // 5MB simulated
            duration: 60,
            createdAt: new Date()
          }]
        });
        console.log(`✅ TEST: Rendering completed for micro-video: ${microVideoId}`);
      } catch (error) {
        console.error(`❌ TEST: Simulated rendering failed: ${error.message}`);
        await MicroVideo.findByIdAndUpdate(microVideoId, {
          processingStatus: 'failed',
          renderingError: error.message
        });
      }
    }, 3000); // 3 second simulation

    res.json({
      success: true,
      message: '🧪 TEST: Micro-video rendering started (simulated)',
      data: {
        microVideoId,
        title: microVideo.title,
        status: 'rendering',
        estimatedTime: '3 seconds (simulated)',
        renderConfig: {
          voice,
          outputFormat,
          quality,
          includeSubtitles,
          customizations
        },
        statusEndpoint: `/api/test-videos/microvideo/${microVideoId}/status`,
        downloadEndpoint: `/api/test-videos/microvideo/${microVideoId}/download`,
        testMode: true
      }
    });

  } catch (error) {
    console.error('❌ TEST: Micro-video rendering error:', error);
    res.status(500).json({
      success: false,
      message: 'TEST: Failed to start micro-video rendering',
      error: error.message
    });
  }
};

/**
 * TEST ROUTE: Get rendering status
 */
const testGetRenderingStatus = async (req, res) => {
  try {
    console.log('🧪 TEST: Getting rendering status...');

    const { microVideoId } = req.params;

    const microVideo = await MicroVideo.findById(microVideoId);
    if (!microVideo) {
      return res.status(404).json({
        success: false,
        message: 'TEST: Micro-video not found'
      });
    }

    // Calculate progress
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

    const progress = getProgressPercentage(microVideo.processingStatus);

    res.json({
      success: true,
      message: '🧪 TEST: Rendering status retrieved successfully',
      data: {
        microVideoId,
        title: microVideo.title,
        status: microVideo.processingStatus,
        progress: progress,
        progressText: getProgressText(microVideo.processingStatus),
        renderingStarted: microVideo.renderingStarted,
        renderingCompleted: microVideo.renderingCompleted,
        renderingDetails: {
          phase: getCurrentRenderingPhase(microVideo.processingStatus),
          error: microVideo.renderingError || null,
          outputFiles: microVideo.outputFiles || []
        },
        actions: {
          canCancel: microVideo.processingStatus === 'rendering',
          canRetry: microVideo.processingStatus === 'failed',
          canDownload: microVideo.processingStatus === 'rendered',
          downloadUrl: microVideo.processingStatus === 'rendered' ? 
            `/api/test-videos/microvideo/${microVideoId}/download` : null
        },
        testMode: true
      }
    });

  } catch (error) {
    console.error('❌ TEST: Get rendering status error:', error);
    res.status(500).json({
      success: false,
      message: 'TEST: Failed to get rendering status',
      error: error.message
    });
  }
};

/**
 * TEST ROUTE: Download rendered video (simulated)
 */
const testDownloadRenderedVideo = async (req, res) => {
  try {
    console.log('🧪 TEST: Simulating video download...');

    const { microVideoId } = req.params;
    const { format = 'mp4' } = req.query;

    const microVideo = await MicroVideo.findById(microVideoId);
    if (!microVideo) {
      return res.status(404).json({
        success: false,
        message: 'TEST: Micro-video not found'
      });
    }

    if (microVideo.processingStatus !== 'rendered') {
      return res.status(400).json({
        success: false,
        message: 'TEST: Video is not ready for download',
        data: {
          status: microVideo.processingStatus,
          hint: 'Video needs to be rendered first'
        },
        testMode: true
      });
    }

    // Simulate download (return mock file info)
    const outputFiles = microVideo.outputFiles || [];
    const requestedFile = outputFiles.find(file => file.format === format);

    if (!requestedFile) {
      return res.status(404).json({
        success: false,
        message: `TEST: Video format '${format}' not available`,
        data: {
          availableFormats: outputFiles.map(f => f.format),
          testMode: true
        }
      });
    }

    // Instead of actual file, return download simulation info
    res.json({
      success: true,
      message: '🧪 TEST: Video download simulation',
      data: {
        microVideoId,
        downloadInfo: {
          fileName: requestedFile.fileName,
          fileSize: requestedFile.fileSize,
          duration: requestedFile.duration,
          format: requestedFile.format,
          filePath: requestedFile.filePath
        },
        simulatedDownload: true,
        note: 'In real environment, this would return the actual video file',
        testMode: true
      }
    });

  } catch (error) {
    console.error('❌ TEST: Video download error:', error);
    res.status(500).json({
      success: false,
      message: 'TEST: Failed to simulate video download',
      error: error.message
    });
  }
};

// ============================================================================
// Helper Functions for Test Controllers
// ============================================================================

const createMockTranscript = async (videoId) => {
  const transcript = new Transcript({
    videoId: videoId,
    extractionMethod: 'test-mock',
    language: { code: 'en' },
    segments: [
      {
        startTime: 0,
        endTime: 30,
        text: 'Welcome to this educational video. Today we will explore important concepts.',
        confidence: 0.95,
        keyTopics: ['introduction', 'overview'],
        importance: 0.8,
        cltPhase: 'prepare'
      },
      {
        startTime: 30,
        endTime: 60,
        text: 'Let us define our learning objectives and understand what we aim to achieve.',
        confidence: 0.92,
        keyTopics: ['objectives', 'goals'],
        importance: 0.9,
        cltPhase: 'initiate'
      },
      {
        startTime: 60,
        endTime: 150,
        text: 'Now we dive into the main content. Here are the key principles and detailed explanations.',
        confidence: 0.88,
        keyTopics: ['main content', 'principles'],
        importance: 0.95,
        cltPhase: 'deliver'
      },
      {
        startTime: 150,
        endTime: 180,
        text: 'To summarize, we have covered all the essential points. Let us review what we learned.',
        confidence: 0.91,
        keyTopics: ['summary', 'review'],
        importance: 0.85,
        cltPhase: 'end'
      }
    ],
    fullText: 'Welcome to this educational video. Today we will explore important concepts. Let us define our learning objectives and understand what we aim to achieve. Now we dive into the main content. Here are the key principles and detailed explanations. To summarize, we have covered all the essential points. Let us review what we learned.',
    processingStatus: 'completed',
    quality: {
      overallConfidence: 0.91,
      wordCount: 45,
      segmentCount: 4
    }
  });

  await transcript.save();
  return transcript;
};

const generateMockCLTBLMScript = (videoTitle, targetDuration, difficultyLevel) => {
  return {
    prepare: {
      content: `Welcome to this ${difficultyLevel} level lesson on ${videoTitle}. We're about to embark on a focused learning journey that will enhance your understanding of key concepts.`,
      purpose: 'Set context and prepare the learner',
      keyObjectives: ['Orient learner', 'Establish context'],
      estimatedDuration: targetDuration * 0.15
    },
    initiate: {
      content: `By the end of this micro-learning session, you will be able to understand core principles, apply key concepts, and analyze the main components discussed in ${videoTitle}.`,
      purpose: 'Establish learning objectives',
      keyObjectives: ['Define goals', 'Set expectations'],
      estimatedDuration: targetDuration * 0.2
    },
    deliver: {
      content: `Let's explore the main concepts. The fundamental principles include systematic understanding, practical application, and critical analysis. Each element builds upon the previous one to create comprehensive knowledge.`,
      purpose: 'Deliver core educational content',
      keyObjectives: ['Present main content', 'Explain concepts', 'Provide examples'],
      estimatedDuration: targetDuration * 0.5
    },
    end: {
      content: `To conclude, we have examined the essential aspects of ${videoTitle}. Remember to apply these principles in practice and continue exploring related topics for deeper understanding.`,
      purpose: 'Summarize and reinforce learning',
      keyObjectives: ['Summarize key points', 'Reinforce learning', 'Encourage application'],
      estimatedDuration: targetDuration * 0.15
    },
    contentAnalysis: {
      subject: 'Test Subject',
      difficulty: difficultyLevel,
      keyTopics: ['concept analysis', 'practical application', 'systematic understanding']
    }
  };
};

const testCreateMockTranscriptAndMicroVideos = async (videoId) => {
  try {
    // Create mock transcript
    const transcript = await createMockTranscript(videoId);
    
    // Create mock micro-videos
    const phases = ['prepare', 'initiate', 'deliver', 'end'];
    const video = await Video.findById(videoId);
    
    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];
      const startTime = (video.originalDuration / phases.length) * i;
      const endTime = (video.originalDuration / phases.length) * (i + 1);
      
      const microVideo = new MicroVideo({
        originalVideoId: videoId,
        transcriptId: transcript._id,
        userId: 'test-user-123',
        title: `TEST: ${video.title} - ${phase.charAt(0).toUpperCase() + phase.slice(1)} (${i + 1})`,
        sequence: i + 1,
        timeRange: {
          startTime,
          endTime,
          duration: endTime - startTime
        },
        cltBlmScript: {
          [phase]: {
            content: `Mock ${phase} content for testing`,
            purpose: `${phase} phase`,
            keyObjectives: [`Test ${phase} objective`],
            estimatedDuration: endTime - startTime
          }
        },
        keypoints: [{
          label: `${phase} keypoint`,
          description: `Test keypoint for ${phase}`,
          weight: 0.8,
          bloomLevel: 'understand'
        }],
        generatedScript: `Enhanced ${phase} script for testing`,
        processingStatus: 'completed'
      });
      
      await microVideo.save();
    }
    
    // Update video status
    await Video.findByIdAndUpdate(videoId, {
      processingStatus: 'completed'
    });
    
    console.log(`✅ TEST: Mock data created for video: ${videoId}`);
  } catch (error) {
    console.error('❌ TEST: Failed to create mock data:', error);
  }
};

const calculateTotalWords = (cltBlmScript) => {
  const phases = ['prepare', 'initiate', 'deliver', 'end'];
  return phases.reduce((total, phase) => {
    const content = cltBlmScript[phase]?.content || '';
    return total + content.split(/\s+/).length;
  }, 0);
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

module.exports = {
  testProcessYouTubeURL,
  testGetVideoStatus,
  testGetMicroVideo,
  testPreviewTTS,
  // Phase 1A Test Controllers
  testUploadVideo,
  testGenerateCltBlmScript,
  testGetCltBlmScript,
  testCreateMicroVideoSegmentation,
  testRenderMicroVideo,
  testGetRenderingStatus,
  testDownloadRenderedVideo
};