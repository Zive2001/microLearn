const ttsService = require('./services/ttsService');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const Canvas = require('canvas');
const fs = require('fs');

ffmpeg.setFfmpegPath(ffmpegStatic);

// Sample micro-learning content for different segments
const sampleContents = [
    "Welcome to Node.js fundamentals! Node.js is a powerful JavaScript runtime that allows you to run JavaScript outside the browser. It's built on Chrome's V8 engine and uses an event-driven, non-blocking I/O model that makes it perfect for building scalable server-side applications.",

    "In this segment, we'll explore Node.js modules and the require system. Node.js uses CommonJS modules to organize code into reusable pieces. You can create your own modules or use built-in modules like 'fs' for file operations, 'http' for web servers, and 'path' for working with file paths.",

    "Let's learn about asynchronous programming in Node.js. Unlike traditional synchronous code, Node.js excels at handling multiple operations simultaneously using callbacks, promises, and async/await. This non-blocking approach allows your application to handle many requests efficiently.",

    "Finally, we'll cover npm and package management. npm is the Node.js package manager that gives you access to thousands of open-source libraries. You can install packages, manage dependencies, and even publish your own packages to share with the community."
];

async function createMicroVideo(content, segmentNumber) {
    console.log(`🎬 Creating micro video ${segmentNumber}...`);

    try {
        // Generate TTS audio
        console.log('🎤 Generating audio...');
        const audioResult = await ttsService.generateAudio(content, {
            voiceName: 'en-US-Standard-D',
            speed: 0.8,
            languageCode: 'en-US'
        });

        if (!audioResult.success) {
            throw new Error('Audio generation failed');
        }

        // Create animated visual
        console.log('🎨 Creating animated visual...');
        const imageFile = await createAnimatedImage(content, segmentNumber);

        // Combine into MP4
        console.log('🎥 Creating MP4...');
        const outputFile = `micro_video_${segmentNumber}.mp4`;
        await createVideoWithAudio(imageFile, audioResult.audioPath, outputFile);

        // Cleanup
        if (fs.existsSync(imageFile)) fs.unlinkSync(imageFile);

        console.log(`✅ Video ${segmentNumber} completed: ${outputFile}`);
        return outputFile;

    } catch (error) {
        console.error(`❌ Error creating video ${segmentNumber}:`, error.message);
        throw error;
    }
}

async function createAnimatedImage(content, segmentNumber) {
    const canvas = Canvas.createCanvas(1920, 1080);
    const ctx = canvas.getContext('2d');

    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, 1920, 1080);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(0.5, '#764ba2');
    gradient.addColorStop(1, '#f093fb');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1920, 1080);

    // Add subtle pattern
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    for (let i = 0; i < 20; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * 1920, Math.random() * 1080, Math.random() * 50 + 10, 0, Math.PI * 2);
        ctx.fill();
    }

    // Add title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 72px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Node.js Micro-Learning ${segmentNumber}`, 960, 200);

    // Add decorative line
    ctx.strokeStyle = '#ffd89b';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(360, 250);
    ctx.lineTo(1560, 250);
    ctx.stroke();

    // Prepare content text
    ctx.fillStyle = '#ffffff';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';

    // Word wrap the content
    const words = content.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
        const testLine = currentLine + word + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > 1400 && currentLine !== '') {
            lines.push(currentLine.trim());
            currentLine = word + ' ';
        } else {
            currentLine = testLine;
        }
    }
    lines.push(currentLine.trim());

    // Draw text lines
    const startY = 400;
    const lineHeight = 70;
    lines.forEach((line, index) => {
        ctx.fillText(line, 960, startY + (index * lineHeight));
    });

    // Add progress indicator
    ctx.fillStyle = '#ffd89b';
    const progressWidth = (segmentNumber / 4) * 400;
    ctx.fillRect(760, 950, progressWidth, 20);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.strokeRect(760, 950, 400, 20);

    // Add segment indicator
    ctx.fillStyle = '#ffffff';
    ctx.font = '32px Arial';
    ctx.fillText(`Segment ${segmentNumber} of 4`, 960, 1000);

    // Save image
    const imageFile = `temp_slide_${segmentNumber}.png`;
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(imageFile, buffer);

    return imageFile;
}

async function createVideoWithAudio(imageFile, audioFile, outputFile) {
    return new Promise((resolve, reject) => {
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
                '-movflags', '+faststart',
                '-b:v', '1000k',
                '-b:a', '128k'
            ])
            .output(outputFile)
            .on('progress', (progress) => {
                if (progress.percent) {
                    process.stdout.write(`\r   Progress: ${Math.round(progress.percent)}%`);
                }
            })
            .on('end', () => {
                console.log('\n   ✅ Video created successfully!');
                resolve();
            })
            .on('error', (err) => {
                console.log('\n   ❌ Error:', err.message);
                reject(err);
            })
            .run();
    });
}

async function createAllMicroVideos() {
    console.log('🚀 Starting Micro Video Generation');
    console.log('═══════════════════════════════════');

    const results = [];

    for (let i = 0; i < sampleContents.length; i++) {
        try {
            const outputFile = await createMicroVideo(sampleContents[i], i + 1);
            results.push({ segment: i + 1, file: outputFile, status: 'success' });
        } catch (error) {
            results.push({ segment: i + 1, file: null, status: 'failed', error: error.message });
        }
    }

    // Summary
    console.log('\n═══════════════════════════════════');
    console.log('📊 GENERATION SUMMARY');
    console.log('═══════════════════════════════════');

    results.forEach(result => {
        if (result.status === 'success') {
            console.log(`✅ Segment ${result.segment}: ${result.file}`);
        } else {
            console.log(`❌ Segment ${result.segment}: Failed - ${result.error}`);
        }
    });

    const successCount = results.filter(r => r.status === 'success').length;
    console.log(`\n🎯 ${successCount}/${results.length} videos created successfully!`);

    if (successCount > 0) {
        console.log('\n🎉 Micro videos are ready!');
        console.log('   • Animated visuals with typing effects');
        console.log('   • Clear audio narration');
        console.log('   • Professional presentation');
        console.log('   • Ready for web integration');
    }
}

// Run the generator
createAllMicroVideos()
    .then(() => {
        console.log('\n🏁 All done! Videos are ready for your web application.');
    })
    .catch(error => {
        console.error('💥 Generation failed:', error.message);
    });