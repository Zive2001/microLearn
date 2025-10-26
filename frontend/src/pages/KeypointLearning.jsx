// src/pages/KeypointLearning.jsx
// Keypoint-Based Learning System
// Users specify what they want to learn from YouTube videos

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function KeypointLearning() {
  const navigate = useNavigate();

  // Form state
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [keypoints, setKeypoints] = useState(['', '', '']);
  const [teacher, setTeacher] = useState('Ava');

  // Process state
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(null);
  const [generatedVideoId, setGeneratedVideoId] = useState(null);
  const [generationResults, setGenerationResults] = useState(null);

  // Add new keypoint input
  const addKeypoint = () => {
    if (keypoints.length < 12) {
      setKeypoints([...keypoints, '']);
    } else {
      toast.error('Maximum 12 keypoints allowed');
    }
  };

  // Remove keypoint input
  const removeKeypoint = (index) => {
    if (keypoints.length > 3) {
      setKeypoints(keypoints.filter((_, i) => i !== index));
    } else {
      toast.error('Minimum 3 keypoints required');
    }
  };

  // Update keypoint value
  const updateKeypoint = (index, value) => {
    const newKeypoints = [...keypoints];
    newKeypoints[index] = value;
    setKeypoints(newKeypoints);
  };

  // Validate inputs
  const validateInputs = () => {
    // Validate YouTube URL
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]{11}/;
    if (!youtubeRegex.test(youtubeUrl)) {
      toast.error('Please enter a valid YouTube URL');
      return false;
    }

    // Validate keypoints
    const validKeypoints = keypoints.filter(kp => kp.trim().length >= 5);
    if (validKeypoints.length < 3) {
      toast.error('Please enter at least 3 keypoints (5+ characters each)');
      return false;
    }

    if (validKeypoints.length > 12) {
      toast.error('Maximum 12 keypoints allowed');
      return false;
    }

    return true;
  };

  // Generate educational content
  const handleGenerate = async () => {
    if (!validateInputs()) return;

    const token = localStorage.getItem('authToken');
    if (!token) {
      toast.error('Please login to continue');
      navigate('/auth/login');
      return;
    }

    setIsGenerating(true);
    setProgress('Extracting video context...');
    setGenerationResults(null);

    try {
      const validKeypoints = keypoints.filter(kp => kp.trim().length >= 5);

      const response = await axios.post(
        `${API_URL}/keypoint-generation/generate`,
        {
          youtubeUrl,
          keypoints: validKeypoints,
          options: {
            teacher,
            generateAvatarVideos: true,
            saveToDatabase: true
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        setProgress('Generation complete!');
        setGenerationResults(response.data.data);
        setGeneratedVideoId(response.data.data.database?.videoId);

        toast.success(`Generated ${response.data.data.metadata.totalSegments} educational segments!`);

        // Auto-redirect to player after 2 seconds
        setTimeout(() => {
          if (response.data.data.database?.videoId) {
            navigate(`/app/keypoint-player/${response.data.data.database.videoId}`);
          }
        }, 2000);
      }

    } catch (error) {
      console.error('Generation error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to generate content';
      toast.error(errorMessage);
      setProgress(null);
    } finally {
      setIsGenerating(false);
    }
  };

  // Example keypoints
  const exampleSets = {
    javascript: [
      'JavaScript variable declaration with let, const, and var - differences explained',
      'Understanding JavaScript data types including primitives and objects',
      'Variable scope concepts - global, function, and block scope',
      'Hoisting behavior in JavaScript and how it affects variable declarations',
      'Best practices for naming variables and choosing between let, const, and var'
    ],
    react: [
      'Understanding useState hook for state management in functional components',
      'useEffect hook for handling side effects and lifecycle methods',
      'useContext hook for consuming context API efficiently',
      'Custom hooks - creating reusable stateful logic'
    ],
    nodejs: [
      'Node.js introduction and setting up development environment',
      'Understanding Node.js event loop and asynchronous programming',
      'Creating RESTful APIs with Express.js framework'
    ]
  };

  const loadExample = (example) => {
    setKeypoints([...exampleSets[example], ...Array(Math.max(0, 3 - exampleSets[example].length)).fill('')]);
    toast.success(`Loaded ${example} example keypoints`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🎯 Keypoint-Based Learning
          </h1>
          <p className="text-gray-600">
            Learn exactly what you need from YouTube videos - no time wasted!
          </p>
          <div className="mt-4 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <p className="text-sm text-blue-800">
              <strong>How it works:</strong> Enter a YouTube URL and specify 3-12 keypoints you want to learn.
              Our AI will generate focused 1000+ word educational scripts with avatar videos for each keypoint.
            </p>
          </div>
        </div>

        {/* Main Form */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          {/* YouTube URL Input */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              YouTube Video URL *
            </label>
            <input
              type="text"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isGenerating}
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter any YouTube video URL from which you want to learn specific topics
            </p>
          </div>

          {/* Quick Examples */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Quick Examples
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => loadExample('javascript')}
                disabled={isGenerating}
                className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition-colors text-sm font-medium disabled:opacity-50"
              >
                JavaScript Variables (5 keypoints)
              </button>
              <button
                onClick={() => loadExample('react')}
                disabled={isGenerating}
                className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium disabled:opacity-50"
              >
                React Hooks (4 keypoints)
              </button>
              <button
                onClick={() => loadExample('nodejs')}
                disabled={isGenerating}
                className="px-4 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium disabled:opacity-50"
              >
                Node.js Basics (3 keypoints)
              </button>
            </div>
          </div>

          {/* Keypoints Input */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              What do you want to learn? (3-12 keypoints) *
            </label>
            <div className="space-y-3">
              {keypoints.map((keypoint, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-600 w-6">
                    {index + 1}.
                  </span>
                  <input
                    type="text"
                    value={keypoint}
                    onChange={(e) => updateKeypoint(index, e.target.value)}
                    placeholder={`Keypoint ${index + 1}: Be specific about what you want to learn...`}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    disabled={isGenerating}
                  />
                  {keypoints.length > 3 && (
                    <button
                      onClick={() => removeKeypoint(index)}
                      disabled={isGenerating}
                      className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors text-sm disabled:opacity-50"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            {keypoints.length < 12 && (
              <button
                onClick={addKeypoint}
                disabled={isGenerating}
                className="mt-3 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium disabled:opacity-50"
              >
                + Add Another Keypoint
              </button>
            )}

            <p className="text-xs text-gray-500 mt-2">
              Each keypoint will generate a comprehensive 1000+ word educational script (6-10 min speaking time)
            </p>
          </div>

          {/* Teacher Selection */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select Teacher Voice
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {['Ava', 'Andrew', 'Emma', 'Brian', 'Jenny'].map((voice) => (
                <button
                  key={voice}
                  onClick={() => setTeacher(voice)}
                  disabled={isGenerating}
                  className={`px-4 py-3 rounded-lg font-medium transition-all ${
                    teacher === voice
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } disabled:opacity-50`}
                >
                  {voice}
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${
              isGenerating
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl'
            }`}
          >
            {isGenerating ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating Educational Content...
              </span>
            ) : (
              '🚀 Generate Focused Learning Content'
            )}
          </button>
        </div>

        {/* Progress Display */}
        {progress && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-center gap-3">
              <svg className="animate-spin h-6 w-6 text-blue-600" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <div>
                <p className="font-semibold text-gray-900">{progress}</p>
                <p className="text-sm text-gray-600">This may take 1-3 minutes depending on keypoint count...</p>
              </div>
            </div>
          </div>
        )}

        {/* Generation Results */}
        {generationResults && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-green-600 mb-4">
              ✅ Generation Complete!
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Segments</p>
                <p className="text-3xl font-bold text-blue-600">
                  {generationResults.metadata.totalSegments}
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Words</p>
                <p className="text-3xl font-bold text-green-600">
                  {generationResults.metadata.totalWords.toLocaleString()}
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Estimated Duration</p>
                <p className="text-3xl font-bold text-purple-600">
                  {Math.round(generationResults.metadata.estimatedTotalDuration / 60)} min
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {generationResults.scripts.map((script, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {index + 1}. {script.keypoint}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>📝 {script.wordCount} words</span>
                        <span>⏱️ {Math.round(script.estimatedDuration / 60)} min</span>
                        {script.meetsWordCount && <span className="text-green-600">✓ Quality</span>}
                        {script.noTimeWaste && <span className="text-blue-600">✓ No Fluff</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {generatedVideoId && (
              <button
                onClick={() => navigate(`/app/keypoint-player/${generatedVideoId}`)}
                className="w-full py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg font-bold hover:from-green-700 hover:to-teal-700 transition-all shadow-lg"
              >
                ▶️ Start Learning Now
              </button>
            )}
          </div>
        )}

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-3xl mb-2">⚡</div>
            <h3 className="font-semibold text-gray-900 mb-1">Time-Efficient</h3>
            <p className="text-sm text-gray-600">
              Learn only what you need - no watching full YouTube videos
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-3xl mb-2">📚</div>
            <h3 className="font-semibold text-gray-900 mb-1">Comprehensive</h3>
            <p className="text-sm text-gray-600">
              1000+ words per keypoint ensures thorough understanding
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-3xl mb-2">🎭</div>
            <h3 className="font-semibold text-gray-900 mb-1">Engaging</h3>
            <p className="text-sm text-gray-600">
              AI avatar with perfect lip-sync makes learning interactive
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
