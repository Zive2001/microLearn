const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();

// Security and logging middleware
app.use(helmet());
app.use(morgan('combined'));

// CORS configuration for frontend connection
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
const connectDB = async () => {
    try {
        // Check if MONGODB_URI exists
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI environment variable is not defined');
        }

        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000, // 5 second timeout
            socketTimeoutMS: 45000, // 45 second socket timeout
        });
        
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        
        // Handle connection errors after initial connection
        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err);
        });
        
        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
        });
        
        mongoose.connection.on('reconnected', () => {
            console.log('✅ MongoDB reconnected');
        });
        
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.error('');
        console.error('🔧 Troubleshooting steps:');
        console.error('1. Check if your MongoDB Atlas cluster is running');
        console.error('2. Verify your IP address is whitelisted in MongoDB Atlas');
        console.error('3. Confirm your database credentials are correct');
        console.error('4. Check your internet connection');
        console.error('');
        
        // Don't exit the process, let the server run without database
        console.warn('⚠️ Server will continue running without database connection');
        console.warn('⚠️ Database-dependent features will not work until connection is restored');
    }
};

// Connect to database
connectDB();

// Middleware to check database connection for API routes
const checkDatabaseConnection = (req, res, next) => {
    if (req.path.startsWith('/api') && req.path !== '/api/health') {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({
                success: false,
                message: 'Database connection is not available. Please try again later.',
                error: 'SERVICE_UNAVAILABLE'
            });
        }
    }
    next();
};

app.use(checkDatabaseConnection);

// Routes (we'll add these step by step)
app.get('/api/health', (req, res) => {
    const dbStatus = mongoose.connection.readyState;
    const dbStates = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
    };
    
    res.json({ 
        message: 'Adaptive Learning System API is running!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        database: {
            status: dbStates[dbStatus] || 'unknown',
            connected: dbStatus === 1
        },
        server: {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            version: process.version
        }
    });
});

// Import routes (uncomment as we create them)
const authRoutes = require('./routes/auth')
const topicRoutes = require('./routes/topics');
const testRoutes = require('./routes/test');
// const assessmentRoutes = require('./routes/assessment');
// const contentRoutes = require('./routes/content');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/topics', topicRoutes);
app.use('/api/test', testRoutes);

// app.use('/api/assessment', assessmentRoutes);
// app.use('/api/content', contentRoutes);

// Global error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
    });
});

// Handle 404 routes - will be added back later
// app.all('*', (req, res) => {
//     res.status(404).json({ message: 'Route not found' });
// });

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;