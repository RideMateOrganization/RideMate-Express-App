import mongoose from 'mongoose';
import { getDatabaseUri } from '../config/database.js';

const connectToDatabase = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState === 1) {
      next();
      return;
    }

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(getDatabaseUri(), {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 60000,
        connectTimeoutMS: 10000,
        bufferCommands: true,
      });
    }

    if (mongoose.connection.readyState === 2) {
      await new Promise((resolve, reject) => {
        mongoose.connection.once('connected', resolve);
        mongoose.connection.once('error', reject);
      });
    }

    if (mongoose.connection.readyState === 1) {
      next();
    } else {
      throw new Error('Database connection not ready');
    }
  } catch (error) {
    console.error('Database connection error in middleware:', error);
    res.status(500).json({
      success: false,
      error: 'Database connection failed. Please try again later.',
    });
  }
};

export default connectToDatabase;
