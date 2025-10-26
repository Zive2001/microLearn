# Phase 3: Quick Reference Guide

## 🎯 Phase 3 In One Sentence
**Transform mock educational videos into real, personalized AI-generated avatar videos with educational scripts based on user-selected learning topics.**

---

## 📊 Current State → Phase 3 State

### BEFORE PHASE 3
```
User selects keypoints
         ↓
Sees HARDCODED MOCK videos
("Here is some generic learning content...")
         ↓
Quiz asks GENERIC questions
("What is a variable?")
```

### AFTER PHASE 3
```
User selects keypoints
         ↓
Generates REAL videos
(3D Ava speaks about the topic for 6+ minutes)
         ↓
Quiz asks SPECIFIC questions from the script
("Why do we need variables for memory allocation?")
```

---

## 🔧 What Gets Built

### 1. NEW BACKEND ENDPOINT
```
POST /api/microlearning/:videoId/generate-keypoint-based

Request:
{
  youtubeUrl: "https://youtube.com/...",
  keypoints: ["Variable Declaration", "Scope"],
  teacher: "Ava"
}

Response:
{
  status: "started",
  message: "Generation started..."
}

// Processes in background for 2-5 minutes
// Then returns when done
```

### 2. BACKGROUND PROCESSING FUNCTION
```
For each keypoint:
  1. Extract YouTube transcript → Get source material
  2. Generate script (OpenAI) → 1000+ words about topic
  3. Generate TTS audio (Azure) → Teacher's voice saying script
  4. Generate avatar video (3D) → 3D teacher lip-syncing to audio
  5. Save to database → Store for playback

Repeat for all keypoints selected
```

### 3. FRONTEND POLLING
```
MicrolearningPage:
  • Detects location.state.keypoints
  • Calls generation endpoint
  • Polls status every 5 seconds
  • Shows "Generating..." while waiting
  • Displays real videos when done
```

---

## 📈 Data Flow

```
PHASE 2 OUTPUT                    PHASE 3 INPUT
┌──────────────────────┐          ┌──────────────────────────┐
│ User Selections:     │          │ Generation Endpoint:     │
│ • Keypoints: [...]   │  ─────→  │ • Receives data          │
│ • Teacher: "Ava"     │          │ • Starts generation      │
│ • youtubeUrl: "..."  │          │ • Returns 200 OK         │
└──────────────────────┘          └──────────────────────────┘
                                          ↓
                                  ┌──────────────────────────┐
                                  │ Backend Processing:      │
                                  │ 1. Extract transcript    │
                                  │ 2. For each keypoint:    │
                                  │    - Generate script     │
                                  │    - Generate audio      │
                                  │    - Generate video      │
                                  │    - Save MicroVideo doc │
                                  │ 3. Mark completed        │
                                  └──────────────────────────┘
                                          ↓
                          PHASE 3 OUTPUT (DATABASE)
                          ┌──────────────────────────┐
                          │ MicroVideo Documents:    │
                          │ • Real scripts (1000+w)  │
                          │ • Audio files (Azure)    │
                          │ • Avatar videos (3D)     │
                          │ • Learning objectives    │
                          │ • Code examples          │
                          └──────────────────────────┘
                                   ↓ PHASE 4
                          ┌──────────────────────────┐
                          │ Quiz System Uses:        │
                          │ • Real content           │
                          │ • Better questions       │
                          │ • Practical examples     │
                          └──────────────────────────┘
```

---

## 🛠️ Implementation Checklist

### Backend (routes/microlearning.js)
```javascript
☐ Create new endpoint: POST /api/microlearning/:videoId/generate-keypoint-based
☐ Implement generateKeyPointMicroVideos() function
☐ Extract YouTube transcript
☐ Loop through each keypoint:
  ☐ Call keypointScriptGenerationService
  ☐ Call azureTtsService
  ☐ Generate 3D avatar video
  ☐ Save MicroVideo document
☐ Handle errors with fallback
☐ Return status messages
```

### Frontend (MicrolearningPage.jsx)
```javascript
☐ Detect location.state?.keypoints
☐ If keypoints exist:
  ☐ Call generation endpoint
  ☐ Show loading/generating message
  ☐ Poll status every 5 seconds
  ☐ Fetch completed videos
  ☐ Display real content
☐ If no keypoints:
  ☐ Use existing mock behavior
☐ Add error handling/fallback
```

### Testing
```
☐ Test endpoint with Postman
☐ Check backend logs during generation
☐ Verify status returns 200
☐ Monitor database for MicroVideo docs
☐ Full flow test: Modal → Generation → Display
☐ Verify avatar videos play
☐ Test quiz gets real content
☐ Test fallback if error
```

---

## 📊 Services Used

### Already Available ✅
```
keypointScriptGenerationService
  ├─ Function: generateScriptForKeypoint()
  ├─ Input: keypoint, youtubeUrl, transcript
  └─ Output: 1000+ word script, objective, cognitive load, examples

azureTtsService
  ├─ Function: generateTTSWithVisemes()
  ├─ Input: text, teacher name
  └─ Output: audio path, visemes (lip-sync data), duration

YouTube Transcript API
  ├─ Function: Extract transcript from URL
  ├─ Input: youtubeUrl
  └─ Output: Full transcript text

MicroVideo Model
  ├─ Already has all fields needed
  ├─ No schema changes required
  └─ Ready to store real data
```

