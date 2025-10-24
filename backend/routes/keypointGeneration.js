// routes/keypointGeneration.js
// User-Keypoint-Based Educational Script & Avatar Video Generation
// Users specify what they want to learn → Get focused educational content

const express = require('express');
const { body, validationResult } = require('express-validator');
const { protect } = require('../middleware/auth');
const router = express.Router();

// Services
const keypointScriptGenerationService = require('../services/keypointScriptGenerationService');
const MicroVideo = require('../models/MicroVideo');
const Video = require('../models/Video');

/**
 * @desc    Generate educational scripts and avatar videos from user keypoints
 * @route   POST /api/keypoint-generation/generate
 * @access  Private
 *
 * @example
 * POST /api/keypoint-generation/generate
 * {
 *   "youtubeUrl": "https://youtu.be/W6NZfCO5SIk",
 *   "keypoints": [
 *     "JavaScript variable declaration with let, const, and var",
 *     "Understanding data types in JavaScript",
 *     "Variable scope and hoisting concepts"
 *   ],
 *   "options": {
 *     "teacher": "Ava",
 *     "generateAvatarVideos": true,
 *     "saveToDatabase": true
 *   }
 * }
 */
router.post('/generate', protect, [
    body('youtubeUrl')
        .notEmpty()
        .withMessage('YouTube URL is required')
        .custom((value) => {
            const youtubeRegexes = [
                /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/,
                /^https?:\/\/youtu\.be\/[\w-]+/,
                /^https?:\/\/(www\.)?youtube\.com\/embed\/[\w-]+/,
                /^https?:\/\/m\.youtube\.com\/watch\?v=[\w-]+/
            ];
            if (youtubeRegexes.some(regex => regex.test(value))) {
                return true;
            }
            throw new Error('Must be a valid YouTube URL');
        }),
    body('keypoints')
        .isArray({ min: 3, max: 12 })
        .withMessage('Keypoints must be an array with 3-12 items'),
    body('keypoints.*')
        .isString()
        .isLength({ min: 5, max: 200 })
        .withMessage('Each keypoint must be 5-200 characters'),
    body('options.teacher')
        .optional()
        .isIn(['Ava', 'Andrew', 'Emma', 'Brian', 'Jenny'])
        .withMessage('Invalid teacher selection'),
    body('options.generateAvatarVideos')
        .optional()
        .isBoolean(),
    body('options.saveToDatabase')
        .optional()
        .isBoolean()
], async (req, res) => {
    const startTime = Date.now();

    try {
        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { youtubeUrl, keypoints, options = {} } = req.body;
        const userId = req.user._id;

        console.log('\n🚀 KEYPOINT-BASED GENERATION REQUEST');
        console.log('=' .repeat(70));
        console.log(`📹 YouTube URL: ${youtubeUrl}`);
        console.log(`🔑 Keypoints (${keypoints.length}):`);
        keypoints.forEach((kp, i) => console.log(`   ${i + 1}. ${kp}`));
        console.log(`👤 Teacher: ${options.teacher || 'Ava'}`);
        console.log(`🎬 Generate Videos: ${options.generateAvatarVideos !== false}`);
        console.log(`💾 Save to DB: ${options.saveToDatabase !== false}`);

        // Generate scripts and avatar videos
        const result = await keypointScriptGenerationService.generateFromKeypoints({
            youtubeUrl,
            keypoints,
            options: {
                teacher: options.teacher || 'Ava',
                generateAvatarVideos: options.generateAvatarVideos !== false,
                model: options.model || 'gpt-4'
            }
        });

        // Save to database if requested
        let savedData = null;
        if (options.saveToDatabase !== false) {
            savedData = await saveToDatabaseHelper(
                result,
                youtubeUrl,
                userId,
                options.teacher || 'Ava'
            );
            console.log(`💾 Saved to database: Video ID ${savedData.videoId}`);
        }

        const processingTime = Date.now() - startTime;

        console.log('\n✅ KEYPOINT GENERATION COMPLETED');
        console.log('=' .repeat(70));
        console.log(`⏱️ Processing time: ${Math.round(processingTime / 1000)}s`);
        console.log(`📝 Scripts generated: ${result.scripts.length}`);
        console.log(`📊 Total words: ${result.metadata.totalWords}`);
        console.log(`🎭 Avatar videos: ${result.avatarVideos ? result.avatarVideos.filter(v => !v.failed).length : 0}`);

        res.json({
            success: true,
            message: 'Keypoint-based generation completed successfully',
            data: {
                processingTimeMs: processingTime,
                youtubeVideoId: result.videoContext.youtubeVideoId,
                videoTitle: result.videoContext.title,

                // Generated scripts
                scripts: result.scripts.map(script => ({
                    segmentNumber: script.segmentNumber,
                    keypoint: script.keypoint,
                    title: script.title,
                    educationalScript: script.educationalScript,
                    wordCount: script.wordCount,
                    estimatedDuration: script.estimatedDuration,
                    meetsWordCount: script.meetsWordCount,
                    noTimeWaste: script.noTimeWaste,
                    frameStructure: script.frameStructure
                })),

                // Avatar video data
                avatarVideos: result.avatarVideos ? result.avatarVideos.map(av => ({
                    segmentNumber: av.segmentNumber,
                    keypoint: av.keypoint,
                    title: av.title,
                    teacher: av.teacher,
                    audioBase64: av.audioBase64, // For frontend playback
                    visemes: av.visemes, // For lip-sync
                    duration: av.duration,
                    failed: av.failed || false
                })) : null,

                // Database references
                database: savedData ? {
                    videoId: savedData.videoId,
                    microVideoIds: savedData.microVideoIds
                } : null,

                // Metadata
                metadata: result.metadata,

                // Quality metrics
                quality: {
                    avgWordsPerSegment: result.metadata.avgWordsPerSegment,
                    meetsRequirements: result.scripts.every(s => s.meetsWordCount),
                    noTimeWaste: result.scripts.every(s => s.noTimeWaste),
                    readyForDelivery: result.scripts.every(s => s.readyForAvatar)
                }
            }
        });

    } catch (error) {
        console.error('❌ KEYPOINT GENERATION FAILED:', error);

        res.status(500).json({
            success: false,
            message: 'Keypoint generation failed',
            error: error.message,
            processingTimeMs: Date.now() - startTime
        });
    }
});

