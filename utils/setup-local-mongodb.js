// utils/setup-local-mongodb.js
const fs = require('fs');
const path = require('path');

function setupLocalMongoDB() {
    console.log('🔧 Setting up local MongoDB configuration...\n');
    
    const envPath = path.join(__dirname, '..', '.env');
    
    try {
        let envContent = fs.readFileSync(envPath, 'utf8');
        
        // Comment out the current Atlas connection
        envContent = envContent.replace(
            /^MONGODB_URI=mongodb\+srv:\/\/.*$/m,
            '# MONGODB_URI=mongodb+srv://supun_se:q8ORi2YC5lIGOJ5x@microlearn.5iohc2a.mongodb.net/microLearnDB?retryWrites=true&w=majority&appName=MicroLearn'
        );
        
        // Add local MongoDB connection
        if (!envContent.includes('# Local MongoDB')) {
            const localConfig = `\n# Local MongoDB Configuration (for development)
MONGODB_URI=mongodb://localhost:27017/microLearnDB`;
            
            envContent = envContent.replace(
                /^# MongoDB Configuration.*$/m,
                `# MongoDB Configuration (Replace with your MongoDB Atlas connection string)${localConfig}`
            );
        }
        
        fs.writeFileSync(envPath, envContent);
        
        console.log('✅ Updated .env file with local MongoDB configuration');
        console.log('📍 New connection string: mongodb://localhost:27017/microLearnDB\n');
        
        console.log('📋 Next steps:');
        console.log('1. Install MongoDB locally:');
        console.log('   - Windows: https://docs.mongodb.com/manual/tutorial/install-mongodb-on-windows/');
        console.log('   - macOS: brew install mongodb-community');
        console.log('   - Linux: https://docs.mongodb.com/manual/administration/install-on-linux/');
        console.log('');
        console.log('2. Start MongoDB service:');
        console.log('   - Windows: net start MongoDB');
        console.log('   - macOS/Linux: brew services start mongodb-community');
        console.log('');
        console.log('3. Or use Docker:');
        console.log('   docker run -d -p 27017:27017 --name mongodb mongo:latest');
        console.log('');
        console.log('4. Restart your server: npm run dev');
        
    } catch (error) {
        console.error('❌ Error updating .env file:', error.message);
    }
}

function setupAtlasAlternative() {
    console.log('🔧 MongoDB Atlas Alternative Setup...\n');
    
    console.log('🔍 Your current cluster hostname is not resolving.');
    console.log('This usually means:\n');
    
    console.log('1. 🚫 Cluster is paused or deleted');
    console.log('   - Go to MongoDB Atlas dashboard');
    console.log('   - Check if your cluster is running');
    console.log('   - Resume if paused\n');
    
    console.log('2. 🔗 Connection string is outdated');
    console.log('   - Get a fresh connection string from Atlas');
    console.log('   - Database > Connect > Connect your application');
    console.log('   - Copy the new connection string\n');
    
    console.log('3. 🆓 Try MongoDB Atlas free tier alternatives:');
    console.log('   - Create a new free cluster');
    console.log('   - Or use MongoDB Cloud Manager\n');
    
    console.log('4. 🏠 Use local development database:');
    console.log('   - Run: npm run setup-local-mongodb');
    console.log('   - This will configure local MongoDB');
}

if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.includes('--local')) {
        setupLocalMongoDB();
    } else {
        setupAtlasAlternative();
    }
}

module.exports = { setupLocalMongoDB, setupAtlasAlternative };