# 🎬 Clip-Based Quiz Component

A complete quiz system that generates assessments from micro-video clips following CLT-bLM methodology and Bloom taxonomy progression.

## 🚀 Quick Start

### Setup
```bash
npm install
npm run dev
```

### Environment Variables
```env
MONGODB_URI=your_mongodb_connection_string
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-3.5-turbo
JWT_SECRET=your_jwt_secret
```

### Test the System
```bash
npm run test-clip-quiz
```

## 📋 How It Works

### Quiz Generation Rules
- **Every 3 clips** → 1 quiz session (5 questions)
- **Final quiz** → 10 questions covering all clips
- **Questions generated** from actual clip transcripts
- **Wrong answers prioritized** in final quiz

### Example: 9 Clips
```
Clips 1-3 → Formative Quiz 1 (5 questions)
Clips 4-6 → Formative Quiz 2 (5 questions) 
Clips 7-9 → Formative Quiz 3 (5 questions)
All clips → Final Quiz (10 questions)
```

## 🎯 API Endpoints

### Generate Quiz from Clips
```http
POST /api/clip-quiz/generate
{
  "subjectArea": "JavaScript Fundamentals",
  "totalClips": 9,
  "clipMetadata": [...],
  "transcriptSegments": [...],
  "keypointsSelected": [...]
}
```

### Start Quiz Session
```http
POST /api/clip-quiz/session/start
{
  "quizPoolId": "...",
  "sessionName": "Formative Quiz 1",
  "clipRange": {"start": 1, "end": 3}
}
```

### View Analytics
```http
GET /api/clip-quiz/analytics/{quizPoolId}
```

## 🧠 Educational Features

- **CLT-bLM Phases**: Prepare → Initiate → Deliver → End
- **Bloom Taxonomy**: Remember → Understand → Apply → Analyze
- **Adaptive Scoring**: CC: +1, CW: -1, WC: +0.5, WW: -0.5
- **75% Mastery Threshold** for progression

## 📊 Key Files

- `services/clipBasedQuizGenerator.js` - Core quiz generation
- `routes/clipQuiz.js` - API endpoints
- `utils/testClipBasedQuizFlow.js` - Testing suite
- `CLIP_BASED_QUIZ_TESTING_GUIDE.md` - Complete testing guide