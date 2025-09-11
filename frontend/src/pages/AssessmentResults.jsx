import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { 
  CheckCircle as CheckCircleIcon, 
  XCircle as XCircleIcon, 
  TrendingUp as TrendingUpIcon,
  BookOpen as BookOpenIcon,
  Video as VideoCameraIcon,
  RotateCcw as RotateCcwIcon
} from 'lucide-react';

const AssessmentResults = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { topic } = useParams();
  
  const { score, totalQuestions, timeElapsed } = location.state || {
    score: 0,
    totalQuestions: 0,
    timeElapsed: 0
  };

  const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

  const getPerformanceLevel = (percentage) => {
    if (percentage >= 80) return { level: 'Excellent', color: 'text-green-600', bgColor: 'bg-green-100' };
    if (percentage >= 60) return { level: 'Good', color: 'text-blue-600', bgColor: 'bg-blue-100' };
    if (percentage >= 40) return { level: 'Fair', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    return { level: 'Needs Improvement', color: 'text-red-600', bgColor: 'bg-red-100' };
  };

  const performance = getPerformanceLevel(percentage);

  const formatTime = (seconds) => {
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Results Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <div className={`mx-auto w-16 h-16 ${performance.bgColor} rounded-full flex items-center justify-center mb-4`}>
          {percentage >= 60 ? (
            <CheckCircleIcon className={`w-8 h-8 ${performance.color}`} />
          ) : (
            <XCircleIcon className={`w-8 h-8 ${performance.color}`} />
          )}
        </div>
        
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Assessment Complete!
        </h1>
        
        <div className="text-4xl font-bold text-gray-900 mb-2">
          {score}/{totalQuestions}
        </div>
        
        <div className="text-lg text-gray-600 mb-4">
          {percentage}% Score
        </div>
        
        <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${performance.bgColor} ${performance.color}`}>
          <TrendingUpIcon className="w-4 h-4 mr-2" />
          {performance.level}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CheckCircleIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Correct Answers</p>
              <p className="text-2xl font-semibold text-gray-900">{score}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUpIcon className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Accuracy</p>
              <p className="text-2xl font-semibold text-gray-900">{percentage}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BookOpenIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Time Taken</p>
              <p className="text-2xl font-semibold text-gray-900">{formatTime(timeElapsed)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Recommended Next Steps
        </h2>
        
        <div className="space-y-4">
          {recommendations.map((rec, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-base font-medium text-gray-900 mb-2">
                    {rec.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {rec.description}
                  </p>
                </div>
                <VideoCameraIcon className="w-5 h-5 text-gray-400 mt-1" />
              </div>
              
              <button
                onClick={() => navigate(rec.link)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800"
              >
                {rec.action}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => navigate(`/app/assessment/${topic}`)}
          className="flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <RotateCcwIcon className="w-5 h-5 mr-2" />
          Retake Assessment
        </button>
        
        <button
          onClick={() => navigate('/app/dashboard')}
          className="flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default AssessmentResults;