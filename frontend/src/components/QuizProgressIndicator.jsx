import React, { useState, useEffect } from 'react';
import {
  CheckCircle as CheckCircleIcon,
  Circle as CircleIcon,
  Target as TargetIcon,
  Clock as ClockIcon
} from 'lucide-react';
import { quizProgressionAPI } from '../services/api';

const QuizProgressIndicator = ({
  video,
  className = '',
  showDetails = false
}) => {
  const [progression, setProgression] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgression();
  }, [video?.id]);

  const loadProgression = async () => {
    if (!video?.id) return;

    try {
      setLoading(true);
      const progressionData = quizProgressionAPI.getQuizProgression(video.id);
      setProgression(progressionData);
    } catch (error) {
      console.error('Error loading quiz progression:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !progression || !progression.quizSchedule?.length) {
    return null;
  }

  const totalQuizzes = progression.quizSchedule.length;
  const completedIntermediates = progression.completedIntermediateQuizzes.length;
  const finalCompleted = progression.finalQuizCompleted ? 1 : 0;
  const totalCompleted = completedIntermediates + finalCompleted;
  const progressPercentage = (totalCompleted / totalQuizzes) * 100;

  const getMasteryColor = (masteryLevel) => {
    switch (masteryLevel) {
      case 'mastered':
        return 'text-green-600';
      case 'developing':
        return 'text-yellow-600';
      case 'needs-review':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getMasteryIcon = (masteryLevel) => {
    switch (masteryLevel) {
      case 'mastered':
        return '🏆';
      case 'developing':
        return '📚';
      case 'needs-review':
        return '📖';
      default:
        return '🎯';
    }
  };

  return (
    <div className={`${className}`}>
      {/* Compact Progress Indicator */}
      <div className="flex items-center space-x-2">
        <TargetIcon className="h-4 w-4 text-[#6B6B6B]" />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-[#37352F]">
              Quiz Progress
            </span>
            <span className="text-xs text-[#6B6B6B]">
              {totalCompleted}/{totalQuizzes}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${
                progressPercentage === 100 ? 'bg-green-500' : 'bg-[#2383E2]'
              }`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Detailed Progress (if enabled) */}
      {showDetails && (
        <div className="mt-3 space-y-2">
          {/* Quiz Schedule */}
          <div className="space-y-1">
            {progression.quizSchedule.map((quiz, index) => {
              const isCompleted = quiz.sessionType === 'intermediate'
                ? progression.completedIntermediateQuizzes.some(q => q.sessionNumber === quiz.sessionNumber)
                : progression.finalQuizCompleted;

              const isAvailable = !isCompleted && (
                quiz.sessionType === 'intermediate'
                  ? quiz.sessionNumber === progression.currentQuizNumber
                  : progression.readyForFinal
              );

              return (
                <div key={index} className="flex items-center space-x-2 text-xs">
                  {isCompleted ? (
                    <CheckCircleIcon className="h-3 w-3 text-green-600" />
                  ) : isAvailable ? (
                    <CircleIcon className="h-3 w-3 text-[#2383E2]" />
                  ) : (
                    <CircleIcon className="h-3 w-3 text-gray-300" />
                  )}
                  <span className={`flex-1 ${
                    isCompleted ? 'text-green-700 line-through' :
                    isAvailable ? 'text-[#2383E2] font-medium' :
                    'text-gray-500'
                  }`}>
                    {quiz.description}
                  </span>
                  {isAvailable && (
                    <ClockIcon className="h-3 w-3 text-[#2383E2]" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Final Quiz Result */}
          {progression.finalQuizCompleted && progression.finalQuizResult && (
            <div className="pt-2 border-t border-[#E9E9E7]">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-medium text-[#37352F]">
                  Final Result:
                </span>
                <span className="text-xs">
                  {getMasteryIcon(progression.finalQuizResult.masteryScore.masteryLevel)}
                </span>
                <span className={`text-xs font-medium capitalize ${
                  getMasteryColor(progression.finalQuizResult.masteryScore.masteryLevel)
                }`}>
                  {progression.finalQuizResult.masteryScore.masteryLevel.replace('-', ' ')}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QuizProgressIndicator;