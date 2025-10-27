// src/services/api.js
import axios from 'axios';
import toast from 'react-hot-toast';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api',
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
      console.log('🔐 Added auth token to request:', {
        url: config.url,
        hasToken: !!token,
        tokenLength: token.length
      });
    } else {
      console.warn('⚠️ No auth token found in localStorage for request:', config.url);
    }

    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
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
      // Unauthorized - only redirect if we're not already on auth page
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/auth/')) {
        console.warn('⚠️ Unauthorized access - clearing session and redirecting to login');
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');

        // Use a small delay to allow the error to be caught first
        setTimeout(() => {
          window.location.href = '/auth/login';
        }, 300);
      }

      if (!toast) {
        console.error('Toast not available');
      } else {
        toast.error('Session expired. Please log in again.');
      }
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
  console.error('API Error Details:');
  console.error('  Status:', error.response?.status);
  console.error('  Message:', message);
  console.error('  Full error:', error);

  // Don't log sensitive data, but log structure for debugging
  if (error.response?.data) {
    console.error('  Response data keys:', Object.keys(error.response.data));
  }

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
      console.log('📝 API Request - Start Assessment:');
      console.log('  Topic:', topic);
      console.log('  Config:', config);
      console.log('  Payload:', { topic, config });

      const response = await api.post('/assessment/start', { topic, config });
      return handleApiResponse(response);
    } catch (error) {
      console.error('❌ Assessment API Error:');
      console.error('  Topic sent:', topic);
      console.error('  Config sent:', config);
      console.error('  Full error:', error);
      console.error('  Error response:', error.response?.data);
      console.error('  Error status:', error.response?.status);
      console.error('  Error message:', error.message);

      // Enhanced error handling for specific cases
      if (error.response?.data?.message?.includes('active assessment session')) {
        console.log('🔄 Active session detected - this should be handled by the component');
      }

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
  submitAnswer: async (sessionId, questionId, userAnswer, questionTimeSpent = 0, totalTimeSpent = 0) => {
    try {
      const payload = {
        questionId,
        userAnswer,
        timeSpent: questionTimeSpent,
        totalTimeSpent: totalTimeSpent
      };

      console.log('📤 Submitting answer with timing data:', {
        questionTimeSpent,
        totalTimeSpent,
        payload
      });

      const response = await api.post(`/assessment/${sessionId}/answer`, payload);
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

      // Backend validation: maxVideos must be between 1 and 10
      if (options.maxVideos) {
        params.maxVideos = Math.min(Math.max(parseInt(options.maxVideos), 1), 10);
      }

      // Backend validation: includeAlternative must be boolean string
      if (options.includeAlternative !== undefined) {
        params.includeAlternative = options.includeAlternative.toString();
      }

      console.log('🎬 Getting recommendations:', { topic, options, params });
      console.log('🎬 Full URL will be:', `/microlearning/recommendations/${topic}?${new URLSearchParams(params).toString()}`);

      const response = await api.get(`/microlearning/recommendations/${topic}`, { params });
      const result = handleApiResponse(response);

      console.log('🎬 Recommendations response:', result);

      return result;
    } catch (error) {
      console.error('❌ Recommendations error:', error);

      // Log detailed error info for debugging
      if (error.response?.data?.errors) {
        console.error('❌ Validation errors:', error.response.data.errors);
      }
      if (error.response?.data) {
        console.error('❌ Full error response:', error.response.data);
      }

      // Enhanced error handling for specific cases
      if (error.message.includes('assessment')) {
        throw new Error('Please complete an assessment for this topic first to get personalized recommendations.');
      }

      if (error.message.includes('not selected')) {
        throw new Error('Please select this topic in your learning preferences first.');
      }

      throw handleApiError(error);
    }
  },

  // Generate learning path for topic
  generateLearningPath: async (topic, maxVideos = 5) => {
    try {
      console.log('🛤️ Generating learning path:', { topic, maxVideos });

      const response = await api.get(`/microlearning/learning-path/${topic}`, {
        params: { maxVideos }
      });
      const result = handleApiResponse(response);

      console.log('🛤️ Learning path response:', result);

      return result;
    } catch (error) {
      console.error('❌ Learning path error:', error);

      if (error.message.includes('assessment')) {
        throw new Error('Assessment required for learning path generation. Please complete an assessment first.');
      }

      throw handleApiError(error);
    }
  },

  // Get available topics for microlearning
  getAvailableTopics: async () => {
    try {
      console.log('🎯 Getting available topics');

      const response = await api.get('/microlearning/available-topics');
      const result = handleApiResponse(response);

      console.log('🎯 Available topics response:', result);

      return result;
    } catch (error) {
      console.error('❌ Available topics error:', error);
      throw handleApiError(error);
    }
  },

  // Get quick recommendations (1 video per topic)
  getQuickRecommendations: async () => {
    try {
      console.log('⚡ Getting quick recommendations');

      const response = await api.get('/microlearning/quick-recommendations');
      const result = handleApiResponse(response);

      console.log('⚡ Quick recommendations response:', result);

      return result;
    } catch (error) {
      console.error('❌ Quick recommendations error:', error);
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

// ===== QUIZ API SERVICES =====
export const quizAPI = {
  // Start a new quiz session for a video
  startQuizSession: async (videoId, sessionType = 'intermediate') => {
    try {
      console.log('🎯 Starting quiz session:', { videoId, sessionType });

      const response = await api.post(`/quiz/start/${videoId}`, { sessionType });
      const result = handleApiResponse(response);

      console.log('✅ Quiz session started:', result);
      return result;
    } catch (error) {
      console.error('❌ Error starting quiz session:', error);

      // Handle specific quiz errors
      if (error.response?.data?.message?.includes('active session')) {
        throw new Error('You already have an active quiz session for this video. Please complete or abandon it first.');
      }

      if (error.response?.data?.message?.includes('No micro-videos found')) {
        throw new Error('This video is not ready for quizzing yet. Please try again later.');
      }

      throw handleApiError(error);
    }
  },

  // Get quiz session information
  getQuizSession: async (sessionId) => {
    try {
      console.log('📋 Getting quiz session:', sessionId);

      const response = await api.get(`/quiz/session/${sessionId}`);
      const result = handleApiResponse(response);

      console.log('✅ Quiz session data:', result);
      return result;
    } catch (error) {
      console.error('❌ Error getting quiz session:', error);
      throw handleApiError(error);
    }
  },

  // Get current question for active quiz session
  getCurrentQuestion: async (sessionId) => {
    try {
      console.log('❓ Getting current question for session:', sessionId);

      const response = await api.get(`/quiz/session/${sessionId}/current-question`);
      const result = handleApiResponse(response);

      console.log('✅ Current question:', result);
      return result;
    } catch (error) {
      console.error('❌ Error getting current question:', error);

      if (error.response?.status === 400 && error.response?.data?.message?.includes('not active')) {
        throw new Error('Quiz session is not active or has been completed.');
      }

      throw handleApiError(error);
    }
  },

  // Submit answer to quiz question
  submitAnswer: async (sessionId, questionId, answer, timeSpent = 0) => {
    try {
      console.log('📝 Submitting answer:', { sessionId, questionId, answer, timeSpent });

      const response = await api.post(`/quiz/session/${sessionId}/answer`, {
        questionId,
        answer,
        timeSpent
      });
      const result = handleApiResponse(response);

      console.log('✅ Answer submitted:', result);
      return result;
    } catch (error) {
      console.error('❌ Error submitting answer:', error);

      if (error.response?.data?.message?.includes('retry attempt')) {
        throw new Error('You have already used your retry attempt for this question.');
      }

      throw handleApiError(error);
    }
  },

  // Get quiz session results (when implemented)
  getQuizResults: async (sessionId) => {
    try {
      console.log('🏆 Getting quiz results:', sessionId);

      const response = await api.get(`/quiz/session/${sessionId}/results`);
      const result = handleApiResponse(response);

      console.log('✅ Quiz results:', result);
      return result;
    } catch (error) {
      console.error('❌ Error getting quiz results:', error);

      // Handle not yet implemented endpoint
      if (error.response?.status === 501) {
        console.log('ℹ️ Detailed results not implemented yet, using session data');
        // Fall back to getting session data for basic results
        return await quizAPI.getQuizSession(sessionId);
      }

      throw handleApiError(error);
    }
  },

  // Get user's quiz sessions for a video
  getVideoQuizSessions: async (videoId) => {
    try {
      console.log('📚 Getting quiz sessions for video:', videoId);

      const response = await api.get(`/quiz/video/${videoId}/sessions`);
      const result = handleApiResponse(response);

      console.log('✅ Video quiz sessions:', result);
      return result;
    } catch (error) {
      console.error('❌ Error getting video quiz sessions:', error);
      throw handleApiError(error);
    }
  },

  // Get user's recent quiz sessions
  getRecentQuizSessions: async (limit = 10) => {
    try {
      console.log('🕒 Getting recent quiz sessions:', limit);

      const response = await api.get('/quiz/sessions/recent', {
        params: { limit }
      });
      const result = handleApiResponse(response);

      console.log('✅ Recent quiz sessions:', result);
      return result;
    } catch (error) {
      console.error('❌ Error getting recent quiz sessions:', error);
      throw handleApiError(error);
    }
  },

  // Helper method to check if user has an active session for a video
  hasActiveSession: async (videoId) => {
    try {
      const sessions = await quizAPI.getVideoQuizSessions(videoId);
      const activeSessions = sessions.sessions?.filter(session => session.status === 'active') || [];
      return activeSessions.length > 0 ? activeSessions[0] : null;
    } catch (error) {
      console.error('❌ Error checking active session:', error);
      return null;
    }
  }
};

// ===== MOCK MICROLEARNING API SERVICES =====
// Temporary mock implementation until real microlearning pipeline is ready
export const mockMicrolearningAPI = {
  // Generate mock microlearning content for a video with 9 segments (3x3 grid)
  generateMicrolearningContent: async (videoId, videoTitle = 'Programming Tutorial', segmentCount = 9) => {
    try {
      console.log('🎬 Generating mock microlearning content for:', videoId, `(${segmentCount} segments)`);

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Define segment templates for realistic content generation
      const segmentTemplates = [
        {
          titleTemplate: 'Introduction & Setup',
          keyPointsTemplates: ['Environment setup', 'Basic project structure', 'Initial configuration'],
          summaryTemplate: 'introduction and basic setup',
          difficulty: 'Beginner',
          cognitiveLoad: 3
        },
        {
          titleTemplate: 'Core Concepts & Syntax',
          keyPointsTemplates: ['Basic syntax rules', 'Variable declarations', 'Data types'],
          summaryTemplate: 'fundamental concepts and syntax',
          difficulty: 'Beginner',
          cognitiveLoad: 4
        },
        {
          titleTemplate: 'Functions & Methods',
          keyPointsTemplates: ['Function declarations', 'Parameter handling', 'Return values'],
          summaryTemplate: 'functions and method creation',
          difficulty: 'Intermediate',
          cognitiveLoad: 5
        },
        {
          titleTemplate: 'Control Flow & Logic',
          keyPointsTemplates: ['Conditional statements', 'Loop structures', 'Boolean logic'],
          summaryTemplate: 'control flow and logical operations',
          difficulty: 'Intermediate',
          cognitiveLoad: 5
        },
        {
          titleTemplate: 'Data Structures',
          keyPointsTemplates: ['Arrays and lists', 'Objects and dictionaries', 'Data manipulation'],
          summaryTemplate: 'data structures and manipulation',
          difficulty: 'Intermediate',
          cognitiveLoad: 6
        },
        {
          titleTemplate: 'Error Handling',
          keyPointsTemplates: ['Exception handling', 'Debugging techniques', 'Error prevention'],
          summaryTemplate: 'error handling and debugging',
          difficulty: 'Intermediate',
          cognitiveLoad: 6
        },
        {
          titleTemplate: 'Advanced Patterns',
          keyPointsTemplates: ['Design patterns', 'Code organization', 'Modular programming'],
          summaryTemplate: 'advanced patterns and organization',
          difficulty: 'Professional',
          cognitiveLoad: 7
        },
        {
          titleTemplate: 'Performance & Optimization',
          keyPointsTemplates: ['Performance considerations', 'Memory management', 'Optimization techniques'],
          summaryTemplate: 'performance optimization',
          difficulty: 'Professional',
          cognitiveLoad: 8
        },
        {
          titleTemplate: 'Best Practices & Next Steps',
          keyPointsTemplates: ['Industry standards', 'Code quality', 'Further learning paths'],
          summaryTemplate: 'best practices and career development',
          difficulty: 'Professional',
          cognitiveLoad: 7
        }
      ];

      // Generate micro-videos based on segment count
      const microVideos = [];
      let currentTime = 0;

      for (let i = 0; i < segmentCount; i++) {
        const template = segmentTemplates[i % segmentTemplates.length];
        const duration = Math.floor(Math.random() * 180) + 120; // 2-5 minutes per segment
        const durationMinutes = Math.floor(duration / 60);
        const durationSeconds = duration % 60;
        const durationStr = `${durationMinutes}:${durationSeconds.toString().padStart(2, '0')}`;

        const startTimeStr = `${Math.floor(currentTime / 60)}:${(currentTime % 60).toString().padStart(2, '0')}`;
        currentTime += duration;
        const endTimeStr = `${Math.floor(currentTime / 60)}:${(currentTime % 60).toString().padStart(2, '0')}`;

        microVideos.push({
          id: `micro_${videoId}_${i + 1}`,
          sequence: i + 1,
          title: `${i + 1}. ${template.titleTemplate}`,
          duration: durationStr,
          startTime: startTimeStr,
          endTime: endTimeStr,
          keyPoints: template.keyPointsTemplates.map(point =>
            point.replace(/placeholder/g, videoTitle.toLowerCase())
          ),
          summary: `This microlearning segment covers ${template.summaryTemplate} in ${videoTitle.toLowerCase()}. Learn essential skills and techniques that will build your understanding progressively.`,
          transcript: `In this segment of ${videoTitle.toLowerCase()}, we'll explore ${template.summaryTemplate}. This builds on previous concepts and prepares you for more advanced topics. Pay attention to the key patterns and techniques demonstrated.`,
          difficulty: template.difficulty,
          cognitiveLoad: template.cognitiveLoad,
          learningObjectives: [
            `Master ${template.titleTemplate.toLowerCase()}`,
            `Apply concepts in practice`,
            `Understand implementation details`
          ]
        });
      }

      const totalDurationMinutes = Math.floor(currentTime / 60);
      const totalDurationStr = `${totalDurationMinutes}:${(currentTime % 60).toString().padStart(2, '0')}`;

      const mockContent = {
        videoId: videoId,
        originalTitle: videoTitle,
        status: 'completed',
        generatedAt: new Date().toISOString(),
        processingTime: '3.2 seconds',
        microVideos: microVideos,
        analytics: {
          totalDuration: totalDurationStr,
          averageCognitiveLoad: Math.round(microVideos.reduce((sum, mv) => sum + mv.cognitiveLoad, 0) / microVideos.length * 10) / 10,
          difficultyProgression: [...new Set(microVideos.map(mv => mv.difficulty))],
          estimatedLearningTime: `${Math.ceil(totalDurationMinutes * 1.5)}-${Math.ceil(totalDurationMinutes * 2)} minutes`,
          recommendedBreaks: Math.floor(segmentCount / 3)
        },
        metadata: {
          topic: 'programming',
          language: 'javascript',
          framework: null,
          prerequisites: ['basic computer literacy'],
          targetAudience: 'beginners to intermediate',
          learningPath: 'fundamentals'
        }
      };

      console.log('✅ Mock microlearning content generated:', mockContent);
      return mockContent;

    } catch (error) {
      console.error('❌ Error generating mock microlearning content:', error);
      throw new Error('Failed to generate microlearning content');
    }
  },

  // Get mock microlearning content for a video (if already generated)
  getMicrolearningContent: async (videoId) => {
    try {
      console.log('📚 Getting mock microlearning content for:', videoId);

      // Simulate checking if content exists
      await new Promise(resolve => setTimeout(resolve, 500));

      // For demo, assume content exists for some videos
      const existingContent = localStorage.getItem(`microlearning_${videoId}`);

      if (existingContent) {
        return JSON.parse(existingContent);
      }

      // Return null if content doesn't exist
      return null;

    } catch (error) {
      console.error('❌ Error getting mock microlearning content:', error);
      return null;
    }
  },

  // Check mock microlearning processing status
  getMicrolearningStatus: async (videoId) => {
    try {
      console.log('🔍 Checking mock microlearning status for:', videoId);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));

      const content = await mockMicrolearningAPI.getMicrolearningContent(videoId);

      return {
        videoId: videoId,
        status: content ? 'completed' : 'not_started',
        progress: content ? 100 : 0,
        estimatedTimeRemaining: content ? 0 : '2-3 minutes',
        lastUpdated: content ? content.generatedAt : null
      };

    } catch (error) {
      console.error('❌ Error checking mock microlearning status:', error);
      return {
        videoId: videoId,
        status: 'error',
        progress: 0,
        error: error.message
      };
    }
  },

  // Store mock microlearning content (simulate backend storage)
  storeMicrolearningContent: async (videoId, content) => {
    try {
      console.log('💾 Storing mock microlearning content for:', videoId);

      localStorage.setItem(`microlearning_${videoId}`, JSON.stringify(content));

      return { success: true, videoId, storedAt: new Date().toISOString() };
    } catch (error) {
      console.error('❌ Error storing mock microlearning content:', error);
      throw error;
    }
  },

  // Get all mock microlearning content for user
  getAllMicrolearningContent: async () => {
    try {
      console.log('📚 Getting all mock microlearning content');

      const allContent = [];

      // Check localStorage for all microlearning content
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('microlearning_')) {
          const content = JSON.parse(localStorage.getItem(key));
          allContent.push(content);
        }
      }

      return {
        totalContent: allContent.length,
        content: allContent.sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt))
      };

    } catch (error) {
      console.error('❌ Error getting all mock microlearning content:', error);
      return { totalContent: 0, content: [] };
    }
  },

  // Delete mock microlearning content
  deleteMicrolearningContent: async (videoId) => {
    try {
      console.log('🗑️ Deleting mock microlearning content for:', videoId);

      localStorage.removeItem(`microlearning_${videoId}`);

      return { success: true, videoId, deletedAt: new Date().toISOString() };
    } catch (error) {
      console.error('❌ Error deleting mock microlearning content:', error);
      throw error;
    }
  }
};

// ===== AI QUESTION GENERATION API SERVICES =====
// Generate quiz questions from microlearning content using AI
export const aiQuestionAPI = {
  // Generate questions from microlearning transcript
  generateQuestions: async (microVideo) => {
    try {
      console.log('🤖 Generating AI questions for:', microVideo.title);

      // For now, create a simple mock that looks like AI-generated
      // TODO: Replace with real backend API call
      const aiGeneratedQuestions = await mockAIQuestionGeneration(microVideo);

      console.log('✅ AI questions generated:', aiGeneratedQuestions);
      return aiGeneratedQuestions;

    } catch (error) {
      console.error('❌ Error generating AI questions:', error);
      throw new Error('Failed to generate questions from content');
    }
  },

  // Generate questions for entire microlearning content
  generateQuizFromMicrolearning: async (microlearningContent, quizType = 'intermediate', weakKeyPoints = []) => {
    try {
      console.log('🤖 Generating quiz from microlearning:', microlearningContent.originalTitle);
      console.log('📊 Quiz type:', quizType, 'Weak areas:', weakKeyPoints);

      const allQuestions = [];

      if (quizType === 'intermediate') {
        // Standard intermediate quiz - 1-2 questions per segment
        for (const microVideo of microlearningContent.microVideos) {
          const questions = await aiQuestionAPI.generateQuestions(microVideo);
          allQuestions.push(...questions);
        }
      } else if (quizType === 'final') {
        // Enhanced final quiz - focus on weak areas and comprehensive coverage
        const enhancedQuestions = await aiQuestionAPI.generateAdaptiveFinalQuiz(
          microlearningContent,
          weakKeyPoints
        );
        allQuestions.push(...enhancedQuestions);
      }

      return {
        videoId: microlearningContent.videoId,
        originalTitle: microlearningContent.originalTitle,
        totalQuestions: allQuestions.length,
        questions: allQuestions,
        generatedAt: new Date().toISOString(),
        source: `ai-generated-${quizType}`,
        adaptations: quizType === 'final' ? {
          focusedKeyPoints: weakKeyPoints,
          adaptiveStrategy: 'weakness-focused'
        } : null
      };

    } catch (error) {
      console.error('❌ Error generating quiz from microlearning:', error);
      throw new Error('Failed to generate quiz from microlearning content');
    }
  },

  // Generate adaptive final quiz based on intermediate performance
  generateAdaptiveFinalQuiz: async (microlearningContent, weakKeyPoints = []) => {
    try {
      console.log('🎯 Generating adaptive final quiz with focus on:', weakKeyPoints);

      const allQuestions = [];
      const keyPointCoverage = new Map();

      // 1. Generate MORE questions for weak key points (2-3 questions each)
      for (const weakKeyPoint of weakKeyPoints) {
        const relevantSegments = microlearningContent.microVideos.filter(
          mv => mv.keyPoints.includes(weakKeyPoint)
        );

        for (const segment of relevantSegments) {
          // Generate multiple questions for weak areas
          const focusedQuestions = await aiQuestionAPI.generateFocusedQuestions(
            segment,
            weakKeyPoint,
            'challenging' // Higher difficulty for weak areas
          );
          allQuestions.push(...focusedQuestions);
          keyPointCoverage.set(weakKeyPoint, (keyPointCoverage.get(weakKeyPoint) || 0) + focusedQuestions.length);
        }
      }

      // 2. Generate comprehensive questions for all other key points (1 question each)
      for (const microVideo of microlearningContent.microVideos) {
        for (const keyPoint of microVideo.keyPoints) {
          if (!weakKeyPoints.includes(keyPoint)) {
            const comprehensiveQuestion = await aiQuestionAPI.generateSingleFocusedQuestion(
              microVideo,
              keyPoint,
              'standard'
            );
            if (comprehensiveQuestion) {
              allQuestions.push(comprehensiveQuestion);
              keyPointCoverage.set(keyPoint, 1);
            }
          }
        }
      }

      // 3. Add integration questions that test understanding across segments
      const integrationQuestions = await aiQuestionAPI.generateIntegrationQuestions(
        microlearningContent,
        Math.min(3, Math.floor(allQuestions.length * 0.3)) // 30% integration questions
      );
      allQuestions.push(...integrationQuestions);

      console.log('✅ Generated adaptive final quiz:', {
        totalQuestions: allQuestions.length,
        weakKeyPointFocus: weakKeyPoints.length,
        keyPointCoverage: Array.from(keyPointCoverage.entries())
      });

      return allQuestions;

    } catch (error) {
      console.error('❌ Error generating adaptive final quiz:', error);
      throw new Error('Failed to generate adaptive final quiz');
    }
  },

  // Generate focused questions for specific key points
  generateFocusedQuestions: async (microVideo, targetKeyPoint, difficultyLevel = 'standard') => {
    try {
      const questions = [];
      const questionCount = difficultyLevel === 'challenging' ? 2 : 1;

      for (let i = 0; i < questionCount; i++) {
        // Simulate AI delay
        await new Promise(resolve => setTimeout(resolve, 500));

        const questionId = `ai_focused_${microVideo.id}_${targetKeyPoint.replace(/\s+/g, '_')}_${i + 1}`;

        const question = {
          questionId: questionId,
          question: generateAdvancedQuestion(targetKeyPoint, microVideo.difficulty, difficultyLevel),
          options: {
            A: generateAdvancedOption(targetKeyPoint, 'correct', difficultyLevel),
            B: generateAdvancedOption(targetKeyPoint, 'distractor', difficultyLevel),
            C: generateAdvancedOption(targetKeyPoint, 'distractor', difficultyLevel),
            D: generateAdvancedOption(targetKeyPoint, 'distractor', difficultyLevel)
          },
          correctAnswer: 'A',
          explanation: `This focuses on ${targetKeyPoint} from "${microVideo.title}". ${generateDetailedExplanation(targetKeyPoint, difficultyLevel)}`,
          hint: `Consider the specific aspects of ${targetKeyPoint} and how they apply in practical scenarios.`,
          difficulty: difficultyLevel === 'challenging' ? 'Professional' : microVideo.difficulty,
          keyPoint: targetKeyPoint,
          sourceSegment: microVideo.title,
          cognitiveLoad: difficultyLevel === 'challenging' ? Math.min(microVideo.cognitiveLoad + 2, 10) : microVideo.cognitiveLoad,
          questionType: 'focused-remediation',
          adaptiveReason: `Generated to address weakness in: ${targetKeyPoint}`
        };

        questions.push(question);
      }

      return questions;

    } catch (error) {
      console.error('❌ Error generating focused questions:', error);
      return [];
    }
  },

  // Generate single focused question
  generateSingleFocusedQuestion: async (microVideo, keyPoint, difficultyLevel = 'standard') => {
    const questions = await aiQuestionAPI.generateFocusedQuestions(microVideo, keyPoint, difficultyLevel);
    return questions[0] || null;
  },

  // Generate integration questions that test understanding across segments
  generateIntegrationQuestions: async (microlearningContent, questionCount = 3) => {
    try {
      const integrationQuestions = [];
      const allKeyPoints = microlearningContent.microVideos.flatMap(mv => mv.keyPoints);
      const uniqueKeyPoints = [...new Set(allKeyPoints)];

      for (let i = 0; i < questionCount && i < uniqueKeyPoints.length; i++) {
        // Simulate AI delay
        await new Promise(resolve => setTimeout(resolve, 600));

        const keyPoint1 = uniqueKeyPoints[i];
        const keyPoint2 = uniqueKeyPoints[(i + 1) % uniqueKeyPoints.length];

        const integrationQuestion = {
          questionId: `ai_integration_${microlearningContent.videoId}_${i + 1}`,
          question: `How do ${keyPoint1} and ${keyPoint2} work together in a comprehensive solution?`,
          options: {
            A: `${keyPoint1} provides the foundation while ${keyPoint2} handles the implementation details`,
            B: `${keyPoint2} replaces the need for ${keyPoint1} in modern approaches`,
            C: `${keyPoint1} and ${keyPoint2} are completely independent concepts`,
            D: `${keyPoint2} is only used when ${keyPoint1} fails`
          },
          correctAnswer: 'A',
          explanation: `Integration questions test your understanding of how different concepts work together. ${keyPoint1} and ${keyPoint2} are complementary concepts that strengthen each other when used together.`,
          hint: `Think about how these concepts complement rather than compete with each other.`,
          difficulty: 'Professional',
          keyPoint: `${keyPoint1} + ${keyPoint2}`,
          sourceSegment: 'Multiple segments',
          cognitiveLoad: 8,
          questionType: 'integration',
          adaptiveReason: 'Tests comprehensive understanding across multiple learning segments'
        };

        integrationQuestions.push(integrationQuestion);
      }

      return integrationQuestions;

    } catch (error) {
      console.error('❌ Error generating integration questions:', error);
      return [];
    }
  },

  // ===== PHASE 1B: DIFFICULTY ADJUSTMENT SYSTEM =====

  // Calculate user performance metrics for difficulty adjustment
  calculatePerformanceMetrics: (userAnswers = []) => {
    if (!userAnswers.length) {
      return {
        accuracyRate: 0,
        averageResponseTime: 0,
        difficultyDistribution: { easy: 0, intermediate: 0, professional: 0 },
        cognitiveLoadHandling: 0,
        improvementTrend: 'stable',
        recommendedDifficultyAdjustment: 0
      };
    }

    const totalQuestions = userAnswers.length;
    const correctAnswers = userAnswers.filter(a => a.isCorrect).length;
    const accuracyRate = (correctAnswers / totalQuestions) * 100;

    // Calculate average response time (simulate realistic values)
    const avgResponseTime = userAnswers.reduce((sum, answer) => {
      return sum + (answer.responseTime || Math.random() * 30000 + 15000);
    }, 0) / totalQuestions;

    // Analyze difficulty distribution of answered questions
    const difficultyCount = { easy: 0, intermediate: 0, professional: 0 };
    let totalCognitiveLoad = 0;

    userAnswers.forEach(answer => {
      const difficulty = answer.question?.difficulty?.toLowerCase() || 'intermediate';
      if (difficultyCount[difficulty] !== undefined) {
        difficultyCount[difficulty]++;
      }
      totalCognitiveLoad += answer.question?.cognitiveLoad || 5;
    });

    const avgCognitiveLoad = totalCognitiveLoad / totalQuestions;

    // Calculate improvement trend (compare first half vs second half performance)
    let improvementTrend = 'stable';
    if (totalQuestions >= 4) {
      const firstHalf = userAnswers.slice(0, Math.floor(totalQuestions / 2));
      const secondHalf = userAnswers.slice(Math.floor(totalQuestions / 2));

      const firstHalfAccuracy = firstHalf.filter(a => a.isCorrect).length / firstHalf.length;
      const secondHalfAccuracy = secondHalf.filter(a => a.isCorrect).length / secondHalf.length;

      if (secondHalfAccuracy > firstHalfAccuracy + 0.1) {
        improvementTrend = 'improving';
      } else if (secondHalfAccuracy < firstHalfAccuracy - 0.1) {
        improvementTrend = 'declining';
      }
    }

    // Calculate recommended difficulty adjustment (-2 to +2)
    let difficultyAdjustment = 0;

    if (accuracyRate > 85 && avgResponseTime < 20000) {
      // High accuracy and fast responses - increase difficulty
      difficultyAdjustment = improvementTrend === 'improving' ? 2 : 1;
    } else if (accuracyRate < 50 || avgResponseTime > 45000) {
      // Low accuracy or slow responses - decrease difficulty
      difficultyAdjustment = improvementTrend === 'declining' ? -2 : -1;
    } else if (improvementTrend === 'improving' && accuracyRate > 70) {
      difficultyAdjustment = 1;
    } else if (improvementTrend === 'declining' && accuracyRate < 65) {
      difficultyAdjustment = -1;
    }

    return {
      accuracyRate: Math.round(accuracyRate * 10) / 10,
      averageResponseTime: Math.round(avgResponseTime / 1000),
      difficultyDistribution: difficultyCount,
      cognitiveLoadHandling: Math.round(avgCognitiveLoad * 10) / 10,
      improvementTrend,
      recommendedDifficultyAdjustment: difficultyAdjustment
    };
  },

  // Generate questions with dynamic difficulty adjustment
  generateAdaptiveQuestions: async (microVideo, baseParams = {}) => {
    try {
      const {
        userPerformanceHistory = [],
        currentAccuracy = 70,
        recentResponseTimes = [],
        difficultyPreference = 0,
        adaptiveMode = true
      } = baseParams;

      console.log('🧠 Generating adaptive questions for:', microVideo.title);
      console.log('📊 Performance context:', { currentAccuracy, difficultyPreference, adaptiveMode });

      if (!adaptiveMode) {
        // Fall back to standard generation if adaptive mode is disabled
        return await aiQuestionAPI.generateQuestions(microVideo);
      }

      // Calculate performance metrics
      const metrics = aiQuestionAPI.calculatePerformanceMetrics(userPerformanceHistory);
      const difficultyAdjustment = metrics.recommendedDifficultyAdjustment + difficultyPreference;

      // Determine adaptive difficulty level
      let adaptiveDifficulty = microVideo.difficulty || 'Intermediate';
      let cognitiveLoadAdjustment = 0;

      if (difficultyAdjustment >= 2) {
        adaptiveDifficulty = 'Professional';
        cognitiveLoadAdjustment = 2;
      } else if (difficultyAdjustment >= 1) {
        adaptiveDifficulty = microVideo.difficulty === 'Easy' ? 'Intermediate' : 'Professional';
        cognitiveLoadAdjustment = 1;
      } else if (difficultyAdjustment <= -2) {
        adaptiveDifficulty = 'Easy';
        cognitiveLoadAdjustment = -2;
      } else if (difficultyAdjustment <= -1) {
        adaptiveDifficulty = microVideo.difficulty === 'Professional' ? 'Intermediate' : 'Easy';
        cognitiveLoadAdjustment = -1;
      }

      // Generate adaptive questions
      const adaptiveQuestions = [];
      const questionCount = metrics.accuracyRate > 80 ? 3 : 2; // More questions for high performers

      for (let i = 0; i < questionCount; i++) {
        // Simulate AI processing delay
        await new Promise(resolve => setTimeout(resolve, 600));

        const keyPoint = microVideo.keyPoints[i % microVideo.keyPoints.length];
        const adjustedCognitiveLoad = Math.max(1, Math.min(10,
          (microVideo.cognitiveLoad || 5) + cognitiveLoadAdjustment
        ));

        const adaptiveQuestion = {
          questionId: `adaptive_q_${microVideo.id}_${i + 1}_${Date.now()}`,
          question: generateAdaptiveDifficultyQuestion(keyPoint, adaptiveDifficulty, metrics),
          options: {
            A: generateAdaptiveOption(keyPoint, 'correct', adaptiveDifficulty, metrics),
            B: generateAdaptiveOption(keyPoint, 'distractor', adaptiveDifficulty, metrics),
            C: generateAdaptiveOption(keyPoint, 'distractor', adaptiveDifficulty, metrics),
            D: generateAdaptiveOption(keyPoint, 'distractor', adaptiveDifficulty, metrics)
          },
          correctAnswer: 'A',
          explanation: generateAdaptiveExplanation(keyPoint, adaptiveDifficulty, metrics),
          hint: generateAdaptiveHint(keyPoint, adaptiveDifficulty, metrics),
          difficulty: adaptiveDifficulty,
          keyPoint: keyPoint,
          sourceSegment: microVideo.title,
          cognitiveLoad: adjustedCognitiveLoad,
          questionType: 'adaptive',
          adaptiveMetadata: {
            originalDifficulty: microVideo.difficulty,
            adjustmentReason: aiQuestionAPI.getDifficultyAdjustmentReason(difficultyAdjustment, metrics),
            performanceMetrics: metrics,
            adaptiveDifficultyLevel: difficultyAdjustment
          }
        };

        adaptiveQuestions.push(adaptiveQuestion);
      }

      console.log('✅ Generated adaptive questions:', {
        originalDifficulty: microVideo.difficulty,
        adaptiveDifficulty: adaptiveDifficulty,
        difficultyAdjustment: difficultyAdjustment,
        questionCount: adaptiveQuestions.length,
        cognitiveLoadRange: `${Math.min(...adaptiveQuestions.map(q => q.cognitiveLoad))}-${Math.max(...adaptiveQuestions.map(q => q.cognitiveLoad))}`
      });

      return adaptiveQuestions;

    } catch (error) {
      console.error('❌ Error generating adaptive questions:', error);
      // Fall back to standard generation on error
      return await aiQuestionAPI.generateQuestions(microVideo);
    }
  },

  // Get explanation for difficulty adjustment
  getDifficultyAdjustmentReason: (adjustment, metrics) => {
    if (adjustment >= 2) {
      return `Increased difficulty significantly due to high accuracy (${metrics.accuracyRate}%) and ${metrics.improvementTrend} trend`;
    } else if (adjustment >= 1) {
      return `Increased difficulty moderately due to good performance and ${metrics.improvementTrend} trend`;
    } else if (adjustment <= -2) {
      return `Decreased difficulty significantly due to low accuracy (${metrics.accuracyRate}%) or slow responses`;
    } else if (adjustment <= -1) {
      return `Decreased difficulty moderately to support better learning outcomes`;
    } else {
      return `Maintained current difficulty level based on balanced performance`;
    }
  },

  // Real-time difficulty adjustment during quiz
  adjustQuestionDifficultyInRealTime: async (upcomingQuestions, recentAnswers = []) => {
    try {
      if (recentAnswers.length < 2) {
        return upcomingQuestions; // Need at least 2 answers for real-time adjustment
      }

      console.log('⚡ Performing real-time difficulty adjustment...');

      // Calculate recent performance (last 3-5 questions)
      const recentPerformance = recentAnswers.slice(-5);
      const recentAccuracy = (recentPerformance.filter(a => a.isCorrect).length / recentPerformance.length) * 100;
      const avgRecentResponseTime = recentPerformance.reduce((sum, a) => sum + (a.responseTime || 25000), 0) / recentPerformance.length;

      let realTimeAdjustment = 0;

      // Quick adjustment rules for real-time adaptation
      if (recentAccuracy >= 90 && avgRecentResponseTime < 15000) {
        realTimeAdjustment = 1; // Increase difficulty
      } else if (recentAccuracy <= 40 || avgRecentResponseTime > 50000) {
        realTimeAdjustment = -1; // Decrease difficulty
      }

      if (realTimeAdjustment === 0) {
        return upcomingQuestions; // No adjustment needed
      }

      // Adjust upcoming questions
      const adjustedQuestions = await Promise.all(upcomingQuestions.map(async (question) => {
        // Only adjust questions that haven't been shown yet
        const adjustedCognitiveLoad = Math.max(1, Math.min(10,
          question.cognitiveLoad + realTimeAdjustment
        ));

        const adjustedDifficulty = realTimeAdjustment > 0
          ? (question.difficulty === 'Easy' ? 'Intermediate' : question.difficulty === 'Intermediate' ? 'Professional' : 'Professional')
          : (question.difficulty === 'Professional' ? 'Intermediate' : question.difficulty === 'Intermediate' ? 'Easy' : 'Easy');

        return {
          ...question,
          difficulty: adjustedDifficulty,
          cognitiveLoad: adjustedCognitiveLoad,
          adaptiveMetadata: {
            ...question.adaptiveMetadata,
            realTimeAdjustment: realTimeAdjustment,
            adjustmentTrigger: recentAccuracy >= 90 ? 'high-performance' : 'low-performance',
            adjustmentTimestamp: new Date().toISOString()
          }
        };
      }));

      console.log(`✅ Real-time adjustment applied: ${realTimeAdjustment > 0 ? 'increased' : 'decreased'} difficulty for ${adjustedQuestions.length} questions`);
      return adjustedQuestions;

    } catch (error) {
      console.error('❌ Error in real-time difficulty adjustment:', error);
      return upcomingQuestions;
    }
  }
};

