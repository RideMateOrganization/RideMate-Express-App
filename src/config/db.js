import mongoose from 'mongoose';
import { getDatabaseUri, getDatabaseName } from './database.js';

let cachedDb = null;
let cachedDbName = null;

// @desc Connect to MongoDB with connection pooling
// @route Public - Anyone can connect to the database
async function connectDB() {
  const expectedDbName = getDatabaseName();
  const expectedDbUri = getDatabaseUri();

  if (mongoose.connection.readyState === 1) {
    const actualDbName = mongoose.connection.db?.databaseName;
    if (actualDbName === expectedDbName && cachedDbName === expectedDbName) {
      return mongoose.connection;
    }
    if (actualDbName !== expectedDbName) {
      const switchedConnection = mongoose.connection.useDb(expectedDbName);
      mongoose.connection.db = switchedConnection.db;
      cachedDb = mongoose.connection;
      cachedDbName = expectedDbName;
      return mongoose.connection;
    }
  }

  if (mongoose.connection.readyState === 2) {
    await new Promise((resolve, reject) => {
      mongoose.connection.once('connected', resolve);
      mongoose.connection.once('error', reject);
    });
    const actualDbName = mongoose.connection.db?.databaseName;
    if (actualDbName === expectedDbName && cachedDbName === expectedDbName) {
      return mongoose.connection;
    }
    if (actualDbName !== expectedDbName) {
      const switchedConnection = mongoose.connection.useDb(expectedDbName);
      mongoose.connection.db = switchedConnection.db;
      cachedDb = mongoose.connection;
      cachedDbName = expectedDbName;
      return mongoose.connection;
    }
  }

  if (cachedDb && cachedDbName === expectedDbName) {
    return cachedDb;
  }

  try {
    const conn = await mongoose.connect(expectedDbUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 60000,
      connectTimeoutMS: 10000,
      bufferCommands: true,
    });

    const connectedDbName = conn.connection.db?.databaseName;
    if (connectedDbName !== expectedDbName) {
      const switchedConnection = conn.connection.useDb(expectedDbName);
      mongoose.connection.db = switchedConnection.db;
      cachedDb = mongoose.connection;
      cachedDbName = expectedDbName;
      return mongoose.connection;
    }

    cachedDb = conn;
    cachedDbName = expectedDbName;
    return conn;
  } catch (error) {
    console.error(`Database connection error: ${error.message}`);
    cachedDb = null;
    cachedDbName = null;
    throw error;
  }
}

// @desc Disconnect from MongoDB
async function disconnectDB() {
  if (!cachedDb) return;

  try {
    await mongoose.disconnect();
    cachedDb = null;
    cachedDbName = null;
  } catch (error) {
    console.error(`Error disconnecting: ${error.message}`);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await disconnectDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectDB();
  process.exit(0);
});

export { connectDB, disconnectDB };
