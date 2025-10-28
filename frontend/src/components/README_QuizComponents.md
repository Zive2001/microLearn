# Quiz Components Documentation

This document explains how to use the modular quiz components in the MicroLearn application.

## Overview

The quiz system has been refactored into reusable components that can be easily integrated into different parts of the application:

- **`QuizComponent`** - Base quiz component with full functionality
- **`MicrolearningQuiz`** - Specialized component for microlearning context
- **`useQuiz`** - Custom hook for quiz state management

## Components

### 1. QuizComponent

The base quiz component that provides all quiz functionality.

#### Props

```javascript
<QuizComponent
  // Required
  questions={questions}
  
  // Optional
  currentQuestionIndex={0}
  onQuestionChange={(index) => {}}
  quizState={QUIZ_STATES.READY}
  selectedAnswer={null}
  onAnswerSelect={(answer) => {}}
  onAnswerSubmit={(answer, isTimeUp, timeSpent) => {}}
  showResult={false}
  
  // Configuration
  quizType="intermediate" // 'intermediate' or 'final'
  allowNavigation={true}
  showProgress={true}
  showTimer={false}
  timeLimit={null}
  
  // Styling
  className=""
  questionClassName=""
  optionClassName=""
  
  // Callbacks
  onQuizComplete={(results) => {}}
  onError={() => {}}
  
  // Custom renderers
  renderQuestion={(question, index) => <div>...</div>}
  renderOption={(option) => <button>...</button>}
  renderProgress={() => <div>...</div>}
  renderTimer={() => <div>...</div>}
/>
```

#### Quiz States

```javascript
import { QUIZ_STATES } from './QuizComponent';

QUIZ_STATES.LOADING        // Quiz is loading
QUIZ_STATES.READY          // Ready for user interaction
QUIZ_STATES.SUBMITTING     // Answer is being submitted
QUIZ_STATES.SHOWING_RESULT // Showing result after answer
QUIZ_STATES.COMPLETED      // Quiz is completed
QUIZ_STATES.ERROR          // Error state
```

### 2. MicrolearningQuiz

A specialized quiz component for microlearning context with enhanced UI and features.

#### Props

```javascript
<MicrolearningQuiz
  questions={questions}
  quizType="intermediate" // 'intermediate' or 'final'
  onQuizComplete={(results) => {}}
  onError={() => {}}
  showTimer={false}
  timeLimit={null}
  allowNavigation={true}
  className=""
/>
```

#### Features

- Enhanced question display with metadata
- Adaptive learning indicators
- Learning objectives display
- Improved progress tracking
- Microlearning-specific styling

### 3. useQuiz Hook

Custom hook for managing quiz state and logic.

#### Usage

```javascript
import useQuiz from '../hooks/useQuiz';

const {
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
  progress,
  accuracy
} = useQuiz({
  questions,
  onQuizComplete,
  onError,
  autoAdvance: false
});
```

## Question Format

Questions should follow this format:

```javascript
const questions = [
  {
    question: "What is React?",
    options: {
      A: "A JavaScript library for building user interfaces",
      B: "A database management system",
      C: "A server-side framework",
      D: "A programming language"
    },
    correctAnswer: "A",
    explanation: "React is a JavaScript library developed by Facebook for building user interfaces.",
    difficulty: "Beginner",
    cognitiveLoad: 3,
    learningObjective: "Understand what React is and its purpose",
    estimatedTime: 2,
    adaptiveReason: "This question was selected based on your previous performance"
  }
];
```

## Examples

### Basic Usage

```javascript
import React, { useState } from 'react';
import MicrolearningQuiz from '../components/MicrolearningQuiz';

const MyQuizPage = () => {
  const [questions, setQuestions] = useState([]);
  
  const handleQuizComplete = (results) => {
    console.log('Quiz completed:', results);
    // Handle completion
  };
  
  return (
    <MicrolearningQuiz
      questions={questions}
      onQuizComplete={handleQuizComplete}
      quizType="intermediate"
    />
  );
};
```

### Advanced Usage with Custom Rendering

```javascript
import React from 'react';
import QuizComponent from '../components/QuizComponent';

const CustomQuiz = () => {
  const renderQuestion = (question, index) => (
    <div className="custom-question">
      <h2>{question.question}</h2>
      <div className="metadata">
        <span>Difficulty: {question.difficulty}</span>
      </div>
    </div>
  );
  
  return (
    <QuizComponent
      questions={questions}
      renderQuestion={renderQuestion}
      onQuizComplete={handleComplete}
    />
  );
};
```

### Using the Hook Directly

```javascript
import React from 'react';
import useQuiz from '../hooks/useQuiz';

const CustomQuizImplementation = () => {
  const {
    currentQuestion,
    selectedAnswer,
    handleAnswerSelect,
    handleAnswerSubmit,
    progress
  } = useQuiz({
    questions,
    onQuizComplete: (results) => console.log(results)
  });
  
  return (
    <div>
      <h2>{currentQuestion.question}</h2>
      {/* Custom UI implementation */}
    </div>
  );
};
```

## Migration Guide

### From TutorialQuiz.jsx

1. Replace the quiz logic with `MicrolearningQuiz` component
2. Move question generation to parent component
3. Use the `onQuizComplete` callback for completion handling

### From AssessmentQuiz.jsx

1. Use `QuizComponent` with custom renderers
2. Implement assessment-specific logic in parent component
3. Use `useQuiz` hook for state management

## Best Practices

1. **Question Format**: Always provide complete question objects with all optional fields
2. **Error Handling**: Implement proper error handling with `onError` callback
3. **Accessibility**: Ensure custom renderers maintain accessibility
4. **Performance**: Use `React.memo` for custom renderers if needed
5. **State Management**: Use the `useQuiz` hook for complex state management

## Styling

The components use Tailwind CSS classes and can be customized through:

- `className` prop for main container
- `questionClassName` for question container
- `optionClassName` for option buttons
- Custom renderers for complete UI control

## Testing

Components can be tested by:

1. Mocking the `questions` prop
2. Testing callback functions
3. Verifying state changes
4. Testing custom renderers

Example test:

```javascript
import { render, fireEvent } from '@testing-library/react';
import MicrolearningQuiz from '../components/MicrolearningQuiz';

test('handles answer selection', () => {
  const questions = [/* mock questions */];
  const onAnswerSelect = jest.fn();
  
  render(
    <MicrolearningQuiz
      questions={questions}
      onAnswerSelect={onAnswerSelect}
    />
  );
  
  fireEvent.click(getByText('Option A'));
  expect(onAnswerSelect).toHaveBeenCalledWith('A');
});
```
