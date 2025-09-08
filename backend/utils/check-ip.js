// utils/check-ip.js
const https = require('https');
const http = require('http');

async function getPublicIP() {
    // Try multiple services
    const services = [
        { url: 'http://checkip.amazonaws.com/', protocol: 'http' },
        { url: 'http://ipinfo.io/ip', protocol: 'http' },
        { url: 'http://icanhazip.com/', protocol: 'http' }
    ];

    for (const service of services) {
        try {
            const ip = await tryService(service);
            return ip.trim();
        } catch (error) {
            console.log(`Failed to get IP from ${service.url}:`, error.message);
            continue;
        }
    }
    throw new Error('Failed to get IP from all services');
}

function tryService(service) {
    return new Promise((resolve, reject) => {
        const client = service.protocol === 'https' ? https : http;
        const request = client.get(service.url, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve(data);
            });
        });
        
        request.on('error', (err) => {
            reject(err);
        });
        
        request.setTimeout(5000, () => {
            request.destroy();
            reject(new Error('Timeout'));
        });
    });
}

async function checkIP() {
    try {
        const ip = await getPublicIP();
        console.log('🌐 Your current public IP address is:', ip);
        console.log('');
        console.log('📝 To fix MongoDB Atlas connection:');
        console.log('1. Go to MongoDB Atlas Dashboard');
        console.log('2. Navigate to Network Access');
        console.log('3. Add this IP address to your whitelist:', ip);
        console.log('4. Or add 0.0.0.0/0 for all IPs (less secure)');
        console.log('');
        console.log('🔗 MongoDB Atlas: https://cloud.mongodb.com/');
    } catch (error) {
        console.error('❌ Error getting IP address:', error.message);
    }
}

if (require.main === module) {
    checkIP();
}

module.exports = { getPublicIP, checkIP };