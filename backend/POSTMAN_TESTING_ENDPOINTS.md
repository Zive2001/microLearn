# 🧪 **POSTMAN TESTING ENDPOINTS - AI QUIZ SYSTEM**

**Server:** http://localhost:5000  
**Updated:** 2025-09-13 (Latest fixes applied)  
**Status:** ✅ Ready for complete testing

---

## 📋 **STEP-BY-STEP POSTMAN TESTING**

### **🔥 STEP 1: Health Checks**

#### **1.1 Server Health**
```
Method: GET
URL: http://localhost:5000/api/health
Headers: None
Body: None
```
**✅ Expected: `200 OK` with server info**

#### **1.2 OpenAI Health**
```
Method: GET
URL: http://localhost:5000/api/test/openai-health
Headers: None
Body: None
```
**✅ Expected: `200 OK` with AI status**

---

### **🔥 STEP 2: Authentication (REQUIRED)**

#### **2.1 Register New User**
```
Method: POST
URL: http://localhost:5000/api/auth/register
Headers:
  Content-Type: application/json
Body: raw (JSON)
```

**Request Body:**
```json
{
  "email": "testuser@quiz.com",
  "password": "password123",
  "profile": {
    "firstName": "Quiz",
    "lastName": "Tester",
    "profession": "Developer",
    "gender": "Male",
    "experienceLevel": "Intermediate"
  },
  "learningPreferences": {
    "interestedAreas": ["javascript", "react", "python"],
    "preferredContentLength": "Medium (10-20 min)",
    "learningGoal": "Skill Enhancement"
  }
}
```

#### **2.2 Login User**
```
Method: POST
URL: http://localhost:5000/api/auth/login
Headers:
  Content-Type: application/json
Body: raw (JSON)
```

**Request Body:**
```json
{
  "email": "testuser@quiz.com",
  "password": "password123"
}
```

**⚠️ COPY THE JWT TOKEN FROM LOGIN RESPONSE - YOU'LL NEED IT!**

---

### **🔥 STEP 3: AI Quiz System Testing**

#### **3.1 Get Available AI Topics**
```
Method: GET
URL: http://localhost:5000/api/quiz/topics
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN_HERE
  Content-Type: application/json
Body: None
```

**✅ Expected Response:**
```json
{
  "success": true,
  "message": "Available quiz topics retrieved (AI-Generated Questions)",
  "data": {
    "topics": ["javascript", "react", "typescript", "nodejs", "python", "nextjs", "mongodb", "css-tailwind"],
    "userLevel": "Intermediate",
    "totalTopics": 8,
    "dynamicGeneration": true,
    "aiPowered": true
  }
}
```

#### **3.2 Start AI Quiz - JavaScript (MAIN TEST)**
```
Method: POST
URL: http://localhost:5000/api/quiz/start
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN_HERE
  Content-Type: application/json
Body: raw (JSON)
```

**Request Body:**
```json
{
  "topic": "javascript",
  "sessionType": "formative",
  "config": {
    "questionsPerSession": 3,
    "timeLimit": 10,
    "adaptiveDifficulty": true,
    "bloomProgression": true,
    "hintsEnabled": true
  }
}
```

**✅ Expected Success Response:**
```json
{
  "success": true,
  "message": "AI-Powered Quiz session started successfully",
  "data": {
    "sessionId": "68c5d8a2f123456789abcdef",
    "sessionType": "formative",
    "status": "in_progress",
    "currentQuestion": {
      "id": "dynamic_1726201653_abc123",
      "questionText": "Which method removes the last element from a JavaScript array?",
      "questionType": "mcq",
      "options": [
        {"text": "pop()", "isCorrect": true},
        {"text": "shift()", "isCorrect": false},
        {"text": "slice()", "isCorrect": false},
        {"text": "splice()", "isCorrect": false}
      ],
      "correctAnswer": "pop()",
      "explanation": "The pop() method removes and returns the last element.",
      "difficulty": "medium",
      "bloomLevel": "Remember",
      "topic": "javascript",
      "aiGenerated": true
    },
    "questionsTotal": 3,
    "questionsAnswered": 0,
    "timeLimit": 10,
    "hintsEnabled": true,
    "aiGenerated": true
  }
}
```

**⚠️ COPY THE sessionId FROM RESPONSE - YOU'LL NEED IT FOR NEXT STEPS!**

#### **3.3 Get Current Session Status**
```
Method: GET
URL: http://localhost:5000/api/quiz/session/YOUR_SESSION_ID_HERE
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN_HERE
  Content-Type: application/json
Body: None
```

**✅ Expected Response:**
```json
{
  "success": true,
  "data": {
    "session": {
      "_id": "68c5d8a2f123456789abcdef",
      "sessionType": "formative",
      "status": "in_progress",
      "currentQuestionIndex": 0,
      "totalQuestions": 3,
      "completionPercentage": 0,
      "timeLimit": 10,
      "hintsEnabled": true,
      "startedAt": "2025-09-13T11:45:32.246Z",
      "score": {
        "masteryScore": 0,
        "rawScore": 0
      }
    },
    "currentQuestion": {
      "questionText": "Which method removes the last element from a JavaScript array?",
      "options": [...],
      "aiGenerated": true
    },
    "quizPool": null
  }
}
```

#### **3.4 Submit Correct Answer**
```
Method: POST
URL: http://localhost:5000/api/quiz/session/YOUR_SESSION_ID_HERE/answer
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN_HERE
  Content-Type: application/json
Body: raw (JSON)
```

**Request Body (Use the correct answer from the question):**
```json
{
  "answer": "pop()",
  "hintUsed": false,
  "timeSpent": 45
}
```

**✅ Expected Success Response:**
```json
{
  "success": true,
  "message": "✅ Correct answer!",
  "data": {
    "isCorrect": true,
    "correctAnswer": "pop()",
    "explanation": "The pop() method removes and returns the last element.",
    "masteryScore": 33,
    "sessionProgress": {
      "currentQuestionIndex": 1,
      "totalQuestions": 3,
      "completionPercentage": 33
    },
    "nextQuestion": {
      "id": "dynamic_1726201700_def456",
      "questionText": "What does 'typeof null' return in JavaScript?",
      "difficulty": "hard",
      "bloomLevel": "Apply",
      "aiGenerated": true
    },
    "sessionComplete": false,
    "aiInsights": {
      "recentAccuracy": 100,
      "trend": "improving",
      "recommendation": "Ready for harder questions"
    }
  }
}
```

#### **3.5 Get AI Hint**
```
Method: GET
URL: http://localhost:5000/api/quiz/session/YOUR_SESSION_ID_HERE/hint
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN_HERE
  Content-Type: application/json
Body: None
```

**✅ Expected Response:**
```json
{
  "success": true,
  "message": "Hint retrieved successfully",
  "data": {
    "hint": "💡 Hint: Think about JavaScript's quirky behavior with the typeof operator.",
    "aiGenerated": true
  }
}
```

#### **3.6 Submit Answer with Hint**
```
Method: POST
URL: http://localhost:5000/api/quiz/session/YOUR_SESSION_ID_HERE/answer
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN_HERE
  Content-Type: application/json
Body: raw (JSON)
```

**Request Body:**
```json
{
  "answer": "object",
  "hintUsed": true,
  "timeSpent": 90
}
```

#### **3.7 Submit Wrong Answer (Test Adaptive Difficulty)**
```
Method: POST
URL: http://localhost:5000/api/quiz/session/YOUR_SESSION_ID_HERE/answer
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN_HERE
  Content-Type: application/json
Body: raw (JSON)
```

**Request Body (Use wrong answer):**
```json
{
  "answer": "undefined",
  "hintUsed": false,
  "timeSpent": 60
}
```

**✅ Expected Response:**
```json
{
  "success": true,
  "message": "❌ Incorrect answer",
  "data": {
    "isCorrect": false,
    "correctAnswer": "object",
    "explanation": "In JavaScript, typeof null returns 'object' due to a legacy bug.",
    "nextQuestion": {
      "difficulty": "easy",
      "bloomLevel": "Remember"
    },
    "aiInsights": {
      "recentAccuracy": 50,
      "trend": "struggling",
      "recommendation": "Consider reviewing fundamentals"
    }
  }
}
```

---

### **🔥 STEP 4: Different Topics Testing**

#### **4.1 Start React Quiz**
```
Method: POST
URL: http://localhost:5000/api/quiz/start
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN_HERE
  Content-Type: application/json
Body: raw (JSON)
```

**Request Body:**
```json
{
  "topic": "react",
  "sessionType": "formative",
  "config": {
    "questionsPerSession": 4,
    "timeLimit": 12,
    "adaptiveDifficulty": true
  }
}
```

#### **4.2 Start Python Quiz**
```
Method: POST
URL: http://localhost:5000/api/quiz/start
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN_HERE
  Content-Type: application/json
Body: raw (JSON)
```

**Request Body:**
```json
{
  "topic": "python",
  "sessionType": "final",
  "config": {
    "questionsPerSession": 5,
    "timeLimit": 15
  }
}
```

#### **4.3 Start TypeScript Quiz**
```
Method: POST
URL: http://localhost:5000/api/quiz/start
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN_HERE
  Content-Type: application/json
Body: raw (JSON)
```

**Request Body:**
```json
{
  "topic": "typescript",
  "sessionType": "formative",
  "config": {
    "questionsPerSession": 3,
    "timeLimit": 8
  }
}
```

---

### **🔥 STEP 5: Session Management**

#### **5.1 Complete Quiz Session**
```
Method: POST
URL: http://localhost:5000/api/quiz/session/YOUR_SESSION_ID_HERE/complete
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN_HERE
  Content-Type: application/json
Body: None
```

**✅ Expected Response:**
```json
{
  "success": true,
  "message": "Quiz session completed successfully",
  "data": {
    "sessionId": "68c5d8a2f123456789abcdef",
    "finalScore": 67,
    "questionsAnswered": 3,
    "totalQuestions": 3,
    "performance": "Good"
  }
}
```

#### **5.2 Get Quiz Progress for Topic**
```
Method: GET
URL: http://localhost:5000/api/quiz/progress/javascript
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN_HERE
  Content-Type: application/json
Body: None
```

**✅ Expected Response:**
```json
{
  "success": true,
  "data": {
    "topic": "javascript",
    "progress": {
      "topic": "javascript",
      "totalSessions": 1,
      "completedSessions": 1,
      "averageMasteryScore": 67,
      "finalQuizCompleted": false
    },
    "recentSessions": [
      {
        "_id": "68c5d8a2f123456789abcdef",
        "sessionType": "formative",
        "masteryScore": 67,
        "completedAt": "2025-09-13T11:50:32.165Z"
      }
    ]
  }
}
```

#### **5.3 Get Overall Statistics**
```
Method: GET
URL: http://localhost:5000/api/quiz/stats
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN_HERE
  Content-Type: application/json
Body: None
```

**✅ Expected Response:**
```json
{
  "success": true,
  "data": {
    "totalSessions": 3,
    "completedSessions": 2,
    "completionRate": 67,
    "overallStats": {
      "totalQuizzesCompleted": 2,
      "averageScore": 72,
      "strongestBloomLevel": "Apply",
      "weakestBloomLevel": "Create",
      "totalTimeSpent": 450
    },
    "topicProgress": [
      {
        "topic": "javascript",
        "completedSessions": 1,
        "averageMasteryScore": 67
      }
    ]
  }
}
```

---

### **🔥 STEP 6: Advanced AI Testing**

#### **6.1 Direct AI Question Generation**
```
Method: POST
URL: http://localhost:5000/api/test/generate-question
Headers:
  Content-Type: application/json
Body: raw (JSON)
```

**Request Body:**
```json
{
  "topic": "javascript",
  "difficulty": "intermediate"
}
```

