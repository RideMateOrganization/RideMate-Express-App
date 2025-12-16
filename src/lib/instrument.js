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
    integrations: [
      Sentry.consoleLoggingIntegration({ levels: ['log', 'warn', 'error'] }),
    ],
    enableLogs: true,
  });
  // Use Sentry logger for initialization message
  Sentry.logger.info(`✅ Sentry initialized for ${env} environment`);
} else {
  // Fallback to console.warn for Sentry initialization since logger is not set up yet
  console.warn('⚠️  Sentry DSN not configured - error tracking disabled');
}