// Mock AI question generation (simulates real AI)
// TODO: Replace with actual backend API call
async function mockAIQuestionGeneration(microVideo) {
  // Simulate AI processing time
  await new Promise(resolve => setTimeout(resolve, 800));

  // Generate content-aware questions based on the microVideo data
  const questions = [];

  // Generate 2 questions per segment based on actual content
  const keyPoints = microVideo.keyPoints || ['programming concepts', 'implementation'];
  const transcript = microVideo.transcript || '';

  // Question 1: Knowledge check based on first key point
  questions.push({
    questionId: `ai_q_${microVideo.id}_1`,
    question: generateContentBasedQuestion(keyPoints[0], microVideo.difficulty, 'knowledge'),
    options: {
      A: generateRelevantOption(keyPoints[0], 'correct'),
      B: generateRelevantOption(keyPoints[0], 'distractor'),
      C: generateRelevantOption(keyPoints[0], 'distractor'),
      D: generateRelevantOption(keyPoints[0], 'distractor')
    },
    correctAnswer: 'A',
    explanation: `This relates to ${keyPoints[0]} as explained in the "${microVideo.title}" segment.`,
    hint: `Think about ${keyPoints[0]} and how it applies in this context.`,
    difficulty: microVideo.difficulty,
    keyPoint: keyPoints[0],
    sourceSegment: microVideo.title,
    cognitiveLoad: microVideo.cognitiveLoad,
    questionType: 'knowledge-check'
  });

  // Question 2: Application question if multiple key points
  if (keyPoints.length > 1) {
    questions.push({
      questionId: `ai_q_${microVideo.id}_2`,
      question: generateContentBasedQuestion(keyPoints[1], microVideo.difficulty, 'application'),
      options: {
        A: generateRelevantOption(keyPoints[1], 'distractor'),
        B: generateRelevantOption(keyPoints[1], 'correct'),
        C: generateRelevantOption(keyPoints[1], 'distractor'),
        D: generateRelevantOption(keyPoints[1], 'distractor')
      },
      correctAnswer: 'B',
      explanation: `This demonstrates practical application of ${keyPoints[1]} from the "${microVideo.title}" segment.`,
      hint: `Consider how you would implement ${keyPoints[1]} in practice.`,
      difficulty: microVideo.difficulty,
      keyPoint: keyPoints[1],
      sourceSegment: microVideo.title,
      cognitiveLoad: microVideo.cognitiveLoad,
      questionType: 'application'
    });
  }

  return questions;
}

