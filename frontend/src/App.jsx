// src/App.jsx - Phase 1 & 2: Landing Page & User Registration Flow
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Context Providers
import { AuthProvider } from './context/AuthContext';

// Auth Pages (self-contained layouts)
import Login from './pages/Login';
import Register from './pages/Register';

// Phase 1: Landing Page
import LandingPage from './pages/LandingPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen">
          <Routes>
            {/* Phase 1: Public Landing Page */}
            <Route path="/" element={<LandingPage />} />
            
            {/* Authentication Routes (self-contained layouts) */}
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/register" element={<Register />} />
            <Route path="/auth" element={<Navigate to="/auth/login" replace />} />

            {/* Temporary Dashboard Redirect (for Phase 2 testing) */}
            <Route path="/dashboard" element={
              <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center bg-white p-12 rounded-lg border border-gray-200 shadow-sm">
                  <h1 className="text-3xl font-bold text-gray-900 mb-4">🎉 Welcome to MicroLearn!</h1>
                  <p className="text-gray-600 mb-6">Phase 2 Complete - Registration successful!</p>
                  <p className="text-sm text-gray-500 mb-6">Dashboard coming in Phase 3...</p>
                  <button 
                    onClick={() => window.location.href = '/'} 
                    className="px-6 py-3 bg-gray-900 text-white font-medium rounded-md hover:bg-gray-800 transition-colors duration-200"
                  >
                    Back to Landing Page
                  </button>
                </div>
              </div>
            } />

            {/* Fallback Route - Redirect to Landing Page */}
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
    </AuthProvider>
  );
}

export default App;