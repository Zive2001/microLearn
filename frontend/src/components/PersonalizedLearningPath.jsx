/**
 * PersonalizedLearningPath Component
 *
 * Displays AI-powered personalized learning recommendations
 * Shows learning pace, patterns, and suggested next steps
 * Phase 4: Frontend integration for personalized learning paths
 */

import { useState, useEffect } from 'react';
import { Target, TrendingUp, Lightbulb, ArrowRight, AlertCircle } from 'lucide-react';
import { apiClient } from '../services/api';
import Loading from './Loading';

const PersonalizedLearningPath = () => {
  const [learningPath, setLearningPath] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLearningPath();
  }, []);

  const fetchLearningPath = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiClient.get('/recommendations/learning-path');

      if (response.data.success) {
        setLearningPath(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching learning path:', err);
      setError('Failed to load personalized learning path');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-[#E9E9E7] p-6">
        <Loading text="Creating your personalized learning path..." />
      </div>
    );
  }

  if (!learningPath) {
    return null;
  }

  const getRecommendationIcon = (type) => {
    switch (type) {
      case 'advancement':
        return <TrendingUp className="h-5 w-5 text-green-600" />;
      case 'reinforcement':
        return <Target className="h-5 w-5 text-amber-600" />;
      case 'peer_learning':
        return <Lightbulb className="h-5 w-5 text-blue-600" />;
      case 'time_optimization':
        return <ArrowRight className="h-5 w-5 text-purple-600" />;
      default:
        return <Lightbulb className="h-5 w-5 text-[#2383E2]" />;
    }
  };

  const getRecommendationColor = (type) => {
    switch (type) {
      case 'advancement':
        return 'bg-green-50 border-green-200';
      case 'reinforcement':
        return 'bg-amber-50 border-amber-200';
      case 'peer_learning':
        return 'bg-blue-50 border-blue-200';
      case 'time_optimization':
        return 'bg-purple-50 border-purple-200';
      default:
        return 'bg-[#2383E2]/5 border-[#2383E2]/20';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-[#E9E9E7] p-6">
      {/* Header */}
      <div className="flex items-center space-x-2 mb-6">
        <Target className="h-5 w-5 text-[#2383E2]" />
        <h3 className="text-lg font-semibold text-[#37352F]">Your Learning Path</h3>
      </div>

      {/* Personalization Info */}
      {learningPath.personalization && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 pb-6 border-b border-[#E9E9E7]">
          <div className="text-center sm:text-left">
            <p className="text-xs text-[#6B6B6B] uppercase tracking-wide font-medium">Learning Pace</p>
            <p className="text-sm font-semibold text-[#37352F]">{learningPath.personalization.learningPace}</p>
          </div>
          <div className="text-center sm:text-left">
            <p className="text-xs text-[#6B6B6B] uppercase tracking-wide font-medium">Session Time</p>
            <p className="text-sm font-semibold text-[#37352F]">{learningPath.personalization.sessionTime}</p>
          </div>
          <div className="text-center sm:text-left">
            <p className="text-xs text-[#6B6B6B] uppercase tracking-wide font-medium">Focus Area</p>
            <p className="text-sm font-semibold text-[#37352F]">{learningPath.personalization.learningFocus}</p>
          </div>
        </div>
      )}

      {/* Learning Patterns */}
      {learningPath.patterns && learningPath.patterns.successRate !== undefined && (
        <div className="mb-6 p-4 bg-[#F7F6F3] rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[#37352F]">Your Success Rate</span>
            <span className="text-2xl font-bold text-[#2383E2]">{learningPath.patterns.successRate}%</span>
          </div>
          <div className="w-full bg-[#E9E9E7] rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#2383E2] to-[#1968B1] h-full transition-all"
              style={{ width: `${learningPath.patterns.successRate}%` }}
            />
          </div>
        </div>
      )}

      {/* Recommendations */}
      {learningPath.recommendations && learningPath.recommendations.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-[#37352F] mb-3">Recommended Next Steps:</p>
          {learningPath.recommendations.map((rec, idx) => (
            <div
              key={idx}
              className={`border rounded-lg p-4 ${getRecommendationColor(rec.type)}`}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getRecommendationIcon(rec.type)}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-[#37352F] mb-1">{rec.title}</h4>
                  <p className="text-sm text-[#6B6B6B]">{rec.description}</p>
                  <button className="mt-2 text-xs font-medium text-[#2383E2] hover:text-[#1968B1] flex items-center space-x-1">
                    <span>{rec.action === 'explore_advanced' ? 'Explore Advanced Topics' : rec.action === 'practice_basics' ? 'Practice Basics' : rec.action === 'view_similar_users' ? 'See Similar Users' : 'Continue Learning'}</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3 mt-4">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <button
        onClick={fetchLearningPath}
        className="mt-4 w-full py-2 text-sm font-medium text-[#2383E2] hover:bg-[#2383E2]/5 rounded-lg transition-colors"
      >
        Refresh Learning Path
      </button>
    </div>
  );
};

export default PersonalizedLearningPath;
