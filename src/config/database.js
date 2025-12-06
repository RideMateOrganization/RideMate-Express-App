/**
 * Database Configuration and Connection Management for Railway
 *
 * Provides persistent MongoDB connection for always-on containers.
 * Optimized for Railway deployment with automatic reconnection and connection pooling.
 */

import mongoose from 'mongoose';

/**
 * Get the current environment (development, staging, or production)
 * @returns {string} The current environment
 */
function getEnvironment() {
  const env = process.env.NODE_ENV || 'development';
  return env.toLowerCase();
}

/**
 * Get the MongoDB cluster URI (without database name)
 * @returns {string} The cluster connection string
 * @throws {Error} If MONGO_URI is not set
 */
export function getClusterUri() {
  const clusterUri = process.env.MONGO_URI;

  if (!clusterUri) {
    throw new Error(
      'MONGO_URI environment variable is not set. ' +
        'Please set it to your MongoDB Atlas cluster connection string (without database name).',
    );
  }

  return clusterUri;
}

/**
 * Get the database name for the current environment
 * @returns {string} The database name
 */
export function getDatabaseName() {
  const env = getEnvironment();

  let dbName;
  switch (env) {
    case 'production':
    case 'prod':
      dbName = process.env.MONGO_DB_NAME_PRODUCTION || 'ridemate-prod';
      break;
    case 'staging':
      dbName = process.env.MONGO_DB_NAME_STAGING || 'ridemate-staging';
      break;
    case 'development':
    case 'dev':
    default:
      dbName = process.env.MONGO_DB_NAME_DEVELOPMENT || 'ridemate-dev';
      break;
  }

  return dbName;
}

/**
 * Get the full MongoDB connection URI with database name
 * Used for Mongoose connections
 * @returns {string} The full connection string with database name
 */
export function getDatabaseUri() {
  const clusterUri = getClusterUri();
  const dbName = getDatabaseName();
  const url = new URL(clusterUri);
  url.pathname = `/${dbName}`;
  return url.toString();
}

/**
 * Connection options optimized for Railway always-on containers
 */
const connectionOptions = {
  // Connection pool settings
  maxPoolSize: 10,
  minPoolSize: 2,

  // Timeout settings
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,

  // Retry settings
  retryWrites: true,
  retryReads: true,

  // Compression
  compressors: ['zlib'],

  // Other options
  autoIndex: getEnvironment() === 'development',
};

/**
 * Connect to MongoDB with persistent connection
 * @returns {Promise<void>}
 */
export async function connectToDatabase() {
  try {
    // Check if already connected
    if (mongoose.connection.readyState === 1) {
      console.log('MongoDB already connected');
      return;
    }

    const uri = getDatabaseUri();
    const dbName = getDatabaseName();

    await mongoose.connect(uri, connectionOptions);

    console.log(`MongoDB connected to database: ${dbName}`);

    // Set up connection event handlers
    mongoose.connection.on('error', (error) => {
      console.error('MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected successfully');
    });
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

/**
 * Close MongoDB connection gracefully
 * @returns {Promise<void>}
 */
export async function closeDatabaseConnection() {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
    }
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
    throw error;
  }
}

/**
 * Get connection status
 * @returns {Object} Connection status information
 */
export function getConnectionStatus() {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  return {
    state: states[mongoose.connection.readyState],
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host,
    port: mongoose.connection.port,
    name: mongoose.connection.name,
  };
}
