// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Context Providers
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';

// Layout Components
import Layout from './components/Layout';
import AuthLayout from './components/AuthLayout';

// Auth Pages
import Login from './pages/Login';
import Register from './pages/Register';

// Main App Pages
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import TopicSelection from './pages/TopicSelection';
import AssessmentSelection from './pages/AssessmentSelection';
import AssessmentQuiz from './pages/AssessmentQuiz';
import AssessmentResults from './pages/AssessmentResults';
import VideoRecommendations from './pages/VideoRecommendations';
import LearningPath from './pages/LearningPath';
import Profile from './pages/Profile';

// Protected Route Component
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              
              {/* Auth Routes */}
              <Route path="/auth" element={<AuthLayout />}>
                <Route path="login" element={<Login />} />
                <Route path="register" element={<Register />} />
                <Route index element={<Navigate to="/auth/login" replace />} />
              </Route>

              {/* Protected App Routes */}
              <Route path="/app" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                {/* Dashboard */}
                <Route index element={<Navigate to="/app/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                
                {/* Topic Selection */}
                <Route path="topics" element={<TopicSelection />} />
                
                {/* Assessment Flow */}
                <Route path="assessment">
                  <Route index element={<AssessmentSelection />} />
                  <Route path=":topic" element={<AssessmentQuiz />} />
                  <Route path=":topic/results" element={<AssessmentResults />} />
                </Route>
                
                {/* Video Recommendations */}
                <Route path="recommendations">
                  <Route index element={<VideoRecommendations />} />
                  <Route path=":topic" element={<VideoRecommendations />} />
                  <Route path="learning-path/:topic" element={<LearningPath />} />
                </Route>
                
                {/* User Profile */}
                <Route path="profile" element={<Profile />} />
              </Route>

              {/* Fallback Route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            {/* Global Toast Notifications */}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  duration: 3000,
                  theme: {
                    primary: 'green',
                    secondary: 'black',
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