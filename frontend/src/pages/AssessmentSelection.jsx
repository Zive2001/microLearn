import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../hooks/useAuth';
import { getTopicMeta } from '../utils/helpers';
import { assessmentAPI } from '../services/api';
import {
  Clock as ClockIcon,
  HelpCircle as QuestionMarkCircleIcon,
  Play as PlayIcon,
  CheckCircle as CheckCircleIcon,
  Target as TargetIcon,
  ArrowRight as ArrowRightIcon
} from 'lucide-react';
import Loading from '../components/Loading';
import toast from 'react-hot-toast';

const AssessmentSelection = () => {
  const { user } = useAuth();
  const {
    selectedTopics,
    assessmentHistory,
    activeSessions,
    isLoading,
    fetchSelectedTopics,
    fetchAssessmentHistory,
    fetchActiveSessions
  } = useApp();

  const [progressSummary, setProgressSummary] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(true);

  const navigate = useNavigate();

  // Fetch real progress data from API
  const fetchProgressData = async () => {
    try {
      setLoadingProgress(true);
      const summary = await assessmentAPI.getProgressSummary();
      setProgressSummary(summary);
    } catch (error) {
      console.error('Error fetching progress summary:', error);
      toast.error('Failed to load assessment progress');
    } finally {
      setLoadingProgress(false);
    }
  };

  useEffect(() => {
    fetchSelectedTopics();
    fetchAssessmentHistory();
    fetchActiveSessions();
    fetchProgressData();
  }, []);

  // Get topic progress from real data
  const getTopicProgress = (topicSlug) => {
    if (!progressSummary?.topicProgress) return null;
    return progressSummary.topicProgress.find(tp => tp.topic === topicSlug);
  };

  // Use real selected topics or fallback
  const displayTopics = selectedTopics?.length > 0 ? selectedTopics : [];

  const handleStartAssessment = (topicSlug) => {
    console.log('🚀 Starting assessment for topicSlug:', topicSlug);
    console.log('🚀 Target URL will be:', `/app/assessment/${topicSlug}`);
    navigate(`/app/assessment/${topicSlug}`);
  };

  const hasActiveSession = (topicSlug) => {
    return activeSessions?.some(session => session.topic === topicSlug && session.status === 'active');
  };

  const getLastAssessmentResult = (topicSlug) => {
    return assessmentHistory?.find(assessment => assessment.topic === topicSlug);
  };

  if (isLoading || loadingProgress) {
    return <Loading fullScreen text="Loading assessments..." />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <TargetIcon className="h-6 w-6 text-gray-600" />
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Skill Assessment
          </h1>
          <p className="text-gray-600 mb-6">
            Take adaptive assessments to evaluate your programming skills
          </p>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-md mx-auto">
            <div className="text-center">
              <div className="text-xl font-semibold text-gray-900">
                {progressSummary?.totalSelectedTopics || displayTopics.length || 0}
              </div>
              <div className="text-sm text-gray-600">Selected Topics</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-semibold text-gray-900">
                {progressSummary?.assessedTopics || 0}
              </div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-semibold text-gray-900">
                {progressSummary?.activeAssessments || 0}
              </div>
              <div className="text-sm text-gray-600">In Progress</div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Sessions */}
      {activeSessions?.length > 0 && (
        <div className="bg-orange-50 rounded-lg border border-orange-200 p-4">
          <div className="flex items-start space-x-3">
            <ClockIcon className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-base font-medium text-gray-900 mb-2">
                Resume Your Assessments
              </h3>
              <p className="text-gray-600 text-sm mb-3">
                You have {activeSessions.length} incomplete assessment{activeSessions.length > 1 ? 's' : ''}. Continue where you left off.
              </p>
              <div className="space-y-2">
                {activeSessions.map((session, index) => {
                  const sessionKey = session.sessionId || session.id || session._id || `session-${index}`;
                  const topicSlug = session.topic || session.topicSlug || 'unknown';
                  const meta = getTopicMeta(topicSlug);
                  return (
                    <div key={sessionKey} className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center space-x-3">
                        <div className="text-lg">{meta.icon}</div>
                        <div>
                          <p className="font-medium text-gray-900">{meta.name}</p>
                          <p className="text-sm text-gray-500">
                            Question {session.currentQuestion || 1} of {session.totalQuestions || 10}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate(`/app/assessment/${topicSlug}?session=${sessionKey}`)}
                        className="inline-flex items-center px-3 py-1.5 bg-orange-600 text-white rounded text-sm font-medium hover:bg-orange-700 transition-colors"
                      >
                        Resume
                        <ArrowRightIcon className="ml-1 h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Available Assessments */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Available Assessments</h2>
          {displayTopics?.length === 0 && (
            <Link
              to="/app/topics"
              className="text-sm text-[#495057] hover:text-[#212529] font-medium"
            >
              Select Topics First →
            </Link>
          )}
        </div>

        {displayTopics?.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
            <h3 className="text-base font-medium text-gray-900 mb-2">
              Select Your Topics First
            </h3>
            <p className="text-gray-600 mb-4 text-sm">
              Choose the programming topics you want to learn before taking assessments.
            </p>
            <Link
              to="/app/topics"
              className="inline-flex items-center px-4 py-2 bg-[#212529] text-white rounded text-sm font-medium hover:bg-[#495057] transition-colors"
            >
              Browse Topics
              <ArrowRightIcon className="ml-1 h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {displayTopics.map((topic, index) => {
              // Handle both data structures: topic.topic (string) or topic.slug or just topic
              let topicSlug;
              if (typeof topic === 'string') {
                topicSlug = topic;
              } else if (typeof topic === 'object' && topic !== null) {
                topicSlug = topic.topic || topic.slug || topic._id || `unknown-${index}`;
              } else {
                topicSlug = `fallback-${index}`;
              }

              const meta = getTopicMeta(topicSlug);
              const hasActive = hasActiveSession(topicSlug);
              const topicProgress = getTopicProgress(topicSlug);

              // Real assessment status from backend
              const hasAssessed = topicProgress && topicProgress.currentLevel !== 'Not Assessed';
              const currentLevel = topicProgress?.currentLevel;
              const currentScore = topicProgress?.currentScore;

              return (
                <div
                  key={`${topicSlug}-${index}`}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-3">
                        <div className="text-xl mr-3">{meta.icon}</div>
                        <div>
                          <h3 className="text-base font-medium text-gray-900">
                            {meta.name} Assessment
                          </h3>
                          <p className="text-sm text-gray-500">
                            Adaptive assessment that adjusts to your skill level
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                        <div className="flex items-center">
                          <ClockIcon className="h-3 w-3 mr-1" />
                          10-15 min
                        </div>
                        <div className="flex items-center">
                          <QuestionMarkCircleIcon className="h-3 w-3 mr-1" />
                          5-20 questions
                        </div>
                      </div>

                      {/* Status */}
                      <div className="flex items-center space-x-3 mb-3">
                        {hasAssessed && (
                          <div className="flex items-center space-x-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                              <CheckCircleIcon className="h-3 w-3 mr-1" />
                              {currentLevel}
                            </span>
                            {currentScore && (
                              <span className="text-sm text-gray-600">
                                {currentScore}%
                              </span>
                            )}
                          </div>
                        )}

                        {hasActive && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
                            <ClockIcon className="h-3 w-3 mr-1" />
                            In Progress
                          </span>
                        )}

                        {!hasAssessed && !hasActive && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                            Not Started
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="ml-4 flex flex-col gap-2">
                      <button
                        onClick={() => handleStartAssessment(topicSlug)}
                        className="inline-flex items-center px-3 py-1.5 bg-[#212529] text-white rounded text-sm font-medium hover:bg-[#495057] transition-colors"
                      >
                        <PlayIcon className="h-3 w-3 mr-1" />
                        {hasAssessed ? 'Retake' : 'Start'}
                      </button>

                      {hasAssessed && (
                        <Link
                          to={`/app/recommendations/${topicSlug}`}
                          className="inline-flex items-center px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50 transition-colors text-center"
                        >
                          View Videos
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
        <h3 className="text-base font-medium text-gray-900 mb-4">How Assessment Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-start space-x-3">
            <CheckCircleIcon className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-600" />
            <div>
              <p className="font-medium text-gray-900">Adaptive Difficulty</p>
              <p className="text-gray-600">Questions adjust based on your answers</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <CheckCircleIcon className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-600" />
            <div>
              <p className="font-medium text-gray-900">Real-time Analysis</p>
              <p className="text-gray-600">AI analyzes your skill level instantly</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <CheckCircleIcon className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-600" />
            <div>
              <p className="font-medium text-gray-900">Personalized Results</p>
              <p className="text-gray-600">Get curated content for your level</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <CheckCircleIcon className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-600" />
            <div>
              <p className="font-medium text-gray-900">Progress Tracking</p>
              <p className="text-gray-600">Monitor improvement over time</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssessmentSelection;