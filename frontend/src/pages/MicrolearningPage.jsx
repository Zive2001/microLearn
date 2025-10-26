import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  ArrowLeft as ArrowLeftIcon,
  Play as PlayIcon,
  Clock as ClockIcon,
  Brain as BrainIcon,
  Target as TargetIcon,
  CheckCircle as CheckCircleIcon,
  BookOpen as BookOpenIcon,
  Award as AwardIcon
} from 'lucide-react';
import { mockMicrolearningAPI } from '../services/api';
import Loading from '../components/Loading';
import toast from 'react-hot-toast';

const MicrolearningPage = () => {
  const { videoId, topic } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // State for microlearning content and quiz progression
  const [microlearningContent, setMicrolearningContent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [quizProgression, setQuizProgression] = useState({
    completedQuizzes: [],
    availableQuizzes: [],
    finalQuizAvailable: true, // Final quiz is always available
    unlockedSegments: 3 // All segments are unlocked from start
  });

  // Load microlearning content on component mount
  useEffect(() => {
    loadMicrolearningContent();
  }, [videoId]);

  // Handle quiz completion when returning from quiz
  useEffect(() => {
    if (location.state?.quizCompleted) {
      const { quizType, quizResults, completedSegment } = location.state;
      console.log('🎯 Quiz completed:', quizType, quizResults, 'Segment:', completedSegment);

      if (quizType === 'intermediate') {
        toast.success('Intermediate quiz completed! 🎉');
      } else if (quizType === 'final') {
        toast.success('Final quiz completed! Excellent work! 🏆');
      }

      // Find and mark the completed quiz
      setQuizProgression(prev => {
        // Find the current active intermediate quiz (the one that was just completed)
        let quizId;
        if (quizType === 'final') {
          quizId = 'final';
        } else {
          // For intermediate quizzes, we need to find which one was completed
          // Use the completedSegment information if available, otherwise fall back to the old logic
          if (completedSegment) {
            quizId = `intermediate-${completedSegment}`;
          } else {
            // Fallback: Find the first available intermediate quiz that's not completed
            const activeQuiz = prev.availableQuizzes.find(q => q.type === 'intermediate' && q.available && !q.completed);
            quizId = activeQuiz?.id;
            
            // If we can't find it by availability, try to find by segment number
            if (!quizId) {
              // Find the quiz that corresponds to the current unlocked segment
              const currentSegmentQuiz = prev.availableQuizzes.find(q => 
                q.type === 'intermediate' && 
                q.segmentNumber === prev.unlockedSegments && 
                !q.completed
              );
              quizId = currentSegmentQuiz?.id;
            }
          }
        }

        if (quizId) {
          const completedQuiz = prev.availableQuizzes.find(q => q.id === quizId);
          console.log('🎯 Found completed quiz:', {
            quizId,
            completedQuiz: completedQuiz ? {
              id: completedQuiz.id,
              title: completedQuiz.title,
              segmentNumber: completedQuiz.segmentNumber,
              type: completedQuiz.type
            } : null,
            quizType,
            completedSegment
          });
          
          const updatedQuizzes = prev.availableQuizzes.map(quiz =>
            quiz.id === quizId ? { ...quiz, completed: true, results: quizResults } : quiz
          );

          let newUnlockedSegments = prev.unlockedSegments;
          let finalQuizAvailable = prev.finalQuizAvailable;

          // No progressive unlocking - all content is always available
          if (quizType === 'intermediate' && completedQuiz) {
            toast.success(`Quiz ${completedQuiz.segmentNumber} completed! 🎯`);
          }

          return {
            ...prev,
            availableQuizzes: updatedQuizzes,
            completedQuizzes: [...prev.completedQuizzes, quizId],
            unlockedSegments: newUnlockedSegments,
            finalQuizAvailable
          };
        } else {
          console.warn('⚠️ Could not identify completed quiz:', {
            quizType,
            completedSegment,
            availableQuizzes: prev.availableQuizzes.map(q => ({
              id: q.id,
              type: q.type,
              segmentNumber: q.segmentNumber,
              available: q.available,
              completed: q.completed
            }))
          });
        }
      });

      // Clear the navigation state
      navigate(location.pathname, { replace: true });
    }
  }, [location.state]);

  const loadMicrolearningContent = async () => {
    try {
      setIsLoading(true);
      console.log('🎬 Loading microlearning content for video:', videoId);

      // PHASE 2: Check if keypoints provided (from KeypointSelectionModal)
      const hasKeypoints = location.state?.keypoints && location.state?.keypoints.length > 0;

      let content;

      if (hasKeypoints) {
        // NEW: Prepare for Phase 3 generation with keypoints
        console.log('🎯 Keypoint-based generation will happen in Phase 3');
        console.log('Keypoints:', location.state.keypoints);
        console.log('Teacher:', location.state.teacher);

        // For now, show loading - Phase 3 will add actual generation
        toast.info('Preparing to generate personalized content...');

        // Fallback for now - will be replaced by Phase 3 generation
        const videoTitle = location.state?.videoTitle || `Tutorial Video ${videoId}`;
        content = await mockMicrolearningAPI.generateMicrolearningContent(
          videoId,
          videoTitle,
          location.state.keypoints.length // Generate videos matching keypoint count
        );

        if (content) {
          // Store keypoint info in content for quiz system
          content.selectedKeypoints = location.state.keypoints;
          content.teacher = location.state.teacher;
          await mockMicrolearningAPI.storeMicrolearningContent(videoId, content);
          toast.success('Learning content prepared! 🎯');
        }
      } else {
        // FALLBACK: Use mock data if no keypoints (existing behavior)
        console.log('🔄 Using standard microlearning content generation...');
        let existingContent = await mockMicrolearningAPI.getMicrolearningContent(videoId);

        if (!existingContent) {
          const videoTitle = location.state?.videoTitle || location.state?.videoData?.title || `Tutorial Video ${videoId}`;
          existingContent = await mockMicrolearningAPI.generateMicrolearningContent(
            videoId,
            videoTitle,
            9 // Explicitly generate 9 micro-videos
          );

          if (existingContent) {
            await mockMicrolearningAPI.storeMicrolearningContent(videoId, existingContent);
            toast.success('Microlearning content generated successfully! 🎯');
          }
        }
        content = existingContent;
      }

      if (content) {
        setMicrolearningContent(content);
        initializeQuizProgression(content);
      } else {
        throw new Error('Failed to generate microlearning content');
      }

    } catch (error) {
      console.error('❌ Error loading microlearning content:', error);
      toast.error('Failed to load microlearning content');
      navigate(-1);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeQuizProgression = (content) => {
    const microVideos = content.microVideos || [];
    const totalVideos = microVideos.length;

    // Calculate number of intermediate quizzes (every 3 videos)
    const intermediateQuizCount = Math.floor(totalVideos / 3);
    const availableQuizzes = [];

    // Create intermediate quiz entries - all available from start
    for (let i = 0; i < intermediateQuizCount; i++) {
      const startIndex = i * 3;
      const endIndex = Math.min(startIndex + 3, totalVideos);
      const videosInQuiz = microVideos.slice(startIndex, endIndex);

      availableQuizzes.push({
        id: `intermediate-${i + 1}`,
        type: 'intermediate',
        title: `Quiz ${i + 1}: Videos ${startIndex + 1}-${endIndex}`,
        description: `Test your understanding of ${videosInQuiz.map(v => v.title).join(', ')}`,
        videoIndices: Array.from({ length: endIndex - startIndex }, (_, idx) => startIndex + idx),
        microVideos: videosInQuiz,
        completed: false,
        available: true, // All quizzes are available from the start
        segmentNumber: i + 1 // Add segment number for tracking
      });
    }

    // Add final quiz - available from start
    availableQuizzes.push({
      id: 'final',
      type: 'final',
      title: 'Final Comprehensive Quiz',
      description: `Master all concepts from this ${totalVideos}-part tutorial`,
      videoIndices: Array.from({ length: totalVideos }, (_, idx) => idx),
      microVideos: microVideos,
      completed: false,
      available: true // Available from the start
    });

    setQuizProgression({
      completedQuizzes: [],
      availableQuizzes,
      finalQuizAvailable: true, // Final quiz is always available
      unlockedSegments: 3 // All segments are unlocked from start
    });

    console.log('✅ Quiz system initialized:', {
      totalVideos,
      intermediateQuizCount,
      availableQuizzes: availableQuizzes.length,
      allContentUnlocked: true
    });
  };

  const handleQuizStart = async (quiz) => {
    try {
      console.log('🎯 Starting quiz:', quiz.title);

      if (quiz.type === 'intermediate') {
        toast.success(`Starting ${quiz.title}! 🎯`);
      } else {
        toast.success('Starting Final Quiz! Good luck! 🏆');
      }

      // Navigate to quiz page with microlearning context
      navigate(`/app/quiz/start/${videoId}`, {
        state: {
          fromMicrolearning: true,
          quizType: quiz.type,
          microVideos: quiz.microVideos,
          microlearningContent: microlearningContent,
          quizTitle: quiz.title
        }
      });

    } catch (error) {
      console.error('❌ Error starting quiz:', error);
      toast.error('Failed to start quiz. Please try again.');
    }
  };

  const handleQuizCompletion = (quizId, results) => {
    setQuizProgression(prev => {
      const updatedQuizzes = prev.availableQuizzes.map(quiz =>
        quiz.id === quizId ? { ...quiz, completed: true, results } : quiz
      );

      // Check if all intermediate quizzes are completed
      const intermediateQuizzes = updatedQuizzes.filter(q => q.type === 'intermediate');
      const completedIntermediateCount = intermediateQuizzes.filter(q => q.completed).length;
      const finalQuizAvailable = completedIntermediateCount === intermediateQuizzes.length;

      // Enable final quiz if all intermediate quizzes are completed
      if (finalQuizAvailable) {
        updatedQuizzes.forEach(quiz => {
          if (quiz.type === 'final') {
            quiz.available = true;
          }
        });
      }

      return {
        ...prev,
        availableQuizzes: updatedQuizzes,
        completedQuizzes: [...prev.completedQuizzes, quizId],
        finalQuizAvailable
      };
    });
  };


  const renderMicroVideo = (microVideo, index) => (
    <div
      key={microVideo.id}
      className="bg-white rounded-lg shadow-sm border border-[#E9E9E7] overflow-hidden hover:shadow-md transition-all"
    >
      {/* Video Thumbnail */}
      <div className="relative aspect-video bg-gradient-to-br from-[#212529] to-[#495057]">
        <div className="w-full h-full flex items-center justify-center">
          <PlayIcon className="h-12 w-12 text-white/80" />
        </div>

        {/* Video Info Overlay */}
        <div className="absolute top-2 left-2 bg-black/75 text-white text-xs px-2 py-1 rounded">
          {index + 1} of {microlearningContent.microVideos.length}
        </div>

        <div className="absolute bottom-2 right-2 bg-black/75 text-white text-xs px-2 py-1 rounded flex items-center">
          <ClockIcon className="h-3 w-3 mr-1" />
          {microVideo.duration}
        </div>
      </div>

      {/* Video Content */}
      <div className="p-4">
        <h3 className="text-sm font-semibold text-[#37352F] mb-2 line-clamp-2">
          {microVideo.title}
        </h3>

        <p className="text-xs text-[#6B6B6B] mb-3 line-clamp-2">
          {microVideo.summary}
        </p>

        {/* Difficulty and Cognitive Load */}
        <div className="flex items-center justify-between mb-3">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
            microVideo.difficulty === 'Beginner' ? 'bg-green-100 text-green-800 border-green-200' :
            microVideo.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
            'bg-red-100 text-red-800 border-red-200'
          }`}>
            {microVideo.difficulty}
          </span>

          <div className="flex items-center text-xs text-[#6B6B6B]">
            <BrainIcon className="h-3 w-3 mr-1" />
            Load: {microVideo.cognitiveLoad}/10
          </div>
        </div>

        {/* Key Points */}
        {microVideo.keyPoints && microVideo.keyPoints.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs text-[#6B6B6B] font-medium">Key Points:</div>
            <div className="flex flex-wrap gap-1">
              {microVideo.keyPoints.slice(0, 2).map((point, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-[#F7F6F3] text-[#6B6B6B]"
                >
                  {point}
                </span>
              ))}
              {microVideo.keyPoints.length > 2 && (
                <span className="text-xs text-[#6B6B6B]">
                  +{microVideo.keyPoints.length - 2} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderQuizButton = (quiz) => {
    const isCompleted = quiz.completed;
    const isAvailable = quiz.available;
    const isFinal = quiz.type === 'final';

    return (
      <div
        key={quiz.id}
        className={`p-6 rounded-xl border-2 transition-all ${
          isCompleted
            ? 'bg-green-50 border-green-200'
            : isAvailable
              ? 'bg-white border-[#212529] hover:shadow-md'
              : 'bg-gray-50 border-gray-200'
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              {isFinal ? (
                <AwardIcon className={`h-5 w-5 ${isCompleted ? 'text-green-600' : isAvailable ? 'text-[#212529]' : 'text-gray-400'}`} />
              ) : (
                <TargetIcon className={`h-5 w-5 ${isCompleted ? 'text-green-600' : isAvailable ? 'text-[#212529]' : 'text-gray-400'}`} />
              )}

              <h3 className={`text-lg font-semibold ${
                isCompleted ? 'text-green-800' : isAvailable ? 'text-[#37352F]' : 'text-gray-500'
              }`}>
                {quiz.title}
              </h3>

              {isCompleted && (
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
              )}
            </div>

            <p className={`text-sm mb-4 ${
              isCompleted ? 'text-green-700' : isAvailable ? 'text-[#6B6B6B]' : 'text-gray-500'
            }`}>
              {quiz.description}
            </p>


            <div className="flex items-center space-x-4">
              <button
                onClick={() => handleQuizStart(quiz)}
                disabled={!isAvailable}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  isCompleted
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : isAvailable
                      ? isFinal
                        ? 'bg-gradient-to-r from-purple-600 to-[#212529] text-white hover:from-purple-700 hover:to-[#495057]'
                        : 'bg-[#212529] text-white hover:bg-[#495057]'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isCompleted ? (isFinal ? 'Retake Final Quiz' : 'Retake Quiz') : 'Start Quiz'}
              </button>

              <div className="text-sm text-[#6B6B6B]">
                {isFinal ? '15 questions' : `${quiz.microVideos?.length || 3} videos covered`}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return <Loading fullScreen text="Loading microlearning content..." />;
  }

  if (!microlearningContent) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm border border-[#E9E9E7] p-8 max-w-md text-center">
          <h2 className="text-lg font-semibold text-[#37352F] mb-2">Content Not Available</h2>
          <p className="text-[#6B6B6B] mb-4">
            Unable to load microlearning content for this video.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center px-4 py-2 bg-[#212529] text-white rounded-lg hover:bg-[#495057] transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      {/* CSS for highlight animations */}
      <style>{`
        .highlight-new-segment {
          animation: pulse-blue 2s ease-in-out;
          border: 2px solid #212529;
          border-radius: 12px;
        }

        .highlight-final-quiz {
          animation: pulse-gold 2s ease-in-out;
          border: 2px solid #f59e0b;
          border-radius: 12px;
        }

        @keyframes pulse-blue {
          0%, 100% { box-shadow: 0 0 0 0 rgba(35, 131, 226, 0.7); }
          50% { box-shadow: 0 0 0 10px rgba(35, 131, 226, 0); }
        }

        @keyframes pulse-gold {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7); }
          50% { box-shadow: 0 0 0 10px rgba(245, 158, 11, 0); }
        }
      `}</style>
      {/* Header */}
      <div className="bg-white border-b border-[#E9E9E7] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center text-[#6B6B6B] hover:text-[#212529] transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                Back to Recommendations
              </button>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-sm text-[#6B6B6B]">
                {microlearningContent.microVideos?.length || 0} micro-videos
              </div>
              <div className="text-sm text-[#6B6B6B]">
                Est. {microlearningContent.analytics?.estimatedLearningTime || '15-20 minutes'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Title Section */}
        <div className="bg-white rounded-xl shadow-sm border border-[#E9E9E7] p-8 mb-8">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-gradient-to-br from-[#212529] to-[#495057] rounded-xl flex items-center justify-center">
                <BookOpenIcon className="h-8 w-8 text-white" />
              </div>
            </div>

            <div className="flex-1">
              <h1 className="text-3xl font-bold text-[#37352F] mb-2">
                {microlearningContent.originalTitle}
              </h1>

              <p className="text-lg text-[#6B6B6B] mb-4">
                Interactive microlearning with progressive quizzes
              </p>

              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <ClockIcon className="h-5 w-5 text-[#6B6B6B]" />
                  <span className="text-sm text-[#6B6B6B]">
                    Total: {microlearningContent.analytics?.totalDuration}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <BrainIcon className="h-5 w-5 text-[#6B6B6B]" />
                  <span className="text-sm text-[#6B6B6B]">
                    Avg Load: {microlearningContent.analytics?.averageCognitiveLoad}/10
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <TargetIcon className="h-5 w-5 text-[#6B6B6B]" />
                  <span className="text-sm text-[#6B6B6B]">
                    {quizProgression.availableQuizzes.filter(q => q.type === 'intermediate').length} Quizzes + Final
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Micro-Videos with Progressive Quiz Layout */}
        <div className="bg-white rounded-xl shadow-sm border border-[#E9E9E7] p-8 mb-8">
          <h2 className="text-xl font-semibold text-[#37352F] mb-6">
            Microlearning Videos
          </h2>

          {/* Segment-based Video Display */}
          {(() => {
            const totalSegments = Math.ceil((microlearningContent.microVideos?.length || 0) / 3);
            return Array.from({ length: totalSegments }, (_, idx) => idx + 1);
          })().map(segmentNumber => {
            const startIndex = (segmentNumber - 1) * 3;
            const endIndex = Math.min(startIndex + 3, microlearningContent.microVideos?.length || 0);
            const segmentVideos = microlearningContent.microVideos?.slice(startIndex, endIndex) || [];
            const isUnlocked = true; // All segments are always unlocked
            const correspondingQuiz = quizProgression.availableQuizzes.find(q => q.segmentNumber === segmentNumber);

            // Show all segments, but with locked videos for locked segments

            return (
              <div key={segmentNumber} id={`segment-${segmentNumber}`} className="mb-8">
                {/* Segment Header */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-[#37352F] flex items-center space-x-2">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                      correspondingQuiz?.completed ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {segmentNumber}
                    </span>
                    <span>Segment {segmentNumber}: Videos {startIndex + 1}-{endIndex}</span>
                  </h3>

                  {correspondingQuiz?.completed && (
                    <span className="text-sm text-green-600 bg-green-100 px-3 py-1 rounded-full flex items-center space-x-1">
                      <CheckCircleIcon className="h-4 w-4" />
                      <span>Completed</span>
                    </span>
                  )}
                </div>

                {/* Videos Grid for this segment */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                  {segmentVideos.map((microVideo, videoIndex) =>
                    renderMicroVideo(microVideo, startIndex + videoIndex)
                  )}
                </div>

                {/* Quiz Button for this segment */}
                {correspondingQuiz && (
                  <div className="flex justify-center">
                    <div className={`p-4 rounded-xl border-2 w-full max-w-md ${
                      correspondingQuiz.completed
                        ? 'bg-green-50 border-green-200'
                        : correspondingQuiz.available
                          ? 'bg-white border-[#212529]'
                          : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="text-center">
                        <h4 className={`text-lg font-semibold mb-2 ${
                          correspondingQuiz.completed ? 'text-green-800' :
                          correspondingQuiz.available ? 'text-[#37352F]' :
                          'text-gray-500'
                        }`}>
                          {correspondingQuiz.title}
                        </h4>

                        <p className={`text-sm mb-4 ${
                          correspondingQuiz.completed ? 'text-green-700' :
                          correspondingQuiz.available ? 'text-[#6B6B6B]' :
                          'text-gray-500'
                        }`}>
                          {correspondingQuiz.description}
                        </p>

                        <button
                          onClick={() => handleQuizStart(correspondingQuiz)}
                          disabled={!correspondingQuiz.available}
                          className={`px-6 py-3 rounded-lg font-medium transition-colors w-full ${
                            correspondingQuiz.completed
                              ? 'bg-green-600 text-white hover:bg-green-700'
                              : correspondingQuiz.available
                                ? 'bg-[#212529] text-white hover:bg-[#495057]'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          {correspondingQuiz.completed ? 'Retake Quiz' : 'Start Quiz'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Final Quiz Section */}
        <div id="final-quiz-section" className="space-y-6">
          <h2 className="text-2xl font-semibold text-[#37352F]">
            Final Assessment
          </h2>

          <div className="space-y-4">
            {/* Only show the final quiz */}
            {quizProgression.availableQuizzes
              .filter(quiz => quiz.type === 'final')
              .map(quiz => renderQuizButton(quiz))}

            {/* Progress Summary */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg font-semibold text-[#212529]">Learning Progress</span>
                <span className="text-sm text-[#212529]">
                  {quizProgression.completedQuizzes.filter(id => id.startsWith('intermediate')).length} / {Math.ceil((microlearningContent.microVideos?.length || 0) / 3)} quizzes completed
                </span>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                <div
                  className="bg-[#212529] h-3 rounded-full transition-all duration-300"
                  style={{
                    width: `${(quizProgression.completedQuizzes.filter(id => id.startsWith('intermediate')).length / Math.max(1, Math.ceil((microlearningContent.microVideos?.length || 0) / 3))) * 100}%`
                  }}
                ></div>
              </div>

              <div className="text-sm text-[#212529]">
                Track your progress through the {Math.ceil((microlearningContent.microVideos?.length || 0) / 3)} intermediate quizzes and final comprehensive assessment
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MicrolearningPage;