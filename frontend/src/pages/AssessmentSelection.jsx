import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../hooks/useAuth';
import { getTopicMeta } from '../utils/helpers';
import { ASSESSMENT_CONFIG } from '../constants';
import { 
  Clock as ClockIcon, 
  HelpCircle as QuestionMarkCircleIcon,
  Play as PlayIcon,
  CheckCircle as CheckCircleIcon,
  Target as TargetIcon,
  Sparkles as SparklesIcon,
  TrendingUp as TrendingUpIcon,
  ArrowRight as ArrowRightIcon
} from 'lucide-react';
import Loading from '../components/Loading';
import toast from 'react-hot-toast';

const AssessmentSelection = () => {
  const { user } = useAuth();
  const { 
    selectedTopics, 
    assessmentHistory,
    activeSessions,
    isLoading,
    fetchSelectedTopics,
    fetchAssessmentHistory,
    fetchActiveSessions
  } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSelectedTopics();
    fetchAssessmentHistory();
    fetchActiveSessions();
  }, []);

  const handleStartAssessment = (topicSlug) => {
    navigate(`/app/assessment/${topicSlug}/quiz`);
  };

  const hasActiveSession = (topicSlug) => {
    return activeSessions?.some(session => session.topic === topicSlug && session.status === 'active');
  };

  const getLastAssessmentResult = (topicSlug) => {
    return assessmentHistory?.find(assessment => assessment.topic === topicSlug);
  };

  if (isLoading) {
    return <Loading fullScreen text="Loading assessments..." />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-[#E9E9E7] p-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-[#2383E2]/10 rounded-full flex items-center justify-center">
              <TargetIcon className="h-8 w-8 text-[#2383E2]" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-[#37352F] mb-2">
            AI-Powered Skill Assessment
          </h1>
          <p className="text-lg text-[#6B6B6B] mb-6">
            Take personalized assessments that adapt to your skill level in real-time
          </p>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#37352F]">{selectedTopics?.length || 0}</div>
              <div className="text-sm text-[#6B6B6B]">Topics Selected</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#37352F]">{assessmentHistory?.length || 0}</div>
              <div className="text-sm text-[#6B6B6B]">Assessments Taken</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#37352F]">{activeSessions?.length || 0}</div>
              <div className="text-sm text-[#6B6B6B]">Active Sessions</div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Sessions */}
      {activeSessions?.length > 0 && (
        <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-6">
          <div className="flex items-start space-x-3">
            <ClockIcon className="h-6 w-6 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-[#37352F] mb-2">
                Resume Your Assessments
              </h3>
              <p className="text-[#6B6B6B] mb-4">
                You have {activeSessions.length} incomplete assessment{activeSessions.length > 1 ? 's' : ''}. Continue where you left off.
              </p>
              <div className="space-y-2">
                {activeSessions.map((session) => {
                  const meta = getTopicMeta(session.topic);
                  return (
                    <div key={session.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-yellow-200">
                      <div className="flex items-center space-x-3">
                        <div className="text-xl">{meta.icon}</div>
                        <div>
                          <p className="font-medium text-[#37352F]">{meta.name}</p>
                          <p className="text-sm text-[#6B6B6B]">
                            Question {session.currentQuestion || 1} of {session.totalQuestions || 10}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate(`/app/assessment/${session.topic}/quiz?session=${session.id}`)}
                        className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
                      >
                        Resume
                        <ArrowRightIcon className="ml-2 h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Available Assessments */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#37352F]">Available Assessments</h2>
          {selectedTopics?.length === 0 && (
            <Link
              to="/app/topics"
              className="text-sm text-[#2383E2] hover:text-[#0F62FE] font-medium"
            >
              Select Topics First →
            </Link>
          )}
        </div>

        {selectedTopics?.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-[#E9E9E7] p-8 text-center">
            <div className="w-16 h-16 bg-[#6B6B6B]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <SparklesIcon className="h-8 w-8 text-[#6B6B6B]" />
            </div>
            <h3 className="text-lg font-medium text-[#37352F] mb-2">
              Select Your Topics First
            </h3>
            <p className="text-[#6B6B6B] mb-6">
              Choose the programming topics you want to learn before taking assessments.
            </p>
            <Link
              to="/app/topics"
              className="inline-flex items-center px-6 py-3 bg-[#2383E2] text-white rounded-lg hover:bg-[#0F62FE] transition-colors"
            >
              Browse Topics
              <ArrowRightIcon className="ml-2 h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {selectedTopics.map((topic) => {
              const meta = getTopicMeta(topic.topic);
              const hasActive = hasActiveSession(topic.topic);
              const lastResult = getLastAssessmentResult(topic.topic);
              const hasAssessed = !!topic.knowledgeLevel;
              
              return (
                <div
                  key={topic.topic}
                  className="bg-white rounded-xl shadow-sm border border-[#E9E9E7] p-6 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-3">
                        <div className="text-2xl mr-3">{meta.icon}</div>
                        <div>
                          <h3 className="text-lg font-semibold text-[#37352F]">
                            {meta.name} Assessment
                          </h3>
                          <p className="text-sm text-[#6B6B6B]">
                            Adaptive assessment that adjusts to your skill level
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-6 text-sm text-[#6B6B6B] mb-4">
                        <div className="flex items-center">
                          <ClockIcon className="h-4 w-4 mr-1" />
                          10-15 minutes
                        </div>
                        <div className="flex items-center">
                          <QuestionMarkCircleIcon className="h-4 w-4 mr-1" />
                          5-20 questions (adaptive)
                        </div>
                        <div className="flex items-center">
                          <TrendingUpIcon className="h-4 w-4 mr-1" />
                          AI-powered
                        </div>
                      </div>
                      
                      {/* Status */}
                      <div className="flex items-center space-x-4 mb-4">
                        {hasAssessed && (
                          <div className="flex items-center space-x-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                              ✓ Assessed as {topic.knowledgeLevel}
                            </span>
                            <span className="text-sm text-[#6B6B6B]">
                              Score: {topic.assessmentScore}%
                            </span>
                          </div>
                        )}
                        
                        {hasActive && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                            ⏸ In Progress
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="ml-6 flex flex-col gap-2">
                      <button
                        onClick={() => handleStartAssessment(topic.topic)}
                        className="inline-flex items-center px-4 py-2 bg-[#2383E2] text-white rounded-lg hover:bg-[#0F62FE] transition-colors text-sm font-medium"
                      >
                        <PlayIcon className="h-4 w-4 mr-2" />
                        {hasAssessed ? 'Retake Assessment' : 'Start Assessment'}
                      </button>
                      
                      {hasAssessed && (
                        <Link
                          to={`/app/recommendations/${topic.topic}`}
                          className="inline-flex items-center px-4 py-2 bg-white border border-[#E9E9E7] text-[#37352F] rounded-lg hover:bg-[#F7F6F3] transition-colors text-sm font-medium text-center"
                        >
                          View Recommendations
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-gradient-to-br from-[#2383E2] to-[#0F62FE] rounded-xl p-8 text-white">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <SparklesIcon className="h-6 w-6" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold mb-4">How AI Assessment Works</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-blue-100">
              <div className="flex items-start space-x-3">
                <CheckCircleIcon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Adaptive Difficulty</p>
                  <p className="text-sm">Questions adjust based on your answers</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircleIcon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Real-time Analysis</p>
                  <p className="text-sm">AI analyzes your skill level instantly</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircleIcon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Personalized Results</p>
                  <p className="text-sm">Get curated content for your level</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircleIcon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Progress Tracking</p>
                  <p className="text-sm">Monitor improvement over time</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssessmentSelection;