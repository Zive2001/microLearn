import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft as ArrowLeftIcon,
  Brain as BrainIcon,
  Clock as ClockIcon,
  CheckCircle as CheckCircleIcon,
  AlertCircle as AlertCircleIcon,
  Loader2 as LoaderIcon,
  Play as PlayIcon
} from 'lucide-react';
import { quizAPI, mockMicrolearningAPI, aiQuestionAPI, quizProgressionAPI } from '../services/api';
import Loading from '../components/Loading';
import toast from 'react-hot-toast';

const TutorialQuiz = () => {
  const { sessionId, videoId } = useParams();
  const navigate = useNavigate();

  // Quiz state
  const [quizSession, setQuizSession] = useState(null);
  const [microlearningContent, setMicrolearningContent] = useState(null);
  const [aiQuestions, setAiQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Progression tracking state
  const [quizProgression, setQuizProgression] = useState(null);
  const [currentQuizType, setCurrentQuizType] = useState('intermediate'); // 'intermediate' or 'final'
  const [userAnswers, setUserAnswers] = useState([]);

  // Load quiz session and generate questions
  useEffect(() => {
    loadQuizData();
  }, [sessionId, videoId]);

  const loadQuizData = async () => {
    try {
      setIsLoading(true);

      // If we have sessionId, load existing session
      if (sessionId) {
        console.log('📋 Loading existing quiz session:', sessionId);
        const session = await quizAPI.getQuizSession(sessionId);
        setQuizSession(session);

        // Get microlearning content for this video
        const microlearning = await mockMicrolearningAPI.getMicrolearningContent(session.video?.id || videoId);
        if (microlearning) {
          setMicrolearningContent(microlearning);
          // Generate AI questions from microlearning
          const quiz = await aiQuestionAPI.generateQuizFromMicrolearning(microlearning);
          setAiQuestions(quiz.questions);
        }
      }
      // If starting from videoId, we need to create session first
      else if (videoId) {
        console.log('🎯 Starting new quiz for video:', videoId);

        // Get microlearning content first
        const microlearning = await mockMicrolearningAPI.getMicrolearningContent(videoId);
        if (!microlearning) {
          toast.error('Please generate microlearning content first!');
          navigate(-1);
          return;
        }

        setMicrolearningContent(microlearning);

        // Initialize or get quiz progression
        let progression = quizProgressionAPI.getQuizProgression(videoId);
        if (!progression || progression.totalMicroVideos === 0) {
          progression = quizProgressionAPI.initializeProgression(videoId, microlearning);
        }
        setQuizProgression(progression);

        // Determine current quiz type based on progression
        const availableQuiz = quizProgressionAPI.getCurrentAvailableQuiz(videoId);
        if (availableQuiz) {
          setCurrentQuizType(availableQuiz.sessionType);
          console.log(`🎯 Starting ${availableQuiz.sessionType} quiz:`, availableQuiz);
        }

        // Generate AI questions based on quiz type and progression
        let weakKeyPoints = [];
        if (availableQuiz && availableQuiz.sessionType === 'final') {
          // Get weak key points from intermediate quizzes for adaptive final quiz
          weakKeyPoints = progression.weakKeyPoints || [];
        }

        // Get user's performance history for adaptive difficulty adjustment
        const userPerformanceHistory = progression.completedIntermediateQuizzes.flatMap(quiz =>
          quiz.userAnswers || []
        );

        // Generate quiz with adaptive difficulty if we have performance data
        let quiz;
        if (userPerformanceHistory.length > 0 && availableQuiz?.sessionType === 'intermediate') {
          console.log('🧠 Using adaptive difficulty system based on performance history');
          const adaptiveQuestions = [];

          // Generate adaptive questions for each microlearning segment
          for (const microVideo of microlearning.microVideos) {
            const adaptiveParams = {
              userPerformanceHistory,
              currentAccuracy: progression.overallAccuracy || 70,
              adaptiveMode: true
            };

            const segmentQuestions = await aiQuestionAPI.generateAdaptiveQuestions(microVideo, adaptiveParams);
            adaptiveQuestions.push(...segmentQuestions);
          }

          quiz = {
            videoId: microlearning.videoId,
            originalTitle: microlearning.originalTitle,
            totalQuestions: adaptiveQuestions.length,
            questions: adaptiveQuestions,
            generatedAt: new Date().toISOString(),
            source: 'adaptive-ai-generated',
            adaptiveFeatures: {
              adaptiveDifficulty: true,
              performanceBasedGeneration: true
            }
          };
        } else {
          // Use standard adaptive final quiz or regular quiz
          quiz = await aiQuestionAPI.generateQuizFromMicrolearning(
            microlearning,
            availableQuiz?.sessionType || 'intermediate',
            weakKeyPoints
          );
        }

        setAiQuestions(quiz.questions);

        console.log(`✅ Generated ${quiz.questions.length} ${availableQuiz?.sessionType || 'intermediate'} questions`, {
          weakKeyPointFocus: weakKeyPoints.length,
          adaptations: quiz.adaptations
        });

        // Create mock quiz session (since backend might not have real data)
        const mockSession = {
          sessionId: `mock_session_${Date.now()}`,
          sessionType: 'intermediate',
          totalQuestions: quiz.questions.length,
          currentQuestionIndex: 0,
          status: 'active',
          video: {
            id: videoId,
            title: microlearning.originalTitle
          },
          progressPercentage: 0,
          currentAccuracy: 0
        };
        setQuizSession(mockSession);

        // Save active session to localStorage
        localStorage.setItem(`quiz_active_${videoId}`, JSON.stringify({
          sessionId: mockSession.sessionId,
          startedAt: new Date().toISOString(),
          progressPercentage: 0
        }));
      }

    } catch (error) {
      console.error('❌ Error loading quiz data:', error);
      toast.error('Failed to load quiz. Please try again.');
      navigate(-1);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSelect = (answer) => {
    setSelectedAnswer(answer);
    setShowResult(false);
  };

  const handleAnswerSubmit = async () => {
    if (!selectedAnswer) {
      toast.error('Please select an answer first!');
      return;
    }

    setSubmitting(true);

    try {
      const currentQuestion = aiQuestions[currentQuestionIndex];
      const isCorrect = selectedAnswer === currentQuestion.correctAnswer;

      // Record user's answer with performance data and adaptive metadata
      const answerRecord = {
        questionIndex: currentQuestionIndex,
        question: currentQuestion,
        selectedAnswer: selectedAnswer,
        correctAnswer: currentQuestion.correctAnswer,
        isCorrect: isCorrect,
        responseTime: Math.random() * 30000 + 10000, // Mock realistic response time (10-40 seconds)
        timeSpent: 30, // Mock time - in real app you'd track actual time
        retryAttempts: 0,
        submittedAt: new Date().toISOString(),
        // Include adaptive difficulty context
        adaptiveContext: currentQuestion.adaptiveMetadata ? {
          wasAdaptive: true,
          originalDifficulty: currentQuestion.adaptiveMetadata.originalDifficulty,
          adjustedDifficulty: currentQuestion.difficulty,
          adjustmentReason: currentQuestion.adaptiveMetadata.adjustmentReason,
          performanceMetrics: currentQuestion.adaptiveMetadata.performanceMetrics,
          adaptiveDifficultyLevel: currentQuestion.adaptiveMetadata.adaptiveDifficultyLevel
        } : {
          wasAdaptive: false,
          difficulty: currentQuestion.difficulty
        }
      };

      // Update user answers array
      const newUserAnswers = [...userAnswers];
      newUserAnswers[currentQuestionIndex] = answerRecord;
      setUserAnswers(newUserAnswers);

      // Show result
      setShowResult(true);

      // Simulate backend submission
      console.log('📝 Submitting answer:', {
        questionId: currentQuestion.questionId,
        selectedAnswer,
        correctAnswer: currentQuestion.correctAnswer,
        isCorrect,
        answerRecord
      });

      if (isCorrect) {
        toast.success('Correct! 🎉');
      } else {
        toast.error('Incorrect. Try to understand the explanation.');
      }

    } catch (error) {
      console.error('❌ Error submitting answer:', error);
      toast.error('Failed to submit answer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNextQuestion = async () => {
    if (currentQuestionIndex < aiQuestions.length - 1) {
      // Check if we should apply real-time difficulty adjustment
      if (userAnswers.length >= 2) {
        try {
          console.log('⚡ Checking for real-time difficulty adjustment...');
          const upcomingQuestions = aiQuestions.slice(currentQuestionIndex + 1);
          const adjustedQuestions = await aiQuestionAPI.adjustQuestionDifficultyInRealTime(
            upcomingQuestions,
            userAnswers
          );

          // Update questions if they were adjusted
          if (adjustedQuestions !== upcomingQuestions) {
            const updatedQuestions = [
              ...aiQuestions.slice(0, currentQuestionIndex + 1),
              ...adjustedQuestions
            ];
            setAiQuestions(updatedQuestions);
            console.log('✅ Real-time difficulty adjustment applied to remaining questions');
          }
        } catch (error) {
          console.error('❌ Real-time difficulty adjustment failed:', error);
          // Continue without adjustment if it fails
        }
      }

      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer('');
      setShowResult(false);
    } else {
      // Quiz completed
      handleQuizComplete();
    }
  };

  const handleQuizComplete = () => {
    if (!microlearningContent?.videoId || !quizProgression) {
      toast.error('Unable to save quiz results');
      navigate(-1);
      return;
    }

    try {
      // Record quiz completion based on type
      let updatedProgression;

      if (currentQuizType === 'intermediate') {
        // Record intermediate quiz completion
        updatedProgression = quizProgressionAPI.recordIntermediateQuizCompletion(
          microlearningContent.videoId,
          quizSession,
          userAnswers,
          aiQuestions
        );

        if (updatedProgression && updatedProgression.readyForFinal) {
          toast.success('Intermediate quiz completed! Final quiz is now available! 🎯');
        } else {
          toast.success('Quiz completed! Keep learning! 🎉');
        }

      } else if (currentQuizType === 'final') {
        // Record final quiz completion
        updatedProgression = quizProgressionAPI.recordFinalQuizCompletion(
          microlearningContent.videoId,
          quizSession,
          userAnswers,
          aiQuestions
        );

        if (updatedProgression) {
          const masteryLevel = updatedProgression.finalQuizResult?.masteryScore?.masteryLevel;
          if (masteryLevel === 'mastered') {
            toast.success('🎉 Congratulations! You have mastered this topic!');
          } else if (masteryLevel === 'developing') {
            toast.success('Great progress! Keep practicing to fully master this topic. 📚');
          } else {
            toast('Consider reviewing the content and retaking some quizzes. 📖', {
              icon: '💡'
            });
          }
        }
      }

      // Legacy completion tracking
      const completionData = {
        videoId: microlearningContent.videoId,
        completedAt: new Date().toISOString(),
        totalQuestions: aiQuestions.length,
        correctAnswers: userAnswers.filter(answer => answer.isCorrect).length,
        quizType: currentQuizType
      };

      localStorage.setItem(`quiz_completed_${microlearningContent.videoId}`, JSON.stringify(completionData));

      // Remove active session
      localStorage.removeItem(`quiz_active_${microlearningContent.videoId}`);

      console.log('✅ Quiz completion recorded:', {
        quizType: currentQuizType,
        performance: completionData,
        progressionUpdate: updatedProgression ? 'success' : 'failed'
      });

    } catch (error) {
      console.error('❌ Error recording quiz completion:', error);
      toast.error('Quiz completed but failed to save progress');
    }

    // Navigate back to video recommendations
    navigate(-1);
  };

  if (isLoading) {
    return <Loading fullScreen text="Loading quiz session..." />;
  }

  if (!quizSession || !aiQuestions.length) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm border border-[#E9E9E7] p-8 max-w-md text-center">
          <AlertCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-[#37352F] mb-2">Quiz Not Available</h2>
          <p className="text-[#6B6B6B] mb-4">
            Unable to load quiz session or questions. Please ensure microlearning content is generated first.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center px-4 py-2 bg-[#2383E2] text-white rounded-lg hover:bg-[#0F62FE] transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Videos
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = aiQuestions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / aiQuestions.length) * 100;

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      {/* Header */}
      <div className="bg-white border-b border-[#E9E9E7] sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center text-[#6B6B6B] hover:text-[#2383E2] transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                Back to Videos
              </button>
            </div>

            <div className="flex items-center space-x-6">
              <div className="text-sm text-[#6B6B6B]">
                {currentQuizType === 'final' ? '🎯 Final Quiz' : '📝 Intermediate Quiz'} •
                Question {currentQuestionIndex + 1} of {aiQuestions.length}
              </div>
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    currentQuizType === 'final' ? 'bg-green-500' : 'bg-[#2383E2]'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Microlearning Context */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-[#E9E9E7] p-6 sticky top-24">
              <h3 className="text-lg font-semibold text-[#37352F] mb-4">
                📚 Learning Context
              </h3>

              {microlearningContent && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-[#37352F] mb-2">
                      {microlearningContent.originalTitle}
                    </h4>
                    <p className="text-xs text-[#6B6B6B]">
                      {microlearningContent.microVideos.length} learning segments
                    </p>
                  </div>

                  {/* Adaptive Difficulty Indicators */}
                  {currentQuestion && currentQuestion.adaptiveMetadata && (
                    <div className="pt-4 border-t border-[#E9E9E7]">
                      <div className="flex items-center space-x-2 mb-3">
                        <BrainIcon className="h-4 w-4 text-purple-600" />
                        <span className="text-xs font-medium text-purple-700">Adaptive Mode Active</span>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-[#6B6B6B]">Difficulty Level:</span>
                          <span className={`text-xs font-medium px-2 py-1 rounded ${
                            currentQuestion.difficulty === 'Professional' ? 'bg-red-100 text-red-700' :
                            currentQuestion.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {currentQuestion.difficulty}
                          </span>
                        </div>

                        {currentQuestion.adaptiveMetadata.adjustmentReason && (
                          <div className="bg-purple-50 rounded-lg p-2">
                            <p className="text-xs text-purple-700">
                              🧠 {currentQuestion.adaptiveMetadata.adjustmentReason}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Show relevant microlearning segment */}
                  {currentQuestion && (
                    <div className="pt-4 border-t border-[#E9E9E7]">
                      <p className="text-xs font-medium text-[#6B6B6B] mb-2">
                        Related to: {currentQuestion.sourceSegment}
                      </p>
                      <div className="bg-[#F7F6F3] rounded-lg p-3">
                        <p className="text-xs text-[#37352F]">
                          Focus: {currentQuestion.keyPoint}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quiz Question */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-[#E9E9E7] p-8">
              {currentQuestion && (
                <div className="space-y-6">
                  {/* Question Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-3">
                        <BrainIcon className="h-5 w-5 text-[#2383E2]" />
                        <span className="text-sm font-medium text-[#6B6B6B]">
                          {currentQuestion.questionType} • {currentQuestion.difficulty}
                        </span>
                        {/* Adaptive Indicator */}
                        {currentQuestion.adaptiveReason && (
                          <div className="flex items-center space-x-1">
                            <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">
                              🎯 Focus Area
                            </span>
                          </div>
                        )}
                        {currentQuestion.questionType === 'integration' && (
                          <div className="flex items-center space-x-1">
                            <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                              🔗 Integration
                            </span>
                          </div>
                        )}
                      </div>
                      <h2 className="text-xl font-semibold text-[#37352F] leading-relaxed">
                        {currentQuestion.question}
                      </h2>
                      {/* Adaptive Reason */}
                      {currentQuestion.adaptiveReason && (
                        <p className="text-sm text-orange-600 mt-2 italic">
                          {currentQuestion.adaptiveReason}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Answer Options */}
                  <div className="space-y-3">
                    {Object.entries(currentQuestion.options).map(([key, value]) => (
                      <button
                        key={key}
                        onClick={() => handleAnswerSelect(key)}
                        disabled={showResult}
                        className={`
                          w-full text-left p-4 rounded-lg border-2 transition-all
                          ${selectedAnswer === key
                            ? 'border-[#2383E2] bg-[#2383E2]/5'
                            : 'border-[#E9E9E7] hover:border-[#2383E2]/50'
                          }
                          ${showResult && key === currentQuestion.correctAnswer
                            ? 'border-green-500 bg-green-50'
                            : showResult && selectedAnswer === key && key !== currentQuestion.correctAnswer
                            ? 'border-red-500 bg-red-50'
                            : ''
                          }
                          disabled:cursor-not-allowed
                        `}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`
                            w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-medium
                            ${selectedAnswer === key ? 'border-[#2383E2] bg-[#2383E2] text-white' : 'border-[#E9E9E7]'}
                          `}>
                            {key}
                          </div>
                          <span className="text-[#37352F]">{value}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Result & Explanation */}
                  {showResult && (
                    <div className="space-y-4">
                      <div className={`
                        p-4 rounded-lg border
                        ${selectedAnswer === currentQuestion.correctAnswer
                          ? 'border-green-200 bg-green-50'
                          : 'border-red-200 bg-red-50'
                        }
                      `}>
                        <div className="flex items-center mb-2">
                          {selectedAnswer === currentQuestion.correctAnswer ? (
                            <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
                          ) : (
                            <AlertCircleIcon className="h-5 w-5 text-red-600 mr-2" />
                          )}
                          <span className={`font-medium ${
                            selectedAnswer === currentQuestion.correctAnswer ? 'text-green-800' : 'text-red-800'
                          }`}>
                            {selectedAnswer === currentQuestion.correctAnswer ? 'Correct!' : 'Incorrect'}
                          </span>
                        </div>
                        <p className={`text-sm ${
                          selectedAnswer === currentQuestion.correctAnswer ? 'text-green-700' : 'text-red-700'
                        }`}>
                          {currentQuestion.explanation}
                        </p>
                      </div>

                      {/* Hint for wrong answers */}
                      {selectedAnswer !== currentQuestion.correctAnswer && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-800">
                            <span className="font-medium">💡 Hint: </span>
                            {currentQuestion.hint}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-between pt-4">
                    <div>
                      {currentQuestionIndex > 0 && (
                        <button
                          onClick={() => {
                            setCurrentQuestionIndex(currentQuestionIndex - 1);
                            setSelectedAnswer('');
                            setShowResult(false);
                          }}
                          className="px-4 py-2 text-[#6B6B6B] hover:text-[#2383E2] transition-colors"
                        >
                          Previous
                        </button>
                      )}
                    </div>

                    <div className="space-x-3">
                      {!showResult ? (
                        <button
                          onClick={handleAnswerSubmit}
                          disabled={!selectedAnswer || submitting}
                          className="px-6 py-2 bg-[#2383E2] text-white rounded-lg hover:bg-[#0F62FE] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {submitting ? (
                            <>
                              <LoaderIcon className="h-4 w-4 animate-spin mr-2 inline" />
                              Submitting...
                            </>
                          ) : (
                            'Submit Answer'
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={handleNextQuestion}
                          className="px-6 py-2 bg-[#059669] text-white rounded-lg hover:bg-[#047857] transition-colors"
                        >
                          {currentQuestionIndex < aiQuestions.length - 1 ? 'Next Question' : 'Complete Quiz'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorialQuiz;