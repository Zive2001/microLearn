/**
 * RecommendedQuizzesWidget Component
 *
 * Displays AI-recommended quizzes for a specific video/topic
 * Shows similarity reasoning and recommendation scores
 * Phase 4: Frontend integration for advanced quiz recommendations
 */

import { useState, useEffect } from 'react';
import { Sparkles, CheckCircle, AlertCircle, Zap } from 'lucide-react';
import { apiClient } from '../services/api';
import Loading from './Loading';

const RecommendedQuizzesWidget = ({ videoId, videoTitle }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (videoId) {
      fetchRecommendations();
    }
  }, [videoId]);

  const fetchRecommendations = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiClient.get(
        `/recommendations/quizzes/${videoId}?limit=3&minSimilarity=0.7&minQuality=6`
      );

      if (response.data.success) {
        setRecommendations(response.data.data.recommendedQuizzes || []);
      }
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setError('Failed to load quiz recommendations');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-[#E9E9E7] p-6">
        <Loading text="Finding best quizzes for you..." />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-[#E9E9E7] p-6">
      <div className="flex items-center space-x-2 mb-6">
        <Sparkles className="h-5 w-5 text-amber-500" />
        <h3 className="text-lg font-semibold text-[#37352F]">
          Recommended Quizzes {videoTitle && `for ${videoTitle}`}
        </h3>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3 mb-4">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {recommendations.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-[#6B6B6B]">
            No personalized recommendations yet. Start taking quizzes to see AI-powered suggestions!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {recommendations.map((quiz, idx) => (
            <div
              key={idx}
              className="border border-[#E9E9E7] rounded-lg p-4 hover:border-[#2383E2]/30 hover:bg-[#2383E2]/5 transition-all"
            >
              {/* Header with Quality and Score */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-[#37352F] mb-1">
                    {quiz.microVideoTitle}
                  </h4>
                  <p className="text-xs text-[#6B6B6B]">
                    {quiz.totalQuestions} questions • {quiz.difficulty} level
                  </p>
                </div>

                {/* Recommendation Score Badge */}
                <div className="flex-shrink-0 ml-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-100 to-amber-50 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-sm font-bold text-amber-700">
                        {Math.round(quiz.recommendationScore * 100)}
                      </div>
                      <div className="text-xs text-amber-600">score</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quality Indicator */}
              <div className="flex items-center space-x-2 mb-3">
                <div className="flex-1 bg-[#E9E9E7] rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#2383E2] to-[#1968B1] h-full transition-all"
                    style={{ width: `${(quiz.questionQuality / 10) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-[#37352F] min-w-max">
                  {quiz.questionQuality}/10 quality
                </span>
              </div>

              {/* Recommendation Reason */}
              {quiz.recommendationReason && (
                <div className="flex items-start space-x-2 p-3 bg-[#F7F6F3] rounded-lg mb-3">
                  <Zap className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-[#37352F]">{quiz.recommendationReason}</p>
                </div>
              )}

              {/* Similarity Details (if available) */}
              {quiz.similarityPercentage !== undefined && (
                <div className="flex items-center justify-between p-3 bg-[#2383E2]/5 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-[#2383E2]" />
                    <span className="text-sm text-[#2383E2]">
                      {quiz.similarityPercentage}% match with similar learners
                    </span>
                  </div>
                  {quiz.performanceScore !== undefined && (
                    <span className="text-xs font-medium text-[#6B6B6B]">
                      {Math.round(quiz.performanceScore * 100)}% success rate
                    </span>
                  )}
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={() => {
                  // This would navigate to the quiz or take the quiz
                  console.log('Taking quiz:', quiz.quizPoolId);
                }}
                className="mt-3 w-full py-2 px-4 bg-[#2383E2] hover:bg-[#1968B1] text-white font-medium rounded-lg transition-colors"
              >
                Take This Quiz
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={fetchRecommendations}
        className="mt-4 w-full py-2 text-sm font-medium text-[#2383E2] hover:bg-[#2383E2]/5 rounded-lg transition-colors"
      >
        Refresh Recommendations
      </button>
    </div>
  );
};

export default RecommendedQuizzesWidget;
