import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getTopicMeta } from '../utils/helpers';
import { assessmentAPI } from '../services/api';
import { 
  CheckCircle as CheckCircleIcon, 
  XCircle as XCircleIcon, 
  TrendingUp as TrendingUpIcon,
  BookOpen as BookOpenIcon,
  Video as VideoCameraIcon,
  RotateCcw as RotateCcwIcon,
  Clock as ClockIcon,
  Target as TargetIcon,
  Trophy as TrophyIcon,
  ArrowRight as ArrowRightIcon
} from 'lucide-react';
import Loading from '../components/Loading';
import toast from 'react-hot-toast';

const AssessmentResults = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { topic } = useParams();
  const { user } = useAuth();
  
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const topicMeta = getTopicMeta(topic);

  const { score, totalQuestions, timeElapsed } = location.state || {
    score: 0,
    totalQuestions: 0,
    timeElapsed: 0
  };

  const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

  const getPerformanceLevel = (percentage) => {
    if (percentage >= 80) return { 
      level: 'Excellent', 
      color: 'text-green-600', 
      bgColor: 'bg-green-100',
      borderColor: 'border-green-200',
      description: 'Outstanding performance! You have mastered this topic.'
    };
    if (percentage >= 60) return { 
      level: 'Good', 
      color: 'text-blue-600', 
      bgColor: 'bg-blue-100',
      borderColor: 'border-blue-200',
      description: 'Great job! You have a solid understanding of this topic.'
    };
    if (percentage >= 40) return { 
      level: 'Fair', 
      color: 'text-yellow-600', 
      bgColor: 'bg-yellow-100',
      borderColor: 'border-yellow-200',
      description: 'Good progress! Focus on strengthening your foundation.'
    };
    return { 
      level: 'Needs Improvement', 
      color: 'text-red-600', 
      bgColor: 'bg-red-100',
      borderColor: 'border-red-200',
      description: 'Keep learning! Start with the basics to build confidence.'
    };
  };

  const performance = getPerformanceLevel(percentage);

  const formatTime = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getRecommendations = (percentage, topic) => {
    if (percentage >= 80) {
      return [
        {
          type: 'advanced',
          title: 'Advanced Topics',
          description: `You have a strong foundation in ${topic}. Ready for advanced concepts!`,
          action: 'Explore Advanced Videos',
          link: `/app/recommendations/${topic}?level=advanced`
        }
      ];
    } else if (percentage >= 60) {
      return [
        {
          type: 'intermediate',
          title: 'Intermediate Practice',
          description: `Good progress! Focus on intermediate ${topic} concepts.`,
          action: 'Browse Intermediate Content',
          link: `/app/recommendations/${topic}?level=intermediate`
        }
      ];
    } else {
      return [
        {
          type: 'beginner',
          title: 'Foundation Building',
          description: `Start with fundamental ${topic} concepts to build a strong base.`,
          action: 'Start with Basics',
          link: `/app/recommendations/${topic}?level=beginner`
        }
      ];
    }
  };

  const recommendations = getRecommendations(percentage, topic);

  return (
    <div className="space-y-8">
      {/* Results Header */}
      <div className="bg-white rounded-xl shadow-sm border border-[#E9E9E7] p-8">
        <div className="text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="text-3xl mr-4">{topicMeta.icon}</div>
            <div>
              <h1 className="text-2xl font-bold text-[#37352F]">
                {topicMeta.name} Assessment
              </h1>
              <p className="text-[#6B6B6B]">Assessment completed successfully</p>
            </div>
          </div>
          
          <div className={`mx-auto w-20 h-20 ${performance.bgColor} rounded-full flex items-center justify-center mb-6`}>
            {percentage >= 60 ? (
              <CheckCircleIcon className={`w-10 h-10 ${performance.color}`} />
            ) : percentage >= 40 ? (
              <TrendingUpIcon className={`w-10 h-10 ${performance.color}`} />
            ) : (
              <XCircleIcon className={`w-10 h-10 ${performance.color}`} />
            )}
          </div>
          
          <div className="text-6xl font-bold text-[#37352F] mb-4">
            {percentage}%
          </div>
          
          <div className={`inline-flex items-center px-6 py-3 rounded-full text-base font-medium border ${performance.bgColor} ${performance.color} ${performance.borderColor} mb-4`}>
            <TargetIcon className="w-5 h-5 mr-2" />
            {performance.level}
          </div>
          
          <p className="text-[#6B6B6B] max-w-md mx-auto">
            {performance.description}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-[#E9E9E7] p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-[#2383E2]/10 rounded-lg flex items-center justify-center mr-4">
              <TrophyIcon className="w-6 h-6 text-[#2383E2]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#6B6B6B]">Final Score</p>
              <p className="text-2xl font-bold text-[#37352F]">{percentage}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-[#E9E9E7] p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
              <CheckCircleIcon className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#6B6B6B]">Correct Answers</p>
              <p className="text-2xl font-bold text-[#37352F]">{score}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-[#E9E9E7] p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
              <ClockIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#6B6B6B]">Time Taken</p>
              <p className="text-2xl font-bold text-[#37352F]">{formatTime(timeElapsed)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-[#E9E9E7] p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
              <BookOpenIcon className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#6B6B6B]">Total Questions</p>
              <p className="text-2xl font-bold text-[#37352F]">{totalQuestions}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-xl shadow-sm border border-[#E9E9E7] p-8">
        <h2 className="text-xl font-semibold text-[#37352F] mb-6">
          🎯 Recommended Next Steps
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {recommendations.map((rec, index) => (
            <div key={index} className="border border-[#E9E9E7] rounded-xl p-6 hover:shadow-md transition-all">
              <div className="flex items-start space-x-4 mb-4">
                <div className="w-12 h-12 bg-[#2383E2]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <VideoCameraIcon className="w-6 h-6 text-[#2383E2]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-[#37352F] mb-2">
                    {rec.title}
                  </h3>
                  <p className="text-[#6B6B6B] mb-4">
                    {rec.description}
                  </p>
                  
                  <button
                    onClick={() => navigate(rec.link)}
                    className="inline-flex items-center px-4 py-2 bg-[#2383E2] text-white rounded-lg hover:bg-[#0F62FE] transition-colors text-sm font-medium"
                  >
                    {rec.action}
                    <ArrowRightIcon className="ml-2 h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={() => navigate(`/app/assessment/${topic}/quiz`)}
          className="flex items-center justify-center px-6 py-3 bg-white border border-[#E9E9E7] text-[#37352F] rounded-lg hover:bg-[#F7F6F3] transition-colors font-medium"
        >
          <RotateCcwIcon className="w-5 h-5 mr-2" />
          Retake Assessment
        </button>
        
        <button
          onClick={() => navigate('/app/dashboard')}
          className="flex items-center justify-center px-6 py-3 bg-[#2383E2] text-white rounded-lg hover:bg-[#0F62FE] transition-colors font-medium"
        >
          Back to Dashboard
          <ArrowRightIcon className="w-5 h-5 ml-2" />
        </button>
      </div>
    </div>
  );
};

export default AssessmentResults;