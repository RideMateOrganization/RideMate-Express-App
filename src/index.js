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

// Initialize database connection with retry logic
async function initializeDatabase() {
  // Check if already connected
  if (mongoose.connection.readyState === 1) {
    console.log('✅ Database already connected');
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000, // Increased for serverless
      socketTimeoutMS: 45000, // Increased for serverless
      connectTimeoutMS: 10000, // Increased for serverless
      bufferCommands: false, // Disable mongoose buffering for serverless
      bufferMaxEntries: 0, // Disable mongoose buffering
    });
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    // Don't exit in serverless - let the middleware handle it
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
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

// Database connection middleware with fallback connection attempt
app.use(async (req, res, next) => {
  // If connected, proceed immediately
  if (mongoose.connection.readyState === 1) {
    return next();
  }

  // If connecting, wait for connection
  if (mongoose.connection.readyState === 2) {
    try {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 5000);

        mongoose.connection.once('connected', () => {
          clearTimeout(timeout);
          resolve();
        });
        mongoose.connection.once('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });
      return next();
    } catch (error) {
      console.error('Database connection timeout:', error);
      return res.status(503).json({
        success: false,
        error: 'Database connection timeout. Please try again later.',
      });
    }
  }

  // If disconnected, try to reconnect
  if (mongoose.connection.readyState === 0) {
    try {
      await initializeDatabase();
      if (mongoose.connection.readyState === 1) {
        return next();
      }
    } catch (error) {
      console.error('Database reconnection failed:', error);
    }
  }

  // If still not connected, return error
  return res.status(503).json({
    success: false,
    error: 'Database connection not available. Please try again later.',
  });
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

// Start server with database connection
async function startServer() {
  try {
    await initializeDatabase();

    app.listen(PORT, () => {
      console.info(`🚀 Server running in ${env} mode on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    // In production (Vercel), don't exit - let the middleware handle connections
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
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
