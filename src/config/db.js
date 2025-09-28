import mongoose from 'mongoose';

let cachedDb = null;

// @desc Connect to MongoDB with connection pooling
// @route Public - Anyone can connect to the database
async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (mongoose.connection.readyState === 2) {
    return new Promise((resolve, reject) => {
      mongoose.connection.once('connected', () => resolve(mongoose.connection));
      mongoose.connection.once('error', reject);
    });
  }

  if (cachedDb) return cachedDb;

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 60000,
      connectTimeoutMS: 10000,
      bufferCommands: true,
    });

    cachedDb = conn;
    return conn;
  } catch (error) {
    console.error(`Database connection error: ${error.message}`);
    throw error;
  }
}

// @desc Disconnect from MongoDB
async function disconnectDB() {
  if (!cachedDb) return;

  try {
    await mongoose.disconnect();
    cachedDb = null;
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
