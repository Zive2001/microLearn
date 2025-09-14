# 🧪 **COMPLETE POSTMAN TEST DATA - AI QUIZ SYSTEM**

**Server:** http://localhost:5000  
**AI Model:** OpenAI GPT-3.5-turbo  
**Status:** All endpoints ready for testing  

---

## 📋 **COMPLETE TESTING SEQUENCE**

### **Step 1: Health Checks**

#### **1.1 Server Health**
```
Method: GET
URL: http://localhost:5000/api/health
Headers: None
Body: None
```
**Expected:** `200 OK` with server info

#### **1.2 OpenAI Health**
```
Method: GET  
URL: http://localhost:5000/api/test/openai-health
Headers: None
Body: None
```
**Expected:** `200 OK` with AI status

---

### **Step 2: User Authentication**

#### **2.1 Register User**
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
  "email": "testuser@aitest.com",
  "password": "password123",
  "profile": {
    "firstName": "Test",
    "lastName": "User",
    "profession": "Software Developer",
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
  "email": "testuser@aitest.com",
  "password": "password123"
}
```

**⚠️ IMPORTANT: Copy the JWT token from response for next steps!**

---

### **Step 3: AI-Powered Quiz System Tests**

#### **3.1 Get AI Quiz Topics**
```
Method: GET
URL: http://localhost:5000/api/quiz/topics
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN_HERE
  Content-Type: application/json
Body: None
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Available quiz topics retrieved (AI-Generated Questions)",
  "data": {
    "topics": [
      "javascript", "react", "typescript", "nodejs", 
      "python", "nextjs", "mongodb", "css-tailwind"
    ],
    "userLevel": "Intermediate",
    "totalTopics": 8,
    "dynamicGeneration": true,
    "aiPowered": true
  }
}
```

#### **3.2 Start AI Quiz Session - JavaScript**
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
    "questionsPerSession": 5,
    "timeLimit": 15,
    "adaptiveDifficulty": true,
    "bloomProgression": true,
    "hintsEnabled": true
  }
}
```

**Expected:** AI-generated question with session ID

#### **3.3 Start AI Quiz Session - React**
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
    "adaptiveDifficulty": true,
    "bloomProgression": true
  }
}
```

#### **3.4 Start AI Quiz Session - Python**
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
    "questionsPerSession": 6,
    "timeLimit": 20,
    "adaptiveDifficulty": false,
    "bloomProgression": true
  }
}
```

#### **3.5 Get Current Quiz Session**
```
Method: GET
URL: http://localhost:5000/api/quiz/session/SESSION_ID_FROM_STEP_3.2
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN_HERE
  Content-Type: application/json
Body: None
```

#### **3.6 Submit Correct Answer**
```
Method: POST
URL: http://localhost:5000/api/quiz/session/SESSION_ID_FROM_STEP_3.2/answer
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN_HERE
  Content-Type: application/json
Body: raw (JSON)
```

**Request Body (Example - use correct answer from question):**
```json
{
  "answer": "let myVariable = 5;",
  "hintUsed": false,
  "timeSpent": 45
}
```

#### **3.7 Submit Incorrect Answer**
```
Method: POST
URL: http://localhost:5000/api/quiz/session/SESSION_ID_FROM_STEP_3.2/answer
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN_HERE
  Content-Type: application/json
Body: raw (JSON)
```

**Request Body (Example - use wrong answer):**
```json
{
  "answer": "var myVariable = 5;",
  "hintUsed": false,
  "timeSpent": 60
}
```

#### **3.8 Get AI Hint**
```
Method: GET
URL: http://localhost:5000/api/quiz/session/SESSION_ID_FROM_STEP_3.2/hint
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN_HERE
  Content-Type: application/json
Body: None
```

#### **3.9 Submit Answer with Hint Used**
```
Method: POST
URL: http://localhost:5000/api/quiz/session/SESSION_ID_FROM_STEP_3.2/answer
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN_HERE
  Content-Type: application/json
Body: raw (JSON)
```

**Request Body:**
```json
{
  "answer": "CORRECT_ANSWER_FROM_QUESTION",
  "hintUsed": true,
  "timeSpent": 90
}
```

#### **3.10 Complete Quiz Session**
```
Method: POST
URL: http://localhost:5000/api/quiz/session/SESSION_ID_FROM_STEP_3.2/complete
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN_HERE
  Content-Type: application/json
Body: None
```

#### **3.11 Get Quiz Progress - JavaScript**
```
Method: GET
URL: http://localhost:5000/api/quiz/progress/javascript
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN_HERE
  Content-Type: application/json
Body: None
```

#### **3.12 Get Quiz Progress - React**
```
Method: GET
URL: http://localhost:5000/api/quiz/progress/react
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN_HERE
  Content-Type: application/json
Body: None
```

#### **3.13 Get Overall Quiz Statistics**
```
Method: GET
URL: http://localhost:5000/api/quiz/stats
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN_HERE
  Content-Type: application/json
Body: None
```

---

### **Step 4: Advanced AI Testing**

#### **4.1 Test AI Question Generation Directly**
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

