// utils/test-mongodb.js
const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function testMongoDBConnection() {
    console.log('🔍 Testing MongoDB Connection...\n');
    
    // Check environment variable
    console.log('📋 Environment Check:');
    console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);
    console.log('MONGODB_URI length:', process.env.MONGODB_URI?.length || 0);
    console.log('MONGODB_URI (masked):', process.env.MONGODB_URI?.replace(/:[^:@]+@/, ':***@') || 'NOT SET');
    console.log('');
    
    if (!process.env.MONGODB_URI) {
        console.error('❌ MONGODB_URI is not set in environment variables');
        return;
    }
    
    // Parse the connection string
    try {
        const url = new URL(process.env.MONGODB_URI.replace('mongodb+srv://', 'https://'));
        console.log('📊 Connection String Analysis:');
        console.log('Protocol: mongodb+srv');
        console.log('Username:', url.username);
        console.log('Password:', url.password ? '***' : 'NOT SET');
        console.log('Host:', url.hostname);
        console.log('Database:', url.pathname.substring(1).split('?')[0]);
        console.log('');
    } catch (error) {
        console.error('❌ Invalid connection string format:', error.message);
        return;
    }
    
    // Test 1: Native MongoDB Driver
    console.log('🧪 Test 1: Native MongoDB Driver');
    try {
        const client = new MongoClient(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
            connectTimeoutMS: 10000,
        });
        
        console.log('Connecting...');
        await client.connect();
        console.log('✅ Native driver connection successful!');
        
        // Test database operations
        const db = client.db();
        const collections = await db.listCollections().toArray();
        console.log('📁 Available collections:', collections.map(c => c.name));
        
        await client.close();
        console.log('✅ Connection closed successfully');
    } catch (error) {
        console.error('❌ Native driver failed:', error.message);
        if (error.code) console.error('Error code:', error.code);
        if (error.codeName) console.error('Error codeName:', error.codeName);
    }
    console.log('');
    
    // Test 2: Mongoose
    console.log('🧪 Test 2: Mongoose Connection');
    try {
        console.log('Connecting with Mongoose...');
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
            connectTimeoutMS: 10000,
        });
        
        console.log('✅ Mongoose connection successful!');
        console.log('Connection state:', mongoose.connection.readyState);
        console.log('Database name:', mongoose.connection.db.databaseName);
        console.log('Host:', mongoose.connection.host);
        
        await mongoose.disconnect();
        console.log('✅ Mongoose disconnected successfully');
    } catch (error) {
        console.error('❌ Mongoose failed:', error.message);
        if (error.code) console.error('Error code:', error.code);
        if (error.codeName) console.error('Error codeName:', error.codeName);
    }
    console.log('');
    
    // DNS Resolution Test
    console.log('🧪 Test 3: DNS Resolution');
    try {
        const dns = require('dns').promises;
        const hostname = process.env.MONGODB_URI.match(/@([^/]+)/)?.[1];
        if (hostname) {
            console.log('Resolving hostname:', hostname);
            const addresses = await dns.resolve(hostname);
            console.log('✅ DNS resolution successful:', addresses);
        }
    } catch (error) {
        console.error('❌ DNS resolution failed:', error.message);
    }
    console.log('');
    
    // Network connectivity test
    console.log('🧪 Test 4: Network Connectivity');
    try {
        const net = require('net');
        const hostname = process.env.MONGODB_URI.match(/@([^/]+)/)?.[1];
        if (hostname) {
            await new Promise((resolve, reject) => {
                const socket = net.createConnection({ host: hostname, port: 27017, timeout: 5000 });
                socket.on('connect', () => {
                    console.log('✅ Network connectivity successful');
                    socket.destroy();
                    resolve();
                });
                socket.on('error', reject);
                socket.on('timeout', () => reject(new Error('Connection timeout')));
            });
        }
    } catch (error) {
        console.error('❌ Network connectivity failed:', error.message);
    }
}

// Run the test
if (require.main === module) {
    testMongoDBConnection().catch(console.error);
}

module.exports = { testMongoDBConnection };