const User = require('../models/user');

// @desc Get current user
// @route GET /api/v1/users/me
// @access Private - Only for logged in users
async function getUser(req, res) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

// @desc Get user by id
// @route GET /api/v1/users/:id
// @access Private - Only for logged in users
async function getUserById(req, res) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

// @desc Update user details
// @route PUT /api/v1/users/me
// @access Private - Only for logged in users
async function updateUser(req, res) {
  try {
    // Fields that can be updated
    const allowedUpdates = [
      'name',
      'email',
      'handle',
      'image',
      'bio',
      'gender',
      'dob',
      'bloodGroup',
      'address',
      'phone',
      'phoneCountryCode',
    ];

    // Filter out fields that are not allowed to be updated
    const updates = {};
    Object.keys(req.body).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    // If no valid updates provided
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update',
      });
    }

    // Find and update the user
    const user = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: user,
      message: 'User details updated successfully',
    });
  } catch (error) {
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        error: errors.join(', '),
      });
    }

    // Handle duplicate key errors (e.g., email, handle, phone already exists)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        error: `${field} already exists`,
      });
    }

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

module.exports = { getUser, getUserById, updateUser };
