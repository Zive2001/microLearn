import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getTopicMeta } from '../utils/helpers';
import { 
  ChevronLeft as ChevronLeftIcon, 
  ChevronRight as ChevronRightIcon, 
  Check as CheckIcon,
  Clock as ClockIcon,
  AlertCircle as AlertCircleIcon,
  Pause as PauseIcon,
  X as XIcon
} from 'lucide-react';
import toast from 'react-hot-toast';

// Sample questions for different topics
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
    },
    {
      id: 3,
      question: "What is the difference between == and === in JavaScript?",
      options: [
        "No difference, they work the same",
        "=== checks type and value, == only checks value",
        "== is faster than ===",
        "=== is deprecated"
      ],
      correct: 1
    }
  ],
  react: [
    {
      id: 1,
      question: "What is JSX in React?",
      options: [
        "A database query language",
        "A syntax extension for JavaScript",
        "A testing framework",
        "A build tool"
      ],
      correct: 1
    },
    {
      id: 2,
      question: "Which hook is used to manage state in functional components?",
      options: [
        "useEffect",
        "useState",
        "useCallback",
        "useMemo"
      ],
      correct: 1
    }
  ],
  nodejs: [
    {
      id: 1,
      question: "What is Node.js primarily used for?",
      options: [
        "Frontend development",
        "Database management",
        "Server-side JavaScript runtime",
        "Mobile app development"
      ],
      correct: 2
    },
    {
      id: 2,
      question: "Which module is used to create HTTP servers in Node.js?",
      options: [
        "fs",
        "path",
        "http",
        "url"
      ],
      correct: 2
    }
  ],
  python: [
    {
      id: 1,
      question: "Which of these is NOT a valid Python data type?",
      options: [
        "list",
        "tuple",
        "array",
        "dict"
      ],
      correct: 2
    },
    {
      id: 2,
      question: "What is the correct way to create a function in Python?",
      options: [
        "function myFunc():",
        "def myFunc():",
        "create myFunc():",
        "func myFunc():"
      ],
      correct: 1
    }
  ]
};

const AssessmentQuiz = () => {
  const { topic } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const questions = sampleQuestions[topic] || sampleQuestions.general;
  const topicMeta = getTopicMeta(topic);

  // Timer effect
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
        timeElapsed,
        questions // Include questions for results page
      }
    });
  };

  const handlePauseAssessment = () => {
    toast.success('Assessment paused. You can resume later.');
    navigate('/app/assessment');
  };

  const handleAbandonAssessment = () => {
    if (window.confirm('Are you sure you want to abandon this assessment? Your progress will be lost.')) {
      navigate('/app/assessment');
    }
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
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircleIcon className="h-8 w-8 text-red-600" />
        </div>
        <h2 className="text-xl font-semibold text-[#37352F] mb-2">
          Assessment not found
        </h2>
        <p className="text-[#6B6B6B] mb-6">
          We couldn't load questions for this topic. Please try again.
        </p>
        <button 
          onClick={() => navigate('/app/assessment')}
          className="inline-flex items-center px-6 py-3 bg-[#2383E2] text-white rounded-lg hover:bg-[#0F62FE] transition-colors"
        >
          Back to Assessments
        </button>
      </div>
    );
  }

  const question = questions[currentQuestion];

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
              <p className="text-[#6B6B6B]">
                AI-powered adaptive assessment
              </p>
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
            Question {currentQuestion + 1} of {questions.length}
          </span>
          <div className="flex space-x-1">
            {questions.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === currentQuestion
                    ? 'bg-[#2383E2]'
                    : answers[questions[index].id] !== undefined
                    ? 'bg-green-500'
                    : 'bg-[#D3D3D1]'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="bg-white rounded-xl shadow-sm border border-[#E9E9E7] p-8">
        <h2 className="text-xl font-semibold text-[#37352F] mb-8 leading-relaxed">
          {question.question}
        </h2>
        
        <div className="space-y-4">
          {question.options.map((option, index) => {
            const isSelected = answers[question.id] === index;
            return (
              <button
                key={index}
                onClick={() => handleAnswerSelect(question.id, index)}
                disabled={isSubmitting}
                className={`w-full text-left p-6 rounded-xl border transition-all duration-200 ${
                  isSelected
                    ? 'border-[#2383E2] bg-[#2383E2]/5' 
                    : 'border-[#E9E9E7] hover:border-[#D3D3D1] hover:bg-[#F7F6F3]'
                } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-center">
                  <div className={`w-6 h-6 rounded-full border-2 mr-4 flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'border-[#2383E2] bg-[#2383E2]'
                      : 'border-[#D3D3D1]'
                  }`}>
                    {isSelected && (
                      <CheckIcon className="w-3 h-3 text-white" />
                    )}
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
        <button
          onClick={handlePrevious}
          disabled={currentQuestion === 0}
          className="flex items-center px-4 py-3 text-sm font-medium text-[#6B6B6B] bg-white border border-[#E9E9E7] rounded-lg hover:bg-[#F7F6F3] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeftIcon className="w-4 h-4 mr-2" />
          Previous
        </button>

        <div className="text-sm text-[#6B6B6B]">
          {Object.keys(answers).length} of {questions.length} answered
        </div>

        {isLastQuestion ? (
          <button
            onClick={handleSubmit}
            disabled={!allQuestionsAnswered}
            className="flex items-center px-6 py-3 text-sm font-medium text-white bg-[#2383E2] rounded-lg hover:bg-[#0F62FE] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Submit Assessment
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="flex items-center px-4 py-3 text-sm font-medium text-[#6B6B6B] bg-white border border-[#E9E9E7] rounded-lg hover:bg-[#F7F6F3] transition-colors"
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