import React, { useState, useEffect } from 'react';
import {
  Play as PlayIcon,
  Clock as ClockIcon,
  BookOpen as BookOpenIcon,
  Brain as BrainIcon,
  Target as TargetIcon,
  ChevronDown as ChevronDownIcon,
  ChevronUp as ChevronUpIcon,
  Loader2 as LoaderIcon,
  CheckCircle as CheckCircleIcon,
  AlertCircle as AlertCircleIcon
} from 'lucide-react';
import { mockMicrolearningAPI } from '../services/api';
import toast from 'react-hot-toast';

const MicrolearningPreview = ({
  video,
  onContentReady,
  className = '',
  showFullPreview = true
}) => {
  const [content, setContent] = useState(null);
  const [status, setStatus] = useState('checking'); // checking, not_started, generating, completed, error
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkMicrolearningStatus();
  }, [video?.id]);

  const checkMicrolearningStatus = async () => {
    if (!video?.id) return;

    try {
      setStatus('checking');

      // Check if content already exists
      const existingContent = await mockMicrolearningAPI.getMicrolearningContent(video.id);

      if (existingContent) {
        setContent(existingContent);
        setStatus('completed');

        // Notify parent that content is ready
        if (onContentReady) {
          onContentReady(existingContent);
        }
      } else {
        setStatus('not_started');
      }
    } catch (error) {
      console.error('Error checking microlearning status:', error);
      setStatus('error');
    }
  };

  const generateMicrolearningContent = async () => {
    setLoading(true);
    setStatus('generating');

    try {
      toast('Generating microlearning content...', {
        icon: '🎬',
        duration: 2000
      });

      // Generate mock content
      const generatedContent = await mockMicrolearningAPI.generateMicrolearningContent(
        video.id,
        video.title || 'Programming Tutorial'
      );

      // Store the content
      await mockMicrolearningAPI.storeMicrolearningContent(video.id, generatedContent);

      setContent(generatedContent);
      setStatus('completed');

      toast.success('Microlearning content generated successfully! 🎉');

      // Notify parent that content is ready
      if (onContentReady) {
        onContentReady(generatedContent);
      }

    } catch (error) {
      console.error('Error generating microlearning content:', error);
      setStatus('error');
      toast.error(`Failed to generate content: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'beginner':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'advanced':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCognitiveLoadColor = (load) => {
    if (load <= 3) return 'text-green-600';
    if (load <= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const renderMicroVideo = (microVideo, index) => (
    <div
      key={microVideo.id}
      className="bg-[#F7F6F3] rounded-lg p-4 border border-[#E9E9E7]"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-[#2383E2] text-white rounded-full flex items-center justify-center text-xs font-medium">
            {microVideo.sequence}
          </div>
          <h4 className="text-sm font-semibold text-[#37352F]">
            {microVideo.title}
          </h4>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getDifficultyColor(microVideo.difficulty)}`}>
            {microVideo.difficulty}
          </span>
        </div>
      </div>

      <p className="text-xs text-[#6B6B6B] mb-3 line-clamp-2">
        {microVideo.summary}
      </p>

      <div className="flex items-center justify-between text-xs text-[#6B6B6B]">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <ClockIcon className="h-3 w-3 mr-1" />
            {microVideo.duration}
          </div>
          <div className="flex items-center">
            <BrainIcon className="h-3 w-3 mr-1" />
            <span className={getCognitiveLoadColor(microVideo.cognitiveLoad)}>
              Load: {microVideo.cognitiveLoad}/10
            </span>
          </div>
        </div>
      </div>

      {/* Key Points */}
      {microVideo.keyPoints && microVideo.keyPoints.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[#E9E9E7]">
          <p className="text-xs font-medium text-[#37352F] mb-1">Key Points:</p>
          <div className="flex flex-wrap gap-1">
            {microVideo.keyPoints.slice(0, 3).map((point, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-white text-[#6B6B6B]"
              >
                {point}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  if (status === 'checking') {
    return (
      <div className={`bg-white rounded-lg border border-[#E9E9E7] p-4 ${className}`}>
        <div className="flex items-center justify-center py-4">
          <LoaderIcon className="h-5 w-5 animate-spin text-[#6B6B6B] mr-2" />
          <span className="text-sm text-[#6B6B6B]">Checking microlearning status...</span>
        </div>
      </div>
    );
  }

  if (status === 'not_started') {
    return (
      <div className={`bg-white rounded-lg border border-[#E9E9E7] p-4 ${className}`}>
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-[#2383E2]/10 rounded-lg flex items-center justify-center">
              <PlayIcon className="h-5 w-5 text-[#2383E2]" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-[#37352F] mb-1">
              Generate Microlearning Content
            </h3>
            <p className="text-xs text-[#6B6B6B] mb-3">
              Transform this video into bite-sized learning segments optimized for retention and understanding.
            </p>
            <button
              onClick={generateMicrolearningContent}
              disabled={loading}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-[#2383E2] text-white hover:bg-[#0F62FE] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <LoaderIcon className="h-3 w-3 animate-spin mr-1.5" />
                  Generating...
                </>
              ) : (
                <>
                  <PlayIcon className="h-3 w-3 mr-1.5" />
                  Generate Content
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'generating') {
    return (
      <div className={`bg-white rounded-lg border border-[#E9E9E7] p-4 ${className}`}>
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <LoaderIcon className="h-5 w-5 text-orange-600 animate-spin" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-[#37352F] mb-1">
              Generating Microlearning Content...
            </h3>
            <p className="text-xs text-[#6B6B6B] mb-2">
              AI is analyzing the video content and creating optimized learning segments.
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-[#2383E2] h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className={`bg-white rounded-lg border border-red-200 p-4 ${className}`}>
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircleIcon className="h-5 w-5 text-red-600" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-red-800 mb-1">
              Generation Failed
            </h3>
            <p className="text-xs text-red-600 mb-3">
              Failed to generate microlearning content. Please try again.
            </p>
            <button
              onClick={generateMicrolearningContent}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
            >
              <PlayIcon className="h-3 w-3 mr-1.5" />
              Retry Generation
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'completed' && content) {
    return (
      <div className={`bg-white rounded-lg border border-[#E9E9E7] ${className}`}>
        {/* Header */}
        <div className="p-4 border-b border-[#E9E9E7]">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-[#37352F] mb-1">
                  Microlearning Content Ready
                </h3>
                <p className="text-xs text-[#6B6B6B]">
                  {content.microVideos.length} learning segments • {content.analytics.totalDuration} total
                </p>
              </div>
            </div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 hover:bg-[#F7F6F3] rounded transition-colors"
            >
              {expanded ? (
                <ChevronUpIcon className="h-4 w-4 text-[#6B6B6B]" />
              ) : (
                <ChevronDownIcon className="h-4 w-4 text-[#6B6B6B]" />
              )}
            </button>
          </div>

          {/* Quick Stats */}
          <div className="mt-3 flex items-center space-x-4 text-xs text-[#6B6B6B]">
            <div className="flex items-center">
              <ClockIcon className="h-3 w-3 mr-1" />
              {content.analytics.estimatedLearningTime}
            </div>
            <div className="flex items-center">
              <BrainIcon className="h-3 w-3 mr-1" />
              Avg Load: {content.analytics.averageCognitiveLoad}/10
            </div>
            <div className="flex items-center">
              <TargetIcon className="h-3 w-3 mr-1" />
              {content.metadata.targetAudience}
            </div>
          </div>
        </div>

        {/* Expandable Content */}
        {expanded && (
          <div className="p-4">
            <div className="space-y-3">
              {content.microVideos.map((microVideo, index) =>
                renderMicroVideo(microVideo, index)
              )}
            </div>

            {showFullPreview && (
              <div className="mt-4 pt-4 border-t border-[#E9E9E7]">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="font-medium text-[#37352F] mb-1">Difficulty Progression:</p>
                    <div className="flex space-x-1">
                      {content.analytics.difficultyProgression.map((diff, idx) => (
                        <span
                          key={idx}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getDifficultyColor(diff)}`}
                        >
                          {diff}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-[#37352F] mb-1">Generated:</p>
                    <p className="text-[#6B6B6B]">
                      {new Date(content.generatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default MicrolearningPreview;