// src/services/api.js
import axios from 'axios';
import toast from 'react-hot-toast';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const { response } = error;
    
    // Handle different error scenarios
    if (response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/auth/login';
      toast.error('Session expired. Please log in again.');
    } else if (response?.status === 403) {
      toast.error('Access denied. You do not have permission.');
    } else if (response?.status === 404) {
      toast.error('Resource not found.');
    } else if (response?.status >= 500) {
      toast.error('Server error. Please try again later.');
    } else if (error.code === 'ECONNABORTED') {
      toast.error('Request timed out. Please check your connection.');
    } else if (!response) {
      toast.error('Network error. Please check your internet connection.');
    }
    
    return Promise.reject(error);
  }
);

// Generic API methods
export const apiClient = {
  get: (url, config = {}) => api.get(url, config),
  post: (url, data = {}, config = {}) => api.post(url, data, config),
  put: (url, data = {}, config = {}) => api.put(url, data, config),
  patch: (url, data = {}, config = {}) => api.patch(url, data, config),
  delete: (url, config = {}) => api.delete(url, config),
};

// Helper function to handle API responses
export const handleApiResponse = (response) => {
  if (response.data.success) {
    return response.data.data;
  } else {
    throw new Error(response.data.message || 'API request failed');
  }
};

// Helper function to handle API errors
export const handleApiError = (error) => {
  const message = error.response?.data?.message || error.message || 'An error occurred';
  console.error('API Error:', error);
  throw new Error(message);
};

