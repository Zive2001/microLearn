#!/usr/bin/env node

/**
 * Cache Cleanup Script
 * Safely clears YouTube video cache from MongoDB
 *
 * WHAT IT DOES:
 * - Deletes cached videos from "videos" collection
 * - Deletes cached micro-videos from "microvideos" collection
 * - Preserves all user data, quizzes, and user progress
 * - Provides confirmation before deletion
 *
 * SAFE TO RUN: Yes, 100% safe
 * REVERSIBLE: No, data is permanently deleted (but will be re-fetched from YouTube)
 *
 * Usage: node clearCache.js
 */

const mongoose = require('mongoose');
const readline = require('readline');
require('dotenv').config({ path: '.env' });

// Import models
const Video = require('../models/Video');
const MicroVideo = require('../models/MicroVideo');

// Create readline interface for user confirmation
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

/**
 * Ask user for confirmation
 */
function askConfirmation(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
        });
    });
}

/**
 * Main cleanup function
 */
async function clearCache() {
    try {
        console.log(`\n${colors.cyan}🚀 YouTube Cache Cleanup Script${colors.reset}\n`);
        console.log(`${colors.yellow}⚠️  WARNING: This will delete cached video data${colors.reset}`);
        console.log(`${colors.yellow}⚠️  Your user data will NOT be affected${colors.reset}\n`);

        // Display what will be deleted
        console.log(`${colors.blue}📋 Collections to be cleared:${colors.reset}`);
        console.log(`   • videos (cached YouTube video metadata)`);
        console.log(`   • microvideos (cached micro-video segments)\n`);

        console.log(`${colors.blue}✅ What will be PRESERVED:${colors.reset}`);
        console.log(`   • User accounts and authentication`);
        console.log(`   • Quiz progress and scores`);
        console.log(`   • Learning paths`);
        console.log(`   • All other data\n`);

        // Ask for confirmation
        const confirmed = await askConfirmation(`${colors.red}Are you sure you want to proceed? (yes/no): ${colors.reset}`);

        if (!confirmed) {
            console.log(`${colors.yellow}❌ Operation cancelled${colors.reset}\n`);
            process.exit(0);
        }

        // Connect to MongoDB
        console.log(`${colors.blue}🔌 Connecting to MongoDB...${colors.reset}`);
        await mongoose.connect(process.env.MONGODB_URI, {
            connectTimeoutMS: 10000,
            serverSelectionTimeoutMS: 10000
        });
        console.log(`${colors.green}✅ Connected to MongoDB${colors.reset}\n`);

        // Get counts before deletion
        console.log(`${colors.blue}📊 Getting collection sizes...${colors.reset}`);
        const videoCountBefore = await Video.countDocuments();
        const microVideoCountBefore = await MicroVideo.countDocuments();
        console.log(`   Videos before: ${videoCountBefore}`);
        console.log(`   Micro-videos before: ${microVideoCountBefore}\n`);

        // Delete videos
        console.log(`${colors.yellow}🗑️  Deleting videos collection...${colors.reset}`);
        const videoResult = await Video.deleteMany({});
        console.log(`${colors.green}✅ Deleted ${videoResult.deletedCount} video records${colors.reset}`);

        // Delete micro-videos
        console.log(`${colors.yellow}🗑️  Deleting microvideos collection...${colors.reset}`);
        const microVideoResult = await MicroVideo.deleteMany({});
        console.log(`${colors.green}✅ Deleted ${microVideoResult.deletedCount} micro-video records${colors.reset}\n`);

        // Verify deletion
        console.log(`${colors.blue}🔍 Verifying deletion...${colors.reset}`);
        const videoCountAfter = await Video.countDocuments();
        const microVideoCountAfter = await MicroVideo.countDocuments();
        console.log(`   Videos after: ${videoCountAfter}`);
        console.log(`   Micro-videos after: ${microVideoCountAfter}\n`);

        // Success message
        console.log(`${colors.green}═══════════════════════════════════════${colors.reset}`);
        console.log(`${colors.green}✅ CACHE CLEARED SUCCESSFULLY!${colors.reset}`);
        console.log(`${colors.green}═══════════════════════════════════════${colors.reset}\n`);

        console.log(`${colors.blue}📝 Next steps:${colors.reset}`);
        console.log(`   1. Clear browser localStorage (F12 → Application → Clear)`);
        console.log(`   2. Restart your backend server (Ctrl+C, then npm start)`);
        console.log(`   3. Refresh your browser`);
        console.log(`   4. Test video recommendations\n`);

        console.log(`${colors.cyan}The system will fetch fresh videos on next recommendation request${colors.reset}\n`);

        process.exit(0);

    } catch (error) {
        console.error(`${colors.red}❌ ERROR: ${error.message}${colors.reset}\n`);

        if (error.message.includes('ENOTFOUND')) {
            console.error(`${colors.red}⚠️  Cannot connect to MongoDB. Check:`);
            console.error(`   • Internet connection`);
            console.error(`   • MONGODB_URI in .env file`);
            console.error(`   • MongoDB Atlas network access settings${colors.reset}\n`);
        }

        process.exit(1);

    } finally {
        // Close database connection
        try {
            await mongoose.connection.close();
            console.log(`${colors.blue}🔌 MongoDB connection closed${colors.reset}\n`);
        } catch (err) {
            // Ignore close errors
        }

        rl.close();
    }
}

// Run the script
clearCache();