// Generate contextual questions based on content
function generateContentBasedQuestion(keyPoint, difficulty, type) {
  const questionTemplates = {
    knowledge: {
      beginner: `What is the main purpose of ${keyPoint}?`,
      intermediate: `How does ${keyPoint} work in practice?`,
      advanced: `What are the key considerations when implementing ${keyPoint}?`
    },
    application: {
      beginner: `When would you use ${keyPoint}?`,
      intermediate: `How would you implement ${keyPoint} in a real project?`,
      advanced: `What's the best approach for optimizing ${keyPoint}?`
    }
  };

  const level = difficulty?.toLowerCase() || 'beginner';
  return questionTemplates[type][level] || questionTemplates[type]['beginner'];
}

// Generate relevant answer options
function generateRelevantOption(keyPoint, type) {
  const optionTemplates = {
    correct: [
      `It helps manage ${keyPoint} effectively`,
      `It provides a structured approach to ${keyPoint}`,
      `It enables better implementation of ${keyPoint}`,
      `It ensures proper handling of ${keyPoint}`
    ],
    distractor: [
      `It replaces the need for ${keyPoint}`,
      `It makes ${keyPoint} unnecessary`,
      `It has no relation to ${keyPoint}`,
      `It conflicts with ${keyPoint} principles`
    ]
  };

  const options = optionTemplates[type];
  return options[Math.floor(Math.random() * options.length)];
}

