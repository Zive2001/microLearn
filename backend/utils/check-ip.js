// utils/check-ip.js - Check current IP address for MongoDB Atlas whitelist

const https = require('https');

async function getCurrentIP() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.ipify.org',
            port: 443,
            path: '/',
            method: 'GET'
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve(data.trim());
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.end();
    });
}

async function checkMongoDB() {
    try {
        console.log('🔍 Checking current IP address...');
        const currentIP = await getCurrentIP();
        console.log(`📍 Your current IP address: ${currentIP}`);
        
        console.log('\n🔧 MongoDB Atlas Setup Instructions:');
        console.log('1. Go to MongoDB Atlas: https://cloud.mongodb.com/');
        console.log('2. Navigate to your cluster');
        console.log('3. Go to "Network Access" in the left sidebar');
        console.log('4. Click "Add IP Address"');
        console.log(`5. Add this IP: ${currentIP}`);
        console.log('6. Or add 0.0.0.0/0 to allow all IPs (for development only)');
        
        console.log('\n📡 Connection String Check:');
        console.log('Make sure your .env file has the correct MongoDB URI');
        console.log('Format: mongodb+srv://username:password@cluster.mongodb.net/database');
        
        return currentIP;
        
    } catch (error) {
        console.error('❌ Error checking IP:', error.message);
        console.log('\n💡 Alternative: You can check your IP at https://whatismyipaddress.com/');
    }
}

if (require.main === module) {
    checkMongoDB();
}

module.exports = { checkMongoDB, getCurrentIP };