# MicroLearn Backend Architecture & Code Flow
## Detailed Technical Documentation

---

## 🏗️ **Backend Directory Structure**

```
backend/
├── models/
│   ├── User.js              # User schema with dynamic knowledge levels
│   ├── Assessment.js        # Assessment sessions & results models
│   └── Topic.js             # Topic definitions and metadata
├── routes/
│   ├── auth.js              # Authentication endpoints
│   ├── topics.js            # Topic management APIs
│   ├── assessment.js        # Adaptive assessment APIs
│   └── microlearning.js     # Video recommendation APIs
├── services/
│   ├── assessmentAlgorithm.js   # Core adaptive testing engine
│   ├── openaiService.js         # AI question generation & analysis
│   ├── youtubeService.js        # Video search & AI evaluation
│   └── recommendationEngine.js  # Personalized content curation
├── middleware/
│   ├── auth.js              # JWT authentication middleware
│   └── validation.js       # Input validation middleware
├── utils/
│   └── assessmentUtils.js   # Assessment helper functions
└── server.js               # Main application entry point
```

---

## 🔄 **Complete Request Flow Architecture**

### **1. User Registration Flow**

```mermaid
User Registration → auth.js → User.js Model → MongoDB
    ↓
Multi-step form data validation → Profile creation → JWT token generation
    ↓
Automated topic fetching → Learning preferences setup → Dashboard redirect
```

**Code Path:**
1. **Frontend**: `Register.jsx` → **API**: `POST /api/auth/register`
2. **Backend**: `auth.js` → Input validation → Password hashing → `User.create()`
3. **Response**: JWT token + user profile → Frontend state update

### **2. Assessment Session Flow**

```mermaid
Assessment Start → assessment.js → assessmentAlgorithm.js → openaiService.js
    ↓                    ↓                     ↓                    ↓
Session Creation → Algorithm Init → Question Generation → AI Processing
    ↓
AssessmentSession Model → MongoDB Storage → Real-time State Tracking
```

**Detailed Code Flow:**

#### **Step 1: Assessment Initialization**
- **Route**: `POST /api/assessment/start`
- **Handler**: `assessment.js:startAssessment()`
- **Algorithm**: `assessmentAlgorithm.js:startAssessment()`

```javascript
// assessment.js
app.post('/start', async (req, res) => {
    const { topic, config } = req.body;
    const result = await assessmentAlgorithm.startAssessment(req.user._id, topic, config);
    res.json(result);
});

// assessmentAlgorithm.js
async startAssessment(userId, topic, config) {
    // 1. Check for existing active sessions
    // 2. Create new AssessmentSession document
    // 3. Initialize with starting difficulty (intermediate)
    // 4. Return session ID for frontend
}
```

#### **Step 2: Question Generation Loop**
- **Route**: `GET /api/assessment/:sessionId/next`
- **Algorithm Flow**:

```javascript
async getNextQuestion(sessionId) {
    // 1. Load current session state
    const session = await AssessmentSession.findOne({ sessionId });

    // 2. Calculate next difficulty based on performance
    const adjustedDifficulty = this.calculateNextDifficulty(session);

    // 3. Generate AI-powered question
    const question = await openaiService.generateQuestion(
        session.topic,
        adjustedDifficulty,
        session.questions
    );

    // 4. Store question in session
    session.questions.push(question);
    await session.save();

    return question;
}
```

#### **Step 3: Answer Processing & Adaptation**
- **Route**: `POST /api/assessment/:sessionId/answer`
- **Adaptive Logic**:

```javascript
async submitAnswer(sessionId, answer) {
    // 1. Validate and score answer
    const isCorrect = answer === question.correctAnswer;

    // 2. Update session state
    session.currentState.consecutiveCorrect = isCorrect ?
        session.currentState.consecutiveCorrect + 1 : 0;
    session.currentState.consecutiveWrong = !isCorrect ?
        session.currentState.consecutiveWrong + 1 : 0;

    // 3. Apply difficulty adjustment rules
    const newDifficulty = this.calculateNextDifficulty(session);
    session.currentState.currentDifficulty = newDifficulty;

    // 4. Check completion criteria
    if (session.currentState.questionIndex >= session.config.maxQuestions) {
        return await this.completeAssessment(sessionId);
    }
}
```

### **3. Video Recommendation Flow**

```mermaid
User Level Detection → recommendationEngine.js → youtubeService.js → openaiService.js
    ↓                           ↓                        ↓                  ↓
Skill Level Input → Personalization Logic → Video Search → AI Content Analysis
    ↓
Multi-weighted Scoring → Quality Ranking → Caching → Final Recommendations
```

**Detailed Code Path:**

#### **Step 1: Recommendation Request**
- **Route**: `GET /api/microlearning/recommendations/:topic`
- **Handler**: `microlearning.js:getRecommendations()`