// Generate advanced questions for focused learning
function generateAdvancedQuestion(keyPoint, baseDifficulty, difficultyLevel) {
  const advancedTemplates = {
    standard: {
      beginner: `What are the core principles behind ${keyPoint}?`,
      intermediate: `How would you implement ${keyPoint} in a real-world scenario?`,
      advanced: `What are the trade-offs when using ${keyPoint} versus alternative approaches?`
    },
    challenging: {
      beginner: `Why is understanding ${keyPoint} critical for mastering this topic?`,
      intermediate: `What challenges might arise when applying ${keyPoint}, and how would you address them?`,
      advanced: `How does ${keyPoint} integrate with other advanced concepts in this domain?`
    }
  };

  const level = baseDifficulty?.toLowerCase() || 'intermediate';
  const templateSet = advancedTemplates[difficultyLevel] || advancedTemplates.standard;

  return templateSet[level] || templateSet.intermediate;
}

// Generate advanced answer options
function generateAdvancedOption(keyPoint, type, difficultyLevel) {
  const advancedTemplates = {
    correct: {
      standard: [
        `It provides a systematic approach to ${keyPoint}`,
        `It enables efficient implementation of ${keyPoint}`,
        `It ensures reliable application of ${keyPoint}`,
        `It facilitates better understanding of ${keyPoint}`
      ],
      challenging: [
        `It integrates ${keyPoint} with complementary methodologies`,
        `It optimizes ${keyPoint} for complex scenarios`,
        `It addresses edge cases in ${keyPoint} implementation`,
        `It scales ${keyPoint} for enterprise-level applications`
      ]
    },
    distractor: {
      standard: [
        `It completely replaces ${keyPoint}`,
        `It makes ${keyPoint} obsolete`,
        `It contradicts ${keyPoint} principles`,
        `It ignores ${keyPoint} best practices`
      ],
      challenging: [
        `It overcomplicates ${keyPoint} unnecessarily`,
        `It misapplies ${keyPoint} in wrong contexts`,
        `It creates dependencies that conflict with ${keyPoint}`,
        `It prioritizes performance over ${keyPoint} correctness`
      ]
    }
  };

  const templateSet = advancedTemplates[type][difficultyLevel] || advancedTemplates[type].standard;
  return templateSet[Math.floor(Math.random() * templateSet.length)];
}

