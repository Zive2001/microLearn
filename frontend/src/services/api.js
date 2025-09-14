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
  // Generate mock microlearning content for a video
  generateMicrolearningContent: async (videoId, videoTitle = 'Programming Tutorial') => {
    try {
      console.log('🎬 Generating mock microlearning content for:', videoId);

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Generate realistic mock data based on video
      const mockContent = {
        videoId: videoId,
        originalTitle: videoTitle,
        status: 'completed',
        generatedAt: new Date().toISOString(),
        processingTime: '2.3 seconds',
        microVideos: [
          {
            id: `micro_${videoId}_1`,
            sequence: 1,
            title: 'Introduction & Key Concepts',
            duration: '2:30',
            startTime: '00:00',
            endTime: '02:30',
            keyPoints: [
              'Basic syntax and structure',
              'Variable declarations',
              'First programming concepts'
            ],
            summary: `This microlearning segment introduces the fundamental concepts of ${videoTitle.toLowerCase()}. You'll learn about basic syntax, how to declare variables, and understand the core principles that form the foundation of programming.`,
            transcript: `Welcome to this tutorial on ${videoTitle.toLowerCase()}. In this first section, we'll cover the basic syntax and structure. Variables are containers for storing data values. Let's start with the most common ways to declare variables and understand how they work in practice.`,
            difficulty: 'Beginner',
            cognitiveLoad: 3,
            learningObjectives: [
              'Understand basic syntax',
              'Learn variable declaration',
              'Grasp fundamental concepts'
            ]
          },
          {
            id: `micro_${videoId}_2`,
            sequence: 2,
            title: 'Practical Examples & Implementation',
            duration: '3:15',
            startTime: '02:30',
            endTime: '05:45',
            keyPoints: [
              'Code examples and demonstrations',
              'Best practices and common patterns',
              'Error handling basics'
            ],
            summary: `This segment focuses on practical implementation with real code examples. You'll see how the concepts from the previous section work in practice and learn about best practices and common patterns used by professional developers.`,
            transcript: `Now let's see these concepts in action with some practical examples. Here's how you would implement these ideas in real code. Notice how we handle different scenarios and follow best practices. Error handling is also crucial - let's see how to do it properly.`,
            difficulty: 'Intermediate',
            cognitiveLoad: 5,
            learningObjectives: [
              'Apply concepts in practice',
              'Learn best practices',
              'Understand error handling'
            ]
          },
          {
            id: `micro_${videoId}_3`,
            sequence: 3,
            title: 'Advanced Techniques & Next Steps',
            duration: '2:45',
            startTime: '05:45',
            endTime: '08:30',
            keyPoints: [
              'Advanced patterns and techniques',
              'Performance considerations',
              'Further learning resources'
            ],
            summary: `The final segment covers advanced techniques and performance considerations. You'll learn about sophisticated patterns used in professional development and get guidance on next steps for your learning journey.`,
            transcript: `Let's explore some advanced techniques that will take your skills to the next level. Performance is important, so here are some key considerations. For further learning, I recommend exploring these resources and practicing with real projects.`,
            difficulty: 'Advanced',
            cognitiveLoad: 7,
            learningObjectives: [
              'Master advanced techniques',
              'Optimize for performance',
              'Plan continued learning'
            ]
          }
        ],
        analytics: {
          totalDuration: '8:30',
          averageCognitiveLoad: 5,
          difficultyProgression: ['Beginner', 'Intermediate', 'Advanced'],
          estimatedLearningTime: '12-15 minutes',
          recommendedBreaks: 2
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

export default api;