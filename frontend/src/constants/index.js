// src/constants/index.js

// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3
};

// Topic Configuration
export const TOPICS = {
  JAVASCRIPT: 'javascript',
  REACT: 'react',
  TYPESCRIPT: 'typescript',
  NODEJS: 'nodejs',
  PYTHON: 'python',
  NEXTJS: 'nextjs',
  MONGODB: 'mongodb',
  CSS_TAILWIND: 'css-tailwind'
};

// Topic Metadata
export const TOPIC_META = {
  [TOPICS.JAVASCRIPT]: {
    name: 'JavaScript',
    icon: '⚡',
    color: '#F7DF1E',
    category: 'Programming Languages'
  },
  [TOPICS.REACT]: {
    name: 'React',
    icon: '⚛️',
    color: '#61DAFB',
    category: 'Frameworks & Libraries'
  },
  [TOPICS.TYPESCRIPT]: {
    name: 'TypeScript',
    icon: '🔷',
    color: '#3178C6',
    category: 'Programming Languages'
  },
  [TOPICS.NODEJS]: {
    name: 'Node.js',
    icon: '🟢',
    color: '#339933',
    category: 'Backend Development'
  },
  [TOPICS.PYTHON]: {
    name: 'Python',
    icon: '🐍',
    color: '#3776AB',
    category: 'Programming Languages'
  },
  [TOPICS.NEXTJS]: {
    name: 'Next.js',
    icon: '▲',
    color: '#000000',
    category: 'Frameworks & Libraries'
  },
  [TOPICS.MONGODB]: {
    name: 'MongoDB',
    icon: '🍃',
    color: '#47A248',
    category: 'Tools & Technologies'
  },
  [TOPICS.CSS_TAILWIND]: {
    name: 'CSS & Tailwind',
    icon: '🎨',
    color: '#38B2AC',
    category: 'Frontend Development'
  }
};

// Assessment Configuration
export const ASSESSMENT_CONFIG = {
  MIN_QUESTIONS: 5,
  MAX_QUESTIONS: 20,
  DEFAULT_QUESTIONS: 10,
  TIME_PER_QUESTION: 60, // seconds
  DIFFICULTIES: {
    BEGINNER: 'beginner',
    INTERMEDIATE: 'intermediate',
    ADVANCED: 'advanced'
  }
};

// User Levels
export const USER_LEVELS = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  PROFESSIONAL: 'Professional'
};

// Level Colors
export const LEVEL_COLORS = {
  [USER_LEVELS.BEGINNER]: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-200'
  },
  [USER_LEVELS.INTERMEDIATE]: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    border: 'border-yellow-200'
  },
  [USER_LEVELS.PROFESSIONAL]: {
    bg: 'bg-purple-100',
    text: 'text-purple-800',
    border: 'border-purple-200'
  }
};

// Professions
export const PROFESSIONS = [
  'Student',
  'Software Developer',
  'Web Developer',
  'Data Scientist',
  'UI/UX Designer',
  'Product Manager',
  'Other'
];

// Learning Goals
export const LEARNING_GOALS = [
  'Career Change',
  'Skill Enhancement',
  'Academic Requirements',
  'Personal Interest'
];

// Content Length Preferences
export const CONTENT_LENGTHS = [
  'Short (5-10 min)',
  'Medium (10-20 min)',
  'Long (20+ min)'
];

// Interest Areas
export const INTEREST_AREAS = [
  'Web Development',
  'Mobile Development',
  'Data Science',
  'Machine Learning',
  'DevOps',
  'UI/UX Design',
  'Database Management',
  'Cybersecurity'
];

// Routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  DASHBOARD: '/app/dashboard',
  TOPICS: '/app/topics',
  ASSESSMENT: '/app/assessment',
  RECOMMENDATIONS: '/app/recommendations',
  PROFILE: '/app/profile'
};

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  USER: 'user',
  THEME: 'theme',
  LANGUAGE: 'language'
};

// Validation Rules
export const VALIDATION = {
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    MESSAGE: 'Please enter a valid email address'
  },
  PASSWORD: {
    MIN_LENGTH: 6,
    MESSAGE: 'Password must be at least 6 characters long'
  },
  NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 50,
    MESSAGE: 'Name must be between 2 and 50 characters'
  }
};

// UI Configuration
export const UI_CONFIG = {
  ANIMATION_DURATION: 300,
  DEBOUNCE_DELAY: 500,
  TOAST_DURATION: 4000,
  SKELETON_COUNT: 6
};

// Breakpoints (matching Tailwind)
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK: 'Network error. Please check your internet connection.',
  SERVER: 'Server error. Please try again later.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION: 'Please check your input and try again.',
  GENERIC: 'Something went wrong. Please try again.'
};

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN: 'Welcome back!',
  REGISTER: 'Account created successfully!',
  LOGOUT: 'Logged out successfully',
  PROFILE_UPDATE: 'Profile updated successfully',
  TOPIC_SELECTION: 'Topics selected successfully',
  ASSESSMENT_COMPLETE: 'Assessment completed successfully'
};