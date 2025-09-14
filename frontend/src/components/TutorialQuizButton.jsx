import React, { useState, useEffect } from 'react';
import {
  Play as PlayIcon,
  Clock as ClockIcon,
  CheckCircle as CheckCircleIcon,
  AlertCircle as AlertCircleIcon,
  Loader2 as LoaderIcon
} from 'lucide-react';
import { quizAPI, mockMicrolearningAPI } from '../services/api';
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

  // Check if there's an active quiz session for this video
  useEffect(() => {
    checkQuizStatus();
  }, [video?.id]);

  const checkQuizStatus = async () => {
    if (!video?.id) return;

    try {
      setQuizStatus('checking');

      // First check if microlearning content exists
      const microlearningContent = await mockMicrolearningAPI.getMicrolearningContent(video.id);
      setHasMicrolearning(!!microlearningContent);

      if (!microlearningContent) {
        setQuizStatus('unavailable');
        return;
      }

      // Check for active sessions
      const activeSession = await quizAPI.hasActiveSession(video.id);

      if (activeSession) {
        setActiveSession(activeSession);
        setQuizStatus('active');
      } else {
        // Check if user has completed quizzes for this video
        const videoSessions = await quizAPI.getVideoQuizSessions(video.id);
        const completedSessions = videoSessions.sessions?.filter(s => s.status === 'completed') || [];

        if (completedSessions.length > 0) {
          setQuizStatus('completed');
        } else {
          setQuizStatus('available');
        }
      }
    } catch (error) {
      console.error('Error checking quiz status:', error);

      // If video doesn't exist in backend or no micro-videos, mark as unavailable
      if (error.message.includes('not found') || error.message.includes('micro-videos')) {
        setQuizStatus('unavailable');
      } else {
        setQuizStatus('available');
      }
    }
  };

  const handleQuizStart = async () => {
    if (disabled || loading) return;

    setLoading(true);

    try {
      // If there's an active session, resume it
      if (activeSession) {
        toast.success('Resuming your active quiz session!');
        if (onQuizStart) {
          onQuizStart(video, activeSession.sessionId, 'resume');
        }
        return;
      }

      // Start new intermediate quiz
      console.log('🎯 Starting tutorial quiz for video:', video.id);

      const session = await quizAPI.startQuizSession(video.id, 'intermediate');

      toast.success('Quiz started! Good luck! 🎯');

      // Trigger callback to parent component
      if (onQuizStart) {
        onQuizStart(video, session.sessionId, 'new');
      }

      // Update status
      setActiveSession(session);
      setQuizStatus('active');

    } catch (error) {
      console.error('Error starting quiz:', error);

      if (error.message.includes('not ready for quizzing')) {
        toast.error('This video needs to be processed for microlearning first. Coming soon! 🚧');
        setQuizStatus('unavailable');
      } else if (error.message.includes('active session')) {
        toast.error('You already have an active quiz for this video!');
        // Refresh status to get the active session
        checkQuizStatus();
      } else {
        toast.error(`Failed to start quiz: ${error.message}`);
      }
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
          text: 'Quiz Completed',
          bgColor: 'bg-green-100 text-green-700 border-green-200',
          hoverColor: 'hover:bg-green-200',
          disabled: false
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
        return {
          icon: <PlayIcon className="h-4 w-4" />,
          text: 'Take Quiz',
          bgColor: 'bg-[#2383E2] text-white',
          hoverColor: 'hover:bg-[#0F62FE]',
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