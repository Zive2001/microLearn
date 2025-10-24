// routes/test-transcript.js - Test transcript data for micro videos
const express = require('express');
const MicroVideo = require('../models/MicroVideo');
const Video = require('../models/Video');

const router = express.Router();

// @desc    Get detailed transcript data for a micro-video
// @route   GET /api/test-transcript/:microVideoId
// @access  Public (for testing)
router.get('/:microVideoId', async (req, res) => {
    try {
        const { microVideoId } = req.params;

        const microVideo = await MicroVideo.findById(microVideoId);
        if (!microVideo) {
            return res.status(404).json({
                success: false,
                message: 'Micro-video not found'
            });
        }

        const parentVideo = await Video.findById(microVideo.originalVideoId);

        res.json({
            success: true,
            data: {
                microVideoInfo: {
                    id: microVideo._id,
                    title: microVideo.title,
                    sequence: microVideo.sequence,
                    duration: microVideo.timeRange.duration
                },

                // CURRENT TRANSCRIPT DATA AVAILABLE
                transcriptData: {
                    segmentTranscript: microVideo.segmentTranscript,
                    educationalScript: microVideo.cltBlmScript.educationalScript,
                    learningObjective: microVideo.cltBlmScript.learningObjective,
                    keypoints: microVideo.cltBlmScript.keypoints,
                    practicalExample: microVideo.cltBlmScript.practicalExample,
                    visualCues: microVideo.cltBlmScript.visualCues
                },

                // PARENT VIDEO DATA
                parentVideoData: {
                    originalTranscript: parentVideo ? parentVideo.transcript : null,
                    topic: parentVideo ? parentVideo.topic : null
                },

                // READY FOR PHASE 2B
                readyForVideoGeneration: {
                    hasEducationalScript: !!microVideo.cltBlmScript.educationalScript,
                    hasLearningContent: !!microVideo.cltBlmScript.learningObjective,
                    hasVisualCues: microVideo.cltBlmScript.visualCues && microVideo.cltBlmScript.visualCues.length > 0,
                    scriptWordCount: microVideo.cltBlmScript.educationalScript ? microVideo.cltBlmScript.educationalScript.split(' ').length : 0
                }
            }
        });

    } catch (error) {
        console.error('Error getting transcript data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get transcript data',
            error: error.message
        });
    }
});

// @desc    Get all micro-videos with transcript readiness
// @route   GET /api/test-transcript/video/:videoId/readiness
// @access  Public (for testing)
router.get('/video/:videoId/readiness', async (req, res) => {
    try {
        const { videoId } = req.params;

        const microVideos = await MicroVideo.find({ originalVideoId: videoId });
        const parentVideo = await Video.findById(videoId);

        const readinessReport = microVideos.map(mv => ({
            id: mv._id,
            title: mv.title,
            sequence: mv.sequence,

            // Check what we have for video generation
            videoGenerationReadiness: {
                hasEducationalScript: !!mv.cltBlmScript.educationalScript,
                scriptLength: mv.cltBlmScript.educationalScript ? mv.cltBlmScript.educationalScript.length : 0,
                scriptWordCount: mv.cltBlmScript.educationalScript ? mv.cltBlmScript.educationalScript.split(' ').length : 0,
                hasVisualCues: mv.cltBlmScript.visualCues && mv.cltBlmScript.visualCues.length > 0,
                visualCuesCount: mv.cltBlmScript.visualCues ? mv.cltBlmScript.visualCues.length : 0,
                estimatedSpeechDuration: mv.cltBlmScript.educationalScript ? Math.ceil(mv.cltBlmScript.educationalScript.split(' ').length / 150) + ' minutes' : '0 minutes', // ~150 words per minute

                readyForTTS: !!mv.cltBlmScript.educationalScript && mv.cltBlmScript.educationalScript.length > 50
            },

            // Show the actual script preview
            scriptPreview: mv.cltBlmScript.educationalScript ?
                mv.cltBlmScript.educationalScript.substring(0, 200) + '...' :
                'No educational script available'
        }));

        res.json({
            success: true,
            data: {
                parentVideo: {
                    id: parentVideo._id,
                    title: parentVideo.title,
                    topic: parentVideo.topic,
                    hasOriginalTranscript: !!parentVideo.transcript
                },
                microVideosCount: microVideos.length,
                microVideos: readinessReport,

                // OVERALL READINESS FOR PHASE 2B
                phase2BReadiness: {
                    totalMicroVideos: microVideos.length,
                    readyForTTS: readinessReport.filter(mv => mv.videoGenerationReadiness.readyForTTS).length,
                    averageScriptLength: Math.round(readinessReport.reduce((acc, mv) => acc + mv.videoGenerationReadiness.scriptWordCount, 0) / microVideos.length),
                    nextSteps: [
                        'Text-to-Speech conversion of educational scripts',
                        'Visual content generation based on visual cues',
                        'Video assembly with synchronized audio and visuals'
                    ]
                }
            }
        });

    } catch (error) {
        console.error('Error getting readiness report:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get readiness report',
            error: error.message
        });
    }
});

module.exports = router;