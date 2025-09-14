import React, { useState, useEffect } from 'react';
import {
  TrendingUp as TrendingUpIcon,
  Calendar as CalendarIcon,
  Target as TargetIcon,
  Brain as BrainIcon,
  Clock as ClockIcon,
  Award as AwardIcon,
  BarChart3 as BarChartIcon,
  PieChart as PieChartIcon,
  Activity as ActivityIcon,
  CheckCircle as CheckCircleIcon,
  AlertTriangle as AlertTriangleIcon,
  ArrowUp as ArrowUpIcon,
  ArrowDown as ArrowDownIcon,
  Minus as MinusIcon
} from 'lucide-react';
import { quizProgressionAPI } from '../services/api';

const QuizHistoryDashboard = ({
  videoId = null,
  className = '',
  showAllQuizzes = false
}) => {
  const [quizHistory, setQuizHistory] = useState([]);
  const [performanceAnalytics, setPerformanceAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d'); // 7d, 30d, all

  useEffect(() => {
    loadQuizHistory();
  }, [videoId, showAllQuizzes, selectedTimeRange]);

  const loadQuizHistory = async () => {
    try {
      setLoading(true);

      let historyData;
      if (showAllQuizzes) {
        historyData = getAllQuizzesHistory();
      } else if (videoId) {
        historyData = getVideoQuizHistory(videoId);
      } else {
        historyData = getRecentQuizzesHistory();
      }

      // Filter by time range
      const filteredHistory = filterByTimeRange(historyData, selectedTimeRange);
      setQuizHistory(filteredHistory);

      // Calculate analytics
      const analytics = calculatePerformanceAnalytics(filteredHistory);
      setPerformanceAnalytics(analytics);

    } catch (error) {
      console.error('Error loading quiz history:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get all quiz data from localStorage
  const getAllQuizzesHistory = () => {
    const allQuizzes = [];

    // Get all video IDs that have quiz progression data
    const allKeys = Object.keys(localStorage);
    const progressionKeys = allKeys.filter(key => key.startsWith('quiz_progression_'));

    progressionKeys.forEach(key => {
      const videoId = key.replace('quiz_progression_', '');
      const progression = quizProgressionAPI.getQuizProgression(videoId);

      if (progression) {
        // Add intermediate quizzes
        progression.completedIntermediateQuizzes.forEach(quiz => {
          allQuizzes.push({
            videoId: videoId,
            videoTitle: progression.videoTitle || 'Unknown Video',
            quizType: 'intermediate',
            sessionNumber: quiz.sessionNumber,
            completedAt: quiz.completedAt,
            accuracy: quiz.accuracy,
            totalQuestions: quiz.totalQuestions,
            correctAnswers: quiz.correctAnswers,
            timeSpent: quiz.timeSpent,
            userAnswers: quiz.userAnswers || [],
            keyPointsAssessed: quiz.keyPointsAssessed || []
          });
        });

        // Add final quiz if completed
        if (progression.finalQuizCompleted && progression.finalQuizResult) {
          allQuizzes.push({
            videoId: videoId,
            videoTitle: progression.videoTitle || 'Unknown Video',
            quizType: 'final',
            completedAt: progression.finalQuizResult.completedAt,
            accuracy: progression.finalQuizResult.accuracy,
            totalQuestions: progression.finalQuizResult.totalQuestions,
            correctAnswers: progression.finalQuizResult.correctAnswers,
            timeSpent: progression.finalQuizResult.timeSpent,
            masteryScore: progression.finalQuizResult.masteryScore,
            userAnswers: progression.finalQuizResult.userAnswers || [],
            keyPointsAssessed: progression.finalQuizResult.keyPointsAssessed || []
          });
        }
      }
    });

    return allQuizzes.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
  };

  // Get quiz history for specific video
  const getVideoQuizHistory = (videoId) => {
    const progression = quizProgressionAPI.getQuizProgression(videoId);
    if (!progression) return [];

    const videoQuizzes = [];

    // Add intermediate quizzes
    progression.completedIntermediateQuizzes.forEach(quiz => {
      videoQuizzes.push({
        videoId: videoId,
        videoTitle: progression.videoTitle || 'Unknown Video',
        quizType: 'intermediate',
        sessionNumber: quiz.sessionNumber,
        completedAt: quiz.completedAt,
        accuracy: quiz.accuracy,
        totalQuestions: quiz.totalQuestions,
        correctAnswers: quiz.correctAnswers,
        timeSpent: quiz.timeSpent,
        userAnswers: quiz.userAnswers || [],
        keyPointsAssessed: quiz.keyPointsAssessed || []
      });
    });

    // Add final quiz if completed
    if (progression.finalQuizCompleted && progression.finalQuizResult) {
      videoQuizzes.push({
        videoId: videoId,
        videoTitle: progression.videoTitle || 'Unknown Video',
        quizType: 'final',
        completedAt: progression.finalQuizResult.completedAt,
        accuracy: progression.finalQuizResult.accuracy,
        totalQuestions: progression.finalQuizResult.totalQuestions,
        correctAnswers: progression.finalQuizResult.correctAnswers,
        timeSpent: progression.finalQuizResult.timeSpent,
        masteryScore: progression.finalQuizResult.masteryScore,
        userAnswers: progression.finalQuizResult.userAnswers || [],
        keyPointsAssessed: progression.finalQuizResult.keyPointsAssessed || []
      });
    }

    return videoQuizzes.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
  };

  // Get recent quizzes (last 10)
  const getRecentQuizzesHistory = () => {
    return getAllQuizzesHistory().slice(0, 10);
  };

  // Filter quiz history by time range
  const filterByTimeRange = (quizzes, timeRange) => {
    if (timeRange === 'all') return quizzes;

    const now = new Date();
    const days = timeRange === '7d' ? 7 : 30;
    const cutoffDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));

    return quizzes.filter(quiz => new Date(quiz.completedAt) >= cutoffDate);
  };

  // Calculate performance analytics
  const calculatePerformanceAnalytics = (quizzes) => {
    if (!quizzes.length) {
      return {
        totalQuizzes: 0,
        averageAccuracy: 0,
        totalTimeSpent: 0,
        improvementTrend: 'stable',
        strongestTopics: [],
        weakestTopics: [],
        recentPerformance: 0,
        quizTypeDistribution: { intermediate: 0, final: 0 },
        masteryLevels: { mastered: 0, developing: 0, 'needs-review': 0 }
      };
    }

    const totalQuizzes = quizzes.length;
    const totalCorrect = quizzes.reduce((sum, quiz) => sum + quiz.correctAnswers, 0);
    const totalQuestions = quizzes.reduce((sum, quiz) => sum + quiz.totalQuestions, 0);
    const averageAccuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
    const totalTimeSpent = quizzes.reduce((sum, quiz) => sum + (quiz.timeSpent || 0), 0);

    // Calculate improvement trend (recent 5 vs previous 5)
    let improvementTrend = 'stable';
    if (totalQuizzes >= 6) {
      const recent5 = quizzes.slice(0, 5);
      const previous5 = quizzes.slice(5, 10);

      const recentAccuracy = recent5.reduce((sum, q) => sum + q.accuracy, 0) / recent5.length;
      const previousAccuracy = previous5.reduce((sum, q) => sum + q.accuracy, 0) / previous5.length;

      if (recentAccuracy > previousAccuracy + 5) {
        improvementTrend = 'improving';
      } else if (recentAccuracy < previousAccuracy - 5) {
        improvementTrend = 'declining';
      }
    }

    // Analyze topics performance
    const topicPerformance = {};
    quizzes.forEach(quiz => {
      quiz.keyPointsAssessed?.forEach(keyPoint => {
        if (!topicPerformance[keyPoint]) {
          topicPerformance[keyPoint] = { correct: 0, total: 0 };
        }
        topicPerformance[keyPoint].total++;

        // Check if this key point was answered correctly
        const correctInThisQuiz = quiz.userAnswers?.some(answer =>
          answer.question?.keyPoint === keyPoint && answer.isCorrect
        );
        if (correctInThisQuiz) {
          topicPerformance[keyPoint].correct++;
        }
      });
    });

    // Calculate strongest and weakest topics
    const topicScores = Object.entries(topicPerformance)
      .map(([topic, performance]) => ({
        topic,
        accuracy: (performance.correct / performance.total) * 100,
        attempts: performance.total
      }))
      .filter(topic => topic.attempts >= 2); // Only include topics attempted at least twice

    const strongestTopics = topicScores
      .sort((a, b) => b.accuracy - a.accuracy)
      .slice(0, 3);

    const weakestTopics = topicScores
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 3);

    // Quiz type distribution
    const quizTypeDistribution = {
      intermediate: quizzes.filter(q => q.quizType === 'intermediate').length,
      final: quizzes.filter(q => q.quizType === 'final').length
    };

    // Mastery levels from final quizzes
    const masteryLevels = { mastered: 0, developing: 0, 'needs-review': 0 };
    quizzes
      .filter(q => q.quizType === 'final' && q.masteryScore)
      .forEach(quiz => {
        const level = quiz.masteryScore.masteryLevel;
        if (masteryLevels[level] !== undefined) {
          masteryLevels[level]++;
        }
      });

    // Recent performance (last 5 quizzes)
    const recent5Quizzes = quizzes.slice(0, Math.min(5, totalQuizzes));
    const recentPerformance = recent5Quizzes.length > 0
      ? recent5Quizzes.reduce((sum, q) => sum + q.accuracy, 0) / recent5Quizzes.length
      : 0;

    return {
      totalQuizzes,
      averageAccuracy: Math.round(averageAccuracy * 10) / 10,
      totalTimeSpent: Math.round(totalTimeSpent / 60), // Convert to minutes
      improvementTrend,
      strongestTopics,
      weakestTopics,
      recentPerformance: Math.round(recentPerformance * 10) / 10,
      quizTypeDistribution,
      masteryLevels
    };
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'improving':
        return <ArrowUpIcon className="h-4 w-4 text-green-600" />;
      case 'declining':
        return <ArrowDownIcon className="h-4 w-4 text-red-600" />;
      default:
        return <MinusIcon className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTrendColor = (trend) => {
    switch (trend) {
      case 'improving':
        return 'text-green-600';
      case 'declining':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMasteryIcon = (masteryLevel) => {
    switch (masteryLevel) {
      case 'mastered':
        return '🏆';
      case 'developing':
        return '📚';
      case 'needs-review':
        return '📖';
      default:
        return '🎯';
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-[#E9E9E7] p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!quizHistory.length) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-[#E9E9E7] p-6 ${className}`}>
        <div className="text-center py-8">
          <ActivityIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-[#37352F] mb-2">No Quiz History</h3>
          <p className="text-[#6B6B6B]">
            {videoId
              ? 'No quizzes completed for this video yet.'
              : 'Complete some quizzes to see your performance analytics here.'
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Time Range Selector */}
      <div className="bg-white rounded-xl shadow-sm border border-[#E9E9E7] p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-[#37352F] mb-1">
              📊 Quiz Performance Dashboard
            </h2>
            <p className="text-sm text-[#6B6B6B]">
              {videoId ? 'Video-specific analytics' : 'Overall learning analytics'}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-[#6B6B6B]">Time Range:</span>
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value)}
              className="text-sm border border-[#E9E9E7] rounded-lg px-3 py-1 focus:ring-2 focus:ring-[#2383E2] focus:border-transparent"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="all">All time</option>
            </select>
          </div>
        </div>

        {/* Performance Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#F7F6F3] rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <TargetIcon className="h-4 w-4 text-[#2383E2]" />
              <span className="text-xs font-medium text-[#6B6B6B]">Total Quizzes</span>
            </div>
            <div className="text-2xl font-bold text-[#37352F]">
              {performanceAnalytics.totalQuizzes}
            </div>
          </div>

          <div className="bg-[#F7F6F3] rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircleIcon className="h-4 w-4 text-green-600" />
              <span className="text-xs font-medium text-[#6B6B6B]">Avg Accuracy</span>
            </div>
            <div className="text-2xl font-bold text-[#37352F]">
              {performanceAnalytics.averageAccuracy}%
            </div>
          </div>

          <div className="bg-[#F7F6F3] rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <ClockIcon className="h-4 w-4 text-orange-600" />
              <span className="text-xs font-medium text-[#6B6B6B]">Time Spent</span>
            </div>
            <div className="text-2xl font-bold text-[#37352F]">
              {performanceAnalytics.totalTimeSpent}m
            </div>
          </div>

          <div className="bg-[#F7F6F3] rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              {getTrendIcon(performanceAnalytics.improvementTrend)}
              <span className="text-xs font-medium text-[#6B6B6B]">Trend</span>
            </div>
            <div className={`text-sm font-semibold capitalize ${getTrendColor(performanceAnalytics.improvementTrend)}`}>
              {performanceAnalytics.improvementTrend}
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Performance Trend */}
        <div className="bg-white rounded-xl shadow-sm border border-[#E9E9E7] p-6">
          <h3 className="text-lg font-semibold text-[#37352F] mb-4 flex items-center">
            <TrendingUpIcon className="h-5 w-5 mr-2 text-[#2383E2]" />
            Recent Performance
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#6B6B6B]">Recent 5 Quizzes:</span>
              <span className="text-lg font-semibold text-[#37352F]">
                {performanceAnalytics.recentPerformance}%
              </span>
            </div>

            {/* Mini trend chart placeholder */}
            <div className="h-32 bg-[#F7F6F3] rounded-lg flex items-center justify-center">
              <div className="text-center">
                <BarChartIcon className="h-8 w-8 text-[#6B6B6B] mx-auto mb-2" />
                <p className="text-xs text-[#6B6B6B]">Performance visualization</p>
              </div>
            </div>
          </div>
        </div>

        {/* Topic Performance */}
        <div className="bg-white rounded-xl shadow-sm border border-[#E9E9E7] p-6">
          <h3 className="text-lg font-semibold text-[#37352F] mb-4 flex items-center">
            <BrainIcon className="h-5 w-5 mr-2 text-purple-600" />
            Topic Analysis
          </h3>

          {performanceAnalytics.strongestTopics.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-green-700 mb-2">🏆 Strongest Topics</h4>
              <div className="space-y-1">
                {performanceAnalytics.strongestTopics.slice(0, 3).map((topic, index) => (
                  <div key={index} className="flex justify-between items-center text-xs">
                    <span className="text-[#37352F] truncate">{topic.topic}</span>
                    <span className="text-green-600 font-medium">{Math.round(topic.accuracy)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {performanceAnalytics.weakestTopics.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-red-700 mb-2">📖 Areas to Improve</h4>
              <div className="space-y-1">
                {performanceAnalytics.weakestTopics.slice(0, 3).map((topic, index) => (
                  <div key={index} className="flex justify-between items-center text-xs">
                    <span className="text-[#37352F] truncate">{topic.topic}</span>
                    <span className="text-red-600 font-medium">{Math.round(topic.accuracy)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quiz Type Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-[#E9E9E7] p-6">
          <h3 className="text-lg font-semibold text-[#37352F] mb-4 flex items-center">
            <PieChartIcon className="h-5 w-5 mr-2 text-orange-600" />
            Quiz Types
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-[#2383E2] rounded"></div>
                <span className="text-sm text-[#37352F]">Intermediate</span>
              </div>
              <span className="text-sm font-medium">
                {performanceAnalytics.quizTypeDistribution.intermediate}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span className="text-sm text-[#37352F]">Final</span>
              </div>
              <span className="text-sm font-medium">
                {performanceAnalytics.quizTypeDistribution.final}
              </span>
            </div>
          </div>
        </div>

        {/* Mastery Levels */}
        <div className="bg-white rounded-xl shadow-sm border border-[#E9E9E7] p-6">
          <h3 className="text-lg font-semibold text-[#37352F] mb-4 flex items-center">
            <AwardIcon className="h-5 w-5 mr-2 text-yellow-600" />
            Mastery Progress
          </h3>
          <div className="space-y-3">
            {Object.entries(performanceAnalytics.masteryLevels).map(([level, count]) => (
              <div key={level} className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <span className="text-sm">{getMasteryIcon(level)}</span>
                  <span className="text-sm text-[#37352F] capitalize">
                    {level.replace('-', ' ')}
                  </span>
                </div>
                <span className="text-sm font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Quiz History */}
      <div className="bg-white rounded-xl shadow-sm border border-[#E9E9E7] p-6">
        <h3 className="text-lg font-semibold text-[#37352F] mb-4 flex items-center">
          <CalendarIcon className="h-5 w-5 mr-2 text-[#2383E2]" />
          Recent Quiz History
        </h3>
        <div className="space-y-3">
          {quizHistory.slice(0, 10).map((quiz, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-[#F7F6F3] rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full ${
                  quiz.quizType === 'final' ? 'bg-green-500' : 'bg-[#2383E2]'
                }`}></div>
                <div>
                  <div className="text-sm font-medium text-[#37352F]">
                    {quiz.videoTitle}
                  </div>
                  <div className="text-xs text-[#6B6B6B]">
                    {quiz.quizType === 'final' ? '🎯 Final Quiz' : `📝 Quiz ${quiz.sessionNumber || ''}`} •
                    {formatDate(quiz.completedAt)}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className={`text-sm font-medium ${
                  quiz.accuracy >= 80 ? 'text-green-600' :
                  quiz.accuracy >= 60 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {Math.round(quiz.accuracy)}%
                </div>
                <div className="text-xs text-[#6B6B6B]">
                  {quiz.correctAnswers}/{quiz.totalQuestions}
                </div>
              </div>
            </div>
          ))}

          {quizHistory.length > 10 && (
            <div className="text-center pt-2">
              <button className="text-sm text-[#2383E2] hover:underline">
                View all {quizHistory.length} quizzes
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizHistoryDashboard;