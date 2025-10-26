import React, { useState } from 'react';
import { ChevronDown, Check, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * KeypointSelectionModal Component
 * Allows users to select and customize keypoints before generating learning content
 *
 * Props:
 *  - isOpen: boolean - Whether modal is visible
 *  - video: object - Video data with extracted keyTopics
 *  - onClose: function - Called when modal closes
 *  - onConfirm: function - Called with {keypoints, teacher, videoId, videoTitle}
 */
export default function KeypointSelectionModal({
  video,
  isOpen,
  onClose,
  onConfirm
}) {
  const [selectedKeypoints, setSelectedKeypoints] = useState(
    video?.keyTopics || []
  );
  const [customKeypoint, setCustomKeypoint] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('Ava');
  const [isLoading, setIsLoading] = useState(false);

  const teachers = ['Ava', 'Andrew', 'Emma', 'Brian', 'Jenny'];

  const toggleKeypoint = (keypoint) => {
    if (selectedKeypoints.includes(keypoint)) {
      setSelectedKeypoints(
        selectedKeypoints.filter(k => k !== keypoint)
      );
    } else if (selectedKeypoints.length < 4) {
      setSelectedKeypoints([...selectedKeypoints, keypoint]);
    } else {
      toast.error('Maximum 4 keypoints allowed');
    }
  };

  const addCustomKeypoint = () => {
    if (customKeypoint.trim().length < 5) {
      toast.error('Keypoint must be at least 5 characters');
      return;
    }
    if (selectedKeypoints.length >= 4) {
      toast.error('Maximum 4 keypoints allowed');
      return;
    }
    setSelectedKeypoints([...selectedKeypoints, customKeypoint]);
    setCustomKeypoint('');
    toast.success('Keypoint added!');
  };

  const handleConfirm = async () => {
    if (selectedKeypoints.length < 3) {
      toast.error('Select at least 3 keypoints');
      return;
    }

    setIsLoading(true);
    try {
      await onConfirm({
        keypoints: selectedKeypoints,
        teacher: selectedTeacher,
        videoId: video.videoId || video.id,  // Support both videoId and id properties
        videoTitle: video.title
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !video) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-[#212529] to-[#495057] text-white p-6 border-b">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">
                Generate Focused Learning Content
              </h2>
              <p className="text-gray-200 text-sm">
                {video?.title}
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">

          {/* Keypoints Selection */}
          <div>
            <h3 className="text-lg font-semibold text-[#37352F] mb-3">
              Select Learning Topics (3-4)
            </h3>
            <p className="text-sm text-[#6B6B6B] mb-4">
              Each selected topic will generate a comprehensive 1000+ word educational script with avatar video.
            </p>

            {/* Recommended Keypoints */}
            <div className="mb-4">
              <label className="text-sm font-semibold text-[#37352F] mb-3 block">
                Recommended Topics:
              </label>
              <div className="flex flex-wrap gap-2">
                {video?.keyTopics?.map((keypoint, idx) => (
                  <button
                    key={idx}
                    onClick={() => toggleKeypoint(keypoint)}
                    disabled={isLoading}
                    className={`px-4 py-2 rounded-lg border-2 transition-all font-medium text-sm ${
                      selectedKeypoints.includes(keypoint)
                        ? 'bg-blue-100 border-blue-500 text-blue-900'
                        : 'bg-white border-gray-200 text-[#37352F] hover:border-blue-300'
                    } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-center space-x-2">
                      {selectedKeypoints.includes(keypoint) && (
                        <Check className="h-4 w-4" />
                      )}
                      <span>{keypoint}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Keypoint Input */}
            <div className="mb-4">
              <label className="text-sm font-semibold text-[#37352F] mb-2 block">
                Add Custom Topic (Optional):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customKeypoint}
                  onChange={(e) => setCustomKeypoint(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCustomKeypoint()}
                  placeholder="Enter custom topic..."
                  disabled={isLoading}
                  className="flex-1 px-3 py-2 border border-[#E9E9E7] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <button
                  onClick={addCustomKeypoint}
                  disabled={isLoading}
                  className="px-4 py-2 bg-[#212529] text-white rounded-lg hover:bg-[#495057] transition-colors flex items-center space-x-2 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              </div>
            </div>

            {/* Selected Keypoints Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900 mb-2">
                Selected Topics ({selectedKeypoints.length}/4):
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedKeypoints.map((keypoint, idx) => (
                  <div
                    key={idx}
                    className="bg-blue-100 text-blue-900 px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-2"
                  >
                    <span>{keypoint}</span>
                    <button
                      onClick={() => toggleKeypoint(keypoint)}
                      disabled={isLoading}
                      className="hover:text-blue-700"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              {selectedKeypoints.length < 3 && (
                <p className="text-xs text-blue-700 mt-2">
                  ℹ️ Select at least 3 topics to proceed
                </p>
              )}
            </div>
          </div>

          {/* Teacher Selection */}
          <div>
            <h3 className="text-lg font-semibold text-[#37352F] mb-3">
              Select Teacher Voice
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {teachers.map((teacher) => (
                <button
                  key={teacher}
                  onClick={() => setSelectedTeacher(teacher)}
                  disabled={isLoading}
                  className={`py-3 px-4 rounded-lg font-medium transition-all ${
                    selectedTeacher === teacher
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-100 text-[#37352F] hover:bg-gray-200'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {teacher}
                </button>
              ))}
            </div>
          </div>

          {/* Estimated Duration */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-[#6B6B6B]">
              <strong>Estimated Duration:</strong> {selectedKeypoints.length * 7}-{selectedKeypoints.length * 10} minutes
            </p>
            <p className="text-xs text-[#6B6B6B] mt-2">
              {selectedKeypoints.length} topics × 1000+ words per topic = {(selectedKeypoints.length * 1500).toLocaleString()} words of content
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-[#E9E9E7] p-6 flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-3 border border-[#E9E9E7] text-[#37352F] rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || selectedKeypoints.length < 3}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-colors font-medium disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Generating...</span>
              </>
            ) : (
              <>
                <span>🚀 Generate Learning Content</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
