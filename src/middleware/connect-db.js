import { connectDB } from '../config/db.js';

const connectToDatabase = async (req, res, next) => {
  try {
    const connection = await connectDB();
    if (connection && connection.connection.readyState === 1) {
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
