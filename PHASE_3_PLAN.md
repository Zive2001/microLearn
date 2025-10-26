# PHASE 3: KEYPOINT-BASED MICRO VIDEO GENERATION

## 📋 Overview
Generate real educational scripts and avatar videos for each selected keypoint instead of mock data. This is the core feature that transforms the system.

---

## 🎯 What Will Be Done

### 1. Backend Endpoint: Generate Keypoint-Based Videos
**File**: `backend/routes/microlearning.js`

**New Endpoint**:
```javascript
POST /api/microlearning/:videoId/generate-keypoint-based
{
  youtubeUrl: "https://youtube.com/watch?v=...",
  keypoints: ["Topic1", "Topic2", ...],
  teacher: "Ava"
}
```

**What It Does**:
- Extract YouTube video transcript
- For each keypoint:
  - Generate 1000+ word educational script using OpenAI
  - Generate TTS audio with lip-sync visemes using Azure TTS
  - Generate avatar video with teacher speaking
  - Save MicroVideo document with all data
- Return enriched micro-videos with real content

### 2. Background Processing Function
**File**: `backend/routes/microlearning.js`

**Function**: `generateKeyPointMicroVideos(videoId, youtubeUrl, keypoints, teacher, userId)`

**Workflow**:
```
Start Background Job
  ├─ Get/Create Video record
  ├─ Extract YouTube transcript
  ├─ For each keypoint:
  │  ├─ Call keypointScriptGenerationService
  │  │  └─ Generate 1000+ word script
  │  ├─ Call azureTtsService
  │  │  └─ Generate TTS + visemes
  │  ├─ Generate avatar video
  │  │  └─ 3D character speaking with lip-sync
  │  └─ Save MicroVideo document
  └─ Mark video as completed
```

### 3. Update MicrolearningPage
**File**: `frontend/src/pages/MicrolearningPage.jsx`

**Changes**:
- Check if `location.state?.keypoints` exists
- If YES → Call new generation endpoint
- Wait for generation to complete (polling)
- Display generated micro-videos
- If NO → Use fallback mock data

### 4. Use Existing Services
**Reuse**:
- `keypointScriptGenerationService` - Already exists, generate scripts
- `azureTtsService` - Already exists, generate audio + visemes
- `MicroVideo` model - Already exists, store data

---

## 📊 Data Flow

```
User confirms keypoints in Phase 2 modal
  ↓
Navigate to MicrolearningPage with:
  • keypoints: ["Topic1", "Topic2", ...]
  • teacher: "Ava"
  • youtubeUrl: "..."
  ↓
MicrolearningPage detects location.state?.keypoints
  ↓
Call: POST /api/microlearning/:videoId/generate-keypoint-based
  {
    youtubeUrl: "...",
    keypoints: [...],
    teacher: "Ava"
  }
  ↓
BACKEND (Background Job):
  1. Extract transcript from YouTube
  2. For each keypoint:
     a. Generate script (1000+ words)
     b. Generate TTS audio + visemes
     c. Generate avatar video (3D character)
     d. Save MicroVideo document
  3. Mark video as completed
  ↓
FRONTEND (Polling):
  • Call GET /api/videos/:videoId/status every 5 seconds
  • Check if processingStatus === "completed"
  • When done, fetch micro-videos and display
  ↓
Display micro-videos:
  • Each video has: title, script, keypoints, cognitive load
  • Avatar videos ready to play
  • Quiz system gets rich content for better questions
```

---

## 🔄 Integration with Existing Code

### Use Existing Services

**keypointScriptGenerationService.generateScriptForKeypoint()**
```javascript
// Already exists from team member's work
// Takes: keypoint, youtubeUrl, transcript
// Returns: script, wordCount, cognitiveLoad, objectives, etc.
```

**azureTtsService.generateTTSWithVisemes()**
```javascript
// Already exists
// Takes: text, teacher
// Returns: audioPath, visemes, duration
```

### Reuse MicroVideo Model
```javascript
// Already exists with all fields needed:
const microVideo = new MicroVideo({
  originalVideoId: video._id,
  title: keypoint,
  sequence: i + 1,
  cltBlmScript: {
    learningObjective: script.objective,
    keypoints: [keypoint],
    cognitiveLoad: script.cognitiveLoad,
    educationalScript: script.script,
    visualCues: script.visualCues
  },
  audioUrl: ttsResult.audioPath,
  audioProvider: 'azure',
  avatarVideoPath: avatarPath,
  avatarTeacher: teacher,
  processingStatus: 'completed'
});
```

---

## 📝 Changes Summary

### Backend Changes

**New in routes/microlearning.js**:
```javascript
// Endpoint definition
router.post('/generate-keypoint-based/:videoId', protect, ...)

// Background processing function
async function generateKeyPointMicroVideos(videoId, youtubeUrl, keypoints, teacher, userId)

// Helper function
function extractVideoId(url)
```

**No changes to**: Assessment, Quiz, Video models

### Frontend Changes

**In pages/MicrolearningPage.jsx**:
```javascript
// Check for keypoints
const hasKeypoints = location.state?.keypoints?.length > 0;

// If keypoints exist, call generation endpoint
if (hasKeypoints) {
  const response = await axios.post(
    `/api/microlearning/${videoId}/generate-keypoint-based`,
    {
      youtubeUrl: location.state.youtubeUrl,
      keypoints: location.state.keypoints,
      teacher: location.state.teacher
    }
  );
}

// Poll for completion
async function pollForGenerationCompletion(videoId, maxSeconds)

// Fallback if generation fails
content = await mockMicrolearningAPI.generateMicrolearningContent(...)
```

