const { connectDB } = require('../config/db');

const connectToDatabase = async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error('Database connection error in middleware:', error);
    res
      .status(500)
      .json({ success: false, error: 'Failed to connect to the database.' });
  }
};

module.exports = connectToDatabase;
