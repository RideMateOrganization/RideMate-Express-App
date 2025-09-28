import { UserProfile } from '../models/user.js';

// @desc Get current user
// @route GET /api/v1/users/me
// @access Private - Only for logged in users
async function getUser(req, res) {
  try {
    // Check if the authenticated user exists
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    const userProfile = await UserProfile.findByAuthId(req.user.id);
    if (!userProfile) {
      return res.status(404).json({
        success: false,
        error: 'User profile not found. Please contact support.',
      });
    }

    const combinedUser = {
      ...req.user,
      ...userProfile.toObject(),
    };

    res.status(200).json({
      success: true,
      data: combinedUser,
    });
  } catch (error) {
    console.error('Error getting user:', error);
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
    const { id } = req.params;

    // Find user profile by authId
    const userProfile = await UserProfile.findByAuthId(id);
    if (!userProfile) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const combinedUser = {
      id: userProfile.authId,
      ...userProfile.toObject(),
    };

    res.status(200).json({
      success: true,
      data: combinedUser,
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
    // Fields that can be updated (only UserProfile fields, not Better Auth fields)
    const allowedUpdates = [
      'handle',
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

    // Find and update the user using authId from Better Auth session
    const user = await UserProfile.findOneAndUpdate(
      { authId: req.user.id },
      updates,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const combinedUser = {
      ...req.user,
      ...user.toObject(),
    };

    res.status(200).json({
      success: true,
      data: combinedUser,
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

export { getUser, getUserById, updateUser };
