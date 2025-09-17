const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const Canvas = require('canvas');
const fs = require('fs');

ffmpeg.setFfmpegPath(ffmpegStatic);

async function createVideoFromExistingAudio() {
    console.log('🎬 Creating video from existing audio files...');

    // Use the latest 4 audio files
    const audioFiles = fs.readdirSync('generated-audio/')
        .filter(f => f.startsWith('tts_web_') && f.endsWith('.wav'))
        .sort()
        .slice(-4);

    console.log('📁 Found audio files:', audioFiles);

    for (let i = 0; i < audioFiles.length; i++) {
        const audioFile = `generated-audio/${audioFiles[i]}`;
        const segmentNumber = i + 1;

        console.log(`\n🎥 Creating video ${segmentNumber}...`);

        try {
            // Create simple image
            const imageFile = await createSimpleImage(segmentNumber);

            // Create video
            const outputFile = `simple_video_${segmentNumber}.mp4`;
            await combineImageAndAudio(imageFile, audioFile, outputFile);

            // Cleanup
            if (fs.existsSync(imageFile)) fs.unlinkSync(imageFile);

            console.log(`✅ Video ${segmentNumber} completed: ${outputFile}`);

        } catch (error) {
            console.error(`❌ Error creating video ${segmentNumber}:`, error.message);
        }
    }

    console.log('\n🎉 All videos created!');
}

async function createSimpleImage(segmentNumber) {
    const canvas = Canvas.createCanvas(1920, 1080);
    const ctx = canvas.getContext('2d');

    // Background
    const gradient = ctx.createLinearGradient(0, 0, 1920, 1080);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1920, 1080);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 80px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Micro Video ${segmentNumber}`, 960, 400);

    // Subtitle
    ctx.font = '48px Arial';
    ctx.fillText('Node.js Learning Content', 960, 500);

    // Progress
    ctx.font = '32px Arial';
    ctx.fillText(`Segment ${segmentNumber} of 4`, 960, 700);

    const imageFile = `temp_image_${segmentNumber}.png`;
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(imageFile, buffer);

    return imageFile;
}

async function combineImageAndAudio(imageFile, audioFile, outputFile) {
    return new Promise((resolve, reject) => {
        console.log(`   🔄 Processing ${audioFile}...`);

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
            .on('progress', (progress) => {
                if (progress.percent) {
                    process.stdout.write(`\r   Progress: ${Math.round(progress.percent)}%`);
                }
            })
            .on('end', () => {
                console.log('\n   ✅ Done!');
                resolve();
            })
            .on('error', (err) => {
                console.log('\n   ❌ Error:', err.message);
                reject(err);
            })
            .run();
    });
}

// Run
createVideoFromExistingAudio();