// Generate detailed explanations
function generateDetailedExplanation(keyPoint, difficultyLevel) {
  const explanations = {
    standard: `Understanding ${keyPoint} is fundamental to building robust solutions. This concept provides the foundation for more advanced techniques and ensures your implementation follows industry best practices.`,
    challenging: `Mastering ${keyPoint} requires deep understanding of its nuances and edge cases. Professional developers must consider how ${keyPoint} interacts with other system components and scales under different conditions.`
  };

  return explanations[difficultyLevel] || explanations.standard;
}

// ===== ADAPTIVE DIFFICULTY HELPER FUNCTIONS =====

// Generate adaptive difficulty questions
function generateAdaptiveDifficultyQuestion(keyPoint, difficulty, performanceMetrics) {
  const adaptiveTemplates = {
    Easy: [
      `What is ${keyPoint}?`,
      `How does ${keyPoint} work in simple terms?`,
      `What are the basic benefits of ${keyPoint}?`,
      `When would you use ${keyPoint}?`
    ],
    Intermediate: [
      `How would you implement ${keyPoint} in a project?`,
      `What are the key considerations when using ${keyPoint}?`,
      `How does ${keyPoint} interact with other concepts?`,
      `What problems does ${keyPoint} solve?`
    ],
    Professional: [
      `What are the advanced techniques for optimizing ${keyPoint}?`,
      `How would you scale ${keyPoint} in enterprise environments?`,
      `What are the architectural implications of ${keyPoint}?`,
      `How would you troubleshoot complex issues with ${keyPoint}?`
    ]
  };

  // Add performance-based modifications
  let selectedTemplate = adaptiveTemplates[difficulty] || adaptiveTemplates.Intermediate;
  let question = selectedTemplate[Math.floor(Math.random() * selectedTemplate.length)];

  // Modify question based on performance trends
  if (performanceMetrics.improvementTrend === 'improving' && performanceMetrics.accuracyRate > 80) {
    question = question.replace('What', 'In advanced scenarios, what');
    question = question.replace('How', 'Given complex requirements, how');
  } else if (performanceMetrics.improvementTrend === 'declining' || performanceMetrics.accuracyRate < 60) {
    question = question.replace('advanced', 'basic');
    question = question.replace('complex', 'simple');
  }

  return question;
}