/**
 * @desc    Get generated content by video ID
 * @route   GET /api/keypoint-generation/video/:videoId
 * @access  Private
 */
router.get('/video/:videoId', protect, async (req, res) => {
    try {
        const { videoId } = req.params;

        const video = await Video.findById(videoId);
        if (!video) {
            return res.status(404).json({
                success: false,
                message: 'Video not found'
            });
        }

        const microVideos = await MicroVideo.find({ originalVideoId: videoId })
            .sort({ sequence: 1 });

        res.json({
            success: true,
            data: {
                video: {
                    id: video._id,
                    title: video.title,
                    youtubeVideoId: video.youtubeVideoId,
                    sourceUrl: video.sourceUrl,
                    createdAt: video.createdAt
                },
                microVideos: microVideos.map(mv => ({
                    id: mv._id,
                    sequence: mv.sequence,
                    title: mv.title,
                    keypoint: mv.cltBlmScript?.learningObjective || mv.title,
                    educationalScript: mv.cltBlmScript?.educationalScript,
                    wordCount: mv.cltBlmScript?.educationalScript?.split(/\s+/).length || 0,
                    duration: mv.avatarVideoDuration,
                    teacher: mv.avatarTeacher,
                    hasAudio: !!mv.audioFilename,
                    hasVideo: !!mv.avatarVideoPath,
                    frameStructure: mv.cltBlmScript?.frameStructure
                })),
                summary: {
                    totalSegments: microVideos.length,
                    totalWords: microVideos.reduce((sum, mv) =>
                        sum + (mv.cltBlmScript?.educationalScript?.split(/\s+/).length || 0), 0
                    ),
                    totalDuration: microVideos.reduce((sum, mv) =>
                        sum + (mv.avatarVideoDuration || 0), 0
                    )
                }
            }
        });

    } catch (error) {
        console.error('Error fetching video:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch video',
            error: error.message
        });
    }
});

