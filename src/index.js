import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';
import { toNodeHandler } from 'better-auth/node';

import connectToDatabase from './middleware/connect-db.js';
import auth from './lib/auth.js';
import v1Routes from './routes/v1/index.js';

dotenv.config({ path: './.env', quiet: true });
const env = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 5000;

const app = express();

app.all('/api/auth/*splat', toNodeHandler(auth));

app.use(compression());
if (env === 'development') {
  app.use(morgan('dev'));
}
app.use(
  cors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://ridematefe.com',
      'https://www.ridematefe.com',
      'ridematefe://',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  }),
);
app.use(express.json());
app.use(connectToDatabase);

app.use('/api/v1', v1Routes);

// Debug endpoint to test authentication
app.get('/api/debug/auth', async (req, res) => {
  try {
    const { fromNodeHeaders } = await import('better-auth/node');
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    res.json({
      hasSession: !!session,
      session: session,
      headers: {
        cookie: req.headers.cookie,
        origin: req.headers.origin,
        referer: req.headers.referer,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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
