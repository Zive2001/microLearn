# 🧪 Video Processing Test Endpoints

**Server URL:** `http://localhost:5000`

## 📋 Test Endpoints Overview

All these endpoints **bypass authentication** and use a mock test user automatically.

### 1. 🏥 Health Check
```http
GET http://localhost:5000/api/test-videos/health
```
**Purpose:** Check if all services (transcript extraction, OpenAI, database) are working.

---

### 2. 🎬 Process YouTube Video (Direct URL)
```http
POST http://localhost:5000/api/test-videos/process
Content-Type: application/json

{
  "url": "https://www.youtube.com/watch?v=PkZNo7MFNFg",
  "title": "Learn JavaScript Fundamentals",
  "topic": "javascript"
}
```
**Purpose:** Process a complete YouTube URL directly.

---

### 3. 🎯 Process YouTube Video (Video ID Only)
```http
POST http://localhost:5000/api/test-videos/process-videoid
Content-Type: application/json

{
  "videoId": "PkZNo7MFNFg",
  "topic": "javascript",
  "title": "JavaScript Basics Test"
}
```
**Purpose:** Process using just the video ID (simulates recommendation flow).

---

### 4. 📊 Check Processing Status
```http
GET http://localhost:5000/api/test-videos/{VIDEO_ID}/status
```
**Purpose:** Check if video processing is pending/processing/completed/failed.

**Example:** Replace `{VIDEO_ID}` with the actual MongoDB ObjectId returned from step 2 or 3.

---

### 5. 🎥 Get Micro-Learning Videos
```http
GET http://localhost:5000/api/test-videos/{VIDEO_ID}/micro-videos
```
**Purpose:** Get all segmented micro-learning chunks for a completed video.

---

### 6. 📁 Get All Processed Videos
```http
GET http://localhost:5000/api/test-videos/all
```
**Purpose:** See all videos processed by the test user.

---

### 7. 🧹 Clean Up Test Data
```http
DELETE http://localhost:5000/api/test-videos/cleanup
```
**Purpose:** Delete all test videos and micro-videos from database.

---

## 🎮 Step-by-Step Testing Guide

### **Step 1: Health Check**
```bash
curl -X GET http://localhost:5000/api/test-videos/health
```
Expected: All services should show as available/healthy.

### **Step 2: Process a Video**
**Good test videos (short, educational, with transcripts):**
- `PkZNo7MFNFg` - JavaScript crash course (short)
- `W6NZfCO5SIk` - JavaScript tutorial
- `hdI2bqOjy3c` - JavaScript basics

```bash
curl -X POST http://localhost:5000/api/test-videos/process-videoid \
  -H "Content-Type: application/json" \
  -d '{
    "videoId": "PkZNo7MFNFg",
    "topic": "javascript",
    "title": "JavaScript Test Video"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Video processing started successfully",
  "data": {
    "videoId": "60f7b3b3b3b3b3b3b3b3b3b3",
    "youtubeVideoId": "PkZNo7MFNFg",
    "status": "pending",
    "title": "JavaScript Test Video",
    "topic": "javascript"
  }
}
```

### **Step 3: Monitor Processing**
Use the `videoId` from Step 2:
```bash
curl -X GET http://localhost:5000/api/test-videos/60f7b3b3b3b3b3b3b3b3b3b3/status
```

**Status progression:**
- `pending` → `processing` → `completed` (or `failed`)
- Processing usually takes 2-5 minutes

### **Step 4: Get Micro-Videos**
Once status is `completed`:
```bash
curl -X GET http://localhost:5000/api/test-videos/60f7b3b3b3b3b3b3b3b3b3b3/micro-videos
```

Expected: Array of micro-video segments with learning objectives and YouTube embed URLs.

---

## 🔍 What Happens Behind the Scenes

1. **Transcript Extraction** - Downloads transcript from YouTube
2. **CLT-bLM Analysis** - Uses OpenAI to analyze content for optimal learning
3. **Segmentation** - Breaks video into 5-10 minute chunks
4. **Learning Scripts** - Generates learning objectives and key points
5. **Storage** - Saves everything to MongoDB

---

## 🚨 Troubleshooting

### **Common Issues:**

**1. "No transcript found"**
- Video doesn't have captions/transcript available
- Try different video IDs from the suggested list

**2. "OpenAI API error"**
- Check if `OPENAI_API_KEY` is set in `.env`
- Verify API key has sufficient credits

**3. "Processing failed"**
- Check server logs in terminal
- Try the health check endpoint first

**4. "Video not found"**
- Make sure you're using the correct MongoDB ObjectId
- Check if video processing completed successfully

---

## 📊 Expected Response Examples

### Health Check Response:
```json
{
  "success": true,
  "message": "Video processing health check",
  "services": {
    "transcriptService": { "available": true },
    "openaiService": { "healthy": true },
    "database": { "connected": true }
  }
}
```

### Micro-Videos Response:
```json
{
  "success": true,
  "data": {
    "parentVideo": {
      "title": "JavaScript Test Video",
      "duration": "15m 30s",
      "topic": "javascript"
    },
    "microVideos": [
      {
        "id": "60f7...",
        "title": "JavaScript - Part 1",
        "sequence": 1,
        "timeRange": { "start": "0:00", "end": "5:00" },
        "learningObjective": "Understand JavaScript variables and data types",
        "keypoints": ["Variables", "Data types", "Basic syntax"],
        "youtubeEmbedUrl": "https://www.youtube.com/embed/PkZNo7MFNFg?start=0&end=300"
      }
    ]
  }
}
```

---

## ⚡ Quick Test Commands

**One-liner to test everything:**
```bash
# 1. Health check
curl http://localhost:5000/api/test-videos/health && echo

# 2. Process video
curl -X POST http://localhost:5000/api/test-videos/process-videoid \
  -H "Content-Type: application/json" \
  -d '{"videoId":"PkZNo7MFNFg","topic":"javascript","title":"Test"}' && echo

# 3. Check all videos
curl http://localhost:5000/api/test-videos/all && echo
```

Happy testing! 🚀