// Generate adaptive options
function generateAdaptiveOption(keyPoint, type, difficulty, performanceMetrics) {
  const baseOptions = {
    correct: {
      Easy: `${keyPoint} provides essential functionality`,
      Intermediate: `${keyPoint} enables efficient implementation`,
      Professional: `${keyPoint} optimizes system architecture`
    },
    distractor: {
      Easy: [
        `${keyPoint} is not commonly used`,
        `${keyPoint} creates unnecessary complexity`,
        `${keyPoint} is deprecated technology`
      ],
      Intermediate: [
        `${keyPoint} requires extensive configuration`,
        `${keyPoint} has limited practical applications`,
        `${keyPoint} conflicts with modern standards`
      ],
      Professional: [
        `${keyPoint} introduces significant performance overhead`,
        `${keyPoint} lacks enterprise-grade scalability`,
        `${keyPoint} compromises system security`
      ]
    }
  };

  if (type === 'correct') {
    return baseOptions.correct[difficulty] || baseOptions.correct.Intermediate;
  } else {
    const distractors = baseOptions.distractor[difficulty] || baseOptions.distractor.Intermediate;
    return distractors[Math.floor(Math.random() * distractors.length)];
  }
}

// Generate adaptive explanations
function generateAdaptiveExplanation(keyPoint, difficulty, performanceMetrics) {
  let baseExplanation;

  switch (difficulty) {
    case 'Easy':
      baseExplanation = `${keyPoint} is a fundamental concept that provides essential functionality. Understanding this concept is important for building a solid foundation in this subject area.`;
      break;
    case 'Professional':
      baseExplanation = `${keyPoint} represents an advanced concept that requires careful consideration of system architecture, performance implications, and scalability concerns. Professional implementation demands deep understanding of its interactions with other system components.`;
      break;
    default:
      baseExplanation = `${keyPoint} is an important concept that enables efficient implementation of solutions. It plays a key role in creating robust and maintainable systems.`;
  }

  // Add performance-based guidance
  if (performanceMetrics.improvementTrend === 'declining') {
    baseExplanation += ` Take your time to understand the core principles before moving to more complex applications.`;
  } else if (performanceMetrics.accuracyRate > 85) {
    baseExplanation += ` Consider exploring advanced use cases and integration patterns to deepen your expertise.`;
  }

  return baseExplanation;
}

// Generate adaptive hints
function generateAdaptiveHint(keyPoint, difficulty, performanceMetrics) {
  const baseHints = {
    Easy: `Think about the basic purpose of ${keyPoint}`,
    Intermediate: `Consider how ${keyPoint} fits into the overall system`,
    Professional: `Analyze the architectural and performance implications of ${keyPoint}`
  };

  let hint = baseHints[difficulty] || baseHints.Intermediate;

  // Adaptive hint modifications
  if (performanceMetrics.accuracyRate < 60) {
    hint = `Start simple: ${hint.toLowerCase()}`;
  } else if (performanceMetrics.improvementTrend === 'improving') {
    hint += ` and consider advanced scenarios`;
  }

  return hint;
}

