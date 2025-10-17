const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectToDb = require('./config/db');

// Import routes
const authRoutes = require('./routes/auth');
const vendorRoutes = require('./routes/vendor');
const categoryRoutes = require('./routes/category');
const serviceRoutes = require('./routes/serviceRoutes');

const app = express();

// Connect to MongoDB
connectToDb();

// Security middleware
app.use(helmet());
app.set('trust proxy', true);
// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// CORS configuration
app.use(cors());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for uploaded photos
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/gnet/auth', authRoutes);
app.use('/gnet/vendor', vendorRoutes);
app.use('/gnet/category', categoryRoutes);
app.use('/gnet/service', serviceRoutes);
app.use('/gnet/search', require('./routes/search'));

// Health check endpoint
app.get('/gnet/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Grandeurnet Backend API is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = app;
