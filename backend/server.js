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
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            // Mongoose 8 automatically handles these options
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error('Database connection error:', error.message);
        process.exit(1);
    }
};

// Connect to database
connectDB();

// Routes (we'll add these step by step)
app.get('/api/health', (req, res) => {
    res.json({ 
        message: 'Adaptive Learning System API is running!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Import routes (uncomment as we create them)
// const authRoutes = require('./routes/auth');
// const assessmentRoutes = require('./routes/assessment');
// const contentRoutes = require('./routes/content');

// Use routes
// app.use('/api/auth', authRoutes);
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

// Handle 404 routes
app.use('*', (req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;