/**
 * SimilarUsersCard Component
 *
 * Displays similar users based on learning profile
 * Shows similarity percentage and matched learning dimensions
 * Phase 4: Frontend integration for FAISS similar user discovery
 *
 * New Grid Layout: Shows users as circles (at least 3 per row)
 */

import { useState, useEffect } from 'react';
import { Users, TrendingUp, AlertCircle, User } from 'lucide-react';
import { apiClient } from '../services/api';
import Loading from './Loading';

const SimilarUsersCard = ({ userId, layout = 'grid' }) => {
  const [similarUsers, setSimilarUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [avgSimilarity, setAvgSimilarity] = useState(0);

  useEffect(() => {
    fetchSimilarUsers();
  }, [userId]);

  const fetchSimilarUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get more users for grid layout (at least 6 for 2 rows of 3)
      const limit = layout === 'grid' ? 6 : 5;
      const response = await apiClient.get(`/recommendations/similar-users?limit=${limit}&minSimilarity=0.7`);

      if (response.data.success) {
        setSimilarUsers(response.data.data.similarUsers || []);
        setAvgSimilarity(response.data.data.avgSimilarity || 0);
      }
    } catch (err) {
      console.error('Error fetching similar users:', err);
      setError('Failed to load similar users');
    } finally {
      setIsLoading(false);
    }
  };

  // Profile picture paths - will randomly select between them
  const PROFILE_PICS = ['/profpic.svg', '/profpic2.svg'];

  // Get random profile picture based on user index
  const getRandomProfilePic = (index) => {
    return PROFILE_PICS[index % PROFILE_PICS.length];
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-[#E9E9E7] p-6">
        <Loading text="Finding learning peers..." />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#E9E9E7] p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Users className="h-5 w-5 text-[#2b2d42]" />
          <h3 className="text-lg font-semibold text-[#37352F]">Learning Community</h3>
        </div>
        {avgSimilarity > 0 && (
          <div className="flex items-center space-x-1 bg-[#2b2d42]/10 px-3 py-1 rounded-full">
            <TrendingUp className="h-4 w-4 text-[#2b2d42]" />
            <span className="text-xs font-medium text-[#2b2d42]">
              {Math.round(avgSimilarity * 100)}% avg
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3 mb-4">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {similarUsers.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-[#2b2d42]/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <Users className="h-6 w-6 text-[#2b2d42]" />
          </div>
          <p className="text-sm text-[#6B6B6B]">
            No learning peers found yet. Connect with others as more learners join!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Grid Layout - Users as Circles (3 per row) */}
          {layout === 'grid' && (
            <div className="grid grid-cols-3 gap-4">
              {similarUsers.map((user, idx) => (
                <div key={idx} className="flex flex-col items-center group cursor-pointer">
                  {/* Avatar Circle - Smaller */}
                  <div className="flex justify-center mb-3">
                    <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow relative overflow-hidden border border-[#E9E9E7]">
                      {/* Profile image or random default SVG */}
                      <img
                        src={user.user?.profile?.profileImage || getRandomProfilePic(idx)}
                        alt={`${user.user?.profile?.firstName} ${user.user?.profile?.lastName}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  {/* User Info - More Space */}
                  <div className="w-full text-center space-y-2">
                    <h4 className="font-semibold text-sm text-[#37352F] line-clamp-2">
                      {user.user?.profile?.firstName || 'Anonymous'}
                    </h4>
                    <p className="text-xs text-[#6B6B6B] line-clamp-1">
                      {user.user?.profile?.learningPace || 'Learner'}
                    </p>

                    {/* Match Score */}
                    <div className="pt-1">
                      <div className="inline-block bg-[#2b2d42] text-white px-2 py-1 rounded-full text-xs font-bold">
                        {user.similarityPercentage}%
                      </div>
                    </div>

                    {/* Focus Area Badge */}
                    {user.user?.learningPreferences?.learningFocus && (
                      <p className="text-xs text-[#2b2d42] font-medium pt-1 line-clamp-2">
                        {user.user.learningPreferences.learningFocus.slice(0, 15)}
                      </p>
                    )}
                  </div>

                  {/* Hover Effect */}
                  <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 rounded-lg transition-opacity pointer-events-none"></div>
                </div>
              ))}
            </div>
          )}

          {/* Detailed Layout - One user per row with details on the side */}
          {layout === 'detailed' && (
            <div className="space-y-4">
              {similarUsers.map((user, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-4 p-4 bg-[#F7F6F3] rounded-lg hover:bg-[#EFEFED] transition-colors group cursor-pointer"
                >
                  {/* Avatar Circle */}
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow relative overflow-hidden border border-[#E9E9E7]">
                      {/* Profile image or random default SVG */}
                      <img
                        src={user.user?.profile?.profileImage || getRandomProfilePic(idx)}
                        alt={`${user.user?.profile?.firstName} ${user.user?.profile?.lastName}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  {/* User Details - Left Side */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-sm text-[#37352F]">
                          {user.user?.profile?.firstName || 'Anonymous'} {user.user?.profile?.lastName || 'Learner'}
                        </h4>
                        <p className="text-xs text-[#6B6B6B] mt-1">
                          <span className="font-medium">Pace:</span> {user.user?.profile?.learningPace || 'Not set'}
                        </p>
                      </div>

                      {/* Match Score Badge */}
                      <div className="flex-shrink-0 ml-2">
                        <div className="inline-block bg-[#2b2d42] text-white px-3 py-1.5 rounded-full text-xs font-bold">
                          {user.similarityPercentage}%
                        </div>
                      </div>
                    </div>

                    {/* Focus Area */}
                    {user.user?.learningPreferences?.learningFocus && (
                      <p className="text-xs text-[#2b2d42] font-medium mb-2">
                        <span className="font-semibold">Focus:</span> {user.user.learningPreferences.learningFocus}
                      </p>
                    )}

                    {/* Matched Dimensions */}
                    {user.matchedDimensions && user.matchedDimensions.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {user.matchedDimensions.map((dimension, dIdx) => (
                          <span
                            key={dIdx}
                            className="text-xs px-2 py-1 bg-white border border-[#D0D0CE] text-[#37352F] rounded font-medium"
                          >
                            ✓ {dimension}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* List Layout - Original Card Layout */}
          {layout === 'list' && (
            <div className="space-y-3">
              {similarUsers.map((user, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-4 bg-[#F7F6F3] rounded-lg hover:bg-[#EFEFED] transition-colors"
                >
                  {/* Avatar Circle */}
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm relative overflow-hidden border border-[#E9E9E7]">
                      {/* Profile image or random default SVG */}
                      <img
                        src={user.user?.profile?.profileImage || getRandomProfilePic(idx)}
                        alt={`${user.user?.profile?.firstName} ${user.user?.profile?.lastName}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-[#37352F]">
                          {user.user?.profile?.firstName || 'Anonymous'} {user.user?.profile?.lastName || 'Learner'}
                        </h4>
                        <p className="text-xs text-[#6B6B6B] mt-1">
                          <span className="font-medium">Pace:</span> {user.user?.profile?.learningPace || 'Not set'}
                        </p>
                      </div>

                      {/* Match Score Badge */}
                      <div className="flex-shrink-0 ml-2">
                        <div className="inline-block bg-[#2b2d42] text-white px-3 py-1 rounded-full text-xs font-bold">
                          {user.similarityPercentage}%
                        </div>
                      </div>
                    </div>

                    {/* Focus Area */}
                    {user.user?.learningPreferences?.learningFocus && (
                      <p className="text-xs text-[#2b2d42] font-medium mb-2">
                        <span className="font-semibold">Focus:</span> {user.user.learningPreferences.learningFocus}
                      </p>
                    )}

                    {/* Matched Dimensions */}
                    {user.matchedDimensions && user.matchedDimensions.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {user.matchedDimensions.map((dimension, dIdx) => (
                          <span
                            key={dIdx}
                            className="text-xs px-2 py-1 bg-white border border-[#D0D0CE] text-[#37352F] rounded font-medium"
                          >
                            ✓ {dimension}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <button
        onClick={fetchSimilarUsers}
        className="mt-6 w-full py-2 text-sm font-medium bg-[#2b2d42] text-white rounded-lg hover:bg-[#1a1c2e] transition-colors"
      >
        Refresh Peers
      </button>
    </div>
  );
};

export default SimilarUsersCard;
