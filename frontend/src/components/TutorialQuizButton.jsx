import React, { useState, useEffect } from 'react';
import {
  Play as PlayIcon,
  Clock as ClockIcon,
  CheckCircle as CheckCircleIcon,
  AlertCircle as AlertCircleIcon,
  Loader2 as LoaderIcon
} from 'lucide-react';
import { quizAPI, mockMicrolearningAPI, quizProgressionAPI } from '../services/api';
import toast from 'react-hot-toast';

const TutorialQuizButton = ({
  video,
  onQuizStart,
  className = '',
  disabled = false
}) => {
  const [quizStatus, setQuizStatus] = useState('available'); // available, checking, active, completed, unavailable
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasMicrolearning, setHasMicrolearning] = useState(false);
  const [quizProgression, setQuizProgression] = useState(null);
  const [availableQuiz, setAvailableQuiz] = useState(null);

  // Check if there's an active quiz session for this video
  useEffect(() => {
    checkQuizStatus();
  }, [video?.id]);

  // Refresh status when component becomes visible or microlearning status might have changed
  useEffect(() => {
    const interval = setInterval(() => {
      checkQuizStatus();
    }, 3000); // Check every 3 seconds for microlearning content

    return () => clearInterval(interval);
  }, [video?.id]);

  const checkQuizStatus = async () => {
    if (!video?.id) return;

    try {
      setQuizStatus('checking');

      // Check if microlearning content exists
      const microlearningContent = await mockMicrolearningAPI.getMicrolearningContent(video.id);
      setHasMicrolearning(!!microlearningContent);

      if (!microlearningContent) {
        setQuizStatus('unavailable');
        return;
      }

      // Initialize or get quiz progression
      let progression = quizProgressionAPI.getQuizProgression(video.id);
      if (!progression || progression.totalMicroVideos === 0) {
        progression = quizProgressionAPI.initializeProgression(video.id, microlearningContent);
      }
      setQuizProgression(progression);

      // Get current available quiz based on progression
      const currentQuiz = quizProgressionAPI.getCurrentAvailableQuiz(video.id);
      setAvailableQuiz(currentQuiz);

      if (!currentQuiz) {
        // No more quizzes available - all completed
        setQuizStatus('completed');
      } else {
        // Check if there's an active session in localStorage
        const activeQuizData = localStorage.getItem(`quiz_active_${video.id}`);

        if (activeQuizData) {
          const sessionData = JSON.parse(activeQuizData);
          setActiveSession(sessionData);
          setQuizStatus('active');
        } else {
          setQuizStatus('available');
        }
      }

    } catch (error) {
      console.error('Error checking quiz status:', error);
      // If there's any error, just mark as available if we have microlearning
      setQuizStatus(hasMicrolearning ? 'available' : 'unavailable');
    }
  };

  const handleQuizStart = async () => {
    if (disabled || loading) return;

    setLoading(true);

    try {
      // Check if microlearning content exists first
      if (!hasMicrolearning) {
        toast.error('Please generate microlearning content first! 🚧');
        setLoading(false);
        return;
      }

      // For our AI quiz flow, we don't need backend session creation
      // Just trigger the callback to navigate to quiz page
      console.log('🎯 Starting AI tutorial quiz for video:', video.id, 'Type:', availableQuiz?.sessionType);

      const quizTypeText = availableQuiz?.sessionType === 'final' ? 'final' : 'intermediate';
      toast.success(`Starting ${quizTypeText} AI quiz! Good luck! 🤖`);

      // Create a mock session ID for tracking
      const mockSessionId = `ai_session_${video.id}_${Date.now()}`;

      // Trigger callback to parent component to navigate
      if (onQuizStart) {
        onQuizStart(video, mockSessionId, 'new');
      }

      // Update local status
      setQuizStatus('active');
      setActiveSession({ sessionId: mockSessionId, progressPercentage: 0 });

    } catch (error) {
      console.error('Error starting AI quiz:', error);
      toast.error(`Failed to start quiz: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getButtonContent = () => {
    switch (quizStatus) {
      case 'checking':
        return {
          icon: <LoaderIcon className="h-4 w-4 animate-spin" />,
          text: 'Checking...',
          bgColor: 'bg-gray-100 text-gray-600',
          hoverColor: 'hover:bg-gray-200',
          disabled: true
        };

      case 'active':
        return {
          icon: <PlayIcon className="h-4 w-4" />,
          text: 'Resume Quiz',
          bgColor: 'bg-orange-100 text-orange-700 border-orange-200',
          hoverColor: 'hover:bg-orange-200',
          disabled: false
        };

      case 'completed':
        return {
          icon: <CheckCircleIcon className="h-4 w-4" />,
          text: quizProgression?.finalQuizCompleted ? 'All Quizzes Completed' : 'Quiz Completed',
          bgColor: 'bg-green-100 text-green-700 border-green-200',
          hoverColor: 'hover:bg-green-200',
          disabled: quizProgression?.finalQuizCompleted
        };

      case 'unavailable':
        return {
          icon: <AlertCircleIcon className="h-4 w-4" />,
          text: hasMicrolearning ? 'Processing...' : 'Generate Content First',
          bgColor: 'bg-gray-100 text-gray-500 border-gray-200',
          hoverColor: '',
          disabled: true
        };

      case 'available':
      default:
        const quizText = availableQuiz?.sessionType === 'final'
          ? '🎯 Take Final Quiz'
          : availableQuiz?.description || 'Take Quiz';

        return {
          icon: <PlayIcon className="h-4 w-4" />,
          text: quizText,
          bgColor: availableQuiz?.sessionType === 'final'
            ? 'bg-green-600 text-white'
            : 'bg-[#212529] text-white',
          hoverColor: availableQuiz?.sessionType === 'final'
            ? 'hover:bg-green-700'
            : 'hover:bg-[#495057]',
          disabled: false
        };
    }
  };

  const buttonContent = getButtonContent();
  const isDisabled = disabled || loading || buttonContent.disabled;

  return (
    <button
      onClick={handleQuizStart}
      disabled={isDisabled}
      className={`
        inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md border transition-colors
        ${buttonContent.bgColor}
        ${!isDisabled ? buttonContent.hoverColor : ''}
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      title={
        quizStatus === 'active'
          ? `Resume your quiz (${activeSession?.progressPercentage || 0}% complete)`
          : quizStatus === 'completed'
          ? 'You have completed this quiz. Click to retake.'
          : quizStatus === 'unavailable'
          ? hasMicrolearning
            ? 'Quiz is being prepared from microlearning content'
            : 'Generate microlearning content first to unlock quiz'
          : 'Start tutorial quiz for this video'
      }
    >
      {loading ? (
        <LoaderIcon className="h-4 w-4 animate-spin mr-1.5" />
      ) : (
        <span className="mr-1.5">{buttonContent.icon}</span>
      )}
      {loading ? 'Starting...' : buttonContent.text}
    </button>
  );
};

export default TutorialQuizButton;