/**
 * @desc    Regenerate avatar video for specific micro-video
 * @route   POST /api/keypoint-generation/regenerate-avatar/:microVideoId
 * @access  Private
 */
router.post('/regenerate-avatar/:microVideoId', protect, [
    body('teacher').optional().isIn(['Ava', 'Andrew', 'Emma', 'Brian', 'Jenny'])
], async (req, res) => {
    try {
        const { microVideoId } = req.params;
        const { teacher } = req.body;

        const microVideo = await MicroVideo.findById(microVideoId);
        if (!microVideo) {
            return res.status(404).json({
                success: false,
                message: 'Micro-video not found'
            });
        }

        const script = microVideo.cltBlmScript?.educationalScript;
        if (!script) {
            return res.status(400).json({
                success: false,
                message: 'No educational script found'
            });
        }

        // Generate new avatar video
        const azureTtsService = require('../services/azureTtsService');
        const teacherName = teacher || microVideo.avatarTeacher || 'Ava';

        const ttsResult = await azureTtsService.generateTTSWithVisemes(script, teacherName);

        // Update micro-video
        microVideo.avatarTeacher = teacherName;
        microVideo.audioFilename = ttsResult.audioPath.split('/').pop();
        microVideo.audioUrl = ttsResult.audioPath;
        microVideo.audioDuration = ttsResult.duration;
        microVideo.avatarVisemesCount = ttsResult.visemes.length;
        microVideo.avatarGeneratedAt = new Date();
        await microVideo.save();

        res.json({
            success: true,
            message: 'Avatar video regenerated successfully',
            data: {
                microVideoId: microVideo._id,
                teacher: teacherName,
                duration: ttsResult.duration,
                visemeCount: ttsResult.visemes.length,
                audioBase64: ttsResult.audioBase64,
                visemes: ttsResult.visemes
            }
        });

    } catch (error) {
        console.error('Error regenerating avatar:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to regenerate avatar video',
            error: error.message
        });
    }
});

/**
 * Helper: Save generated content to database
 */
async function saveToDatabaseHelper(result, youtubeUrl, userId, teacher) {
    console.log('\n💾 Saving to database...');

    // Create main video record
    const video = new Video({
        title: result.videoContext.title + ' (Keypoint-Based)',
        description: `Keypoint-based learning: ${result.scripts.length} focused segments`,
        sourceUrl: youtubeUrl,
        youtubeVideoId: result.videoContext.youtubeVideoId,
        uploadedBy: userId,
        topic: 'custom',
        processingStatus: 'completed',
        transcript: result.videoContext.transcript,
        originalDuration: result.videoContext.duration
    });

    await video.save();
    console.log(`✅ Video saved: ${video._id}`);

    // Create micro-video records
    const microVideoIds = [];
    for (let i = 0; i < result.scripts.length; i++) {
        const script = result.scripts[i];
        const avatarData = result.avatarVideos ? result.avatarVideos[i] : null;

        const microVideo = new MicroVideo({
            originalVideoId: video._id,
            title: script.title,
            sequence: script.segmentNumber,

            // Time range (estimated based on script duration)
            timeRange: {
                startTime: i * 300, // Approximate
                endTime: (i + 1) * 300,
                duration: script.estimatedDuration
            },

            // Educational script
            cltBlmScript: {
                learningObjective: script.keypoint,
                keypoints: [script.keypoint],
                cognitiveLoad: 5,
                educationalScript: script.educationalScript,
                difficulty: 'Intermediate',
                frameStructure: script.frameStructure
            },

            // Avatar data
            ...(avatarData && !avatarData.failed && {
                avatarTeacher: avatarData.teacher,
                avatarVideoDuration: avatarData.duration,
                avatarVisemesCount: avatarData.visemes.length,
                avatarGeneratedAt: new Date(),
                audioProvider: 'azure',
                audioDuration: avatarData.duration
            }),

            processingStatus: 'completed'
        });

        await microVideo.save();
        microVideoIds.push(microVideo._id);
    }

    console.log(`✅ Saved ${microVideoIds.length} micro-videos`);

    return {
        videoId: video._id,
        microVideoIds
    };
}

module.exports = router;
