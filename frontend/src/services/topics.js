// src/services/topics.js
import { apiClient, handleApiResponse, handleApiError } from './api';

export const topicsService = {
  // Get all topics
  getAllTopics: async (params = {}) => {
    try {
      const response = await apiClient.get('/topics', { params });
      return handleApiResponse(response);
    } catch (error) {
      handleApiError(error);
    }
  },

  // Get featured topics
  getFeaturedTopics: async () => {
    try {
      const response = await apiClient.get('/topics/featured');
      return handleApiResponse(response);
    } catch (error) {
      handleApiError(error);
    }
  },

  // Get recommended topics for user
  getRecommendedTopics: async (limit = 8) => {
    try {
      const response = await apiClient.get('/topics/recommended', {
        params: { limit }
      });
      return handleApiResponse(response);
    } catch (error) {
      handleApiError(error);
    }
  },

  // Get single topic details
  getTopicDetails: async (slug) => {
    try {
      const response = await apiClient.get(`/topics/${slug}`);
      return handleApiResponse(response);
    } catch (error) {
      handleApiError(error);
    }
  },

  // Select topics for learning
  selectTopics: async (topicIds) => {
    try {
      const response = await apiClient.post('/topics/select', {
        topics: topicIds
      });
      return handleApiResponse(response);
    } catch (error) {
      handleApiError(error);
    }
  },

  // Get user's selected topics
  getMyTopics: async () => {
    try {
      const response = await apiClient.get('/topics/my/selected');
      return handleApiResponse(response);
    } catch (error) {
      handleApiError(error);
    }
  },

  // Remove topic from selection
  removeTopic: async (slug) => {
    try {
      const response = await apiClient.delete(`/topics/my/${slug}`);
      return handleApiResponse(response);
    } catch (error) {
      handleApiError(error);
    }
  },

  // Get all categories
  getCategories: async () => {
    try {
      const response = await apiClient.get('/topics/meta/categories');
      return handleApiResponse(response);
    } catch (error) {
      handleApiError(error);
    }
  }
};