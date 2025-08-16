const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Import database connection and routes
const { connectDB, checkDatabaseHealth } = require('./src/config/database');
const metadataRoutes = require('./src/routes/metadata');
const dataRoutes = require('./src/routes/data');
const lookupRoutes = require('./src/routes/lookup');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to database
connectDB().catch(console.error);

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS for all routes
app.use(morgan('combined')); // Logging
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to DataMarshal API',
    version: '1.0.0',
    features: [
      'Generic table metadata discovery',
      'Safe CRUD operations with allow-lists',
      'Optimistic concurrency control',
      'Audit trail logging',
      'Foreign key lookups'
    ],
    endpoints: {
      health: '/api/health',
      metadata: '/meta/*',
      data: '/data/*',
      lookup: '/lookup/*'
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', async (req, res) => {
  try {
    const dbHealth = await checkDatabaseHealth();
    res.json({
      status: 'healthy',
      uptime: process.uptime(),
      database: dbHealth,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      uptime: process.uptime(),
      database: {
        healthy: false,
        error: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Data Admin API Routes
app.use('/meta', metadataRoutes);
app.use('/data', dataRoutes);
app.use('/lookup', lookupRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`DataMarshal API server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
