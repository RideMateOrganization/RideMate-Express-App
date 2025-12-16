import * as Sentry from '@sentry/node';
import dotenv from 'dotenv';

dotenv.config({ path: './.env', override: false });

const dsn = process.env.SENTRY_DSN;
const env = process.env.NODE_ENV || 'development';

if (dsn) {
  Sentry.init({
    dsn,
    environment: env,
    sendDefaultPii: true,
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
  });
  console.log(`✅ Sentry initialized for ${env} environment`);
} else {
  console.warn('⚠️  Sentry DSN not configured - error tracking disabled');
}
