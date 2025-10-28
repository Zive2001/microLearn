import { useState, useEffect, useCallback } from 'react';
import { QUIZ_STATES } from '../components/QuizComponent';

export const useQuiz = ({
  questions = [],
  onQuizComplete,
  onError,
  autoAdvance = false,
  timeLimit = null
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [quizState, setQuizState] = useState(QUIZ_STATES.READY);
  const [userAnswers, setUserAnswers] = useState([]);
  const [quizStats, setQuizStats] = useState({
    correct: 0,
    incorrect: 0,
    totalTime: 0,
    averageTimePerQuestion: 0
  });

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex >= questions.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;

  // Reset quiz state when questions change
  useEffect(() => {
    if (questions.length > 0) {
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setShowResult(false);
      setQuizState(QUIZ_STATES.READY);
      setUserAnswers([]);
      setQuizStats({
        correct: 0,
        incorrect: 0,
        totalTime: 0,
        averageTimePerQuestion: 0
      });
    }
  }, [questions]);

  const handleAnswerSelect = useCallback((answer) => {
    if (quizState !== QUIZ_STATES.READY) return;
    
    setSelectedAnswer(answer);
    setShowResult(false);
  }, [quizState]);

  const handleAnswerSubmit = useCallback((answer, isTimeUp = false, timeSpent = 0) => {
    if (!answer && !isTimeUp) {
      console.warn('No answer selected');
      return;
    }

    setQuizState(QUIZ_STATES.SUBMITTING);

    // Record the answer
    const answerData = {
      questionIndex: currentQuestionIndex,
      question: currentQuestion?.question,
      selectedAnswer: answer,
      correctAnswer: currentQuestion?.correctAnswer,
      isCorrect: answer === currentQuestion?.correctAnswer,
      timeSpent: timeSpent,
      timestamp: new Date().toISOString(),
      isTimeUp: isTimeUp
    };

    setUserAnswers(prev => [...prev, answerData]);

    // Update stats
    setQuizStats(prev => {
      const newCorrect = answer === currentQuestion?.correctAnswer ? prev.correct + 1 : prev.correct;
      const newIncorrect = answer !== currentQuestion?.correctAnswer ? prev.incorrect + 1 : prev.incorrect;
      const newTotalTime = prev.totalTime + timeSpent;
      const newAverageTime = newTotalTime / (newCorrect + newIncorrect);

      return {
        correct: newCorrect,
        incorrect: newIncorrect,
        totalTime: newTotalTime,
        averageTimePerQuestion: newAverageTime
      };
    });

    // Show result
    setShowResult(true);
    setQuizState(QUIZ_STATES.SHOWING_RESULT);

    // Auto advance if enabled
    if (autoAdvance && !isLastQuestion) {
      setTimeout(() => {
        handleNext();
      }, 2000); // 2 second delay to show result
    }
  }, [currentQuestionIndex, currentQuestion, isLastQuestion, autoAdvance]);

  const handleNext = useCallback(() => {
    if (isLastQuestion) {
      // Quiz completed
      setQuizState(QUIZ_STATES.COMPLETED);
      if (onQuizComplete) {
        onQuizComplete({
          userAnswers,
          stats: quizStats,
          totalQuestions: questions.length,
          completionRate: (quizStats.correct / questions.length) * 100
        });
      }
    } else {
      // Move to next question
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setQuizState(QUIZ_STATES.READY);
    }
  }, [isLastQuestion, userAnswers, quizStats, questions.length, onQuizComplete]);

  const handlePrevious = useCallback(() => {
    if (!isFirstQuestion) {
      setCurrentQuestionIndex(prev => prev - 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setQuizState(QUIZ_STATES.READY);
    }
  }, [isFirstQuestion]);

  const handleQuestionChange = useCallback((newIndex) => {
    if (newIndex >= 0 && newIndex < questions.length) {
      setCurrentQuestionIndex(newIndex);
      setSelectedAnswer(null);
      setShowResult(false);
      setQuizState(QUIZ_STATES.READY);
    }
  }, [questions.length]);

  const resetQuiz = useCallback(() => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setQuizState(QUIZ_STATES.READY);
    setUserAnswers([]);
    setQuizStats({
      correct: 0,
      incorrect: 0,
      totalTime: 0,
      averageTimePerQuestion: 0
    });
  }, []);

  const getProgress = useCallback(() => {
    return {
      current: currentQuestionIndex + 1,
      total: questions.length,
      percentage: questions.length > 0 ? Math.round(((currentQuestionIndex + 1) / questions.length) * 100) : 0
    };
  }, [currentQuestionIndex, questions.length]);

  const getAccuracy = useCallback(() => {
    const totalAnswered = quizStats.correct + quizStats.incorrect;
    return totalAnswered > 0 ? Math.round((quizStats.correct / totalAnswered) * 100) : 0;
  }, [quizStats]);

  return {
    // State
    currentQuestionIndex,
    selectedAnswer,
    showResult,
    quizState,
    userAnswers,
    quizStats,
    currentQuestion,
    isLastQuestion,
    isFirstQuestion,

    // Actions
    handleAnswerSelect,
    handleAnswerSubmit,
    handleNext,
    handlePrevious,
    handleQuestionChange,
    resetQuiz,

    // Computed values
    progress: getProgress(),
    accuracy: getAccuracy(),

    // State setters (for external control)
    setQuizState,
    setCurrentQuestionIndex,
    setSelectedAnswer,
    setShowResult
  };
};

export default useQuiz;
