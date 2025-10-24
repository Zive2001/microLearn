// src/App.jsx - Complete MicroLearn Application
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Context Providers
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Auth Pages (self-contained layouts)
import Login from './pages/Login';
import Register from './pages/Register';

// Public Pages
import LandingPage from './pages/LandingPage';
import Home from './pages/Home';

// Protected Pages
import Dashboard from './pages/Dashboard';
import TopicSelection from './pages/TopicSelection';
import AssessmentSelection from './pages/AssessmentSelection';
import AssessmentQuiz from './pages/AssessmentQuiz';
import AssessmentResults from './pages/AssessmentResults';
import VideoRecommendations from './pages/VideoRecommendations';
import LearningPath from './pages/LearningPath';
import Profile from './pages/Profile';

// Keypoint-Based Learning
import KeypointLearning from './pages/KeypointLearning';
import KeypointPlayer from './pages/KeypointPlayer';
// Quiz Pages
import TutorialQuiz from './pages/TutorialQuiz';
import MicrolearningPage from './pages/MicrolearningPage';
// import QuizResults from './pages/QuizResults';

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <Router>
          <div className="min-h-screen">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/home" element={<Home />} />

              {/* Authentication Routes (self-contained layouts) */}
              <Route path="/auth/login" element={<Login />} />
              <Route path="/auth/register" element={<Register />} />
              <Route path="/auth" element={<Navigate to="/auth/login" replace />} />

              {/* Protected App Routes - wrapped with Layout */}
              <Route path="/app" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="/app/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="topics" element={<TopicSelection />} />
                <Route path="assessment" element={<AssessmentSelection />} />
                <Route path="assessment/:topic" element={<AssessmentQuiz />} />
                <Route path="assessment-results/:topic/:sessionId" element={<AssessmentResults />} />
                <Route path="assessment-results/session/:sessionId" element={<AssessmentResults />} />
                <Route path="recommendations/:topic" element={<VideoRecommendations />} />
                <Route path="learning-path/:topic" element={<LearningPath />} />
                <Route path="keypoint-learning" element={<KeypointLearning />} />
                <Route path="keypoint-player/:videoId" element={<KeypointPlayer />} />
                <Route path="profile" element={<Profile />} />

                {/* Microlearning & Quiz Routes */}
                <Route path="microlearning/:videoId" element={<MicrolearningPage />} />
                <Route path="microlearning/:videoId/:topic" element={<MicrolearningPage />} />
                <Route path="quiz/start/:videoId" element={<TutorialQuiz />} />
                <Route path="quiz/session/:sessionId" element={<TutorialQuiz />} />
                {/* <Route path="quiz/results/:sessionId" element={<QuizResults />} /> */}
              </Route>

              {/* Backward compatibility routes */}
              <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
              <Route path="/topics" element={<Navigate to="/app/topics" replace />} />

              {/* Development: Public access to video creation */}
              <Route path="/keypoint-learning" element={<KeypointLearning />} />
              <Route path="/keypoint-player/:videoId" element={<KeypointPlayer />} />

              {/* Fallback Route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            {/* Global Toast Notifications - Notion Style */}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#1f2937',
                  color: '#fff',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  fontSize: '14px',
                  fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#10b981',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 5000,
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </div>
        </Router>
      </AppProvider>
    </AuthProvider>
  );
}

export default App;