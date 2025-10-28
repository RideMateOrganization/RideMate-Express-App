import mongoose from 'mongoose';

// Cache connection state to avoid repeated checks
let connectionPromise = null;
let isConnecting = false;

const connectToDatabase = async (req, res, next) => {
  try {
    // Fast path: already connected
    if (mongoose.connection.readyState === 1) {
      next();
      return;
    }

    // If already connecting, wait for that connection
    if (isConnecting && connectionPromise) {
      await connectionPromise;
      if (mongoose.connection.readyState === 1) {
        next();
        return;
      }
    }

    // If disconnected, start new connection
    if (mongoose.connection.readyState === 0) {
      isConnecting = true;
      connectionPromise = mongoose.connect(process.env.MONGO_URI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000, // Reduced timeout for faster failure
        socketTimeoutMS: 30000, // Reduced socket timeout
        connectTimeoutMS: 5000, // Reduced connection timeout
        bufferCommands: true,
        bufferMaxEntries: 0, // Disable mongoose buffering for serverless
      });

      await connectionPromise;
      isConnecting = false;
      connectionPromise = null;
    }

    // If connecting, wait for connection
    if (mongoose.connection.readyState === 2) {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 5000);

        mongoose.connection.once('connected', () => {
          clearTimeout(timeout);
          resolve();
        });
        mongoose.connection.once('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });
    }

    // Final check
    if (mongoose.connection.readyState === 1) {
      next();
    } else {
      throw new Error('Database connection not ready');
    }
  } catch (error) {
    console.error('Database connection error in middleware:', error);
    isConnecting = false;
    connectionPromise = null;
    res.status(500).json({
      success: false,
      error: 'Database connection failed. Please try again later.',
    });
  }
};

export default connectToDatabase;
