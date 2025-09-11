// src/services/microlearning.js
import { apiClient, handleApiResponse, handleApiError } from './api';

export const microlearningService = {
  // Get personalized video recommendations
  getRecommendations: async (topic, options = {}) => {
    try {
      const { maxVideos = 3, includeAlternative = false } = options;
      const params = { maxVideos, includeAlternative };
      
      const response = await apiClient.get(`/microlearning/recommendations/${topic}`, { params });
      return handleApiResponse(response);
    } catch (error) {
      handleApiError(error);
    }
  },

  // Generate learning path
  getLearningPath: async (topic, maxVideos = 5) => {
    try {
      const response = await apiClient.get(`/microlearning/learning-path/${topic}`, {
        params: { maxVideos }
      });
      return handleApiResponse(response);
    } catch (error) {
      handleApiError(error);
    }
  },

  // Get available topics for microlearning
  getAvailableTopics: async () => {
    try {
      const response = await apiClient.get('/microlearning/available-topics');
      return handleApiResponse(response);
    } catch (error) {
      handleApiError(error);
    }
  },

  // Get quick recommendations (top 1 per topic)
  getQuickRecommendations: async () => {
    try {
      const response = await apiClient.get('/microlearning/quick-recommendations');
      return handleApiResponse(response);
    } catch (error) {
      handleApiError(error);
    }
  },

  // Get enhanced video details
  getVideoDetails: async (videoId, topic = null) => {
    try {
      const params = topic ? { topic } : {};
      const response = await apiClient.get(`/microlearning/video/${videoId}`, { params });
      return handleApiResponse(response);
    } catch (error) {
      handleApiError(error);
    }
  },

  // Get user statistics
  getStats: async () => {
    try {
      const response = await apiClient.get('/microlearning/stats');
      return handleApiResponse(response);
    } catch (error) {
      handleApiError(error);
    }
  },

  // Search videos by topic and level
  searchVideos: async (topic, level, options = {}) => {
    try {
      const { maxResults = 5, customQuery = null } = options;
      const response = await apiClient.post('/microlearning/search', {
        topic,
        level,
        maxResults,
        customQuery
      });
      return handleApiResponse(response);
    } catch (error) {
      handleApiError(error);
    }
  }
};