---

## 🎯 Key Implementation Details

### Avatar Video Generation
```
For each keypoint:
  1. Get 1000+ word educational script
  2. Convert to audio using Azure TTS
  3. Extract visemes (mouth positions) for lip-sync
  4. Create 3D avatar instance
  5. Sync avatar mouth movements with audio
  6. Add background (3D learning environment)
  7. Add visual elements (code snippets, diagrams)
  8. Render to video file
  9. Save video path in database
```

### Polling Mechanism
```javascript
// Check every 5 seconds if generation is complete
setInterval(() => {
  fetch(`/api/videos/${videoId}/status`)
  if (status === 'completed') {
    // Fetch and display micro-videos
  }
}, 5000);
```

### Error Handling
```javascript
try {
  // Generate keypoint-based content
} catch (error) {
  // Fallback to mock data
  content = mockAPI.generateContent();
  toast.warning('Using standard generation...');
}
```

---

## ✅ Checklist

- [ ] Create generation endpoint in microlearning.js
- [ ] Create background processing function
- [ ] Call keypointScriptGenerationService for scripts
- [ ] Call azureTtsService for audio + visemes
- [ ] Create avatar video for each keypoint
- [ ] Save MicroVideo documents with all data
- [ ] Update MicrolearningPage to detect keypoints
- [ ] Implement polling mechanism
- [ ] Add fallback to mock data if generation fails
- [ ] Test endpoint with cURL/Postman
- [ ] Test full flow: Modal → Generation → Display → Quiz
- [ ] Verify avatar videos play correctly
- [ ] Verify quiz gets rich content data

---

## 🧪 Testing Steps

1. **Test Endpoint Directly** (Postman)
   ```
   POST /api/microlearning/:videoId/generate-keypoint-based
   {
     "youtubeUrl": "https://youtube.com/...",
     "keypoints": ["Variable Declaration", "Scope"],
     "teacher": "Ava"
   }
   ```
   - Should return 200 with "Generation started"

2. **Monitor Logs**
   - Check backend logs for generation progress
   - Look for: Extract transcript → Generate scripts → TTS → Avatar video

3. **Check Status**
   ```
   GET /api/videos/:videoId/status
   ```
   - Should show processingStatus: "completed"

4. **Full Flow Test**
   - Go through Phase 2 modal
   - Select keypoints and teacher
   - Click Generate
   - Wait for microlearning page to load
   - See avatar video content instead of mock data
   - Click Play on video
   - Verify avatar speaks the content

5. **Quiz Integration Test**
   - After micro-videos load
   - Start a quiz
   - Verify questions are about the keypoints (not generic)
   - Check for practical examples from scripts

---

## 📊 Database Changes

### New Data in MicroVideo

```javascript
{
  // Existing fields still work
  originalVideoId: "...",
  title: "Variable Declaration",
  sequence: 1,
  timeRange: {...},

  // NEW: Real scripts instead of mock
  cltBlmScript: {
    educationalScript: "1000+ word real content",
    learningObjective: "Understand how to declare variables",
    keypoints: ["Variable Declaration"],
    cognitiveLoad: 5,
    prerequisites: ["Basic programming concepts"],
    practicalExample: "Real code example",
    visualCues: ["Show syntax highlighting", ...]
  },

  // NEW: Avatar video data
  audioUrl: "path/to/generated/audio.mp3",
  audioProvider: "azure",
  avatarVideoPath: "path/to/generated/video.mp4",
  avatarTeacher: "Ava",
  avatarVisemesCount: 247,
  avatarGeneratedAt: "2025-10-26T...",

  processingStatus: "completed"
}
```

---

## 🔗 Dependencies

**Already Installed**:
- ✅ OpenAI (for script generation)
- ✅ Azure TTS (for audio + visemes)
- ✅ YouTube transcript service
- ✅ MongoDB (for MicroVideo storage)

**No new dependencies needed**

---

## ⏱️ Estimated Time

- Create endpoint: 30 min
- Background processing function: 45 min
- Avatar video generation: 30 min
- Update MicrolearningPage: 30 min
- Polling & error handling: 20 min
- Testing & fixes: 45 min
- **Total: 4-5 hours**

---

## 🎯 Success Criteria

✅ Endpoint accepts POST request with keypoints
✅ Background generation starts without blocking response
✅ Scripts generated for each keypoint (1000+ words)
✅ TTS audio created with visemes
✅ Avatar videos generated successfully
✅ MicroVideo documents saved with all data
✅ MicrolearningPage displays real content (not mock)
✅ Avatar videos play correctly
✅ Quiz system gets rich content for better questions
✅ Fallback to mock data works if generation fails
✅ No breaking changes to existing features

---

## 📝 Summary of Changes

| Component | Change | Lines | Status |
|-----------|--------|-------|--------|
| `routes/microlearning.js` | NEW endpoint + function | +200 | ⏳ To Do |
| `pages/MicrolearningPage.jsx` | Check keypoints + polling | +100 | ⏳ To Do |
| Models | NO CHANGES | 0 | ✅ N/A |
| Services | NO CHANGES | 0 | ✅ N/A |

**Total Backend**: ~300 lines

---

**Status**: ⏳ READY TO IMPLEMENT
**Depends On**: Phase 2 completion
**Blocks**: Phase 4 (Quiz integration)

---

## 🔄 Output of Phase 3

When Phase 3 is complete:
- Users get **real** educational content instead of mock data
- Avatar videos teach the selected keypoints
- 1000+ words per keypoint (6-10 minutes of content)
- Better quiz questions based on real scripts
- Professional, personalized learning experience

---
