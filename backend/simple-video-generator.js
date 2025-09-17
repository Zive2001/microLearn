const axios = require('axios');
const fs = require('fs');
const path = require('path');
const ttsService = require('./services/ttsService');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');

ffmpeg.setFfmpegPath(ffmpegStatic);

async function generateMicroVideo() {
    console.log('🎬 Generating Micro Video...');

    try {
        // 1. Use sample content (since API is down)
        console.log('📝 Using sample content...');
        const content = "Welcome to Node.js micro-learning! In this segment, we'll explore the fundamentals of Node.js runtime environment. Node.js allows you to run JavaScript on the server side, enabling full-stack development with a single programming language. This powerful runtime is built on Chrome's V8 JavaScript engine and provides an event-driven, non-blocking I/O model that makes it lightweight and efficient.";

        console.log('✅ Content received:', content.substring(0, 100) + '...');

        // 2. Generate TTS audio
        console.log('🎤 Generating audio...');
        const audioResult = await ttsService.generateAudio(content, {
            voiceName: 'en-US-Standard-D',
            speed: 0.9,
            languageCode: 'en-US'
        });

        if (!audioResult.success) {
            throw new Error('Audio generation failed');
        }

        const audioFile = audioResult.audioPath;
        console.log('✅ Audio generated:', audioFile);

        // 3. Create animated HTML video
        console.log('🎨 Creating animated video...');
        const htmlContent = createAnimatedHTML(content);

        const htmlFile = 'temp_video.html';
        fs.writeFileSync(htmlFile, htmlContent);

        // 4. Record HTML to MP4 using simple approach
        const outputFile = 'micro_video_final.mp4';

        // Create a simple image for now, then combine with audio
        await createVideoWithAudio(content, audioFile, outputFile);

        console.log('🎉 Video created:', outputFile);

        // Cleanup
        if (fs.existsSync(htmlFile)) fs.unlinkSync(htmlFile);

        return outputFile;

    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    }
}

function createAnimatedHTML(content) {
    return `<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            font-family: Arial, sans-serif;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            padding: 20px;
            box-sizing: border-box;
        }
        .content {
            font-size: 24px;
            text-align: center;
            max-width: 800px;
            line-height: 1.6;
        }
        .typing {
            overflow: hidden;
            border-right: 2px solid white;
            white-space: nowrap;
            animation: typing 10s steps(40, end), blink 1s infinite;
        }
        @keyframes typing {
            from { width: 0 }
            to { width: 100% }
        }
        @keyframes blink {
            from, to { border-color: transparent }
            50% { border-color: white }
        }
    </style>
</head>
<body>
    <div class="content typing" id="content"></div>
    <script>
        const text = ${JSON.stringify(content)};
        const element = document.getElementById('content');
        let i = 0;

        function typeWriter() {
            if (i < text.length) {
                element.innerHTML += text.charAt(i);
                i++;
                setTimeout(typeWriter, 100);
            }
        }

        setTimeout(typeWriter, 1000);
    </script>
</body>
</html>`;
}

async function createVideoWithAudio(content, audioFile, outputFile) {
    return new Promise((resolve, reject) => {
        // Create a simple static image with the content
        const Canvas = require('canvas');
        const canvas = Canvas.createCanvas(1920, 1080);
        const ctx = canvas.getContext('2d');

        // Background gradient
        const gradient = ctx.createLinearGradient(0, 0, 1920, 1080);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1920, 1080);

        // Text
        ctx.fillStyle = 'white';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';

        // Word wrap
        const words = content.split(' ');
        const lines = [];
        let currentLine = '';

        for (const word of words) {
            const testLine = currentLine + word + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > 1600 && currentLine !== '') {
                lines.push(currentLine.trim());
                currentLine = word + ' ';
            } else {
                currentLine = testLine;
            }
        }
        lines.push(currentLine.trim());

        // Draw lines
        const startY = 400;
        lines.forEach((line, index) => {
            ctx.fillText(line, 960, startY + (index * 60));
        });

        // Save image
        const imageFile = 'temp_slide.png';
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(imageFile, buffer);

        // Create video with FFmpeg
        ffmpeg()
            .input(imageFile)
            .inputOptions(['-loop', '1'])
            .input(audioFile)
            .outputOptions([
                '-c:v', 'libx264',
                '-c:a', 'aac',
                '-r', '30',
                '-pix_fmt', 'yuv420p',
                '-shortest',
                '-movflags', '+faststart'
            ])
            .output(outputFile)
            .on('end', () => {
                // Cleanup
                if (fs.existsSync(imageFile)) fs.unlinkSync(imageFile);
                resolve();
            })
            .on('error', (err) => {
                if (fs.existsSync(imageFile)) fs.unlinkSync(imageFile);
                reject(err);
            })
            .run();
    });
}

// Run the generator
generateMicroVideo()
    .then(outputFile => {
        console.log('🎯 Success! Video created:', outputFile);
    })
    .catch(error => {
        console.error('💥 Failed:', error.message);
    });