#### **4.2 Test AI Question Generation - Advanced**
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
  "topic": "react",
  "difficulty": "advanced"
}
```

#### **4.3 Test Complete AI Flow**
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
  "topic": "javascript",
  "userLevel": "Intermediate"
}
```

#### **4.4 Test AI Answer Evaluation**
```
Method: POST
URL: http://localhost:5000/api/test/evaluate-answer
Headers:
  Content-Type: application/json
Body: raw (JSON)
```

**Request Body:**
```json
{
  "question": {
    "question": "What is the correct way to declare a variable in JavaScript?",
    "options": {
      "A": "var x = 5",
      "B": "let x = 5", 
      "C": "const x = 5",
      "D": "All of the above"
    },
    "correctAnswer": "D",
    "explanation": "All three keywords can declare variables in JavaScript"
  },
  "userAnswer": "B",
  "userExplanation": "I think let is the modern way to declare variables"
}
```

---

### **Step 5: Topic and Content Tests**

#### **5.1 Get All Topics**
```
Method: GET
URL: http://localhost:5000/api/topics/
Headers: None
Body: None
```

#### **5.2 Get Featured Topics**
```
Method: GET
URL: http://localhost:5000/api/topics/featured
Headers: None  
Body: None
```

#### **5.3 Select Topics for Learning**
```
Method: POST
URL: http://localhost:5000/api/topics/select
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN_HERE
  Content-Type: application/json
Body: raw (JSON)
```

**Request Body:**
```json
{
  "topics": ["javascript", "react"]
}
```

---

### **Step 6: Error Testing**

#### **6.1 Test Invalid Topic**
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
**Expected:** `400 Bad Request` with validation error

#### **6.2 Test Without Authentication**
```
Method: GET
URL: http://localhost:5000/api/quiz/topics
Headers:
  Content-Type: application/json
Body: None
```
**Expected:** `401 Unauthorized`

#### **6.3 Test Invalid Session ID**
```
Method: POST
URL: http://localhost:5000/api/quiz/session/invalid-id/answer
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN_HERE
  Content-Type: application/json
Body: raw (JSON)
```

**Request Body:**
```json
{
  "answer": "test",
  "timeSpent": 30
}
```
**Expected:** `400 Bad Request` with validation error

---

## 🎯 **SUCCESS INDICATORS TO CHECK**

### **✅ AI Quiz System Working:**
1. **Topics Endpoint** returns 8 topics with `aiPowered: true`
2. **Start Quiz** generates unique AI questions each time
3. **Questions** are well-formed with 4 options each
4. **Adaptive Difficulty** changes based on answers (hard → medium → easy)
5. **Bloom Progression** advances cognitive levels (Remember → Apply → Analyze)
6. **Hints** are contextual and relevant to questions
7. **Scoring** reflects performance accurately
8. **Session Management** tracks progress correctly

### **📊 Performance Expectations:**
- **Question Generation:** < 5 seconds
- **Answer Submission:** < 1 second  
- **Hint Generation:** < 2 seconds
- **Session Updates:** < 1 second

### **🔍 Quality Checks:**
- Questions are grammatically correct
- Options are plausible distractors
- Explanations make sense
- Hints provide helpful guidance
- Difficulty matches request level
- Topics are relevant to programming

---

## 🚨 **TROUBLESHOOTING GUIDE**

### **Common Issues:**

#### **Issue 1: "Invalid token"**
**Solution:** Get fresh token from login endpoint

#### **Issue 2: "AI service temporarily unavailable"**
**Solution:** Check OpenAI health endpoint first

#### **Issue 3: Questions take too long**
**Solution:** Check internet connection and OpenAI status

#### **Issue 4: Poor question quality**
**Solution:** Verify topic spelling and user level

---

## 📋 **TESTING CHECKLIST**

- [ ] Server health check passes
- [ ] OpenAI health check passes  
- [ ] User registration works
- [ ] User login returns JWT token
- [ ] Quiz topics returns 8 AI-powered topics
- [ ] JavaScript quiz starts with AI question
- [ ] React quiz starts with different AI question
- [ ] Python quiz starts with unique AI question
- [ ] Questions have proper structure (4 options)
- [ ] Correct answers advance to harder questions
- [ ] Wrong answers adjust difficulty down
- [ ] Hints are contextual and helpful
- [ ] Session completion works
- [ ] Progress tracking updates
- [ ] Statistics reflect quiz performance
- [ ] Error handling works for invalid data
- [ ] Authentication protection works

**🎉 If all items check out, your AI-powered quiz system is fully functional!**

---

## 🎯 **QUICK TEST SEQUENCE**

1. **Health** → **Register** → **Login** → **Get Token**
2. **Get Topics** → **Start JavaScript Quiz** → **Answer Questions**  
3. **Get Hints** → **Complete Session** → **Check Progress**
4. **Start React Quiz** → **Test Different Topic**
5. **Verify AI Generation** → **Check Adaptive Features**

**This comprehensive test suite will verify every aspect of your professional AI-powered quiz system! 🤖**