#### **Step 2: User Profile Analysis**
```javascript
// recommendationEngine.js
async getPersonalizedRecommendations(userId, topic, options) {
    // 1. Fetch user assessment data
    const userProfile = await this.getUserProfile(userId, topic);

    // 2. Validate user has completed assessment
    if (!userProfile.hasAssessment) {
        throw new Error('Assessment required for personalized recommendations');
    }

    // 3. Get level-appropriate videos
    const videos = await youtubeService.searchEducationalVideos(
        topic,
        userProfile.currentLevel,
        maxVideos
    );
}
```

#### **Step 3: AI-Powered Video Analysis**
```javascript
// youtubeService.js
async searchEducationalVideos(topic, level, maxVideos) {
    // 1. Check cache for existing results
    const cacheKey = `${topic}_${level}_${maxVideos}`;
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;

    // 2. YouTube API search with optimized queries
    const searchResults = await this.searchVideosWithRetry(searchQuery);

    // 3. Get detailed video information
    const detailedVideos = await this.getVideoDetails(searchResults);

    // 4. AI analysis for educational quality
    const analyzedVideos = await this.analyzeVideosWithAI(detailedVideos, topic, level);

    // 5. Rank by quality and cache results
    const rankedVideos = this.rankVideosByQuality(analyzedVideos);
    this.setCachedResult(cacheKey, rankedVideos);

    return rankedVideos;
}
```

#### **Step 4: AI Content Quality Assessment**
```javascript
// youtubeService.js → openaiService.js
async analyzeVideoWithAI(video, topic, level) {
    const prompt = `Analyze this educational video for ${topic} at ${level} level:

    Title: ${video.title}
    Description: ${video.description}
    Duration: ${video.duration}

    Rate on scales 1-10:
    1. Educational Quality (structure, clarity, examples)
    2. Topic Relevance (how well it matches ${topic})
    3. Level Appropriateness (suitable for ${level} level)

    Respond with JSON only: {
        "educationalScore": 8,
        "relevanceScore": 9,
        "levelAppropriateness": 7,
        "overallScore": 8,
        "reasoning": "Clear explanations with practical examples"
    }`;

    const analysis = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }]
    });

    return JSON.parse(analysis.choices[0].message.content);
}
```

---

## 🧮 **Core Algorithm Implementations**

### **Adaptive Difficulty Algorithm**

```javascript
// assessmentAlgorithm.js
calculateNextDifficulty(session) {
    const { currentDifficulty, consecutiveCorrect, consecutiveWrong } = session.currentState;

    // Get performance metrics for current level
    const currentLevelQuestions = session.questions.filter(
        q => q.difficulty === currentDifficulty && q.answeredAt
    );

    // Calculate level-specific accuracy
    const currentLevelAccuracy = currentLevelQuestions.filter(q => q.isCorrect).length /
                                currentLevelQuestions.length;

    // Difficulty increase conditions
    if (consecutiveCorrect >= 2 && currentLevelAccuracy >= 0.75) {
        if (currentDifficulty === 'beginner') return 'intermediate';
        if (currentDifficulty === 'intermediate') return 'advanced';
    }

    // Difficulty decrease conditions
    if (consecutiveWrong >= 2 || currentLevelAccuracy < 0.40) {
        if (currentDifficulty === 'advanced') return 'intermediate';
        if (currentDifficulty === 'intermediate') return 'beginner';
    }

    return currentDifficulty;
}
```

### **Multi-Weighted Recommendation Scoring**

```javascript
// recommendationEngine.js
applyPersonalizationScoring(videos, userProfile) {
    return videos.map(video => {
        const scores = {
            levelMatch: this.calculateLevelMatch(video, userProfile.currentLevel),
            topicRelevance: video.aiAnalysis.relevanceScore / 10,
            educationalQuality: video.aiAnalysis.educationalScore / 10,
            userPreferences: this.calculatePreferenceMatch(video, userProfile)
        };

        // Apply weighted scoring
        const personalizedScore =
            (scores.levelMatch * this.weights.levelMatch) +
            (scores.topicRelevance * this.weights.topicRelevance) +
            (scores.educationalQuality * this.weights.educationalQuality) +
            (scores.userPreferences * this.weights.userPreferences);

        return { ...video, personalizedScore, scoringBreakdown: scores };
    });
}
```

---

## 🔧 **Service Layer Architecture**

### **assessmentAlgorithm.js - Core Assessment Engine**

**Primary Functions:**
- `startAssessment()` - Initialize new assessment session
- `getNextQuestion()` - Generate adaptive questions
- `submitAnswer()` - Process answers and adjust difficulty
- `calculateNextDifficulty()` - Adaptive algorithm core
- `completeAssessment()` - Finalize and score assessment
- `updateUserKnowledgeLevel()` - Update user skill data

**Key Features:**
- Real-time performance tracking
- Intelligent difficulty progression
- Comprehensive performance metrics
- Level determination algorithm