**✅ Expected Response:**
```json
{
  "success": true,
  "data": {
    "question": {
      "question": "What is the difference between 'let' and 'var' in JavaScript?",
      "options": {
        "A": "No difference",
        "B": "let is block-scoped, var is function-scoped",
        "C": "var is newer than let",
        "D": "let can be redeclared, var cannot"
      },
      "correctAnswer": "B",
      "explanation": "let is block-scoped while var is function-scoped.",
      "difficulty": "intermediate",
      "topic": "javascript",
      "estimatedTime": 60
    }
  }
}
```

#### **6.2 Complete AI Flow Test**
```
Method: POST
URL: http://localhost:5000/api/test/complete-flow
Headers:
  Content-Type: application/json
Body: raw (JSON)
```

**Request Body:**
```json
{
  "topic": "react",
  "userLevel": "Intermediate"
}
```

---

### **🔥 STEP 7: Error Testing**

#### **7.1 Test Invalid Topic**
```
Method: POST
URL: http://localhost:5000/api/quiz/start
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN_HERE
  Content-Type: application/json
Body: raw (JSON)
```

**Request Body:**
```json
{
  "topic": "invalid-topic",
  "sessionType": "formative"
}
```

**✅ Expected: `400 Bad Request`**

#### **7.2 Test Without Authentication**
```
Method: GET
URL: http://localhost:5000/api/quiz/topics
Headers:
  Content-Type: application/json
Body: None
```

**✅ Expected: `401 Unauthorized`**

#### **7.3 Test Invalid Session ID**
```
Method: GET
URL: http://localhost:5000/api/quiz/session/invalid-session-id
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN_HERE
  Content-Type: application/json
Body: None
```

**✅ Expected: `400 Bad Request`**

---

## 🎯 **SUCCESS CRITERIA CHECKLIST**

### **✅ Core Functionality:**
- [ ] Server health check returns `200 OK`
- [ ] OpenAI health check returns `200 OK`
- [ ] User registration works
- [ ] User login returns valid JWT token
- [ ] Quiz topics shows 8 topics with `aiPowered: true`
- [ ] Quiz start generates real AI question (not null)
- [ ] Session shows correct `totalQuestions` count
- [ ] Current question has proper structure with 4 options
- [ ] Answer submission works and generates next question
- [ ] Hints are contextual and relevant
- [ ] Correct answers increase difficulty
- [ ] Wrong answers decrease difficulty
- [ ] Session completion works
- [ ] Progress tracking updates correctly

### **🔍 Quality Indicators:**
- **Questions are grammatically correct**
- **Options are plausible distractors**
- **Explanations make technical sense**
- **Hints provide helpful guidance**
- **Difficulty matches user level**
- **Topics are programming-related**

### **⚡ Performance Expectations:**
- **Question Generation:** < 5 seconds
- **Answer Submission:** < 2 seconds
- **Hint Retrieval:** < 1 second
- **Session Updates:** < 1 second

---

## 🚨 **TROUBLESHOOTING**

### **❌ Common Issues & Solutions:**

#### **Issue: "totalQuestions": 0**
**Solution:** Restart server with clean environment

#### **Issue: "currentQuestion": null**
**Solution:** Check OpenAI API key in .env file and restart server

#### **Issue: "AI service temporarily unavailable"**
**Solution:** 
1. Verify OpenAI health endpoint works
2. Check internet connection
3. Restart server completely

#### **Issue: Questions are low quality**
**Solution:** Check topic spelling matches exactly: `javascript`, `react`, `python`, etc.

---

## 🎉 **QUICK TEST SEQUENCE**

1. **Health Checks** (Steps 1.1-1.2)
2. **Authentication** (Steps 2.1-2.2)
3. **Get Topics** (Step 3.1)
4. **Start JavaScript Quiz** (Step 3.2) - **MAIN TEST**
5. **Check Session** (Step 3.3)
6. **Submit Answers** (Steps 3.4-3.7)
7. **Test Different Topics** (Steps 4.1-4.3)
8. **Complete Session** (Step 5.1)
9. **Check Progress** (Steps 5.2-5.3)

**🎯 If Steps 3.2 and 3.3 show proper questions and counts, your AI system is working perfectly!**

---

**🤖 This comprehensive test suite will verify your professional AI-powered quiz system is fully functional!**