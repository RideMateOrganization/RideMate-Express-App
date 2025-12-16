import { webcrypto } from 'node:crypto';

import './lib/instrument.js';

import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';
import { toNodeHandler } from 'better-auth/node';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import * as Sentry from '@sentry/node';

import {
  connectToDatabase,
  closeDatabaseConnection,
} from './config/database.js';
import {
  connectToRedis,
  closeRedisConnection,
  checkRedisHealth,
} from './config/redis.js';
import auth from './lib/auth.js';
import v1Routes from './routes/v1/index.js';

// Polyfill crypto.subtle for Better Auth
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

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

// Debug endpoint - test Sentry error capture
app.get('/debug-sentry', (req, res, next) => {
  throw new Error('My first Sentry error!');
});

// Sentry error handler
Sentry.setupExpressErrorHandler(app);

// 404 handler
app.use((err, req, res, next) => {
  res.statusCode = 500;
  res.end(res.sentry + '\n');
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: env === 'production' ? 'Internal server error' : err.message,
  });
});

// Start server
async function startServer() {
  try {
    await connectToDatabase();
    console.log('✅ MongoDB connected successfully');

    try {
      await connectToRedis();
      // Import worker after Redis is connected
      await import('./workers/ride-reminders.worker.js');
    } catch (error) {
      console.warn(
        '⚠️  Redis connection failed - notification reminders disabled:',
        error.message,
      );
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server running in ${env} mode on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\nSIGTERM received. Closing database connections...');
  await closeDatabaseConnection();
  await closeRedisConnection();
  console.log('Graceful shutdown completed');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT received. Closing database connections...');
  await closeDatabaseConnection();
  await closeRedisConnection();
  console.log('Graceful shutdown completed');
  process.exit(0);
});

startServer();
