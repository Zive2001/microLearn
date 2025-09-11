import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon, Check as CheckIcon } from 'lucide-react';

// Sample questions - in a real app, these would come from an API
const sampleQuestions = {
  general: [
    {
      id: 1,
      question: "What is the primary purpose of a variable in programming?",
      options: [
        "To store and manipulate data",
        "To create visual elements",
        "To connect to databases",
        "To handle user input"
      ],
      correct: 0
    },
    {
      id: 2,
      question: "Which of these is NOT a programming paradigm?",
      options: [
        "Object-Oriented Programming",
        "Functional Programming",
        "Database Programming",
        "Procedural Programming"
      ],
      correct: 2
    }
  ],
  javascript: [
    {
      id: 1,
      question: "What will console.log(typeof null) output?",
      options: [
        "null",
        "undefined",
        "object",
        "string"
      ],
      correct: 2
    },
    {
      id: 2,
      question: "Which method is used to add elements to the end of an array?",
      options: [
        "unshift()",
        "push()",
        "pop()",
        "shift()"
      ],
      correct: 1
    }
  ]
};

const AssessmentQuiz = () => {
  const { topic } = useParams();
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeElapsed, setTimeElapsed] = useState(0);

  const questions = sampleQuestions[topic] || sampleQuestions.general;

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleAnswerSelect = (questionId, answerIndex) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answerIndex
    }));
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const handleSubmit = () => {
    // Calculate score
    const score = questions.reduce((acc, question) => {
      return answers[question.id] === question.correct ? acc + 1 : acc;
    }, 0);

    // Navigate to results page
    navigate(`/app/assessment/${topic}/results`, {
      state: {
        score,
        totalQuestions: questions.length,
        answers,
        timeElapsed
      }
    });
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isLastQuestion = currentQuestion === questions.length - 1;
  const allQuestionsAnswered = questions.every(q => answers[q.id] !== undefined);

  if (!questions.length) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Assessment not found.</p>
        <button 
          onClick={() => navigate('/app/assessment')}
          className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800"
        >
          Back to Assessments
        </button>
      </div>
    );
  }

  const question = questions[currentQuestion];

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-semibold text-gray-900">
            {topic.charAt(0).toUpperCase() + topic.slice(1)} Assessment
          </h1>
          <div className="text-sm text-gray-600">
            Time: {formatTime(timeElapsed)}
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">
            Question {currentQuestion + 1} of {questions.length}
          </span>
          <div className="flex space-x-1">
            {questions.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === currentQuestion
                    ? 'bg-gray-900'
                    : answers[questions[index].id] !== undefined
                    ? 'bg-green-500'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-6">
          {question.question}
        </h2>
        
        <div className="space-y-3">
          {question.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleAnswerSelect(question.id, index)}
              className={`w-full text-left p-4 rounded-lg border transition-colors ${
                answers[question.id] === index
                  ? 'border-gray-900 bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center">
                <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                  answers[question.id] === index
                    ? 'border-gray-900 bg-gray-900'
                    : 'border-gray-300'
                }`}>
                  {answers[question.id] === index && (
                    <CheckIcon className="w-3 h-3 text-white" />
                  )}
                </div>
                <span className="text-gray-900">{option}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={handlePrevious}
          disabled={currentQuestion === 0}
          className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeftIcon className="w-4 h-4 mr-2" />
          Previous
        </button>

        <div className="text-sm text-gray-600">
          {Object.keys(answers).length} of {questions.length} answered
        </div>

        {isLastQuestion ? (
          <button
            onClick={handleSubmit}
            disabled={!allQuestionsAnswered}
            className="flex items-center px-6 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit Assessment
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Next
            <ChevronRightIcon className="w-4 h-4 ml-2" />
          </button>
        )}
      </div>
    </div>
  );
};

export default AssessmentQuiz;