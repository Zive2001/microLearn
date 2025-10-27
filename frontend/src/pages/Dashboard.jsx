// src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useApp } from '../context/AppContext';
import {
  BookOpen as BookOpenIcon,
  GraduationCap as AcademicCapIcon,
  TrendingUp as TrendingUpIcon,
  Play as PlayIcon,
  ArrowRight as ArrowRightIcon,
  Sparkles as SparklesIcon,
  Clock as ClockIcon,
  Target as TargetIcon,
  CheckCircle as CheckCircleIcon,
  HelpCircle as QuestionMarkCircleIcon
} from 'lucide-react';
import Loading from '../components/Loading';
import SimilarUsersCard from '../components/SimilarUsersCard';
import PersonalizedLearningPath from '../components/PersonalizedLearningPath';
import FAISSStatusBadge from '../components/FAISSStatusBadge';
import { getTopicMeta, getTopicIconName, getLevelBadgeClasses, formatTimeAgo } from '../utils/helpers';
import StackIcon from 'tech-stack-icons';

const Dashboard = () => {
  const { user } = useAuth();
  const {
    dashboardData,
    selectedTopics,
    isLoading,
    fetchDashboardData,
    fetchSelectedTopics
  } = useApp();
  const [greeting, setGreeting] = useState('');
  const navigate = useNavigate();

  // Debug logging function
  const debugLog = (message, data) => {
    if (import.meta.env.DEV && window.location.search.includes('debug=true')) {
      console.log(message, data);
    }
  };

  // Get difficulty level color
  const getDifficultyColor = (level) => {
    if (!level) return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' };

    const levelLower = level.toLowerCase();

    if (levelLower.includes('beginner') || levelLower.includes('basic') || levelLower.includes('easy')) {
      return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' };
    } else if (levelLower.includes('intermediate') || levelLower.includes('medium')) {
      return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' };
    } else if (levelLower.includes('advanced') || levelLower.includes('expert') || levelLower.includes('hard')) {
      return { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' };
    } else if (levelLower.includes('master') || levelLower.includes('professional')) {
      return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' };
    }

    return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' };
  };

  // Compute derived state (must be before any early returns)
  const assessedTopics = selectedTopics?.filter(topic =>
    topic.knowledgeLevel || topic.assessmentScore
  ) || [];
  const unassessedTopics = selectedTopics?.filter(topic =>
    !topic.knowledgeLevel && !topic.assessmentScore
  ) || [];
  const stats = dashboardData?.stats || {};
  const quickRecommendations = dashboardData?.quickRecommendations?.recommendations || [];

  useEffect(() => {
    // Set greeting based on time of day
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    // Fetch dashboard data
    fetchDashboardData();
    fetchSelectedTopics();
  }, []);

  // Debug logging to understand selectedTopics data structure
  if (selectedTopics && selectedTopics.length > 0) {
    debugLog('🔍 Dashboard Debug - selectedTopics:', selectedTopics);
    debugLog('🔍 Dashboard Debug - first topic structure:', selectedTopics[0]);
    debugLog('🔍 Dashboard Debug - assessed topics:', assessedTopics);
    debugLog('🔍 Dashboard Debug - unassessed topics:', unassessedTopics);
  } else {
    debugLog('🔍 Dashboard Debug - No selectedTopics yet');
  }

  if (isLoading) {
    return <Loading fullScreen text="Loading your dashboard..." />;
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header - Condensed */}
      <div className="bg-white rounded-xl shadow-sm border border-[#E9E9E7] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-[#37352F] mb-1">
              {greeting}, {user?.profile?.firstName}! 👋
            </h1>
            <p className="text-sm text-[#6B6B6B] mb-4">
              {assessedTopics.length === 0
                ? "Let's start with an assessment to gauge your skills"
                : `Great progress! You've assessed ${assessedTopics.length} topic${assessedTopics.length > 1 ? 's' : ''}.`
              }
            </p>

            {/* Quick Stats - Moderate Size, Lean Layout */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="flex items-center space-x-3 p-3 bg-[#F7F6F3] rounded-lg">
                <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                  <BookOpenIcon className="h-6 w-6 text-[#2383E2]" />
                </div>
                <div>
                  <p className="text-xs text-[#6B6B6B]">Topics Selected</p>
                  <p className="text-2xl font-bold text-[#37352F]">
                    {selectedTopics?.length || 0}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-[#F7F6F3] rounded-lg">
                <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                  <AcademicCapIcon className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-[#6B6B6B]">Assessments</p>
                  <p className="text-2xl font-bold text-[#37352F]">
                    {assessedTopics.length}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-[#F7F6F3] rounded-lg">
                <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                  <TrendingUpIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-[#6B6B6B]">Avg Score</p>
                  <p className="text-2xl font-bold text-[#37352F]">
                    {assessedTopics.length > 0
                      ? Math.round(assessedTopics.reduce((sum, topic) => sum + (topic.assessmentScore || 0), 0) / assessedTopics.length)
                      : 0
                    }%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Illustration - Smaller */}
          <div className="hidden sm:block flex-shrink-0">
            <div className="w-32 h-32 bg-[#F7F6F3] rounded-lg flex items-center justify-center">
              <img
                src="/dashboard.png"
                alt="Dashboard illustration"
                className="w-full h-full object-contain p-2"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="hidden flex-col items-center text-gray-400">
                <SparklesIcon className="h-12 w-12 text-[#2383E2] mb-2" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Progress + Learning Path + Recommendations + Similar Users */}
        <div className="lg:col-span-2 space-y-8">
          {/* Your Progress */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[#37352F]">Your Progress</h2>
              {selectedTopics?.length === 0 && (
                <Link
                  to="/app/topics"
                  className="text-sm text-[#2383E2] hover:text-[#0F62FE] font-medium"
                >
                  Select Topics First →
                </Link>
              )}
            </div>

            {selectedTopics?.length === 0 ? (
              /* No Topics Selected */
              <div className="bg-white rounded-xl shadow-sm border border-[#E9E9E7] p-6 text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpenIcon className="h-8 w-8 text-[#2383E2]" />
                </div>
                <h3 className="text-lg font-medium text-[#37352F] mb-2">
                  Choose Your Learning Topics
                </h3>
                <p className="text-[#6B6B6B] mb-6">
                  Select the programming topics you want to master and we'll assess your current skill level.
                </p>
                <Link
                  to="/app/topics"
                  className="inline-flex items-center px-4 py-2 bg-[#2383E2] text-white rounded-lg hover:bg-[#0F62FE] transition-colors"
                >
                  Browse Topics
                  <ArrowRightIcon className="ml-2 h-4 w-4" />
                </Link>
              </div>
            ) : (
              /* Assessment Cards */
              <div className="grid grid-cols-1 gap-4">
                {selectedTopics.map((topic, index) => {
                  let topicSlug;
                  if (typeof topic === 'string') {
                    topicSlug = topic;
                  } else if (typeof topic === 'object' && topic !== null) {
                    topicSlug = topic.topic || topic.slug || topic.name || topic._id;
                  } else {
                    topicSlug = `fallback-${index}`;
                  }

                  const meta = getTopicMeta(topicSlug);
                  const iconName = getTopicIconName(topicSlug);
                  const hasAssessed = assessedTopics.some(t => (t.topic || t.name) === topicSlug || t._id === topic._id);
                  const topicData = assessedTopics.find(t => (t.topic || t.name) === topicSlug || t._id === topic._id);

                  return (
                    <div
                      key={`${topicSlug}-${index}`}
                      className="bg-white rounded-xl shadow-sm border border-[#E9E9E7] p-5 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          {/* Topic Header */}
                          <div className="flex items-start gap-3 mb-3">
                            <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                              <StackIcon name={iconName} variant="dark" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-[#37352F]">
                                {meta.name} Assessment
                              </h3>
                              <p className="text-sm text-[#6B6B6B]">
                                Adaptive assessment that adjusts to your skill level
                              </p>
                            </div>
                          </div>

                          {/* Metadata */}
                          <div className="flex items-center gap-4 text-sm text-[#6B6B6B] mb-3">
                            <div className="flex items-center">
                              <ClockIcon className="h-4 w-4 mr-1" />
                              10-15 min
                            </div>
                            <div className="flex items-center">
                              <QuestionMarkCircleIcon className="h-4 w-4 mr-1" />
                              5-20 questions
                            </div>
                          </div>

                          {/* Status Badges */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {hasAssessed && topicData ? (
                              <>
                                {(() => {
                                  const colors = getDifficultyColor(topicData.knowledgeLevel);
                                  return (
                                    <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text} border ${colors.border}`}>
                                      <CheckCircleIcon className="h-3.5 w-3.5" />
                                      {topicData.knowledgeLevel}
                                    </span>
                                  );
                                })()}
                                {topicData.assessmentScore && (
                                  <span className="text-sm font-medium text-[#37352F]">
                                    {topicData.assessmentScore}%
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-[#6B6B6B] border border-[#E9E9E7]">
                                Not Started
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-2 ml-4 flex-shrink-0">
                          <button
                            onClick={() => navigate(`/app/assessment/${topicSlug}`)}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0d1b2a] text-white rounded-lg hover:bg-[#16293a] transition-colors text-sm font-medium whitespace-nowrap"
                          >
                            <PlayIcon className="h-4 w-4" />
                            {hasAssessed ? 'Retake' : 'Start'}
                          </button>

                          {hasAssessed && (
                            <Link
                              to={`/app/recommendations/${topicSlug}`}
                              className="inline-flex items-center justify-center gap-1 px-4 py-2 bg-white border border-[#E9E9E7] text-[#37352F] rounded-lg hover:bg-[#F7F6F3] transition-colors text-sm font-medium whitespace-nowrap"
                            >
                              View Videos
                              <ArrowRightIcon className="h-4 w-4" />
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

          {/* Personalized Learning Path */}
          <PersonalizedLearningPath />

          {/* Recommended Videos */}
          {quickRecommendations.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-[#E9E9E7] p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-[#37352F]">Recommended Videos</h2>
                <Link
                  to="/app/recommendations"
                  className="text-sm text-[#2383E2] hover:text-[#0F62FE] font-medium"
                >
                  View All →
                </Link>
              </div>

              <div className="space-y-4">
                {quickRecommendations.slice(0, 3).map((rec, index) => {
                  const meta = getTopicMeta(rec.topic);
                  const iconName = getTopicIconName(rec.topic);
                  const video = rec.recommendation;

                  return (
                    <div
                      key={`${rec.topic}-${video.videoId || index}`}
                      className="flex items-center space-x-4 p-4 border border-[#E9E9E7] rounded-lg hover:bg-[#F7F6F3] transition-colors cursor-pointer"
                      onClick={() => {
                        if (video.url) {
                          window.open(video.url, '_blank', 'noopener,noreferrer');
                        }
                      }}
                    >
                      <div className="flex-shrink-0">
                        {video.thumbnail ? (
                          <>
                            <img
                              src={video.thumbnail}
                              alt={video.title}
                              className="w-16 h-12 rounded object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                            <div className="hidden w-16 h-12 bg-gradient-to-br from-[#2383E2] to-[#0F62FE] rounded flex items-center justify-center">
                              <PlayIcon className="h-6 w-6 text-white" />
                            </div>
                          </>
                        ) : (
                          <div className="w-16 h-12 bg-gradient-to-br from-[#2383E2] to-[#0F62FE] rounded flex items-center justify-center">
                            <PlayIcon className="h-6 w-6 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <div className="w-5 h-5 flex items-center justify-center">
                            <StackIcon name={iconName} variant="dark" />
                          </div>
                          <span className="text-sm font-medium text-[#2383E2]">{meta.name}</span>
                          <span className={getLevelBadgeClasses(rec.userLevel)}>
                            {rec.userLevel}
                          </span>
                        </div>
                        <h3 className="font-medium text-[#37352F] truncate">{video.title}</h3>
                        <p className="text-sm text-[#6B6B6B]">
                          {video.channelTitle} • {video.durationText || video.duration}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <div className="inline-flex items-center px-3 py-2 text-sm bg-[#2383E2] text-white rounded-lg hover:bg-[#0F62FE] transition-colors">
                          Watch
                        </div>
                      </div>
                    </div>
                  );
                })}

                {quickRecommendations.length === 0 && assessedTopics.length > 0 && (
                  <div className="text-center py-6 text-[#6B6B6B]">
                    <p className="mb-2">Loading personalized recommendations...</p>
                    <p className="text-xs">Based on your assessment results</p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Right Column - Quick Actions + Tips + Activity */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-[#E9E9E7] p-6">
            <h2 className="text-lg font-semibold text-[#37352F] mb-4">Quick Actions</h2>

            <div className="space-y-3">
              <Link
                to="/app/topics"
                className="flex items-center p-3 border border-[#E9E9E7] rounded-lg hover:bg-[#F7F6F3] transition-colors group"
              >
                <BookOpenIcon className="h-5 w-5 text-[#2383E2] mr-3" />
                <div className="flex-1">
                  <p className="font-medium text-[#37352F] group-hover:text-[#2383E2]">Browse Topics</p>
                  <p className="text-sm text-[#6B6B6B]">Discover new subjects</p>
                </div>
                <ArrowRightIcon className="h-4 w-4 text-[#6B6B6B] group-hover:text-[#2383E2]" />
              </Link>

              <Link
                to="/app/assessment"
                className="flex items-center p-3 border border-[#E9E9E7] rounded-lg hover:bg-[#F7F6F3] transition-colors group"
              >
                <AcademicCapIcon className="h-5 w-5 text-green-600 mr-3" />
                <div className="flex-1">
                  <p className="font-medium text-[#37352F] group-hover:text-[#2383E2]">Take Assessment</p>
                  <p className="text-sm text-[#6B6B6B]">Test your knowledge</p>
                </div>
                <ArrowRightIcon className="h-4 w-4 text-[#6B6B6B] group-hover:text-[#2383E2]" />
              </Link>
            </div>
          </div>

          {/* Learning Community - Moved to right sidebar */}
          {assessedTopics.length > 0 && (
            <SimilarUsersCard userId={user?._id} layout="detailed" />
          )}

          {/* FAISS Status Badge */}
          <div className="flex justify-end">
            <FAISSStatusBadge />
          </div>

          {/* Learning Tip */}
          <div className="bg-gradient-to-br from-[#0d1b2a] to-[#1b263b] rounded-xl p-6 text-white">
            <div className="flex items-start space-x-3 mb-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <SparklesIcon className="h-5 w-5" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">💡 Learning Tip</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Regular assessment helps track your progress. Consider retaking assessments every few weeks to see your improvement!
                </p>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          {dashboardData?.recentHistory?.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-[#E9E9E7] p-6">
              <h2 className="text-lg font-semibold text-[#37352F] mb-4">Recent Activity</h2>

              <div className="space-y-3">
                {dashboardData.recentHistory.slice(0, 3).map((activity, index) => {
                  // Create unique key using multiple identifiers to avoid duplicates
                  const uniqueKey = `activity-${activity.topic}-${activity.id || activity._id || activity.createdAt || Date.now()}-${index}`;
                  return (
                    <div key={uniqueKey} className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 bg-[#2383E2] rounded-full"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#37352F]">
                          Completed {getTopicMeta(activity.topic).name} assessment
                        </p>
                        <p className="text-xs text-[#6B6B6B]">
                          {formatTimeAgo(activity.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
