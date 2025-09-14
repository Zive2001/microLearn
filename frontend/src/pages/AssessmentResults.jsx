import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useApp } from '../context/AppContext';
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
  ArrowRight as ArrowRightIcon,
  Star as StarIcon,
  Brain as BrainIcon,
  Lightbulb as LightbulbIcon,
  AlertCircle as AlertCircleIcon
} from 'lucide-react';
import Loading from '../components/Loading';
import toast from 'react-hot-toast';

const AssessmentResults = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { topic, sessionId, resultId } = useParams();
  const { user } = useAuth();
  const { updateTopicAssessment, fetchActiveSessions } = useApp();

  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const topicMeta = getTopicMeta(topic);

  // Load assessment results
  useEffect(() => {
    const loadResults = async () => {
      try {
        setIsLoading(true);
        setError(null);

        let resultsData = null;

        // Check if we have results from state (fresh completion)
        if (location.state?.finalResults) {
          resultsData = location.state.finalResults;
        }
        // If we have a resultId, fetch from API
        else if (resultId) {
          resultsData = await assessmentAPI.getAssessmentResult(resultId);
        }
        // If we have sessionId from URL params, get session results
        else if (sessionId) {
          try {
            const sessionProgress = await assessmentAPI.getSessionProgress(sessionId);
            if (sessionProgress.status === 'completed') {
              resultsData = sessionProgress.finalResults;
            }
          } catch (err) {
            console.error('Error getting session results from URL:', err);
          }
        }
        // If we have sessionId from state, get session results
        else if (location.state?.sessionId) {
          try {
            const sessionProgress = await assessmentAPI.getSessionProgress(location.state.sessionId);
            if (sessionProgress.status === 'completed') {
              resultsData = sessionProgress.finalResults;
            }
          } catch (err) {
            console.error('Error getting session results from state:', err);
          }
        }

        if (!resultsData) {
          // If no results found but we have topic and sessionId, create a basic result
          if (topic && (sessionId || location.state?.sessionId)) {
            console.warn('No results data found, creating fallback result');
            resultsData = {
              score: 0,
              level: 'Assessment Completed',
              performance: {
                correctAnswers: 0,
                totalQuestions: 0,
                timeSpent: 0
              },
              analysis: null,
              recommendations: 'Assessment completed. Please check your dashboard for updated progress.'
            };
          } else {
            throw new Error('No assessment results found');
          }
        }

        setResult(resultsData);

        // Update topic assessment data in context
        if (resultsData && topic) {
          try {
            updateTopicAssessment(topic, {
              level: resultsData.level,
              score: resultsData.score,
              sessionId: location.state?.sessionId || sessionId || resultId
            });

            // Refresh active sessions to ensure completed session is removed
            await fetchActiveSessions();
          } catch (contextError) {
            console.warn('Failed to update topic assessment in context:', contextError);
            // Don't fail the whole component if context update fails
          }
        }

      } catch (error) {
        console.error('Error loading assessment results:', error);
        const errorMessage = error.message || 'Failed to load assessment results';
        setError(errorMessage);

        // Don't show toast for context errors, only for actual loading errors
        if (!errorMessage.includes('selectedTopics')) {
          toast.error('Failed to load assessment results');
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadResults();
  }, [topic, sessionId, resultId, location.state]);

  const getLevelColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'professional':
        return {
          color: 'text-purple-600',
          bgColor: 'bg-purple-100',
          borderColor: 'border-purple-200',
          description: 'Exceptional mastery! You demonstrate professional-level expertise.'
        };
      case 'intermediate':
        return {
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          borderColor: 'border-blue-200',
          description: 'Great foundation! You have a solid intermediate understanding.'
        };
      case 'beginner':
        return {
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          borderColor: 'border-green-200',
          description: 'Good start! You\'re building a strong foundation in the basics.'
        };
      default:
        return {
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-200',
          description: 'Assessment complete! Continue learning to improve your skills.'
        };
    }
  };

  const formatTime = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderDifficultyBreakdown = (performance) => {
    if (!performance) return null;

    const difficulties = ['beginnerPerformance', 'intermediatePerformance', 'advancedPerformance'];
    const labels = {
      beginnerPerformance: 'Beginner',
      intermediatePerformance: 'Intermediate',
      advancedPerformance: 'Advanced'
    };

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {difficulties.map(key => {
          const diff = performance[key];
          if (!diff || diff.questions === 0) return null;

          return (
            <div key={key} className="bg-white rounded-lg border border-[#E9E9E7] p-4">
              <div className="text-center">
                <div className="text-lg font-semibold text-[#37352F] mb-1">
                  {labels[key]}
                </div>
                <div className="text-2xl font-bold text-[#2383E2] mb-2">
                  {diff.percentage}%
                </div>
                <div className="text-sm text-[#6B6B6B]">
                  {diff.correct} of {diff.questions} correct
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderRecommendations = (recommendations) => {
    if (!recommendations) return null;

    let parsedRecommendations;
    try {
      parsedRecommendations = typeof recommendations === 'string'
        ? JSON.parse(recommendations)
        : recommendations;
    } catch (e) {
      console.warn('Failed to parse recommendations:', e);
      parsedRecommendations = { nextSteps: [typeof recommendations === 'string' ? recommendations : 'No specific recommendations available'] };
    }

    // Ensure parsedRecommendations is an object
    if (typeof parsedRecommendations !== 'object' || parsedRecommendations === null) {
      parsedRecommendations = { nextSteps: ['Continue practicing to improve your skills'] };
    }

    return (
      <div className="space-y-4">
        {parsedRecommendations.studyPlan && typeof parsedRecommendations.studyPlan === 'string' && (
          <div>
            <h4 className="font-semibold text-[#37352F] mb-2 flex items-center">
              <BookOpenIcon className="h-4 w-4 mr-2" />
              Recommended Study Plan
            </h4>
            <p className="text-[#6B6B6B] leading-relaxed">
              {parsedRecommendations.studyPlan}
            </p>
          </div>
        )}

        {parsedRecommendations.practiceAreas && Array.isArray(parsedRecommendations.practiceAreas) && parsedRecommendations.practiceAreas.length > 0 && (
          <div>
            <h4 className="font-semibold text-[#37352F] mb-2 flex items-center">
              <TargetIcon className="h-4 w-4 mr-2" />
              Focus Areas
            </h4>
            <div className="flex flex-wrap gap-2">
              {parsedRecommendations.practiceAreas.map((area, index) => (
                <span key={index} className="px-3 py-1 bg-[#2383E2]/10 text-[#2383E2] rounded-full text-sm">
                  {typeof area === 'string' ? area : 'Focus Area'}
                </span>
              ))}
            </div>
          </div>
        )}

        {parsedRecommendations.nextSteps && Array.isArray(parsedRecommendations.nextSteps) && parsedRecommendations.nextSteps.length > 0 && (
          <div>
            <h4 className="font-semibold text-[#37352F] mb-2 flex items-center">
              <LightbulbIcon className="h-4 w-4 mr-2" />
              Next Steps
            </h4>
            <ul className="list-disc list-inside space-y-1 text-[#6B6B6B]">
              {parsedRecommendations.nextSteps.map((step, index) => (
                <li key={index}>{typeof step === 'string' ? step : 'Continue learning'}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Handle object-style recommendations (like week1, week2, week3) */}
        {Object.keys(parsedRecommendations).some(key => key.startsWith('week')) && (
          <div>
            <h4 className="font-semibold text-[#37352F] mb-2 flex items-center">
              <BookOpenIcon className="h-4 w-4 mr-2" />
              Learning Plan
            </h4>
            <div className="space-y-3">
              {Object.entries(parsedRecommendations)
                .filter(([key]) => key.startsWith('week'))
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([weekKey, weekData]) => (
                  <div key={weekKey} className="p-3 bg-[#F7F6F3] rounded-lg">
                    <h5 className="font-medium text-[#37352F] mb-2 capitalize">
                      {weekKey.replace(/([a-z])(\d)/, '$1 $2')}
                    </h5>
                    {typeof weekData === 'string' ? (
                      <p className="text-sm text-[#6B6B6B]">{weekData}</p>
                    ) : typeof weekData === 'object' && weekData !== null ? (
                      <div className="text-sm text-[#6B6B6B]">
                        {Object.entries(weekData).map(([key, value]) => (
                          <div key={key} className="mb-1">
                            <strong className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</strong> {typeof value === 'string' ? value : JSON.stringify(value)}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-[#6B6B6B]">Week content available</p>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Loading state
  if (isLoading) {
    return <Loading fullScreen text="Loading your assessment results..." />;
  }

  // Error state
  if (error || !result) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircleIcon className="h-8 w-8 text-red-600" />
        </div>
        <h2 className="text-xl font-semibold text-[#37352F] mb-2">
          Results Not Found
        </h2>
        <p className="text-[#6B6B6B] mb-6">
          {error || 'We couldn\'t load your assessment results. Please try again.'}
        </p>
        <div className="space-x-4">
          <button
            onClick={() => navigate('/app/assessment')}
            className="inline-flex items-center px-6 py-3 bg-[#2383E2] text-white rounded-lg hover:bg-[#0F62FE] transition-colors"
          >
            Back to Assessments
          </button>
        </div>
      </div>
    );
  }

  const levelData = getLevelColor(result.level);
  const performance = result.performance || {};

  return (
    <div className="space-y-8">
      {/* Results Header */}
      <div className="bg-white rounded-xl shadow-sm border border-[#E9E9E7] p-8">
        <div className="text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="text-3xl mr-4">{topicMeta.icon}</div>
            <div>
              <h1 className="text-2xl font-bold text-[#37352F]">
                {topicMeta.name} Assessment Results
              </h1>
              <p className="text-[#6B6B6B]">AI-powered analysis complete</p>
            </div>
          </div>

          <div className={`mx-auto w-20 h-20 ${levelData.bgColor} rounded-full flex items-center justify-center mb-6`}>
            {result.level === 'Professional' ? (
              <StarIcon className={`w-10 h-10 ${levelData.color}`} />
            ) : result.level === 'Intermediate' ? (
              <TrendingUpIcon className={`w-10 h-10 ${levelData.color}`} />
            ) : (
              <CheckCircleIcon className={`w-10 h-10 ${levelData.color}`} />
            )}
          </div>

          <div className="text-6xl font-bold text-[#37352F] mb-4">
            {result.score}%
          </div>

          <div className={`inline-flex items-center px-6 py-3 rounded-full text-base font-medium border ${levelData.bgColor} ${levelData.color} ${levelData.borderColor} mb-4`}>
            <BrainIcon className="w-5 h-5 mr-2" />
            {result.level} Level
          </div>

          {result.confidence && (
            <div className="text-sm text-[#6B6B6B] mb-4">
              Confidence: {Math.round(result.confidence * 100)}%
            </div>
          )}

          <p className="text-[#6B6B6B] max-w-md mx-auto">
            {levelData.description}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-[#E9E9E7] p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-[#2383E2]/10 rounded-lg flex items-center justify-center mr-4">
              <TrophyIcon className="w-6 h-6 text-[#2383E2]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#6B6B6B]">Final Score</p>
              <p className="text-2xl font-bold text-[#37352F]">{result.score}%</p>
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
              <p className="text-2xl font-bold text-[#37352F]">
                {performance.correctAnswers || 0}
              </p>
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
              <p className="text-2xl font-bold text-[#37352F]">
                {formatTime(performance.timeSpent)}
              </p>
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
              <p className="text-2xl font-bold text-[#37352F]">
                {performance.totalQuestions || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Breakdown */}
      {performance && (
        <div className="bg-white rounded-xl shadow-sm border border-[#E9E9E7] p-8">
          <h2 className="text-xl font-semibold text-[#37352F] mb-6">
            📊 Performance Breakdown
          </h2>
          {renderDifficultyBreakdown(performance)}
        </div>
      )}

      {/* Analysis & Strengths/Weaknesses */}
      {result.analysis && (
        <div className="bg-white rounded-xl shadow-sm border border-[#E9E9E7] p-8">
          <h2 className="text-xl font-semibold text-[#37352F] mb-6">
            🎯 Performance Analysis
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {result.analysis.strengths && result.analysis.strengths.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-[#37352F] mb-4 flex items-center">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-2">
                    <CheckCircleIcon className="h-4 w-4 text-green-600" />
                  </div>
                  Strengths
                </h3>
                <div className="space-y-2">
                  {result.analysis.strengths.map((strength, index) => (
                    <div key={index} className="flex items-center p-3 bg-green-50 rounded-lg">
                      <StarIcon className="h-4 w-4 text-green-600 mr-2 flex-shrink-0" />
                      <span className="text-sm text-green-700">{strength}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.analysis.weaknesses && result.analysis.weaknesses.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-[#37352F] mb-4 flex items-center">
                  <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center mr-2">
                    <TrendingUpIcon className="h-4 w-4 text-yellow-600" />
                  </div>
                  Areas for Improvement
                </h3>
                <div className="space-y-2">
                  {result.analysis.weaknesses.map((weakness, index) => (
                    <div key={index} className="flex items-center p-3 bg-yellow-50 rounded-lg">
                      <TargetIcon className="h-4 w-4 text-yellow-600 mr-2 flex-shrink-0" />
                      <span className="text-sm text-yellow-700">{weakness}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Recommendations */}
      {result.recommendations && (
        <div className="bg-white rounded-xl shadow-sm border border-[#E9E9E7] p-8">
          <h2 className="text-xl font-semibold text-[#37352F] mb-6">
            🤖 AI-Powered Recommendations
          </h2>
          {renderRecommendations(result.recommendations)}
        </div>
      )}

      {/* Learning Path Recommendations */}
      <div className="bg-gradient-to-br from-[#2383E2] to-[#0F62FE] rounded-xl p-8 text-white">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <VideoCameraIcon className="h-6 w-6" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold mb-2">
              Ready for Personalized Learning?
            </h3>
            <p className="text-blue-100 mb-6 leading-relaxed">
              Based on your {result.level?.toLowerCase()} level assessment, we've curated the perfect video content to help you grow your {topicMeta.name} skills.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => navigate(`/app/recommendations/${topic}?level=${result.level?.toLowerCase()}`)}
                className="inline-flex items-center px-6 py-3 bg-white text-[#2383E2] rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                <VideoCameraIcon className="h-4 w-4 mr-2" />
                View Recommended Videos
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </button>

              <button
                onClick={() => navigate('/app/dashboard')}
                className="inline-flex items-center px-6 py-3 bg-white/20 text-white rounded-lg font-medium hover:bg-white/30 transition-colors"
              >
                View Progress Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={() => navigate(`/app/assessment/${topic}`)}
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