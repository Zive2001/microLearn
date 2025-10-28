import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MicrolearningQuiz from '../components/MicrolearningQuiz';
import { quizAPI, mockMicrolearningAPI, aiQuestionAPI } from '../services/api';
import Loading from '../components/Loading';
import toast from 'react-hot-toast';

const QuizExample = () => {
  const { videoId } = useParams();
  const navigate = useNavigate();
  
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadQuizData();
  }, [videoId]);

  const loadQuizData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get microlearning content
      const microlearning = await mockMicrolearningAPI.getMicrolearningContent(videoId);
      if (!microlearning) {
        throw new Error('No microlearning content found');
      }

      // Generate AI questions
      const quiz = await aiQuestionAPI.generateQuizFromMicrolearning(microlearning);
      setQuestions(quiz.questions || []);

    } catch (err) {
      console.error('Error loading quiz data:', err);
      setError(err.message);
      toast.error('Failed to load quiz data');
    } finally {
      setLoading(false);
    }
  };

  const handleQuizComplete = (results) => {
    console.log('Quiz completed:', results);
    toast.success(`Quiz completed! Score: ${results.completionRate.toFixed(1)}%`);
    
    // Navigate back or to next step
    navigate(`/app/microlearning/${videoId}`);
  };

  const handleError = () => {
    setError(null);
    loadQuizData();
  };

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Quiz</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={handleError}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Questions Available</h2>
          <p className="text-gray-600 mb-6">No quiz questions were generated for this content.</p>
          <button
            onClick={() => navigate(`/app/microlearning/${videoId}`)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Videos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Knowledge Check</h1>
          <p className="text-gray-600">
            Test your understanding of the microlearning content
          </p>
        </div>

        <MicrolearningQuiz
          questions={questions}
          quizType="intermediate"
          onQuizComplete={handleQuizComplete}
          onError={handleError}
          showTimer={true}
          timeLimit={300} // 5 minutes
          allowNavigation={true}
          className="bg-white rounded-lg shadow-sm p-8"
        />
      </div>
    </div>
  );
};

export default QuizExample;
