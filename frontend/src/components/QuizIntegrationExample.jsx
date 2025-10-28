import React, { useState, useEffect } from 'react';
import MicrolearningQuiz from './MicrolearningQuiz';
import { quizAPI, aiQuestionAPI } from '../services/api';
import toast from 'react-hot-toast';

/**
 * Example component showing how to integrate the quiz component
 * into an existing page or workflow
 */
const QuizIntegrationExample = ({ 
  videoId, 
  microlearningContent, 
  onQuizComplete,
  onBack 
}) => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (microlearningContent) {
      generateQuestions();
    }
  }, [microlearningContent]);

  const generateQuestions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Generate AI questions from microlearning content
      const quiz = await aiQuestionAPI.generateQuizFromMicrolearning(microlearningContent);
      setQuestions(quiz.questions || []);

      if (!quiz.questions || quiz.questions.length === 0) {
        throw new Error('No questions could be generated');
      }

    } catch (err) {
      console.error('Error generating questions:', err);
      setError(err.message);
      toast.error('Failed to generate quiz questions');
    } finally {
      setLoading(false);
    }
  };

  const handleQuizComplete = (results) => {
    console.log('Quiz completed with results:', results);
    
    // Show completion message
    toast.success(`Quiz completed! Score: ${results.completionRate.toFixed(1)}%`);
    
    // Call parent completion handler
    if (onQuizComplete) {
      onQuizComplete(results);
    }
  };

  const handleError = () => {
    setError(null);
    generateQuestions();
  };

  const handleRetry = () => {
    generateQuestions();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Generating quiz questions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <div className="text-red-600 mb-4">
          <svg className="h-12 w-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="text-lg font-semibold mb-2">Error Generating Quiz</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-x-3">
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
            {onBack && (
              <button
                onClick={onBack}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Go Back
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="text-center p-8">
        <div className="text-gray-600 mb-4">
          <svg className="h-12 w-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.709M15 6.291A7.962 7.962 0 0012 5c-2.34 0-4.29 1.009-5.824 2.709" />
          </svg>
          <h3 className="text-lg font-semibold mb-2">No Questions Available</h3>
          <p className="text-gray-600 mb-4">Unable to generate quiz questions for this content.</p>
          <div className="space-x-3">
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
            {onBack && (
              <button
                onClick={onBack}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Go Back
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-integration">
      {/* Optional header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Knowledge Check</h2>
        <p className="text-gray-600">
          Test your understanding of the microlearning content
        </p>
      </div>

      {/* Quiz Component */}
      <MicrolearningQuiz
        questions={questions}
        quizType="intermediate"
        onQuizComplete={handleQuizComplete}
        onError={handleError}
        showTimer={true}
        timeLimit={300} // 5 minutes
        allowNavigation={true}
        className="bg-white rounded-lg shadow-sm p-6"
      />
    </div>
  );
};

export default QuizIntegrationExample;