// ===== AUTHENTICATION API SERVICES =====
export const authAPI = {
  // Register new user
  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Login user
  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get current user profile
  getProfile: async () => {
    try {
      const response = await api.get('/auth/profile');
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Update user profile
  updateProfile: async (profileData) => {
    try {
      const response = await api.put('/auth/profile', profileData);
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get dashboard data
  getDashboard: async () => {
    try {
      const response = await api.get('/auth/dashboard');
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  },
};

// ===== TOPICS API SERVICES =====
export const topicsAPI = {
  // Get all topics
  getTopics: async (params = {}) => {
    try {
      const response = await api.get('/topics', { params });
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get featured topics
  getFeaturedTopics: async () => {
    try {
      const response = await api.get('/topics/featured');
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get recommended topics for user
  getRecommendedTopics: async (limit = 8) => {
    try {
      const response = await api.get('/topics/recommended', { params: { limit } });
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get single topic details
  getTopicDetails: async (slug) => {
    try {
      const response = await api.get(`/topics/${slug}`);
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Select topics for learning
  selectTopics: async (topicIds) => {
    try {
      const response = await api.post('/topics/select', { topics: topicIds });
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get user's selected topics
  getSelectedTopics: async () => {
    try {
      const response = await api.get('/topics/my/selected');
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Remove topic from user's selection
  removeSelectedTopic: async (slug) => {
    try {
      const response = await api.delete(`/topics/my/${slug}`);
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get available categories
  getCategories: async () => {
    try {
      const response = await api.get('/topics/meta/categories');
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  },
};

// ===== ASSESSMENT API SERVICES =====
export const assessmentAPI = {
  // Start new assessment
  startAssessment: async (topic, config = {}) => {
    try {
      const response = await api.post('/assessment/start', { topic, config });
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get next question
  getNextQuestion: async (sessionId) => {
    try {
      const response = await api.get(`/assessment/${sessionId}/next`);
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Submit answer
  submitAnswer: async (sessionId, questionId, userAnswer, timeSpent = 0) => {
    try {
      const response = await api.post(`/assessment/${sessionId}/answer`, {
        questionId,
        userAnswer,
        timeSpent
      });
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get session progress
  getSessionProgress: async (sessionId) => {
    try {
      const response = await api.get(`/assessment/${sessionId}/progress`);
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Complete assessment manually
  completeAssessment: async (sessionId) => {
    try {
      const response = await api.post(`/assessment/${sessionId}/complete`);
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Pause assessment
  pauseAssessment: async (sessionId) => {
    try {
      const response = await api.post(`/assessment/${sessionId}/pause`);
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Resume assessment
  resumeAssessment: async (sessionId) => {
    try {
      const response = await api.post(`/assessment/${sessionId}/resume`);
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Abandon assessment
  abandonAssessment: async (sessionId) => {
    try {
      const response = await api.post(`/assessment/${sessionId}/abandon`);
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get assessment history
  getAssessmentHistory: async (limit = 10, topic = null) => {
    try {
      const params = { limit };
      if (topic) params.topic = topic;
      const response = await api.get('/assessment/history', { params });
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get specific assessment result
  getAssessmentResult: async (resultId) => {
    try {
      const response = await api.get(`/assessment/results/${resultId}`);
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get progress summary across all topics
  getProgressSummary: async () => {
    try {
      const response = await api.get('/assessment/progress-summary');
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get assessment recommendations
  getAssessmentRecommendations: async () => {
    try {
      const response = await api.get('/assessment/recommendations');
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get active sessions
  getActiveSessions: async () => {
    try {
      const response = await api.get('/assessment/active-sessions');
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  },
};

// ===== MICROLEARNING API SERVICES (YouTube Recommendations) =====
export const microlearningAPI = {
  // Get personalized video recommendations for topic
  getRecommendations: async (topic, options = {}) => {
    try {
      const params = {};
      if (options.maxVideos) params.maxVideos = options.maxVideos;
      if (options.includeAlternative) params.includeAlternative = options.includeAlternative;
      
      const response = await api.get(`/microlearning/recommendations/${topic}`, { params });
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Generate learning path for topic
  generateLearningPath: async (topic, maxVideos = 5) => {
    try {
      const response = await api.get(`/microlearning/learning-path/${topic}`, {
        params: { maxVideos }
      });
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get available topics for microlearning
  getAvailableTopics: async () => {
    try {
      const response = await api.get('/microlearning/available-topics');
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get quick recommendations (1 video per topic)
  getQuickRecommendations: async () => {
    try {
      const response = await api.get('/microlearning/quick-recommendations');
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get video details with microlearning enhancements
  getVideoDetails: async (videoId, topic = null) => {
    try {
      const params = {};
      if (topic) params.topic = topic;
      const response = await api.get(`/microlearning/video/${videoId}`, { params });
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get microlearning statistics
  getStats: async () => {
    try {
      const response = await api.get('/microlearning/stats');
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Search videos by topic and level
  searchVideos: async (searchData) => {
    try {
      const response = await api.post('/microlearning/search', searchData);
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Process recommendation for microlearning
  processRecommendation: async (videoId, topic, title = '', description = '') => {
    try {
      const response = await api.post('/microlearning/process-recommendation', {
        videoId,
        topic,
        title,
        description
      });
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get recommendation processing status
  getRecommendationStatus: async (videoId) => {
    try {
      const response = await api.get(`/microlearning/recommendation-status/${videoId}`);
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  },
};

// ===== TEST API SERVICES (for development) =====
export const testAPI = {
  // Check OpenAI health
  checkOpenAIHealth: async () => {
    try {
      const response = await api.get('/test/openai-health');
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Test YouTube search
  testYouTubeSearch: async (topic, level, maxVideos = 3) => {
    try {
      const response = await api.post('/test/youtube-search', { topic, level, maxVideos });
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Test user recommendations
  testUserRecommendations: async (topic) => {
    try {
      const response = await api.get(`/test/user-recommendations/${topic}`);
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Test question generation
  testGenerateQuestion: async (topic, difficulty = 'intermediate') => {
    try {
      const response = await api.post('/test/generate-question', { topic, difficulty });
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Test answer evaluation
  testEvaluateAnswer: async (question, userAnswer, userExplanation = '') => {
    try {
      const response = await api.post('/test/evaluate-answer', {
        question,
        userAnswer,
        userExplanation
      });
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Test recommendations generation
  testGenerateRecommendations: async (assessmentResults) => {
    try {
      const response = await api.post('/test/generate-recommendations', assessmentResults);
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Test full assessment flow
  testFullAssessmentFlow: async (topic, difficulty = 'intermediate') => {
    try {
      const response = await api.post('/test/full-assessment-flow', { topic, difficulty });
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Test complete system integration
  testCompleteFlow: async (topic, userLevel) => {
    try {
      const response = await api.post('/test/complete-flow', { topic, userLevel });
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  },
};

// ===== UTILITY API SERVICES =====
export const utilityAPI = {
  // Check server health
  checkHealth: async () => {
    try {
      const response = await api.get('/health');
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  },
};

// ===== COMBINED USER JOURNEY API =====
// This provides higher-level functions that combine multiple API calls for common user flows
export const userJourneyAPI = {
  // Complete user registration flow
  completeRegistration: async (userData) => {
    try {
      const result = await authAPI.register(userData);
      // Store token and user data
      if (result.token) {
        localStorage.setItem('authToken', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));
      }
      return result;
    } catch (error) {
      throw error;
    }
  },

  // Complete user login flow
  completeLogin: async (email, password) => {
    try {
      const result = await authAPI.login(email, password);
      // Store token and user data
      if (result.token) {
        localStorage.setItem('authToken', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));
      }
      return result;
    } catch (error) {
      throw error;
    }
  },

  // Get user dashboard with all necessary data
  getUserDashboard: async () => {
    try {
      const [dashboard, selectedTopics, quickRecommendations] = await Promise.all([
        authAPI.getDashboard(),
        topicsAPI.getSelectedTopics().catch(() => []),
        microlearningAPI.getQuickRecommendations().catch(() => ({ recommendations: [] }))
      ]);

      return {
        ...dashboard,
        selectedTopics,
        quickRecommendations: quickRecommendations.recommendations || []
      };
    } catch (error) {
      throw error;
    }
  },

  // Complete topic selection to assessment flow
  selectTopicsAndPrepareAssessment: async (topicIds) => {
    try {
      const selectionResult = await topicsAPI.selectTopics(topicIds);
      const selectedTopics = await topicsAPI.getSelectedTopics();
      
      // Return data needed for assessment preparation
      return {
        ...selectionResult,
        selectedTopics,
        readyForAssessment: true
      };
    } catch (error) {
      throw error;
    }
  },

  // Complete assessment flow (start to completion)
  completeAssessmentFlow: async (topic, config = {}) => {
    try {
      // Start assessment
      const startResult = await assessmentAPI.startAssessment(topic, config);
      
      return {
        ...startResult,
        nextStep: 'getNextQuestion',
        sessionId: startResult.sessionId
      };
    } catch (error) {
      throw error;
    }
  },

  // Get post-assessment recommendations and learning path
  getPostAssessmentRecommendations: async (topic) => {
    try {
      const [recommendations, learningPath, availableTopics] = await Promise.all([
        microlearningAPI.getRecommendations(topic).catch(() => ({ recommendations: [] })),
        microlearningAPI.generateLearningPath(topic).catch(() => ({ path: [] })),
        microlearningAPI.getAvailableTopics().catch(() => ({ availableTopics: [] }))
      ]);

      return {
        topic,
        recommendations: recommendations.recommendations || [],
        learningPath: learningPath.path || [],
        availableTopics: availableTopics.availableTopics || [],
        readyForMicrolearning: true
      };
    } catch (error) {
      throw error;
    }
  },

  // Get complete user learning status
  getUserLearningStatus: async () => {
    try {
      const [profile, selectedTopics, assessmentHistory, stats, activeSessions] = await Promise.all([
        authAPI.getProfile(),
        topicsAPI.getSelectedTopics().catch(() => []),
        assessmentAPI.getAssessmentHistory().catch(() => []),
        microlearningAPI.getStats().catch(() => ({})),
        assessmentAPI.getActiveSessions().catch(() => [])
      ]);

      return {
        profile,
        selectedTopics,
        assessmentHistory,
        stats,
        activeSessions,
        hasSelectedTopics: selectedTopics.length > 0,
        hasCompletedAssessments: assessmentHistory.length > 0,
        hasActiveSessions: activeSessions.length > 0
      };
    } catch (error) {
      throw error;
    }
  }
};

export default api;