### No New Dependencies Needed ✅

---

## ⏱️ Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| Phase 1 | 2 hours | ✅ Complete |
| Phase 2 | 2.5 hours | ✅ Complete |
| Phase 3 | 4-5 hours | ⏳ Next |
| Phase 4-6 | 7-12 hours | ⏳ After Phase 3 |

---

## 🎯 Key Implementation Points

### Endpoint Design
```javascript
// Fast response - returns immediately
// Processing happens in background
// Frontend polls for completion

POST /api/microlearning/:videoId/generate-keypoint-based
  ↓
200 OK { status: "started" }
  ↓
Backend starts async job
  ↓
Frontend polls: GET /api/videos/:videoId/status
  ↓
When status = "completed"
  ↓
Fetch MicroVideos and display
```

### For Each Keypoint
```
1. Extract relevant parts of YouTube transcript
2. Feed to keypointScriptGenerationService
   → Get 1000+ word educational script
3. Feed script to azureTtsService
   → Get audio + mouth movements (visemes)
4. Generate 3D avatar video
   → Sync avatar mouth with audio
   → Add learning environment background
   → Render to MP4
5. Save MicroVideo document with all data
```

### Polling Strategy
```javascript
// Check every 5 seconds for up to 2 minutes
// If still generating after 2 minutes:
//   - Show extended wait message OR
//   - Fall back to mock data OR
//   - Let user try again later

setInterval(() => {
  GET /api/videos/:videoId/status
  if (status === "completed") {
    clearInterval()
    Display real videos
  }
}, 5000) // Every 5 seconds
```

### Error Handling
```javascript
try {
  // Generate real content
  const response = await axios.post(
    `/api/microlearning/${videoId}/generate-keypoint-based`,
    { youtubeUrl, keypoints, teacher }
  );

  // Poll for completion
  await pollForCompletion(videoId);

  // Fetch and display
  const videos = await fetchMicrovideos(videoId);
  setContent(videos);

} catch (error) {
  // Fall back to mock data
  console.warn('Generation failed, using mock');
  const mock = await mockAPI.generateContent();
  setContent(mock);
}
```

---

## 📊 Database Changes

### MicroVideo Document Structure

**New/Updated Fields**:
```javascript
{
  // From Phase 2
  originalVideoId: "...",
  title: "Variable Declaration",  // ← User's selected keypoint
  sequence: 1,

  // NEW: Real Educational Content
  cltBlmScript: {
    educationalScript: "1000+ word real script...",  // ← OpenAI generated
    learningObjective: "Learn variable declaration",  // ← OpenAI generated
    keypoints: ["Variable Declaration"],
    cognitiveLoad: 5,  // ← Calculated
    prerequisites: ["Basic programming"],  // ← OpenAI generated
    practicalExample: "Real code example...",  // ← OpenAI generated
    visualCues: ["Highlight variable names", "Show memory"]  // ← OpenAI
  },

  // NEW: Real Audio
  audioUrl: "path/to/azure/audio.mp3",  // ← Azure TTS
  audioProvider: "azure",

  // NEW: Real Avatar Video
  avatarVideoPath: "path/to/avatar/video.mp4",  // ← Generated 3D
  avatarTeacher: "Ava",  // ← User selected
  avatarVisemesCount: 247,  // ← From Azure
  avatarGeneratedAt: "2025-10-26T...",

  processingStatus: "completed"
}
```

---

## 🔗 How It Connects

```
PHASE 1                   PHASE 2                    PHASE 3
(Keypoint Extraction)     (User Selection)           (Video Generation)

Videos show 3 topics  →   User selects 3-4    →    Generates real videos
per card                  + teacher choice          based on selection

                          Data passed via           Receives data via
                          location.state            POST request

                                                    Uses existing services:
                                                    • Script generation
                                                    • TTS audio
                                                    • Avatar video rendering

                                                    Returns real content
                                                    instead of mock
```

---

## ✅ Success Looks Like

✅ User selects 3-4 keypoints + teacher in modal
✅ Clicks "Generate Learning Content"
✅ Navigation to MicrolearningPage
✅ Page shows "Generating your personalized content..."
✅ After 1-2 minutes: Real avatar videos appear
✅ Can see 3D teacher (Ava) speaking about topics
✅ Videos have professional educational scripts
✅ Quiz questions are about the specific scripts (not generic)
✅ No mock data visible
✅ No errors in console

---

## 🚀 When to Move to Phase 4

Phase 4 (Quiz Enhancement) should start when:
- ✅ All Phase 3 avatar videos generating successfully
- ✅ MicroVideo documents storing real content
- ✅ Frontend displays real videos (not mock)
- ✅ No errors in logs
- ✅ Tested with 3+ different keypoint combinations

---

## 📞 Questions?

Refer to:
- **Full Details**: PHASE_3_IMPLEMENTATION_SUMMARY.md
- **Original Plan**: PHASE_3_PLAN.md
- **Architecture**: See system diagrams in summary file

---

## 🎉 Timeline

**Phase 3 Duration**: 4-5 hours
**When**: After Phase 1-2 (COMPLETE ✅)
**What**: Real video generation
**Impact**: Transforms system from mock to production-ready

Ready to start? ✅ Let's build Phase 3!