// ===== QUIZ PROGRESSION TRACKING API =====
// Track user progress through intermediate → final quiz flow
export const quizProgressionAPI = {
  // Calculate quiz schedule based on microlearning content (mirrors backend logic)
  calculateQuizSchedule: (totalMicroVideos) => {
    const schedule = [];
    let sessionNumber = 1;

    // Adaptive quiz scheduling based on total micro-video count (from backend)
    if (totalMicroVideos <= 2) {
      // Very small content: Only final quiz
      schedule.push({
        sessionNumber,
        sessionType: 'final',
        afterMicroVideo: totalMicroVideos,
        questionsCount: Math.min(totalMicroVideos * 2, 6),
        description: 'Single comprehensive quiz for short content'
      });
    } else if (totalMicroVideos <= 4) {
      // Small content: One intermediate + final
      const midpoint = Math.ceil(totalMicroVideos / 2);

      schedule.push({
        sessionNumber,
        sessionType: 'intermediate',
        afterMicroVideo: midpoint,
        questionsCount: Math.min(midpoint * 2, 6),
        description: `Quiz after first ${midpoint} micro-videos`
      });
      sessionNumber++;

      schedule.push({
        sessionNumber,
        sessionType: 'final',
        afterMicroVideo: totalMicroVideos,
        questionsCount: Math.min(totalMicroVideos * 2, 10),
        description: 'Comprehensive final quiz covering all content'
      });
    } else if (totalMicroVideos <= 6) {
      // Medium content: Two intermediates + final
      const firstQuiz = Math.ceil(totalMicroVideos / 3);
      const secondQuiz = Math.ceil(totalMicroVideos * 2 / 3);

      schedule.push({
        sessionNumber,
        sessionType: 'intermediate',
        afterMicroVideo: firstQuiz,
        questionsCount: Math.min(firstQuiz * 2, 6),
        description: `First quiz after ${firstQuiz} micro-videos`
      });
      sessionNumber++;

      schedule.push({
        sessionNumber,
        sessionType: 'intermediate',
        afterMicroVideo: secondQuiz,
        questionsCount: Math.min((secondQuiz - firstQuiz) * 2, 6),
        description: `Second quiz after ${secondQuiz} micro-videos`
      });
      sessionNumber++;

      schedule.push({
        sessionNumber,
        sessionType: 'final',
        afterMicroVideo: totalMicroVideos,
        questionsCount: Math.min(totalMicroVideos * 2, 12),
        description: 'Comprehensive final quiz'
      });
    } else {
      // Large content: Multiple intermediates + final
      const quizInterval = Math.max(2, Math.floor(totalMicroVideos / 4));

      for (let i = quizInterval; i < totalMicroVideos; i += quizInterval) {
        schedule.push({
          sessionNumber,
          sessionType: 'intermediate',
          afterMicroVideo: i,
          questionsCount: Math.min(quizInterval * 2, 8),
          description: `Intermediate quiz ${sessionNumber} after ${i} micro-videos`
        });
        sessionNumber++;
      }

      // Final quiz
      schedule.push({
        sessionNumber,
        sessionType: 'final',
        afterMicroVideo: totalMicroVideos,
        questionsCount: Math.min(totalMicroVideos * 1.5, 15),
        description: 'Comprehensive final quiz covering all micro-videos'
      });
    }

    return schedule;
  },

  // Get quiz progression data for a video
  getQuizProgression: (videoId) => {
    try {
      const progressionData = localStorage.getItem(`quiz_progression_${videoId}`);

      if (progressionData) {
        return JSON.parse(progressionData);
      }

      // Return default progression structure
      return {
        videoId: videoId,
        totalMicroVideos: 0,
        quizSchedule: [],
        completedIntermediateQuizzes: [],
        currentQuizNumber: 1,
        readyForFinal: false,
        finalQuizCompleted: false,
        overallMasteryScore: 0,
        weakKeyPoints: [],
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting quiz progression:', error);
      return null;
    }
  },

  // Initialize quiz progression for a video
  initializeProgression: (videoId, microlearningContent) => {
    try {
      const totalMicroVideos = microlearningContent.microVideos.length;
      const quizSchedule = quizProgressionAPI.calculateQuizSchedule(totalMicroVideos);

      const progression = {
        videoId: videoId,
        originalTitle: microlearningContent.originalTitle,
        totalMicroVideos: totalMicroVideos,
        quizSchedule: quizSchedule,
        completedIntermediateQuizzes: [],
        currentQuizNumber: 1,
        readyForFinal: false,
        finalQuizCompleted: false,
        overallMasteryScore: 0,
        weakKeyPoints: [],
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };

      localStorage.setItem(`quiz_progression_${videoId}`, JSON.stringify(progression));
      console.log('✅ Initialized quiz progression:', progression);

      return progression;
    } catch (error) {
      console.error('Error initializing quiz progression:', error);
      return null;
    }
  },

  // Record completion of an intermediate quiz
  recordIntermediateQuizCompletion: (videoId, quizSession, userAnswers, questions) => {
    try {
      const progression = quizProgressionAPI.getQuizProgression(videoId);
      if (!progression) {
        console.error('No progression data found for video:', videoId);
        return false;
      }

      // Calculate performance metrics
      const correctAnswers = userAnswers.filter(answer => answer.isCorrect).length;
      const totalAnswers = userAnswers.length;
      const accuracy = totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0;

      // Identify weak key points (questions answered incorrectly)
      const weakKeyPoints = questions
        .filter((q, idx) => userAnswers[idx] && !userAnswers[idx].isCorrect)
        .map(q => q.keyPoint)
        .filter((keyPoint, idx, arr) => arr.indexOf(keyPoint) === idx); // unique

      // Create session record
      const sessionRecord = {
        sessionNumber: progression.currentQuizNumber,
        sessionType: 'intermediate',
        sessionId: quizSession.sessionId,
        completedAt: new Date().toISOString(),
        performance: {
          totalQuestions: totalAnswers,
          correctAnswers: correctAnswers,
          accuracy: accuracy,
          weakKeyPoints: weakKeyPoints
        },
        userAnswers: userAnswers.map((answer, idx) => ({
          questionId: questions[idx]?.questionId,
          keyPoint: questions[idx]?.keyPoint,
          selectedAnswer: answer.selectedAnswer,
          correctAnswer: questions[idx]?.correctAnswer,
          isCorrect: answer.isCorrect,
          timeSpent: answer.timeSpent || 0,
          retryAttempts: answer.retryAttempts || 0,
          previousState: 'new', // For intermediate quizzes
          currentState: answer.isCorrect ? 'correct' : 'wrong'
        }))
      };

      // Add to completed quizzes
      progression.completedIntermediateQuizzes.push(sessionRecord);

      // Update overall weak key points
      progression.weakKeyPoints = [
        ...new Set([...progression.weakKeyPoints, ...weakKeyPoints])
      ];

      // Move to next quiz
      progression.currentQuizNumber++;

      // Check if ready for final quiz
      const intermediateQuizzes = progression.quizSchedule.filter(q => q.sessionType === 'intermediate');
      progression.readyForFinal = progression.completedIntermediateQuizzes.length >= intermediateQuizzes.length;

      progression.lastUpdated = new Date().toISOString();

      // Save updated progression
      localStorage.setItem(`quiz_progression_${videoId}`, JSON.stringify(progression));

      console.log('✅ Recorded intermediate quiz completion:', {
        sessionNumber: sessionRecord.sessionNumber,
        accuracy: accuracy,
        readyForFinal: progression.readyForFinal
      });

      return progression;
    } catch (error) {
      console.error('Error recording intermediate quiz completion:', error);
      return false;
    }
  },

  // Calculate mastery score for final quiz (mirrors backend logic)
  calculateMasteryScore: (intermediateAnswers, finalAnswers) => {
    let ccPoints = 0, cwPoints = 0, wcPoints = 0, wwPoints = 0;

    finalAnswers.forEach(finalAnswer => {
      // Find corresponding intermediate answer for same key point
      const intermediateAnswer = intermediateAnswers.find(
        intAnswer => intAnswer.keyPoint === finalAnswer.keyPoint
      );

      if (intermediateAnswer) {
        const prev = intermediateAnswer.currentState;
        const curr = finalAnswer.currentState;

        if (prev === 'correct' && curr === 'correct') {
          ccPoints += 1; // Stable mastery
        } else if (prev === 'correct' && curr === 'wrong') {
          cwPoints -= 1; // Regression
        } else if (prev === 'wrong' && curr === 'correct') {
          wcPoints += 0.5; // Recovery
        } else if (prev === 'wrong' && curr === 'wrong') {
          wwPoints -= 0.5; // Persistent gap
        }
      }
      // 'new' state doesn't affect mastery scoring
    });

    const totalScore = ccPoints + cwPoints + wcPoints + wwPoints;

    return {
      ccPoints,
      cwPoints,
      wcPoints,
      wwPoints,
      totalScore,
      threshold: 6,
      needsSimplifiedQuiz: totalScore < 6,
      masteryLevel: totalScore >= 6 ? 'mastered' : totalScore >= 3 ? 'developing' : 'needs-review'
    };
  },

  // Record final quiz completion
  recordFinalQuizCompletion: (videoId, quizSession, userAnswers, questions) => {
    try {
      const progression = quizProgressionAPI.getQuizProgression(videoId);
      if (!progression) {
        console.error('No progression data found for video:', videoId);
        return false;
      }

      // Calculate performance metrics
      const correctAnswers = userAnswers.filter(answer => answer.isCorrect).length;
      const totalAnswers = userAnswers.length;
      const accuracy = totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0;

      // Prepare final quiz answers for mastery calculation
      const finalAnswers = userAnswers.map((answer, idx) => ({
        questionId: questions[idx]?.questionId,
        keyPoint: questions[idx]?.keyPoint,
        currentState: answer.isCorrect ? 'correct' : 'wrong'
      }));

      // Get all intermediate answers for mastery calculation
      const allIntermediateAnswers = progression.completedIntermediateQuizzes
        .flatMap(session => session.userAnswers);

      // Calculate mastery score
      const masteryScore = quizProgressionAPI.calculateMasteryScore(
        allIntermediateAnswers,
        finalAnswers
      );

      // Update progression
      progression.finalQuizCompleted = true;
      progression.overallMasteryScore = masteryScore.totalScore;
      progression.finalQuizResult = {
        sessionId: quizSession.sessionId,
        completedAt: new Date().toISOString(),
        performance: {
          totalQuestions: totalAnswers,
          correctAnswers: correctAnswers,
          accuracy: accuracy
        },
        masteryScore: masteryScore
      };

      progression.lastUpdated = new Date().toISOString();

      // Save updated progression
      localStorage.setItem(`quiz_progression_${videoId}`, JSON.stringify(progression));

      console.log('✅ Recorded final quiz completion:', {
        accuracy: accuracy,
        masteryScore: masteryScore.totalScore,
        masteryLevel: masteryScore.masteryLevel
      });

      return progression;
    } catch (error) {
      console.error('Error recording final quiz completion:', error);
      return false;
    }
  },

  // Get current available quiz for a video
  getCurrentAvailableQuiz: (videoId) => {
    try {
      const progression = quizProgressionAPI.getQuizProgression(videoId);
      if (!progression || !progression.quizSchedule.length) {
        return null;
      }

      // Check if final quiz is ready
      if (progression.readyForFinal && !progression.finalQuizCompleted) {
        return progression.quizSchedule.find(q => q.sessionType === 'final');
      }

      // Find next intermediate quiz
      const nextQuiz = progression.quizSchedule.find(
        q => q.sessionNumber === progression.currentQuizNumber && q.sessionType === 'intermediate'
      );

      return nextQuiz || null;
    } catch (error) {
      console.error('Error getting current available quiz:', error);
      return null;
    }
  }
};

export default api;