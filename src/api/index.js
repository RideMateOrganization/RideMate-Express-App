const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');

const { connectDB, disconnectDB } = require('../config/db');

dotenv.config({ path: './.env', quiet: true });
const env = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 5000;

connectDB();
const app = express();

app.use(compression());
if (env === 'development') {
  app.use(morgan('dev'));
}
app.use(cors());
app.use(express.json());

const v1Routes = require('../routes/v1');

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

const server = app.listen(
  PORT,
  console.info(`Server running in ${env} mode on port ${PORT}`),
);

process.on('unhandledRejection', async (err) => {
  console.log(`Error: ${err.message}`);
  await disconnectDB();
  server.close(() => process.exit(1));
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Received SIGINT. Performing graceful shutdown...');
  await disconnectDB();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM. Performing graceful shutdown...');
  await disconnectDB();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
