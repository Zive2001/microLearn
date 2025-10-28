import React from 'react';
import QuizComponent, { QUIZ_STATES } from './QuizComponent';
import useQuiz from '../hooks/useQuiz';
import {
  Brain as BrainIcon,
  Target as TargetIcon,
  Award as AwardIcon,
  Clock as ClockIcon,
  TrendingUp as TrendingUpIcon
} from 'lucide-react';

const MicrolearningQuiz = ({
  questions = [],
  quizType = 'intermediate',
  onQuizComplete,
  onError,
  showTimer = false,
  timeLimit = null,
  allowNavigation = true,
  className = '',
  ...props
}) => {
  const {
    currentQuestionIndex,
    selectedAnswer,
    showResult,
    quizState,
    userAnswers,
    quizStats,
    currentQuestion,
    isLastQuestion,
    isFirstQuestion,
    handleAnswerSelect,
    handleAnswerSubmit,
    handleNext,
    handlePrevious,
    handleQuestionChange,
    progress,
    accuracy
  } = useQuiz({
    questions,
    onQuizComplete,
    onError,
    autoAdvance: false
  });

  // Custom question renderer for microlearning context
  const renderQuestion = (question, index) => (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <h2 className="text-xl font-semibold text-gray-900 pr-4">
          {question.question}
        </h2>
        
        {/* Question number badge */}
        <div className="flex-shrink-0">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            {index + 1} of {questions.length}
          </span>
        </div>
      </div>
      
      {/* Question metadata */}
      <div className="flex items-center space-x-6 text-sm text-gray-600">
        {question.difficulty && (
          <div className="flex items-center space-x-1">
            <BrainIcon className="h-4 w-4" />
            <span>Difficulty: {question.difficulty}</span>
          </div>
        )}
        
        {question.cognitiveLoad && (
          <div className="flex items-center space-x-1">
            <TrendingUpIcon className="h-4 w-4" />
            <span>Load: {question.cognitiveLoad}/10</span>
          </div>
        )}
        
        {question.estimatedTime && (
          <div className="flex items-center space-x-1">
            <ClockIcon className="h-4 w-4" />
            <span>~{question.estimatedTime}min</span>
          </div>
        )}
      </div>

      {/* Adaptive reason */}
      {question.adaptiveReason && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <p className="text-sm text-orange-700">
            <strong>Adaptive Learning:</strong> {question.adaptiveReason}
          </p>
        </div>
      )}

      {/* Learning objective */}
      {question.learningObjective && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-700">
            <strong>Learning Objective:</strong> {question.learningObjective}
          </p>
        </div>
      )}
    </div>
  );

  // Custom option renderer for microlearning context
  const renderOption = ({ key, value, isSelected, isCorrect, isIncorrect, isDisabled, onSelect }) => (
    <button
      onClick={onSelect}
      disabled={isDisabled}
      className={`w-full text-left p-6 rounded-xl border-2 transition-all duration-200 ${
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
      }`}
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
        <div className="flex-1">
          <span className="text-gray-900 text-base">{value}</span>
        </div>
        {isCorrect && (
          <div className="ml-4 flex items-center text-green-600">
            <span className="text-sm font-medium mr-1">Correct</span>
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
        {isIncorrect && (
          <div className="ml-4 flex items-center text-red-600">
            <span className="text-sm font-medium mr-1">Incorrect</span>
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>
    </button>
  );

  // Custom progress renderer
  const renderProgress = () => (
    <div className="mb-6">
      <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
        <div className="flex items-center space-x-2">
          {quizType === 'final' ? (
            <AwardIcon className="h-4 w-4 text-yellow-600" />
          ) : (
            <TargetIcon className="h-4 w-4 text-blue-600" />
          )}
          <span className="font-medium">
            {quizType === 'final' ? 'Final Assessment' : 'Knowledge Check'}
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <span>Question {progress.current} of {progress.total}</span>
          <span>{progress.percentage}%</span>
          {userAnswers.length > 0 && (
            <span className="text-green-600">
              {accuracy}% accuracy
            </span>
          )}
        </div>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress.percentage}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className={`microlearning-quiz ${className}`} {...props}>
      <QuizComponent
        questions={questions}
        currentQuestionIndex={currentQuestionIndex}
        onQuestionChange={handleQuestionChange}
        quizState={quizState}
        selectedAnswer={selectedAnswer}
        onAnswerSelect={handleAnswerSelect}
        onAnswerSubmit={handleAnswerSubmit}
        showResult={showResult}
        quizType={quizType}
        allowNavigation={allowNavigation}
        showProgress={true}
        showTimer={showTimer}
        timeLimit={timeLimit}
        onQuizComplete={onQuizComplete}
        onError={onError}
        renderQuestion={renderQuestion}
        renderOption={renderOption}
        renderProgress={renderProgress}
        questionClassName="mb-6"
        optionClassName="mb-3"
      />
    </div>
  );
};

export default MicrolearningQuiz;
