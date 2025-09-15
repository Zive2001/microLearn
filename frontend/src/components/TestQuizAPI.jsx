// Temporary component to test Quiz API integration
// This will be removed after testing
import React, { useState } from 'react';
import { quizAPI } from '../services/api';
import toast from 'react-hot-toast';

const TestQuizAPI = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState('');

  // Test with a mock video ID (you can change this to a real one from your backend)
  const TEST_VIDEO_ID = '507f1f77bcf86cd799439011'; // Mock ObjectId

  const testQuizAPI = async () => {
    setLoading(true);
    setResults('');

    try {
      console.log('🧪 Testing Quiz API...');

      // Test 1: Try to get recent quiz sessions
      console.log('📝 Test 1: Getting recent quiz sessions...');
      const recentSessions = await quizAPI.getRecentQuizSessions(5);
      console.log('✅ Recent sessions:', recentSessions);

      setResults(prev => prev + '✅ Test 1 PASSED: Got recent quiz sessions\n');
      setResults(prev => prev + `📊 Found ${recentSessions.totalSessions || 0} sessions\n\n`);

      // Test 2: Try to get quiz sessions for a video
      console.log('📝 Test 2: Getting quiz sessions for video...');
      const videoSessions = await quizAPI.getVideoQuizSessions(TEST_VIDEO_ID);
      console.log('✅ Video sessions:', videoSessions);

      setResults(prev => prev + '✅ Test 2 PASSED: Got video quiz sessions\n');
      setResults(prev => prev + `📊 Found ${videoSessions.totalSessions || 0} sessions for video\n\n`);

      // Test 3: Check for active sessions
      console.log('📝 Test 3: Checking for active sessions...');
      const activeSession = await quizAPI.hasActiveSession(TEST_VIDEO_ID);
      console.log('✅ Active session check:', activeSession);

      setResults(prev => prev + '✅ Test 3 PASSED: Checked active sessions\n');
      setResults(prev => prev + `📊 Active session: ${activeSession ? 'Yes' : 'No'}\n\n`);

      toast.success('All Quiz API tests passed! 🎉');

    } catch (error) {
      console.error('❌ Quiz API test failed:', error);
      setResults(prev => prev + `❌ TEST FAILED: ${error.message}\n`);
      toast.error(`Test failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testStartQuiz = async () => {
    setLoading(true);

    try {
      console.log('🧪 Testing Quiz Start...');

      // Test starting a quiz session
      const session = await quizAPI.startQuizSession(TEST_VIDEO_ID, 'intermediate');
      console.log('✅ Started quiz session:', session);

      setResults(prev => prev + '✅ QUIZ START TEST PASSED!\n');
      setResults(prev => prev + `📊 Session ID: ${session.sessionId}\n`);
      setResults(prev => prev + `📊 Total Questions: ${session.totalQuestions}\n\n`);

      toast.success('Quiz start test passed! 🎯');

    } catch (error) {
      console.error('❌ Quiz start test failed:', error);
      setResults(prev => prev + `❌ QUIZ START FAILED: ${error.message}\n`);

      // This is expected if video doesn't exist or no micro-videos
      if (error.message.includes('not ready for quizzing')) {
        setResults(prev => prev + '💡 This is expected - video needs microlearning content first\n\n');
        toast.error('Expected error: Video not ready for quizzing (needs microlearning content)');
      } else {
        toast.error(`Quiz start failed: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#E9E9E7] p-6 m-4">
      <h2 className="text-xl font-bold text-[#37352F] mb-4">🧪 Quiz API Test Component</h2>
      <p className="text-sm text-[#6B6B6B] mb-4">
        This is a temporary component to test our Quiz API integration.
      </p>

      <div className="space-y-3 mb-6">
        <button
          onClick={testQuizAPI}
          disabled={loading}
          className="px-4 py-2 bg-[#2383E2] text-white rounded-lg hover:bg-[#0F62FE] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Testing...' : 'Test Basic Quiz API'}
        </button>

        <button
          onClick={testStartQuiz}
          disabled={loading}
          className="px-4 py-2 bg-[#059669] text-white rounded-lg hover:bg-[#047857] disabled:opacity-50 disabled:cursor-not-allowed transition-colors ml-3"
        >
          {loading ? 'Testing...' : 'Test Quiz Start'}
        </button>
      </div>

      {results && (
        <div className="bg-[#F7F6F3] rounded-lg p-4">
          <h3 className="text-sm font-medium text-[#37352F] mb-2">Test Results:</h3>
          <pre className="text-xs text-[#6B6B6B] whitespace-pre-wrap font-mono">
            {results}
          </pre>
        </div>
      )}
    </div>
  );
};

export default TestQuizAPI;