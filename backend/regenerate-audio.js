// Standalone script to regenerate audio for micro-video segments using fixed TTS service
const fs = require("fs").promises;
const path = require("path");
const ttsService = require("./services/ttsService");

// Educational content based on the slides
const microVideoContent = [
  {
    videoId: "micro_4_1757898057823",
    segments: [
      {
        title: "Introduction to Node.js",
        content:
          "Welcome to this tutorial on Node.js. Today we will learn about using Node.js for executing JavaScript code outside the browser. Node.js is a powerful runtime environment that allows developers to run JavaScript on the server side.",
      },
      {
        title: "Learning Objective",
        content:
          "Our learning objective for this session is to understand how to use Node.js for executing JavaScript code outside the browser. We will explore the fundamentals and practical applications of Node.js development.",
      },
      {
        title: "Key Points",
        content:
          "The key points we will cover include understanding the Node.js runtime environment, learning how to set up and configure Node.js projects, exploring the Node.js module system, and understanding how Node.js differs from browser JavaScript execution.",
      },
      {
        title: "Summary",
        content:
          "In summary, the key concepts covered include Introduction to Node.js, Running JavaScript files with Node.js, and Adding script tags in HTML. These fundamentals will help you understand how to effectively use Node.js in your development projects.",
      },
    ],
  },
];

async function regenerateAllAudio() {
  console.log("🎵 Starting audio regeneration for micro-video segments...");

  try {
    // Ensure audio output directory exists
    const audioDir = "./generated-audio ";
    await fs.mkdir(audioDir, { recursive: true });

    for (const video of microVideoContent) {
      console.log(`\n📹 Processing video: ${video.videoId}`);

      for (let i = 0; i < video.segments.length; i++) {
        const segment = video.segments[i];
        console.log(`\n🎬 Segment ${i + 1}: ${segment.title}`);

        try {
          // Generate audio for this segment
          const audioResult = await ttsService.generateAudio(segment.content, {
            voiceName: "en-US-Standard-D",
            speed: 1.0,
            languageCode: "en-US",
          });

          if (audioResult.success) {
            console.log(`✅ Audio generated successfully:`);
            console.log(`   📁 File: ${audioResult.filename}`);
            console.log(`   📊 Size: ${audioResult.size} bytes`);
            console.log(`   ⏱️  Duration: ${audioResult.duration} seconds`);
            console.log(`   🎤 Voice: ${audioResult.voiceUsed}`);
            console.log(
              `   📝 Text length: ${audioResult.textLength} characters`
            );

            if (audioResult.chunksGenerated) {
              console.log(
                `   🔀 Chunks processed: ${audioResult.chunksGenerated}`
              );
            }

            // Create a mapping file for the audio
            const mappingPath = path.join(
              audioDir,
              `${video.videoId}_segment_${i + 1}_mapping.json`
            );
            const mapping = {
              videoId: video.videoId,
              segmentIndex: i + 1,
              title: segment.title,
              content: segment.content,
              audioFile: audioResult.filename,
              audioPath: audioResult.filepath,
              duration: audioResult.duration,
              generated: new Date().toISOString(),
              provider: audioResult.provider,
            };

            await fs.writeFile(mappingPath, JSON.stringify(mapping, null, 2));
            console.log(`   📋 Mapping saved: ${path.basename(mappingPath)}`);
          } else {
            console.error(`❌ Audio generation failed for segment ${i + 1}:`);
            console.error(
              `   Error: ${audioResult.warning || "Unknown error"}`
            );
          }
        } catch (error) {
          console.error(
            `❌ Error generating audio for segment ${i + 1}:`,
            error.message
          );
        }

        // Small delay between generations
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log("\n🎉 Audio regeneration completed!");

    // Generate summary report
    const summaryPath = path.join(audioDir, "audio_regeneration_summary.json");
    const summary = {
      completedAt: new Date().toISOString(),
      videosProcessed: microVideoContent.length,
      totalSegments: microVideoContent.reduce(
        (acc, video) => acc + video.segments.length,
        0
      ),
      outputDirectory: audioDir,
      ttsProvider: ttsService.provider || "web/system",
    };

    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`\n📊 Summary report saved: ${path.basename(summaryPath)}`);

    // List all generated files
    const files = await fs.readdir(audioDir);
    const audioFiles = files.filter(
      (f) => f.endsWith(".wav") || f.endsWith(".mp3")
    );

    console.log(`\n📁 Generated audio files (${audioFiles.length}):`);
    for (const file of audioFiles) {
      const stats = await fs.stat(path.join(audioDir, file));
      console.log(`   🎵 ${file} (${stats.size} bytes)`);
    }
  } catch (error) {
    console.error("❌ Audio regeneration failed:", error);
    process.exit(1);
  }
}

// Run the regeneration
regenerateAllAudio()
  .then(() => {
    console.log("\n✅ Process completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Process failed:", error);
    process.exit(1);
  });
