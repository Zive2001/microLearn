// src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  Target as TargetIcon
} from 'lucide-react';
import Loading from '../components/Loading';
import { getTopicMeta, getLevelBadgeClasses, formatTimeAgo } from '../utils/helpers';

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

  // Debug logging function
  const debugLog = (message, data) => {
    if (import.meta.env.DEV && window.location.search.includes('debug=true')) {
      console.log(message, data);
    }
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

  // Note: Quick recommendations are handled by AppContext initialization

  if (isLoading) {
    return <Loading fullScreen text="Loading your dashboard..." />;
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-white rounded-xl shadow-sm border border-[#E9E9E7] p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-[#37352F] mb-2">
              {greeting}, {user?.profile?.firstName}! 👋
            </h1>
            <p className="text-lg text-[#6B6B6B] mb-6">
              {assessedTopics.length === 0 
                ? "Ready to discover your programming skills? Let's start with an assessment!"
                : `You've assessed ${assessedTopics.length} topic${assessedTopics.length > 1 ? 's' : ''}. Keep building your skills!`
              }
            </p>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-[#2383E2]/10 rounded-lg flex items-center justify-center">
                    <BookOpenIcon className="h-5 w-5 text-[#2383E2]" />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-[#6B6B6B]">Topics Selected</p>
                  <p className="text-xl font-semibold text-[#37352F]">
                    {selectedTopics?.length || 0}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <AcademicCapIcon className="h-5 w-5 text-green-600" />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-[#6B6B6B]">Assessments</p>
                  <p className="text-xl font-semibold text-[#37352F]">
                    {assessedTopics.length}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <TrendingUpIcon className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-[#6B6B6B]">Avg Score</p>
                  <p className="text-xl font-semibold text-[#37352F]">
                    {assessedTopics.length > 0
                      ? Math.round(assessedTopics.reduce((sum, topic) => sum + (topic.assessmentScore || 0), 0) / assessedTopics.length)
                      : 0
                    }%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Illustration */}
          <div className="mt-8 lg:mt-0 lg:ml-8">
            <div className="w-48 h-48 bg-[#F7F6F3] rounded-xl flex items-center justify-center">
              <img 
                src="/dashboard.png" 
                alt="Dashboard illustration" 
                className="w-full h-full object-contain p-4"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="hidden flex-col items-center text-gray-400">
                <SparklesIcon className="h-16 w-16 text-[#2383E2] mb-2" />
                <p className="text-xs">Dashboard Illustration</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Assessment Status */}
          <div className="bg-white rounded-xl shadow-sm border border-[#E9E9E7] p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-[#37352F]">Your Progress</h2>
              <Link 
                to="/app/topics"
                className="text-sm text-[#212529] hover:text-[#212529] font-medium"
              >
                Manage Topics →
              </Link>
            </div>

            {selectedTopics?.length === 0 ? (
              /* No Topics Selected */
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-[#2383E2]/10 rounded-full flex items-center justify-center mx-auto mb-4">
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
              /* Topics Progress */
              <div className="space-y-4">
                {/* Assessed Topics */}
                {assessedTopics.map((topicData) => {
                  const topicSlug = topicData.topic || topicData.slug || topicData;
                  const meta = getTopicMeta(topicSlug);
                  return (
                    <div key={topicSlug} className="flex items-center justify-between p-4 bg-[#F7F6F3] rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">{meta.icon}</div>
                        <div>
                          <h3 className="font-medium text-[#37352F]">{meta.name}</h3>
                          <div className="flex items-center space-x-2">
                            <span className={getLevelBadgeClasses(topicData.knowledgeLevel)}>
                              {topicData.knowledgeLevel}
                            </span>
                            <span className="text-sm text-[#6B6B6B]">
                              Score: {topicData.assessmentScore}%
                            </span>
                          </div>
                        </div>
                      </div>
                      <Link
                        to={`/app/recommendations/${topicSlug}`}
                        className="inline-flex items-center px-3 py-2 text-sm bg-white border border-[#E9E9E7] rounded-lg hover:bg-[#F7F6F3] transition-colors"
                      >
                        View Videos
                      </Link>
                    </div>
                  );
                })}

                {/* Unassessed Topics */}
                {unassessedTopics.map((topicData) => {
                  const topicSlug = topicData.topic || topicData.slug || topicData;
                  const meta = getTopicMeta(topicSlug);
                  return (
                    <div key={topicSlug} className="flex items-center justify-between p-4 border border-[#E9E9E7] rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl opacity-50">{meta.icon}</div>
                        <div>
                          <h3 className="font-medium text-[#37352F]">{meta.name}</h3>
                          <p className="text-sm text-[#6B6B6B]">Not assessed yet</p>
                        </div>
                      </div>
                      <Link
                        to={`/app/assessment/${topicSlug}`}
                        className="inline-flex items-center px-3 py-2 text-sm bg-[#212529] text-white rounded-lg hover:bg-[#212427] transition-colors"
                      >
                        Take Assessment
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Recommendations */}
          {quickRecommendations.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-[#E9E9E7] p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-[#37352F]">Recommended for You</h2>
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
                          <span className="text-lg">{meta.icon}</span>
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
                        <div className="inline-flex items-center px-3 py-2 text-sm bg-[#2383E2] text-white rounded-lg group-hover:bg-[#0F62FE] transition-colors">
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

                {assessedTopics.length === 0 && (
                  <div className="text-center py-6 text-[#6B6B6B]">
                    <p className="mb-2">Complete assessments to see recommendations</p>
                    <Link
                      to="/app/assessment"
                      className="text-[#2383E2] hover:text-[#0F62FE] text-sm font-medium"
                    >
                      Take an Assessment →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Quick Actions */}
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

              <Link
                to="/app/recommendations"
                className="flex items-center p-3 border border-[#E9E9E7] rounded-lg hover:bg-[#F7F6F3] transition-colors group"
              >
                <PlayIcon className="h-5 w-5 text-purple-600 mr-3" />
                <div className="flex-1">
                  <p className="font-medium text-[#37352F] group-hover:text-[#2383E2]">Watch Videos</p>
                  <p className="text-sm text-[#6B6B6B]">Curated content</p>
                </div>
                <ArrowRightIcon className="h-4 w-4 text-[#6B6B6B] group-hover:text-[#2383E2]" />
              </Link>
            </div>
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
                <p className="text-blue-100 text-sm leading-relaxed">
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