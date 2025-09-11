// src/context/AppContext.jsx
import { createContext, useContext, useReducer, useEffect } from 'react';
import { topicsService } from '../services/topics';
import { assessmentService } from '../services/assessment';
import { microlearningService } from '../services/microlearning';
import { useAuth } from '../hooks/useAuth';

// App Context
const AppContext = createContext();

// App Actions
const APP_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  
  // Topics
  SET_TOPICS: 'SET_TOPICS',
  SET_SELECTED_TOPICS: 'SET_SELECTED_TOPICS',
  ADD_SELECTED_TOPIC: 'ADD_SELECTED_TOPIC',
  REMOVE_SELECTED_TOPIC: 'REMOVE_SELECTED_TOPIC',
  
  // Assessment
  SET_ASSESSMENT_PROGRESS: 'SET_ASSESSMENT_PROGRESS',
  SET_ASSESSMENT_HISTORY: 'SET_ASSESSMENT_HISTORY',
  SET_ACTIVE_SESSIONS: 'SET_ACTIVE_SESSIONS',
  
  // Recommendations
  SET_RECOMMENDATIONS: 'SET_RECOMMENDATIONS',
  SET_LEARNING_PATHS: 'SET_LEARNING_PATHS',
  
  // Dashboard
  SET_DASHBOARD_DATA: 'SET_DASHBOARD_DATA',
  SET_STATS: 'SET_STATS'
};

// Initial State
const initialState = {
  // Loading states
  isLoading: false,
  error: null,
  
  // Topics
  allTopics: [],
  selectedTopics: [],
  featuredTopics: [],
  categories: [],
  
  // Assessment
  assessmentProgress: null,
  assessmentHistory: [],
  activeSessions: [],
  
  // Recommendations
  recommendations: {},
  learningPaths: {},
  quickRecommendations: [],
  
  // Dashboard
  dashboardData: null,
  userStats: null
};

// App Reducer
function appReducer(state, action) {
  switch (action.type) {
    case APP_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      };

    case APP_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };

    case APP_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    case APP_ACTIONS.SET_TOPICS:
      return {
        ...state,
        allTopics: action.payload
      };

    case APP_ACTIONS.SET_SELECTED_TOPICS:
      return {
        ...state,
        selectedTopics: action.payload
      };

    case APP_ACTIONS.ADD_SELECTED_TOPIC:
      return {
        ...state,
        selectedTopics: [...state.selectedTopics, action.payload]
      };

    case APP_ACTIONS.REMOVE_SELECTED_TOPIC:
      return {
        ...state,
        selectedTopics: state.selectedTopics.filter(topic => topic.id !== action.payload)
      };

    case APP_ACTIONS.SET_ASSESSMENT_PROGRESS:
      return {
        ...state,
        assessmentProgress: action.payload
      };

    case APP_ACTIONS.SET_ASSESSMENT_HISTORY:
      return {
        ...state,
        assessmentHistory: action.payload
      };

    case APP_ACTIONS.SET_ACTIVE_SESSIONS:
      return {
        ...state,
        activeSessions: action.payload
      };

    case APP_ACTIONS.SET_RECOMMENDATIONS:
      return {
        ...state,
        recommendations: {
          ...state.recommendations,
          [action.payload.topic]: action.payload.data
        }
      };

    case APP_ACTIONS.SET_LEARNING_PATHS:
      return {
        ...state,
        learningPaths: {
          ...state.learningPaths,
          [action.payload.topic]: action.payload.data
        }
      };

    case APP_ACTIONS.SET_DASHBOARD_DATA:
      return {
        ...state,
        dashboardData: action.payload
      };

    case APP_ACTIONS.SET_STATS:
      return {
        ...state,
        userStats: action.payload
      };

    default:
      return state;
  }
}

// App Provider Component
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { isAuthenticated, user } = useAuth();

  // Error handling utility
  const handleError = (error) => {
    console.error('App Error:', error);
    dispatch({
      type: APP_ACTIONS.SET_ERROR,
      payload: error.message || 'An error occurred'
    });
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: APP_ACTIONS.CLEAR_ERROR });
  };

  // Topics Functions
  const fetchAllTopics = async () => {
    try {
      dispatch({ type: APP_ACTIONS.SET_LOADING, payload: true });
      const topics = await topicsService.getAllTopics();
      dispatch({ type: APP_ACTIONS.SET_TOPICS, payload: topics });
    } catch (error) {
      handleError(error);
    } finally {
      dispatch({ type: APP_ACTIONS.SET_LOADING, payload: false });
    }
  };

  const fetchSelectedTopics = async () => {
    try {
      if (!isAuthenticated) return;
      const topics = await topicsService.getMyTopics();
      dispatch({ type: APP_ACTIONS.SET_SELECTED_TOPICS, payload: topics });
    } catch (error) {
      handleError(error);
    }
  };

  const selectTopics = async (topicIds) => {
    try {
      dispatch({ type: APP_ACTIONS.SET_LOADING, payload: true });
      const result = await topicsService.selectTopics(topicIds);
      await fetchSelectedTopics(); // Refresh selected topics
      return result;
    } catch (error) {
      handleError(error);
      throw error;
    } finally {
      dispatch({ type: APP_ACTIONS.SET_LOADING, payload: false });
    }
  };

  // Assessment Functions
  const fetchAssessmentProgress = async () => {
    try {
      if (!isAuthenticated) return;
      const progress = await assessmentService.getProgressSummary();
      dispatch({ type: APP_ACTIONS.SET_ASSESSMENT_PROGRESS, payload: progress });
    } catch (error) {
      handleError(error);
    }
  };

  const fetchAssessmentHistory = async (limit = 10) => {
    try {
      if (!isAuthenticated) return;
      const history = await assessmentService.getHistory(limit);
      dispatch({ type: APP_ACTIONS.SET_ASSESSMENT_HISTORY, payload: history });
    } catch (error) {
      handleError(error);
    }
  };

  const fetchActiveSessions = async () => {
    try {
      if (!isAuthenticated) return;
      const sessions = await assessmentService.getActiveSessions();
      dispatch({ type: APP_ACTIONS.SET_ACTIVE_SESSIONS, payload: sessions });
    } catch (error) {
      handleError(error);
    }
  };

  // Recommendations Functions
  const fetchRecommendations = async (topic, options = {}) => {
    try {
      if (!isAuthenticated) return;
      const recommendations = await microlearningService.getRecommendations(topic, options);
      dispatch({
        type: APP_ACTIONS.SET_RECOMMENDATIONS,
        payload: { topic, data: recommendations }
      });
      return recommendations;
    } catch (error) {
      handleError(error);
      throw error;
    }
  };

  const fetchLearningPath = async (topic, maxVideos = 5) => {
    try {
      if (!isAuthenticated) return;
      const learningPath = await microlearningService.getLearningPath(topic, maxVideos);
      dispatch({
        type: APP_ACTIONS.SET_LEARNING_PATHS,
        payload: { topic, data: learningPath }
      });
      return learningPath;
    } catch (error) {
      handleError(error);
      throw error;
    }
  };

  const fetchQuickRecommendations = async () => {
    try {
      if (!isAuthenticated) return;
      const recommendations = await microlearningService.getQuickRecommendations();
      return recommendations;
    } catch (error) {
      handleError(error);
    }
  };

  // Dashboard Functions
  const fetchDashboardData = async () => {
    try {
      if (!isAuthenticated) return;
      dispatch({ type: APP_ACTIONS.SET_LOADING, payload: true });
      
      // Fetch multiple data sources for dashboard
      const [progress, history, stats, quickRecs] = await Promise.allSettled([
        assessmentService.getProgressSummary(),
        assessmentService.getHistory(5),
        microlearningService.getStats(),
        microlearningService.getQuickRecommendations()
      ]);

      const dashboardData = {
        progress: progress.status === 'fulfilled' ? progress.value : null,
        recentHistory: history.status === 'fulfilled' ? history.value : [],
        stats: stats.status === 'fulfilled' ? stats.value : null,
        quickRecommendations: quickRecs.status === 'fulfilled' ? quickRecs.value : []
      };

      dispatch({ type: APP_ACTIONS.SET_DASHBOARD_DATA, payload: dashboardData });
      
      // Also update individual states
      if (progress.status === 'fulfilled') {
        dispatch({ type: APP_ACTIONS.SET_ASSESSMENT_PROGRESS, payload: progress.value });
      }
      if (history.status === 'fulfilled') {
        dispatch({ type: APP_ACTIONS.SET_ASSESSMENT_HISTORY, payload: history.value });
      }
      if (stats.status === 'fulfilled') {
        dispatch({ type: APP_ACTIONS.SET_STATS, payload: stats.value });
      }

    } catch (error) {
      handleError(error);
    } finally {
      dispatch({ type: APP_ACTIONS.SET_LOADING, payload: false });
    }
  };

  // Initialize data when user logs in
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchDashboardData();
      fetchSelectedTopics();
      fetchActiveSessions();
    }
  }, [isAuthenticated, user]);

  // Context value
  const value = {
    // State
    ...state,
    
    // General actions
    clearError,
    
    // Topics
    fetchAllTopics,
    fetchSelectedTopics,
    selectTopics,
    
    // Assessment
    fetchAssessmentProgress,
    fetchAssessmentHistory,
    fetchActiveSessions,
    
    // Recommendations
    fetchRecommendations,
    fetchLearningPath,
    fetchQuickRecommendations,
    
    // Dashboard
    fetchDashboardData
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

// Custom hook to use app context
export function useApp() {
  const context = useContext(AppContext);
  
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  
  return context;
}

export default AppContext;