### **openaiService.js - AI Question & Analysis Engine**

**Primary Functions:**
- `generateQuestion()` - Create contextual assessment questions
- `evaluateAnswer()` - Enhanced answer analysis with explanations
- `generateLearningRecommendations()` - Post-assessment study plans
- `analyzeVideoContent()` - Educational content quality assessment

**Key Features:**
- Context-aware question generation
- Topic-specific question pools
- Anti-repetition algorithms
- Educational quality analysis

### **youtubeService.js - Video Search & Analysis**

**Primary Functions:**
- `searchEducationalVideos()` - Level-appropriate video search
- `analyzeVideosWithAI()` - AI-powered content evaluation
- `filterEducationalContent()` - Quality filtering algorithms
- `rankVideosByQuality()` - Multi-factor video ranking

**Key Features:**
- Intelligent caching (30-minute timeout)
- Rate limiting and quota optimization
- Fallback content for API failures
- Educational quality scoring

### **recommendationEngine.js - Personalization Engine**

**Primary Functions:**
- `getPersonalizedRecommendations()` - Main recommendation logic
- `getUserProfile()` - User assessment data aggregation
- `applyPersonalizationScoring()` - Multi-weighted scoring
- `generateLearningPath()` - Progressive content sequencing

**Key Features:**
- Multi-parameter personalization
- Learning preference integration
- Progressive difficulty sequencing
- Alternative level content inclusion

---

## 🔐 **Authentication & Middleware Flow**

### **JWT Authentication Pipeline**

```javascript
// middleware/auth.js
const protect = async (req, res, next) => {
    // 1. Extract token from Authorization header
    const token = req.headers.authorization?.replace('Bearer ', '');

    // 2. Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Fetch current user data
    const user = await User.findById(decoded.id).select('-password');

    // 4. Attach user to request object
    req.user = user;
    next();
};

// Applied to protected routes
router.get('/profile', protect, getUserProfile);
router.post('/assessment/start', protect, startAssessment);
```

---

## 📊 **Data Flow & State Management**

### **Assessment Session State Tracking**

```javascript
// Real-time session state structure
{
    sessionId: "unique-session-id",
    currentState: {
        questionIndex: 5,
        currentDifficulty: "intermediate",
        consecutiveCorrect: 2,
        consecutiveWrong: 0,
        totalQuestions: 5,
        correctAnswers: 4
    },
    performance: {
        overallAccuracy: 80,
        averageTimePerQuestion: 45,
        beginnerAccuracy: 100,
        intermediateAccuracy: 75,
        advancedAccuracy: 0
    }
}
```

### **User Knowledge Level Updates**

```javascript
// Dynamic knowledge level storage
user.knowledgeLevels = {
    "javascript": {
        level: "Intermediate",
        score: 78,
        assessedAt: "2025-01-15T10:30:00Z"
    },
    "react": {
        level: "Professional",
        score: 89,
        assessedAt: "2025-01-14T15:45:00Z"
    }
}
```

---

## 🚀 **Performance Optimizations**

### **Caching Strategy**
- **Video Recommendations**: 30-minute cache to reduce YouTube API calls
- **AI Analysis Results**: Permanent cache for analyzed videos
- **User Sessions**: In-memory session state for real-time performance

### **API Optimization**
- **YouTube API**: Reduced from 25 to 5 results per query (95% quota reduction)
- **OpenAI API**: Batch processing and smart retry logic
- **Database Queries**: Indexed fields and optimized aggregation pipelines

### **Scalability Features**
- **Modular Service Architecture**: Independent, testable components
- **Flexible Data Models**: Schema.Types.Mixed for dynamic content
- **Efficient State Management**: Minimal database writes during assessment

---

## 🔗 **Inter-Service Communication**

### **Service Dependency Graph**

```
assessmentAlgorithm.js ←→ openaiService.js (Question Generation)
        ↓
recommendationEngine.js ←→ youtubeService.js (Video Search)
        ↓
youtubeService.js ←→ openaiService.js (Content Analysis)
        ↓
All Services ←→ MongoDB Models (Data Persistence)
```

### **Error Handling & Fallbacks**

```javascript
// Comprehensive error handling with fallbacks
try {
    const aiAnalysis = await openaiService.analyzeVideo(video);
    return { ...video, aiAnalysis };
} catch (error) {
    console.error('AI analysis failed:', error);
    // Fallback to basic scoring
    return {
        ...video,
        aiAnalysis: {
            educationalScore: 5,
            relevanceScore: 5,
            levelAppropriateness: 5,
            reasoning: 'Basic scoring applied due to AI service unavailability'
        }
    };
}
```

---

This architecture provides a robust, scalable, and maintainable foundation for the MicroLearn platform, with intelligent algorithms, comprehensive error handling, and optimal performance characteristics.