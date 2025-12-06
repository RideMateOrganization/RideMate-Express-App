import { webcrypto } from 'node:crypto';

// Polyfill crypto.subtle for Better Auth
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';
import { toNodeHandler } from 'better-auth/node';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';

import { connectToDatabase, closeDatabaseConnection } from './config/database.js';
import { connectToRedis, closeRedisConnection, checkRedisHealth } from './config/redis.js';
import auth from './lib/auth.js';
import v1Routes from './routes/v1/index.js';

dotenv.config({ path: './.env', quiet: true });
const env = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 4060;

const app = express();

// Trust proxy - required for rate limiting behind Railway/proxies
app.set('trust proxy', 1);

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
  },
});

// Security and performance middleware
app.use(helmet());
app.use(limiter);
app.use(compression());

// Logging in development
if (env === 'development') {
  app.use(morgan('dev'));
}

// Body parsing
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Better Auth handler
app.all('/api/auth/*splat', toNodeHandler(auth));

// API routes
app.use('/api/v1', v1Routes);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Ridemate API is running',
    environment: env,
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', async (req, res) => {
  const redisHealthy = await checkRedisHealth();

  res.json({
    success: true,
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services: {
      redis: redisHealthy ? 'connected' : 'disconnected',
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: env === 'production' ? 'Internal server error' : err.message,
  });
});

let server;

// Start server with database connection
async function startServer() {
  try {
    // Connect to MongoDB before starting the server
    await connectToDatabase();
    console.log('✅ MongoDB connected successfully');

    // Connect to Redis (optional - won't crash if unavailable)
    try {
      await connectToRedis();
    } catch (error) {
      console.warn('⚠️  Redis connection failed - caching disabled:', error.message);
    }

    server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server running in ${env} mode on port ${PORT}`);
    });

    server.on('error', (error) => {
      console.error('Server error:', error);
      process.exit(1);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown handler
async function gracefulShutdown(signal) {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  // Stop accepting new connections
  if (server) {
    server.close(async () => {
      console.log('HTTP server closed');

      // Close database connection
      await closeDatabaseConnection();
      console.log('Database connection closed');

      // Close Redis connection
      await closeRedisConnection();

      console.log('Graceful shutdown completed');
      process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  } else {
    await closeDatabaseConnection();
    process.exit(0);
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Start the server
startServer();

export default app;
