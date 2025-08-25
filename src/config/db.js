const mongoose = require('mongoose');

let cachedDb = null;

// @desc Connect to MongoDB with connection pooling
// @route Public - Anyone can connect to the database
async function connectDB() {
  if (cachedDb) {
    console.log('Using existing database connection');
    return cachedDb;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
    });

    cachedDb = conn;
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// @desc Disconnect from MongoDB
async function disconnectDB() {
  if (!cachedDb) {
    return;
  }

  try {
    await mongoose.disconnect();
    cachedDb = null;
    console.log('MongoDB Disconnected');
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

module.exports = { connectDB, disconnectDB };
