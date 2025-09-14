# 🚀 Complete Postman Testing Guide for MicroLearn Video Processing

## 📁 **Import the Postman Collection**

1. **Import the collection file:** `Postman_Collection_MicroLearn_VideoProcessing.json`
2. **Set the base URL variable:** `http://localhost:3001`

---

## 🔧 **Step 1: Start Server**

```bash
# Make sure server is running on port 3001
PORT=3001 npm start
```

**Expected Output:**
```
🚀 Server running on port 3001
🌍 Environment: development
```

---

## 🧪 **Step 2: Test Sequence in Postman**

### **A. Health Check (GET)**
- **URL:** `http://localhost:3001/api/test-videos/health`
- **Method:** GET
- **Expected Response:**
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

### **B. Process Video (POST)**
- **URL:** `http://localhost:3001/api/test-videos/process`
- **Method:** POST
- **Headers:** `Content-Type: application/json`
- **Body (Raw JSON):**
```json
{
  "url": "https://youtu.be/W6NZfCO5SIk",
  "title": "JavaScript Tutorial for Beginners",
  "topic": "javascript"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Video processing started successfully",
  "data": {
    "videoId": "60f7b3b3b3b3b3b3b3b3b3b3",
    "youtubeVideoId": "W6NZfCO5SIk",
    "status": "pending",
    "title": "JavaScript Tutorial for Beginners",
    "topic": "javascript",
    "estimatedProcessingTime": "5-8 minutes"
  }
}
```

**⚠️ SAVE THE `videoId` FROM RESPONSE** - You'll need it for next steps!

### **C. Check Processing Status (GET)**
- **URL:** `http://localhost:3001/api/test-videos/{VIDEO_ID}/status`
- **Method:** GET
- **Replace `{VIDEO_ID}` with the videoId from step B**

**Expected Status Progression:**
1. `"pending"` (initial)
2. `"processing"` (transcript extraction + OpenAI analysis)
3. `"completed"` (success) or `"failed"` (error)

### **D. Get Micro Videos (GET)**
- **URL:** `http://localhost:3001/api/test-videos/{VIDEO_ID}/micro-videos`
- **Method:** GET
- **Only works when status is `"completed"`**

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "title": "JavaScript Fundamentals - Part 1",
      "sequence": 1,
      "timeRange": {
        "startTime": 0,
        "endTime": 420,
        "duration": 420
      },
      "cltBlmScript": {
        "learningObjective": "Understand JavaScript variables and data types",
        "keypoints": ["Variables", "Data types", "String operations"],
        "educationalScript": "In this segment, we'll explore...",
        "practicalExample": "Real-world use case example",
        "difficulty": "Beginner",
        "cognitiveLoad": 4
      },
      "segmentTranscript": "Welcome to JavaScript tutorial..."
    }
  ]
}
```

---

## 📋 **Working Test Videos (Confirmed)**

### **Option 1: JavaScript - 12 minutes**
```json
{
  "url": "https://youtu.be/W6NZfCO5SIk",
  "title": "JavaScript Tutorial - Mosh",
  "topic": "javascript"
}
```

### **Option 2: JavaScript Crash Course - 6 minutes**
```json
{
  "url": "https://youtu.be/hdI2bqOjy3c",
  "title": "JavaScript Crash Course",
  "topic": "javascript"
}
```

### **Option 3: React - 2 minutes (fastest)**
```json
{
  "url": "https://youtu.be/Tn6-PIqc4UM",
  "title": "React in 100 Seconds",
  "topic": "react"
}
```

### **Option 4: Your URL Format**
```json
{
  "url": "https://youtu.be/Ihy0QziLDf0?si=ZCgR_-d5ekl2z70E",
  "title": "Your Video Title",
  "topic": "javascript"
}
```

---

## 🚨 **Troubleshooting**

### **Problem: "processing status: failed"**
**Solutions:**
1. Check server logs for specific error
2. Try a different video URL
3. Verify OpenAI API key has credits
4. Use shorter videos (under 15 minutes)

### **Problem: "Database connection failed"**
**Solutions:**
1. The system works without database for testing
2. Check MongoDB Atlas IP whitelist
3. Use local MongoDB: `mongodb://localhost:27017/microLearnDB`

### **Problem: "Invalid YouTube URL"**
**Solutions:**
1. Use exact JSON format shown above
2. Ensure URL starts with `https://`
3. Test with confirmed working URLs first

### **Problem: "Empty micro-videos response"**
**Causes:**
- Processing failed (check status endpoint)
- Database not saving data
- Video has no transcript available

---

## 🎯 **Quick Success Test**

**Use this exact request in Postman:**

**Method:** POST
**URL:** `http://localhost:3001/api/test-videos/process`
**Headers:** `Content-Type: application/json`
**Body:**
```json
{
  "url": "https://youtu.be/Tn6-PIqc4UM",
  "title": "React Quick Test",
  "topic": "react"
}
```

This should process in ~2-3 minutes since it's only a 2-minute video.

---

## 📊 **Expected Processing Timeline**

- **2-minute video:** ~2-3 minutes processing
- **6-minute video:** ~3-5 minutes processing
- **12-minute video:** ~5-8 minutes processing

**Steps during processing:**
1. Transcript extraction (1-2 minutes)
2. OpenAI analysis (1-3 minutes)
3. Micro-video generation (30 seconds)

---

## ✅ **Success Indicators**

- Health check shows all services healthy
- Process request returns `videoId`
- Status progresses: pending → processing → completed
- Micro-videos endpoint returns array with educational content
- Each micro-video has `cltBlmScript` with learning objectives

The system creates educational micro-content optimized for learning, not just video segments!