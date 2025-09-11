// src/services/assessment.js
import { apiClient, handleApiResponse, handleApiError } from './api';

export const assessmentService = {
  // Start new assessment
  startAssessment: async (topic, config = {}) => {
    try {
      const response = await apiClient.post('/assessment/start', {
        topic,
        config
      });
      return handleApiResponse(response);
    } catch (error) {
      handleApiError(error);
    }
  },

  // Get next question
  getNextQuestion: async (sessionId) => {
    try {
      const response = await apiClient.get(`/assessment/${sessionId}/next`);
      return handleApiResponse(response);
    } catch (error) {
      handleApiError(error);
    }
  },

  // Submit answer
  submitAnswer: async (sessionId, questionId, userAnswer, timeSpent = 0) => {
    try {
      const response = await apiClient.post(`/assessment/${sessionId}/answer`, {
        questionId,
        userAnswer,
        timeSpent
      });
      return handleApiResponse(response);
    } catch (error) {
      handleApiError(error);
    }
  },

  // Get assessment progress
  getProgress: async (sessionId) => {
    try {
      const response = await apiClient.get(`/assessment/${sessionId}/progress`);
      return handleApiResponse(response);
    } catch (error) {
      handleApiError(error);
    }
  },

  // Complete assessment
  completeAssessment: async (sessionId) => {
    try {
      const response = await apiClient.post(`/assessment/${sessionId}/complete`);
      return handleApiResponse(response);
    } catch (error) {
      handleApiError(error);
    }
  },

  // Pause assessment
  pauseAssessment: async (sessionId) => {
    try {
      const response = await apiClient.post(`/assessment/${sessionId}/pause`);
      return handleApiResponse(response);
    } catch (error) {
      handleApiError(error);
    }
  },

  // Resume assessment
  resumeAssessment: async (sessionId) => {
    try {
      const response = await apiClient.post(`/assessment/${sessionId}/resume`);
      return handleApiResponse(response);
    } catch (error) {
      handleApiError(error);
    }
  },

  // Abandon assessment
  abandonAssessment: async (sessionId) => {
    try {
      const response = await apiClient.post(`/assessment/${sessionId}/abandon`);
      return handleApiResponse(response);
    } catch (error) {
      handleApiError(error);
    }
  },

  // Get assessment history
  getHistory: async (limit = 10, topic = null) => {
    try {
      const params = { limit };
      if (topic) params.topic = topic;
      
      const response = await apiClient.get('/assessment/history', { params });
      return handleApiResponse(response);
    } catch (error) {
      handleApiError(error);
    }
  },

  // Get specific assessment result
  getResult: async (resultId) => {
    try {
      const response = await apiClient.get(`/assessment/results/${resultId}`);
      return handleApiResponse(response);
    } catch (error) {
      handleApiError(error);
    }
  },

  // Get progress summary
  getProgressSummary: async () => {
    try {
      const response = await apiClient.get('/assessment/progress-summary');
      return handleApiResponse(response);
    } catch (error) {
      handleApiError(error);
    }
  },

  // Get assessment recommendations
  getRecommendations: async () => {
    try {
      const response = await apiClient.get('/assessment/recommendations');
      return handleApiResponse(response);
    } catch (error) {
      handleApiError(error);
    }
  },

  // Get active sessions
  getActiveSessions: async () => {
    try {
      const response = await apiClient.get('/assessment/active-sessions');
      return handleApiResponse(response);
    } catch (error) {
      handleApiError(error);
    }
  }
};