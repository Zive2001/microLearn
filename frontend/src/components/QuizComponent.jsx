import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle as CheckCircleIcon,
  AlertCircle as AlertCircleIcon,
  Loader2 as LoaderIcon,
  Clock as ClockIcon,
  Brain as BrainIcon,
  Target as TargetIcon,
  Award as AwardIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Check as CheckIcon,
  Pause as PauseIcon,
  X as XIcon,
  TrendingUp as TrendingUpIcon
} from 'lucide-react';
import toast from 'react-hot-toast';

// Quiz states
export const QUIZ_STATES = {
  LOADING: 'loading',
  READY: 'ready',
  SUBMITTING: 'submitting',
  SHOWING_RESULT: 'showing_result',
  COMPLETED: 'completed',
  ERROR: 'error'
};

// Question types
export const QUESTION_TYPES = {
  MULTIPLE_CHOICE: 'multiple_choice',
  TRUE_FALSE: 'true_false',
  FILL_BLANK: 'fill_blank'
};

const QuizComponent = ({
  // Quiz data
  questions = [],
  currentQuestionIndex = 0,
  onQuestionChange,
  
  // Quiz state
  quizState = QUIZ_STATES.READY,
  selectedAnswer = null,
  onAnswerSelect,
  onAnswerSubmit,
  showResult = false,
  
  // Quiz configuration
  quizType = 'intermediate', // 'intermediate' or 'final'
  allowNavigation = true,
  showProgress = true,
  showTimer = false,
  timeLimit = null,
  
  // Styling
  className = '',
  questionClassName = '',
  optionClassName = '',
  
  // Callbacks
  onQuizComplete,
  onError,
  
  // Custom renderers
  renderQuestion = null,
  renderOption = null,
  renderProgress = null,
  renderTimer = null,
  
  // Additional props
  ...props
}) => {
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);
  const questionStartTimeRef = useRef(null);

  // Timer effect
  useEffect(() => {
    if (showTimer && timeLimit && quizState === QUIZ_STATES.READY) {
      if (!isPaused) {
        timerRef.current = setInterval(() => {
          setTimeElapsed(prev => {
            const newTime = prev + 1;
            if (newTime >= timeLimit) {
              // Time's up - auto submit
              handleTimeUp();
              return timeLimit;
            }
            return newTime;
          });
        }, 1000);
      } else {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [showTimer, timeLimit, quizState, isPaused]);

  // Track question start time
  useEffect(() => {
    if (quizState === QUIZ_STATES.READY) {
      questionStartTimeRef.current = Date.now();
    }
  }, [currentQuestionIndex, quizState]);

  const handleTimeUp = () => {
    if (onAnswerSubmit) {
      onAnswerSubmit(selectedAnswer, true); // true indicates time up
    }
  };

  const handleAnswerSelect = (answer) => {
    if (onAnswerSelect) {
      onAnswerSelect(answer);
    }
  };

  const handleAnswerSubmit = () => {
    if (!selectedAnswer) {
      toast.error('Please select an answer first!');
      return;
    }

    if (onAnswerSubmit) {
      const timeSpent = questionStartTimeRef.current ? 
        Math.round((Date.now() - questionStartTimeRef.current) / 1000) : 0;
      onAnswerSubmit(selectedAnswer, false, timeSpent);
    }
  };

  const handleNext = () => {
    if (onQuestionChange) {
      onQuestionChange(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (onQuestionChange) {
      onQuestionChange(currentQuestionIndex - 1);
    }
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    if (questions.length === 0) return 0;
    return Math.round(((currentQuestionIndex + 1) / questions.length) * 100);
  };

  const getRemainingTime = () => {
    if (!timeLimit) return null;
    return Math.max(0, timeLimit - timeElapsed);
  };

  const isLastQuestion = currentQuestionIndex >= questions.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;
  const currentQuestion = questions[currentQuestionIndex];

  if (quizState === QUIZ_STATES.LOADING) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <LoaderIcon className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (quizState === QUIZ_STATES.ERROR) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <AlertCircleIcon className="h-8 w-8 mx-auto mb-4 text-red-600" />
          <p className="text-red-600 mb-4">Error loading quiz</p>
          <button
            onClick={() => onError && onError()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <AlertCircleIcon className="h-8 w-8 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">No question available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`quiz-component ${className}`} {...props}>
      {/* Header */}
      <div className="mb-6">
        {/* Quiz Type Indicator */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            {quizType === 'final' ? (
              <AwardIcon className="h-5 w-5 text-yellow-600" />
            ) : (
              <TargetIcon className="h-5 w-5 text-blue-600" />
            )}
            <span className="text-sm font-medium text-gray-600 uppercase tracking-wide">
              {quizType === 'final' ? 'Final Quiz' : 'Intermediate Quiz'}
            </span>
          </div>

          {/* Timer */}
          {showTimer && timeLimit && (
            <div className="flex items-center space-x-2">
              <ClockIcon className="h-4 w-4 text-gray-500" />
              <span className={`text-sm font-mono ${
                getRemainingTime() < 30 ? 'text-red-600' : 'text-gray-600'
              }`}>
                {formatTime(getRemainingTime())}
              </span>
              <button
                onClick={handlePause}
                className="p-1 hover:bg-gray-100 rounded"
                title={isPaused ? 'Resume' : 'Pause'}
              >
                {isPaused ? (
                  <PlayIcon className="h-4 w-4" />
                ) : (
                  <PauseIcon className="h-4 w-4" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {showProgress && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
              <span>{getProgressPercentage()}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Question */}
      <div className={`question-container mb-6 ${questionClassName}`}>
        {renderQuestion ? (
          renderQuestion(currentQuestion, currentQuestionIndex)
        ) : (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {currentQuestion.question}
            </h2>
            
            {/* Question metadata */}
            {currentQuestion.difficulty && (
              <div className="flex items-center space-x-4 mb-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <BrainIcon className="h-4 w-4" />
                  <span>Difficulty: {currentQuestion.difficulty}</span>
                </div>
                {currentQuestion.cognitiveLoad && (
                  <div className="flex items-center space-x-1">
                    <TrendingUpIcon className="h-4 w-4" />
                    <span>Load: {currentQuestion.cognitiveLoad}/10</span>
                  </div>
                )}
              </div>
            )}

            {/* Adaptive reason */}
            {currentQuestion.adaptiveReason && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-orange-700">
                  <strong>Adaptive:</strong> {currentQuestion.adaptiveReason}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Answer Options */}
      <div className="space-y-3 mb-6">
        {Object.entries(currentQuestion.options || {}).map(([key, value]) => {
          const isSelected = selectedAnswer === key;
          const isCorrect = showResult && key === currentQuestion.correctAnswer;
          const isIncorrect = showResult && selectedAnswer === key && key !== currentQuestion.correctAnswer;
          const isDisabled = quizState === QUIZ_STATES.SUBMITTING || showResult;

          return renderOption ? (
            renderOption({
              key,
              value,
              isSelected,
              isCorrect,
              isIncorrect,
              isDisabled,
              onSelect: () => handleAnswerSelect(key)
            })
          ) : (
            <button
              key={key}
              onClick={() => handleAnswerSelect(key)}
              disabled={isDisabled}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                isSelected
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              } ${
                isCorrect
                  ? 'border-green-500 bg-green-50'
                  : isIncorrect
                  ? 'border-red-500 bg-red-50'
                  : ''
              } ${
                isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              } ${optionClassName}`}
            >
              <div className="flex items-center">
                <div className={`w-6 h-6 rounded-full border-2 mr-4 flex items-center justify-center transition-colors ${
                  isSelected
                    ? 'border-blue-600 bg-blue-600'
                    : 'border-gray-300'
                } ${
                  isCorrect
                    ? 'border-green-500 bg-green-500'
                    : isIncorrect
                    ? 'border-red-500 bg-red-500'
                    : ''
                }`}>
                  <span className={`text-sm font-medium ${
                    isSelected || isCorrect || isIncorrect ? 'text-white' : 'text-gray-600'
                  }`}>
                    {key}
                  </span>
                </div>
                <span className="text-gray-900">{value}</span>
                {isCorrect && (
                  <CheckIcon className="h-5 w-5 text-green-600 ml-auto" />
                )}
                {isIncorrect && (
                  <XIcon className="h-5 w-5 text-red-600 ml-auto" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Result Display */}
      {showResult && (
        <div className="mb-6 p-4 rounded-lg bg-gray-50">
          <div className="flex items-center space-x-2 mb-2">
            {selectedAnswer === currentQuestion.correctAnswer ? (
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircleIcon className="h-5 w-5 text-red-600" />
            )}
            <span className={`font-semibold ${
              selectedAnswer === currentQuestion.correctAnswer ? 'text-green-600' : 'text-red-600'
            }`}>
              {selectedAnswer === currentQuestion.correctAnswer ? 'Correct!' : 'Incorrect'}
            </span>
          </div>
          
          {currentQuestion.explanation && (
            <p className="text-sm text-gray-700 mb-2">
              {currentQuestion.explanation}
            </p>
          )}

          {currentQuestion.correctAnswer && selectedAnswer !== currentQuestion.correctAnswer && (
            <p className="text-sm text-gray-600">
              <strong>Correct answer:</strong> {currentQuestion.options[currentQuestion.correctAnswer]}
            </p>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-3">
          {allowNavigation && !isFirstQuestion && (
            <button
              onClick={handlePrevious}
              className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeftIcon className="h-4 w-4 mr-1" />
              Previous
            </button>
          )}
        </div>

        <div className="flex space-x-3">
          {!showResult && selectedAnswer && (
            <button
              onClick={handleAnswerSubmit}
              disabled={quizState === QUIZ_STATES.SUBMITTING}
              className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {quizState === QUIZ_STATES.SUBMITTING ? (
                <>
                  <LoaderIcon className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckIcon className="h-4 w-4 mr-2" />
                  Submit Answer
                </>
              )}
            </button>
          )}

          {showResult && !isLastQuestion && (
            <button
              onClick={handleNext}
              className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Next
              <ChevronRightIcon className="h-4 w-4 ml-2" />
            </button>
          )}

          {showResult && isLastQuestion && (
            <button
              onClick={() => onQuizComplete && onQuizComplete()}
              className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <CheckCircleIcon className="h-4 w-4 mr-2" />
              Complete Quiz
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizComponent;
