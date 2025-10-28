import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';
import { toNodeHandler } from 'better-auth/node';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';

import connectToDatabase from './middleware/connect-db.js';
import auth from './lib/auth.js';
import v1Routes from './routes/v1/index.js';

dotenv.config({ path: './.env', quiet: true });
const env = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 5000;

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

// Database connection middleware only for API routes
app.use(connectToDatabase);

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

app.listen(PORT, console.info(`Server running in ${env} mode on port ${PORT}`));

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received. Shutting down Express server.');
  app.close(() => {
    process.exit(0);
  });
});

export default app;
