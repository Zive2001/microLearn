# 🎓 microLearn - AI-Powered Adaptive Learning Platform

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19.1.1-blue)](https://reactjs.org/)

An intelligent adaptive learning platform that leverages AI/GPT, natural language processing, and personalized content delivery to create customized learning experiences. The system generates bite-sized microlearning modules, interactive quizzes, and provides AI-driven recommendations based on individual learning patterns.

---

## 📑 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Environment Configuration](#environment-configuration)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Database Models](#database-models)
- [Git Workflow](#git-workflow)
- [Testing](#testing)
- [Contributing](#contributing)
- [Research Team](#research-team)

---

## 🎯 Overview

**microLearn** is an undergraduate research project that addresses the challenges of traditional one-size-fits-all learning approaches. Our platform uses artificial intelligence to create personalized learning paths, generate adaptive content, and provide real-time assessments tailored to each learner's pace and comprehension level.

### Problem Statement
Traditional e-learning platforms often fail to adapt to individual learning styles, leading to decreased engagement and knowledge retention.

### Solution
An AI-driven adaptive learning system that:
- Analyzes learner behavior and comprehension
- Generates personalized microlearning content
- Creates adaptive quizzes based on performance
- Provides intelligent video recommendations
- Offers AI-powered virtual tutoring with avatar and text-to-speech

---

## ✨ Key Features

### 🤖 AI-Powered Learning
- **GPT Integration**: Intelligent content generation and explanation
- **Natural Language Processing**: Advanced text analysis and keypoint extraction
- **FAISS Vector Search**: Semantic similarity for content recommendations
- **Adaptive Quiz Generation**: AI-generated questions based on learning content

### 📹 Video-Based Learning
- **YouTube Integration**: Curated video content from educational channels
- **Transcript Analysis**: Automatic transcript extraction and keypoint identification
- **Video Segmentation**: Breaking down long videos into digestible segments
- **Smart Recommendations**: Personalized video suggestions based on learning progress

### 🎯 Microlearning Modules
- **Bite-sized Content**: 5-10 minute focused learning sessions
- **Keypoint-Based Learning**: Extracted key concepts from educational content
- **Progress Tracking**: Monitor completion and comprehension levels
- **Spaced Repetition**: Optimized content delivery for better retention

### 📊 Assessment & Analytics
- **Adaptive Testing**: Questions adjust to learner's skill level
- **Real-time Feedback**: Instant performance analysis
- **Progress Dashboard**: Comprehensive learning analytics
- **Knowledge Gap Identification**: Targeted recommendations for improvement

### 🎭 Interactive Learning
- **AI Avatar with TTS**: Virtual tutor with text-to-speech capabilities (Azure Speech)
- **3D Visualizations**: Interactive Three.js graphics for complex concepts
- **Gamification Elements**: Engagement through progress tracking and achievements

### 👤 User Management
- **Secure Authentication**: JWT-based user authentication
- **Learning Profiles**: Personalized learning paths and preferences
- **Progress Tracking**: Historical data and performance metrics

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React + Vite)                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ Landing  │  │Dashboard │  │ Learning │  │Assessment│     │
│  │   Page   │  │   & UI   │  │  Paths   │  │  System  │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
└─────────────────────────────────────────────────────────────┘
                              ↕ REST API
┌─────────────────────────────────────────────────────────────┐
│              Backend (Node.js + Express)                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              API Controllers & Routes                │   │
│  │  • Auth  • Videos  • Quiz  • Assessment  • Avatar    │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  Services Layer                      │   │
│  │  • GPT Service  • YouTube API  • FAISS Search        │   │
│  │  • TTS Service  • NLP Processing  • Video Processing │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                  Data Layer (MongoDB)                       │
│  • User Profiles  • Topics  • Videos  • Quizzes             │
│  • Assessments  • FAISS Indexes  • MicroVideos              │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                   External Services                         │
│  • OpenAI GPT API  • YouTube Data API  • Azure Speech       │
└─────────────────────────────────────────────────────────────┘
```

---

## 💻 Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.1.1 | UI framework |
| Vite | 7.1.2 | Build tool and dev server |
| Tailwind CSS | 4.1.13 | Styling framework |
| React Router | 7.8.2 | Client-side routing |
| Zustand | 5.0.8 | State management |
| Three.js | 0.180.0 | 3D graphics and visualizations |
| Axios | 1.11.0 | HTTP client |
| React Hook Form | 7.62.0 | Form handling |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | ≥18.0.0 | Runtime environment |
| Express | 4.21.2 | Web framework |
| MongoDB | via Mongoose 8.8.3 | Database |
| OpenAI | 5.19.1 | GPT integration |
| JWT | 9.0.2 | Authentication |
| Natural | 8.1.0 | NLP processing |
| FAISS-node | 0.5.1 | Vector similarity search |
| YouTube Transcript | 1.2.1 | Transcript extraction |
| Azure Speech SDK | 1.45.0 | Text-to-speech |
| Puppeteer | 21.11.0 | Web scraping |

### AI & Machine Learning
- **OpenAI GPT**: Content generation, quiz creation, explanations
- **Transformers.js**: Local ML models for text processing
- **FAISS**: Semantic search and recommendations
- **Natural NLP**: Text analysis and keyword extraction

---

## 📋 Prerequisites

Before setting up the project, ensure you have:

- **Node.js** (v18.0.0 or higher) - [Download](https://nodejs.org/)
- **npm** (v9.0.0 or higher)
- **MongoDB** - [Download](https://www.mongodb.com/try/download/community) or use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- **Git** - [Download](https://git-scm.com/)

### Required API Keys
1. **OpenAI API Key** - [Get API Key](https://platform.openai.com/api-keys)
2. **YouTube Data API Key** - [Google Cloud Console](https://console.cloud.google.com/)
3. **Azure Speech API Key** (Optional for TTS) - [Azure Portal](https://portal.azure.com/)

---

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Zive2001/microLearn.git
cd microLearn
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your configuration (see Environment Configuration section)

# Seed database with initial topics (optional)
npm run seed-topics
```

### 3. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Create environment file (if needed)
# Configure API endpoint in your vite config or environment
```

---

## 🔐 Environment Configuration

### Backend Environment Variables

Create a `.env` file in the `backend/` directory with the following variables:

```env
# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Database
MONGODB_URI=mongodb://localhost:27017/microlearn
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/microlearn

# Authentication
JWT_SECRET=your_super_secure_jwt_secret_key_here_min_32_characters

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here

# YouTube API
YOUTUBE_API_KEY=your-youtube-data-api-key-here

# Azure Speech (Optional - for TTS functionality)
TTS_PROVIDER=azure
AZURE_SPEECH_KEY=your-azure-speech-api-key
AZURE_SPEECH_REGION=your-azure-region

# Audio Output
AUDIO_OUTPUT_DIR=./audio_output
```

### Frontend Configuration

The frontend is configured through Vite. The API endpoint is typically set to `http://localhost:5000` by default.

If you need to change it, create/edit `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000
```

---

## ▶️ Running the Application

### Development Mode

#### Option 1: Run Both Simultaneously (Recommended)

From the project root:
```bash
# Install concurrently if not already installed
npm install -g concurrently

# Run both frontend and backend
npm run dev
```

#### Option 2: Run Separately

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# Server runs on http://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# App runs on http://localhost:5173
```

### Production Mode

**Backend:**
```bash
cd backend
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
npm run preview
```

---

## 📁 Project Structure

```
microLearn/
├── backend/
│   ├── config/              # Configuration files
│   │   └── database.js      # MongoDB connection config
│   ├── controllers/         # Request handlers
│   │   ├── videoController.js
│   │   ├── quizController.js
│   │   └── avatarTtsController.js
│   ├── models/              # Database schemas
│   │   ├── User.js
│   │   ├── Topic.js
│   │   ├── Video.js
│   │   ├── Quiz.js
│   │   ├── Assessment.js
│   │   ├── MicroVideo.js
│   │   └── FAISSIndex.js
│   ├── routes/              # API routes
│   │   ├── auth.js
│   │   ├── videos.js
│   │   ├── quiz.js
│   │   ├── assessment.js
│   │   ├── microlearning.js
│   │   ├── recommendations.js
│   │   ├── keypointGeneration.js
│   │   └── avatar-tts.js
│   ├── services/            # Business logic
│   │   ├── gptService.js
│   │   ├── youtubeService.js
│   │   ├── faissService.js
│   │   └── ttsService.js
│   ├── middleware/          # Express middleware
│   ├── utils/               # Helper functions
│   ├── scripts/             # Utility scripts
│   ├── server.js           # Application entry point
│   └── package.json
│
├── frontend/
│   ├── public/             # Static assets
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   │   ├── LandingPage.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── TopicSelection.jsx
│   │   │   ├── LearningPath.jsx
│   │   │   ├── MicrolearningPage.jsx
│   │   │   ├── KeypointLearning.jsx
│   │   │   ├── VideoRecommendations.jsx
│   │   │   ├── AssessmentSelection.jsx
│   │   │   ├── AssessmentQuiz.jsx
│   │   │   └── Profile.jsx
│   │   ├── services/       # API service functions
│   │   ├── store/          # Zustand state management
│   │   ├── hooks/          # Custom React hooks
│   │   ├── utils/          # Utility functions
│   │   ├── constants/      # Constants and config
│   │   └── App.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
└── README.md
```

---

## 🔌 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "student123",
  "email": "student@example.com",
  "password": "securePassword123"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "student@example.com",
  "password": "securePassword123"
}
```

### Video Endpoints

#### Get Topic Videos
```http
GET /api/videos/topic/:topicId
Authorization: Bearer <token>
```

#### Get Video Recommendations
```http
GET /api/recommendations/:userId
Authorization: Bearer <token>
```

### Quiz Endpoints

#### Generate Quiz
```http
POST /api/quiz/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "topicId": "507f1f77bcf86cd799439011",
  "difficulty": "medium",
  "questionCount": 10
}
```

#### Submit Quiz
```http
POST /api/quiz/submit
Authorization: Bearer <token>
Content-Type: application/json

{
  "quizId": "507f1f77bcf86cd799439012",
  "answers": [...]
}
```

### Microlearning Endpoints

#### Get Keypoint Content
```http
GET /api/keypoint-generation/:videoId
Authorization: Bearer <token>
```

#### Get Microlearning Modules
```http
GET /api/microlearning/:userId/:topicId
Authorization: Bearer <token>
```

### Assessment Endpoints

#### Get Assessment
```http
GET /api/assessment/:topicId
Authorization: Bearer <token>
```

#### Submit Assessment
```http
POST /api/assessment/submit
Authorization: Bearer <token>
Content-Type: application/json

{
  "assessmentId": "507f1f77bcf86cd799439013",
  "answers": [...]
}
```

### Avatar TTS Endpoints

#### Generate Speech
```http
POST /api/avatar-tts/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "text": "Hello, welcome to microLearn!",
  "voice": "en-US-AriaNeural"
}
```

---

## 🗄️ Database Models

### User Model
```javascript
{
  username: String (required, unique),
  email: String (required, unique),
  password: String (hashed),
  learningProfile: {
    preferredLearningStyle: String,
    difficultyLevel: String,
    completedTopics: [ObjectId],
    currentProgress: Object
  },
  assessmentResults: [{
    topicId: ObjectId,
    score: Number,
    date: Date
  }],
  createdAt: Date,
  updatedAt: Date
}
```

### Topic Model
```javascript
{
  name: String (required),
  description: String,
  category: String,
  difficulty: String,
  videoCount: Number,
  keywords: [String],
  createdAt: Date
}
```

### Video Model
```javascript
{
  youtubeId: String (required, unique),
  title: String,
  description: String,
  topicId: ObjectId,
  transcript: String,
  keypoints: [String],
  duration: Number,
  viewCount: Number,
  embeddings: [Number], // For FAISS similarity
  createdAt: Date
}
```

### Quiz Model
```javascript
{
  topicId: ObjectId,
  userId: ObjectId,
  questions: [{
    question: String,
    options: [String],
    correctAnswer: Number,
    explanation: String,
    difficulty: String
  }],
  generatedBy: String, // 'ai' or 'manual'
  createdAt: Date
}
```

### Assessment Model
```javascript
{
  userId: ObjectId,
  topicId: ObjectId,
  questions: [Object],
  score: Number,
  totalQuestions: Number,
  completedAt: Date,
  timeTaken: Number,
  knowledgeGaps: [String]
}
```

---

## 🌿 Git Workflow

### Branch Structure

- **`master`** → Stable, production-ready code only
- **`dev`** → Integration branch for testing features
- **`feature/*`** → Individual feature development
- **`bugfix/*`** → Bug fixes
- **`experiment/*`** → Experimental features

### Development Process

#### 1. Start New Feature
```bash
# Always start from dev
git checkout dev
git pull origin dev

# Create your feature branch
git checkout -b feature/your-feature-name
```

#### 2. Work on Your Feature
```bash
# Make changes
git add .
git commit -m "feat: descriptive commit message"

# Push to remote
git push origin feature/your-feature-name
```

#### 3. Create Pull Request
1. Go to GitHub repository
2. Click "Pull requests" → "New Pull Request"
3. Base: `dev` ← Compare: `feature/your-feature-name`
4. Add descriptive title and description
5. Request review from team members

#### 4. Code Review & Merge
- Address review comments
- Update PR with fixes
- After approval: Merge to `dev`
- Project lead merges `dev` to `master` after thorough testing

### Commit Message Convention

Use conventional commits format:

```
<type>: <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Build process or auxiliary tool changes

**Examples:**
```bash
git commit -m "feat: add AI-powered quiz generation"
git commit -m "fix: resolve video loading timeout issue"
git commit -m "docs: update API documentation"
```

### Important Rules

❌ **DON'T:**
- Push directly to `master` or `dev`
- Commit `.env` files or API keys
- Use unclear branch names like `test` or `my-branch`

✅ **DO:**
- Use descriptive branch names: `feature/authentication-system`
- Write clear commit messages
- Keep commits small and focused
- Sync regularly with `dev` branch
- Test before creating PR

---

## 🧪 Testing

### Backend Testing

```bash
cd backend

# Run all tests
npm test

# Test MongoDB connection
npm run test-mongodb

# Test specific models
node test-quiz-models.js
```

### Frontend Testing

```bash
cd frontend

# Run linter
npm run lint
```

### API Testing

Use the provided Postman collection:
```
backend/Keypoint_Based_Generation.postman_collection.json
```

Import this into Postman to test all API endpoints.

---

## 🤝 Contributing

We welcome contributions from the research community! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'feat: add amazing feature'`)
4. **Push to branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Code Style Guidelines

- Follow ESLint configuration
- Use meaningful variable and function names
- Add comments for complex logic
- Write self-documenting code
- Keep functions small and focused

---

### Team Members

**IT21833298 - Hettiarachchi R.D.**
**IT21833120 - Seneviratne S.T.**
**IT21800450 - Mapa M.M.S.S.**
**IT21828898 - Thusithan S.**

**GroupID - R25-041**

### Supervisor

- **Academic Supervisor:** [Dr. Prasanna Sumathipala]
---
