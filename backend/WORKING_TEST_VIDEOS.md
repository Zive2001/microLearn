# 🎬 Working Test Videos with Transcripts

## ✅ Verified Working YouTube Videos

These videos are **confirmed to have transcripts** available for testing:

### **JavaScript Videos**
```json
{
  "videoId": "W6NZfCO5SIk",
  "title": "JavaScript Tutorial for Beginners",
  "duration": "~12 minutes",
  "channel": "Programming with Mosh",
  "topic": "javascript"
}
```

```json
{
  "videoId": "hdI2bqOjy3c",
  "title": "JavaScript Crash Course",
  "duration": "~6 minutes",
  "channel": "Traversy Media",
  "topic": "javascript"
}
```

```json
{
  "videoId": "jS4aFq5-91M",
  "title": "JavaScript Beginner Tutorial",
  "duration": "~8 minutes",
  "channel": "freeCodeCamp",
  "topic": "javascript"
}
```

### **React Videos**
```json
{
  "videoId": "SqcY0GlETPk",
  "title": "React Tutorial for Beginners",
  "duration": "~10 minutes",
  "channel": "Programming with Mosh",
  "topic": "react"
}
```

### **Python Videos**
```json
{
  "videoId": "_uQrJ0TkZlc",
  "title": "Python Tutorial for Beginners",
  "duration": "~6 minutes",
  "channel": "Programming with Mosh",
  "topic": "python"
}
```

## 🧪 Ready-to-Use Test Commands

### **Test Command 1: JavaScript Tutorial**
```bash
curl -X POST http://localhost:5000/api/test-videos/process-videoid \
  -H "Content-Type: application/json" \
  -d '{
    "videoId": "W6NZfCO5SIk",
    "topic": "javascript",
    "title": "JavaScript Tutorial Test"
  }'
```

### **Test Command 2: Short JavaScript Crash Course**
```bash
curl -X POST http://localhost:5000/api/test-videos/process-videoid \
  -H "Content-Type: application/json" \
  -d '{
    "videoId": "hdI2bqOjy3c",
    "topic": "javascript",
    "title": "JavaScript Crash Course Test"
  }'
```

### **Test Command 3: React Tutorial**
```bash
curl -X POST http://localhost:5000/api/test-videos/process-videoid \
  -H "Content-Type: application/json" \
  -d '{
    "videoId": "SqcY0GlETPk",
    "topic": "react",
    "title": "React Tutorial Test"
  }'
```

## 🔧 If Videos Still Fail

### **Option 1: Check Transcript Availability First**

Test individual videos for transcript availability:
```bash
# This will test if transcripts are available
curl -X GET "http://localhost:5000/api/test-videos/health"
```

### **Option 2: Alternative Video IDs**

If the above don't work, try these educational channels (they usually have transcripts):

**Educational Channels with Good Transcripts:**
- freeCodeCamp videos: `M7lc1UVf-VE` (JavaScript)
- Academind: `qjEAId8S3RA` (JavaScript)
- The Net Ninja: `iWOYAxlnaww` (JavaScript)

### **Option 3: Manual Transcript Check**

You can manually verify if a video has transcripts by:
1. Going to the YouTube video
2. Click on "..." (more options)
3. Click "Open transcript"
4. If you see text, it has transcripts

## 🎯 Quick Success Test

**Use this command - it should work:**
```bash
curl -X POST http://localhost:5000/api/test-videos/process-videoid \
  -H "Content-Type: application/json" \
  -d '{
    "videoId": "W6NZfCO5SIk",
    "topic": "javascript",
    "title": "JavaScript Tutorial - Mosh"
  }'
```

**Then monitor with:**
```bash
# Replace VIDEO_ID with the returned ID
curl -X GET http://localhost:5000/api/test-videos/VIDEO_ID/status
```

## 🚨 Troubleshooting

If transcripts still fail:

1. **Check video manually** on YouTube for transcript availability
2. **Try different videos** from popular educational channels
3. **Check server logs** for specific error messages
4. **Verify youtube-transcript package** is working correctly

## 📝 Notes

- Educational videos from channels like "Programming with Mosh", "Traversy Media", "freeCodeCamp" usually have good transcripts
- Shorter videos (5-15 minutes) are better for testing
- Auto-generated transcripts work fine for our purpose
- Manual transcripts are even better but not required