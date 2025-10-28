import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';
import { toNodeHandler } from 'better-auth/node';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';

import mongoose from 'mongoose';
import auth from './lib/auth.js';
import v1Routes from './routes/v1/index.js';

dotenv.config({ path: './.env', quiet: true });
const env = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 5000;

// Initialize database connection once at startup
async function initializeDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 30000,
      connectTimeoutMS: 5000,
      bufferCommands: false, // Disable mongoose buffering for serverless
    });
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1); // Exit if database connection fails
  }
}

const app = express();

// Trust proxy - required for rate limiting behind Vercel/proxies
app.set('trust proxy', 1);

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 100, // 100 requests per minute
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
  },
  // Serverless optimizations
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip successful requests to reduce overhead
  skipSuccessfulRequests: false,
  // Skip failed requests to reduce overhead
  skipFailedRequests: false,
});

// Lightweight middleware first (no database dependency)
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());

// Auth routes (no database middleware needed)
app.all('/api/auth/*splat', toNodeHandler(auth));

// Rate limiting after basic middleware
app.use(limiter);

// Simple database connection check middleware (no connection attempts)
app.use((req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      error: 'Database connection not available. Please try again later.',
    });
  }
  next();
});

// Logging after other middleware
if (env === 'development') {
  app.use(morgan('dev'));
}

app.use('/api/v1', v1Routes);

app.get('/', (req, res) => {
  res.send('Ridemate API is running...');
});
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
  });
});

// Start server only after database connection is established
async function startServer() {
  await initializeDatabase();

  app.listen(PORT, () => {
    console.info(`🚀 Server running in ${env} mode on port ${PORT}`);
  });
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received. Shutting down gracefully...');
  try {
    await mongoose.disconnect();
    console.log('Database disconnected');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received. Shutting down gracefully...');
  try {
    await mongoose.disconnect();
    console.log('Database disconnected');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// Start the server
startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

export default app;
