import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useApp } from '../context/AppContext';
import { getTopicMeta } from '../utils/helpers';
import { assessmentAPI } from '../services/api';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Check as CheckIcon,
  Clock as ClockIcon,
  AlertCircle as AlertCircleIcon,
  Pause as PauseIcon,
  X as XIcon,
  Loader as LoaderIcon,
  TrendingUp as TrendingUpIcon
} from 'lucide-react';
import Loading from '../components/Loading';
import toast from 'react-hot-toast';

// Assessment states
const ASSESSMENT_STATES = {
  INITIALIZING: 'initializing',
  LOADING_QUESTION: 'loading_question',
  QUESTION_READY: 'question_ready',
  SUBMITTING_ANSWER: 'submitting_answer',
  COMPLETED: 'completed',
  ERROR: 'error'
};

const AssessmentQuiz = () => {
  const params = useParams();
  const { topic } = params;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { fetchActiveSessions } = useApp();
  const questionStartTimeRef = useRef(null);

  // Debug logging (only when needed)
  const debugLog = (message, data) => {
    if (import.meta.env.DEV && window.location.search.includes('debug=true')) {
      console.log(message, data);
    }
  };

  // Assessment session state
  const [assessmentState, setAssessmentState] = useState(ASSESSMENT_STATES.INITIALIZING);
  const [sessionId, setSessionId] = useState(searchParams.get('session') || null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [progress, setProgress] = useState({
    currentQuestion: 0,
    totalQuestions: 0,
    percentage: 0,
    accuracy: 0
  });
  const [sessionInfo, setSessionInfo] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [error, setError] = useState(null);

  const topicMeta = getTopicMeta(topic);

  // Initialize assessment session (only once per topic)
  useEffect(() => {
    // Prevent multiple initializations
    if (assessmentState !== ASSESSMENT_STATES.INITIALIZING && currentQuestion) {
      return;
    }

    const initializeAssessment = async () => {
      try {
        debugLog('🔍 Initializing assessment:', { topic, sessionId });
        setAssessmentState(ASSESSMENT_STATES.INITIALIZING);
        setError(null);

        let currentSessionId = sessionId;

        // If no existing session, start a new one
        if (!currentSessionId) {
          debugLog('Starting new assessment for topic:', topic);

          // Validate topic before sending to API
          const validTopics = ['javascript', 'react', 'typescript', 'nodejs', 'python', 'nextjs', 'mongodb', 'css-tailwind'];
          if (!validTopics.includes(topic)) {
            throw new Error(`Invalid topic: ${topic}. Valid topics are: ${validTopics.join(', ')}`);
          }

          try {
            const startResponse = await assessmentAPI.startAssessment(topic, {
              maxQuestions: 10,
              initialDifficulty: 'intermediate'
            });

            currentSessionId = startResponse.sessionId;
            setSessionId(currentSessionId);
            setSessionInfo({
              topic: startResponse.topic,
              maxQuestions: startResponse.maxQuestions
            });
            setProgress(startResponse.progress);

            // Set current question from start response
            if (startResponse.currentQuestion) {
              setCurrentQuestion(startResponse.currentQuestion);
              setAssessmentState(ASSESSMENT_STATES.QUESTION_READY);
              questionStartTimeRef.current = Date.now();
            }
          } catch (error) {
            // If there's an active session error, try to handle it
            if (error.message.includes('active assessment session')) {
              debugLog('Active session detected, attempting to clean up...');

              // Try to get active sessions and abandon them
              try {
                const activeSessions = await assessmentAPI.getActiveSessions();
                const existingSession = activeSessions.find(session => session.topic === topic);

                if (existingSession) {
                  // Show user option to resume or abandon
                  const shouldResume = window.confirm(
                    `You have an unfinished ${topicMeta.name} assessment. Would you like to resume it? Click 'Cancel' to start fresh.`
                  );

                  if (shouldResume) {
                    // Resume existing session
                    setSessionId(existingSession.sessionId || existingSession.id);
                    await loadNextQuestion(existingSession.sessionId || existingSession.id);
                    return;
                  } else {
                    // Abandon existing session and start new one
                    await assessmentAPI.abandonAssessment(existingSession.sessionId || existingSession.id);
                    toast.success('Previous session abandoned. Starting fresh assessment...');

                    // Retry starting new assessment
                    const retryResponse = await assessmentAPI.startAssessment(topic, {
                      maxQuestions: 10,
                      initialDifficulty: 'intermediate'
                    });

                    currentSessionId = retryResponse.sessionId;
                    setSessionId(currentSessionId);
                    setSessionInfo({
                      topic: retryResponse.topic,
                      maxQuestions: retryResponse.maxQuestions
                    });
                    setProgress(retryResponse.progress);

                    if (retryResponse.currentQuestion) {
                      setCurrentQuestion(retryResponse.currentQuestion);
                      setAssessmentState(ASSESSMENT_STATES.QUESTION_READY);
                      questionStartTimeRef.current = Date.now();
                    }
                  }
                } else {
                  throw error; // Re-throw if no session found
                }
              } catch (cleanupError) {
                console.error('Failed to handle active session:', cleanupError);
                throw error; // Re-throw original error
              }
            } else {
              throw error; // Re-throw non-session errors
            }
          }

        } else {
          // Resume existing session - get next question
          debugLog('Resuming existing session:', currentSessionId);
          await loadNextQuestion(currentSessionId);
        }
      } catch (error) {
        console.error('Error initializing assessment:', error);
        setError(error.message || 'Failed to start assessment');
        setAssessmentState(ASSESSMENT_STATES.ERROR);
        toast.error('Failed to start assessment. Please try again.');
      }
    };

    // Only initialize if we have a valid topic and haven't initialized yet
    if (topic && topic !== 'undefined' && topic !== 'null' && assessmentState === ASSESSMENT_STATES.INITIALIZING) {
      initializeAssessment();
    } else if (!topic || topic === 'undefined' || topic === 'null') {
      console.error('❌ Topic is invalid:', topic, '(type:', typeof topic, ')');
      setError('Invalid topic selected. Please navigate to the assessment from the topics page.');
      setAssessmentState(ASSESSMENT_STATES.ERROR);
    }
  }, [topic]); // Only depend on topic, not sessionId to prevent loops

  // Timer effect for overall session
  useEffect(() => {
    let timer;
    if (assessmentState === ASSESSMENT_STATES.QUESTION_READY ||
        assessmentState === ASSESSMENT_STATES.SUBMITTING_ANSWER) {
      timer = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [assessmentState]);

  // Load next question from backend
  const loadNextQuestion = async (currentSessionId) => {
    try {
      debugLog('Loading next question for session:', currentSessionId);
      setAssessmentState(ASSESSMENT_STATES.LOADING_QUESTION);
      setSelectedAnswer(null);

      const questionResponse = await assessmentAPI.getNextQuestion(currentSessionId);

      setCurrentQuestion(questionResponse);
      setProgress(prevProgress => ({
        currentQuestion: questionResponse.questionNumber || 0,
        totalQuestions: questionResponse.totalQuestions || 0,
        percentage: Math.round(((questionResponse.questionNumber || 0) / (questionResponse.totalQuestions || 1)) * 100),
        accuracy: prevProgress.accuracy // Keep existing accuracy
      }));
      setAssessmentState(ASSESSMENT_STATES.QUESTION_READY);
      questionStartTimeRef.current = Date.now();

    } catch (error) {
      console.error('Error loading next question:', error);
      if (error.message.includes('Assessment completed')) {
        // Assessment is completed
        setAssessmentState(ASSESSMENT_STATES.COMPLETED);
        toast.success('Assessment completed! Generating your results...');
        setTimeout(() => {
          navigate(`/app/assessment-results/${currentSessionId}`);
        }, 2000);
      } else {
        setError(error.message || 'Failed to load question');
        setAssessmentState(ASSESSMENT_STATES.ERROR);
        toast.error('Failed to load next question');
      }
    }
  };

  // Handle answer selection
  const handleAnswerSelect = (answerOption) => {
    if (assessmentState !== ASSESSMENT_STATES.QUESTION_READY) return;
    setSelectedAnswer(answerOption);
  };

  // Submit answer and get next question
  const handleSubmitAnswer = async () => {
    // Validate submission requirements
    if (!selectedAnswer || !currentQuestion || !sessionId) {
      debugLog('Cannot submit - missing requirements:', {
        selectedAnswer: !!selectedAnswer,
        currentQuestion: !!currentQuestion,
        sessionId: !!sessionId
      });
      return;
    }

    // Prevent double submission
    if (assessmentState === ASSESSMENT_STATES.SUBMITTING_ANSWER) {
      debugLog('Already submitting, ignoring duplicate request');
      return;
    }

    try {
      debugLog('Submitting answer:', { selectedAnswer, questionId: currentQuestion.questionId });
      setAssessmentState(ASSESSMENT_STATES.SUBMITTING_ANSWER);

      // Calculate time spent on this question
      const timeSpent = questionStartTimeRef.current
        ? Math.round((Date.now() - questionStartTimeRef.current) / 1000)
        : 0;

      const response = await assessmentAPI.submitAnswer(
        sessionId,
        currentQuestion.questionId,
        selectedAnswer,
        timeSpent
      );

      // Update progress and performance
      setProgress(prevProgress => response.progress || prevProgress);
      setPerformance(response.performance);

      // Show feedback
      if (response.result?.isCorrect) {
        toast.success('Correct! ✅');
      } else {
        toast.error(`Incorrect. The answer was ${response.result?.correctAnswer || 'not provided'}`);
      }

      // Check if assessment is completed
      if (response.isCompleted || response.finalResults) {
        setAssessmentState(ASSESSMENT_STATES.COMPLETED);
        toast.success('Assessment completed! 🎉');

        // Refresh active sessions to remove completed session
        await fetchActiveSessions();

        // Navigate to results with session data
        setTimeout(() => {
          navigate(`/app/assessment-results/${topic}/${sessionId}`, {
            state: {
              finalResults: response.finalResults,
              sessionId: sessionId,
              topic: topic
            }
          });
        }, 2000);
      } else if (response.nextQuestion) {
        // Load next question directly from response
        setCurrentQuestion(response.nextQuestion);
        setSelectedAnswer(null);
        setAssessmentState(ASSESSMENT_STATES.QUESTION_READY);
        questionStartTimeRef.current = Date.now();
      } else {
        // Load next question from server
        await loadNextQuestion(sessionId);
      }

    } catch (error) {
      console.error('Error submitting answer:', error);
      setError(error.message || 'Failed to submit answer');
      toast.error('Failed to submit answer. Please try again.');
      setAssessmentState(ASSESSMENT_STATES.QUESTION_READY); // Allow retry
    }
  };

  // Handle manual completion
  const handleCompleteAssessment = async () => {
    if (!sessionId) return;

    try {
      const confirmed = window.confirm('Are you sure you want to complete the assessment now? This will generate your final results.');
      if (!confirmed) return;

      setAssessmentState(ASSESSMENT_STATES.SUBMITTING_ANSWER);

      const finalResults = await assessmentAPI.completeAssessment(sessionId);

      setAssessmentState(ASSESSMENT_STATES.COMPLETED);
      toast.success('Assessment completed successfully!');

      // Refresh active sessions to remove completed session
      await fetchActiveSessions();

      // Navigate to results
      setTimeout(() => {
        navigate(`/app/assessment-results/${topic}/${sessionId}`, {
          state: {
            finalResults,
            sessionId,
            topic
          }
        });
      }, 1500);

    } catch (error) {
      console.error('Error completing assessment:', error);
      toast.error('Failed to complete assessment');
      setAssessmentState(ASSESSMENT_STATES.QUESTION_READY);
    }
  };

  // Handle pause assessment
  const handlePauseAssessment = async () => {
    if (!sessionId) return;

    try {
      await assessmentAPI.pauseAssessment(sessionId);
      toast.success('Assessment paused. You can resume later.');
      navigate('/app/assessment');
    } catch (error) {
      console.error('Error pausing assessment:', error);
      toast.error('Failed to pause assessment');
    }
  };

  // Handle abandon assessment
  const handleAbandonAssessment = async () => {
    if (!sessionId) return;

    const confirmed = window.confirm('Are you sure you want to abandon this assessment? Your progress will be lost.');
    if (!confirmed) return;

    try {
      await assessmentAPI.abandonAssessment(sessionId);
      toast.success('Assessment abandoned');

      // Refresh active sessions to remove abandoned session
      await fetchActiveSessions();

      navigate('/app/assessment');
    } catch (error) {
      console.error('Error abandoning assessment:', error);
      toast.error('Failed to abandon assessment');

      // Still refresh sessions and navigate away on error
      await fetchActiveSessions();
      navigate('/app/assessment');
    }
  };

  // Utility functions
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'beginner': return 'text-green-600 bg-green-100';
      case 'intermediate': return 'text-yellow-600 bg-yellow-100';
      case 'advanced': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Loading state
  if (assessmentState === ASSESSMENT_STATES.INITIALIZING) {
    return <Loading fullScreen text="Starting your AI-powered assessment..." />;
  }

  // Error state
  if (assessmentState === ASSESSMENT_STATES.ERROR) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircleIcon className="h-8 w-8 text-red-600" />
        </div>
        <h2 className="text-xl font-semibold text-[#37352F] mb-2">
          Assessment Error
        </h2>
        <p className="text-[#6B6B6B] mb-6">
          {error || 'Something went wrong with your assessment.'}
        </p>
        <div className="space-x-4">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-6 py-3 bg-[#2383E2] text-white rounded-lg hover:bg-[#0F62FE] transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => navigate('/app/assessment')}
            className="inline-flex items-center px-6 py-3 bg-white border border-[#E9E9E7] text-[#37352F] rounded-lg hover:bg-[#F7F6F3] transition-colors"
          >
            Back to Assessments
          </button>
        </div>
      </div>
    );
  }

  // Completed state
  if (assessmentState === ASSESSMENT_STATES.COMPLETED) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckIcon className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold text-[#37352F] mb-2">
          Assessment Complete!
        </h2>
        <p className="text-[#6B6B6B] mb-6">
          AI is analyzing your performance and generating personalized results...
        </p>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2383E2] mx-auto"></div>
      </div>
    );
  }

  // No current question available
  if (!currentQuestion) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="w-16 h-16 bg-[#2383E2]/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <LoaderIcon className="h-8 w-8 text-[#2383E2] animate-spin" />
        </div>
        <h2 className="text-xl font-semibold text-[#37352F] mb-2">
          Loading Assessment Question
        </h2>
        <p className="text-[#6B6B6B] mb-6">
          AI is generating your next personalized question...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-[#E9E9E7] p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="text-2xl">{topicMeta.icon}</div>
            <div>
              <h1 className="text-2xl font-bold text-[#37352F]">
                {topicMeta.name} Assessment
              </h1>
              <div className="flex items-center space-x-3">
                <p className="text-[#6B6B6B]">
                  AI-powered adaptive assessment
                </p>
                {currentQuestion?.difficulty && (
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(currentQuestion.difficulty)}`}>
                    <TrendingUpIcon className="h-3 w-3 mr-1" />
                    {currentQuestion.difficulty}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-[#6B6B6B]">
              <ClockIcon className="h-4 w-4" />
              <span>{formatTime(timeElapsed)}</span>
            </div>

            <button
              onClick={handlePauseAssessment}
              className="inline-flex items-center px-3 py-2 text-sm text-[#6B6B6B] bg-white border border-[#E9E9E7] rounded-lg hover:bg-[#F7F6F3] transition-colors"
            >
              <PauseIcon className="h-4 w-4 mr-2" />
              Pause
            </button>

            <button
              onClick={handleAbandonAssessment}
              className="inline-flex items-center px-3 py-2 text-sm text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              <XIcon className="h-4 w-4 mr-2" />
              Abandon
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-[#6B6B6B]">
            Question {progress.currentQuestion} of {progress.totalQuestions}
            {progress.accuracy > 0 && (
              <span className="ml-3 text-green-600">Accuracy: {progress.accuracy}%</span>
            )}
          </span>
          <div className="w-32 bg-[#E9E9E7] rounded-full h-2">
            <div
              className="bg-[#2383E2] h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="bg-white rounded-xl shadow-sm border border-[#E9E9E7] p-8">
        <h2 className="text-xl font-semibold text-[#37352F] mb-8 leading-relaxed">
          {currentQuestion.question}
        </h2>

        <div className="space-y-4">
          {Object.entries(currentQuestion.options).map(([key, option]) => {
            const isSelected = selectedAnswer === key;
            const isDisabled = assessmentState === ASSESSMENT_STATES.SUBMITTING_ANSWER;
            return (
              <button
                key={key}
                onClick={() => handleAnswerSelect(key)}
                disabled={isDisabled}
                className={`w-full text-left p-6 rounded-xl border transition-all duration-200 ${
                  isSelected
                    ? 'border-[#2383E2] bg-[#2383E2]/5'
                    : 'border-[#E9E9E7] hover:border-[#D3D3D1] hover:bg-[#F7F6F3]'
                } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-center">
                  <div className={`w-6 h-6 rounded-full border-2 mr-4 flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'border-[#2383E2] bg-[#2383E2]'
                      : 'border-[#D3D3D1]'
                  }`}>
                    <span className={`text-sm font-medium ${
                      isSelected ? 'text-white' : 'text-[#6B6B6B]'
                    }`}>
                      {key}
                    </span>
                  </div>
                  <span className="text-[#37352F] text-base">{option}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          {assessmentState === ASSESSMENT_STATES.LOADING_QUESTION && (
            <div className="flex items-center space-x-2 text-[#6B6B6B]">
              <LoaderIcon className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading next question...</span>
            </div>
          )}
        </div>

        <div className="text-sm text-[#6B6B6B]">
          {performance && (
            <span className="mr-4">
              Accuracy: {performance.overallAccuracy || 0}%
            </span>
          )}
          Progress: {progress.percentage}%
        </div>

        <div className="flex items-center space-x-3">
          {progress.currentQuestion >= 5 && (
            <button
              onClick={handleCompleteAssessment}
              disabled={assessmentState === ASSESSMENT_STATES.SUBMITTING_ANSWER}
              className="flex items-center px-4 py-3 text-sm font-medium text-[#6B6B6B] bg-white border border-[#E9E9E7] rounded-lg hover:bg-[#F7F6F3] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Complete Early
            </button>
          )}

          <button
            onClick={handleSubmitAnswer}
            disabled={!selectedAnswer || assessmentState === ASSESSMENT_STATES.SUBMITTING_ANSWER || assessmentState === ASSESSMENT_STATES.LOADING_QUESTION}
            className="flex items-center px-6 py-3 text-sm font-medium text-white bg-[#2383E2] rounded-lg hover:bg-[#0F62FE] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {assessmentState === ASSESSMENT_STATES.SUBMITTING_ANSWER ? (
              <>
                <LoaderIcon className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Answer'
            )}
          </button>
        </div>
      </div>

      {/* Performance Indicator */}
      {performance && (
        <div className="bg-[#F7F6F3] rounded-xl p-4 mt-6">
          <div className="flex items-center justify-between text-sm">
            <div className="text-[#37352F] font-medium">
              Current Performance
            </div>
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <div className="text-[#37352F] font-semibold">{performance.overallAccuracy || 0}%</div>
                <div className="text-[#6B6B6B] text-xs">Accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-[#37352F] font-semibold">{performance.totalQuestions || 0}</div>
                <div className="text-[#6B6B6B] text-xs">Questions</div>
              </div>
              <div className="text-center">
                <div className="text-[#37352F] font-semibold">{performance.correctAnswers || 0}</div>
                <div className="text-[#6B6B6B] text-xs">Correct</div>
              </div>
              {performance.strengthAreas && performance.strengthAreas.length > 0 && (
                <div className="text-center">
                  <div className="text-green-600 font-semibold">{performance.strengthAreas.length}</div>
                  <div className="text-[#6B6B6B] text-xs">Strengths</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssessmentQuiz;