import { User, UserProfile } from '../models/user.js';
import { logInfo, logError } from '../utils/logger.js';
import LegalAcceptance from '../models/legal-acceptance.js';

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

    // Check if user exists in Better Auth
    const authUser = await User.findById(req.user.id);
    if (!authUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    let userProfile = await UserProfile.findByAuthId(req.user.id);
    if (authUser && !userProfile) {
      userProfile = await UserProfile.create({
        authId: req.user.id,
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
    logError('Error getting user:', error);
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
    // Fields that can be updated in Better Auth User model
    const betterAuthAllowedUpdates = ['name', 'email', 'phoneNumber', 'image'];

    // Fields that can be updated in UserProfile model
    const profileAllowedUpdates = [
      'handle',
      'bio',
      'gender',
      'dob',
      'bloodGroup',
      'address',
    ];

    // Filter updates into two separate objects
    const betterAuthUpdates = {};
    const profileUpdates = {};

    Object.keys(req.body).forEach((key) => {
      if (betterAuthAllowedUpdates.includes(key)) {
        betterAuthUpdates[key] = req.body[key];
      } else if (profileAllowedUpdates.includes(key)) {
        profileUpdates[key] = req.body[key];
      }
    });

    // If no valid updates provided
    if (
      Object.keys(betterAuthUpdates).length === 0 &&
      Object.keys(profileUpdates).length === 0
    ) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update',
      });
    }

    // Check if user exists in Better Auth
    const authUser = await User.findById(req.user.id);
    if (!authUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    let updatedAuthUser = authUser;
    let updatedUserProfile = null;

    // Update Better Auth User model if there are Better Auth updates
    if (Object.keys(betterAuthUpdates).length > 0) {
      updatedAuthUser = await User.findByIdAndUpdate(
        req.user.id,
        betterAuthUpdates,
        {
          new: true,
          runValidators: true,
        },
      );
    }

    // Find existing user profile or create one if it doesn't exist
    let userProfile = await UserProfile.findByAuthId(req.user.id);
    if (authUser && !userProfile) {
      userProfile = await UserProfile.create({
        authId: req.user.id,
      });
    }

    // Update the user profile with the provided profile updates
    if (Object.keys(profileUpdates).length > 0) {
      updatedUserProfile = await UserProfile.findOneAndUpdate(
        { authId: req.user.id },
        profileUpdates,
        {
          new: true,
          runValidators: true,
        },
      );
    } else {
      updatedUserProfile = userProfile;
    }

    const combinedUser = {
      ...updatedAuthUser.toObject(),
      ...updatedUserProfile.toObject(),
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

// @desc Accept terms of service and privacy policy
// @route POST /api/v1/users/accept-terms
// @access Private - Only for logged in users
async function acceptTerms(req, res) {
  try {
    const { termsOfService, privacyPolicy, dataProcessingConsent, versions } =
      req.body;

    // Validate that all terms are being accepted
    if (!termsOfService || !privacyPolicy || !dataProcessingConsent) {
      return res.status(400).json({
        success: false,
        error:
          'Terms of service, privacy policy, and data processing consent must all be accepted',
      });
    }

    logInfo(req.user.id);
    // Check if user exists in Better Auth
    const authUser = await User.findById(req.user.id);
    if (!authUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const currentTime = new Date();
    const acceptanceData = {
      user: authUser.id,
      termsOfServiceAccepted: true,
      termsOfServiceAcceptedAt: currentTime,
      privacyPolicyAccepted: true,
      privacyPolicyAcceptedAt: currentTime,
      dataProcessingConsentAccepted: true,
      dataProcessingConsentAcceptedAt: currentTime,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      acceptanceMethod: 'api',
    };

    if (versions) {
      if (versions.termsOfService) {
        acceptanceData.termsOfServiceVersion = versions.termsOfService;
      }
      if (versions.privacyPolicy) {
        acceptanceData.privacyPolicyVersion = versions.privacyPolicy;
      }
      if (versions.dataProcessingConsent) {
        acceptanceData.dataProcessingConsentVersion =
          versions.dataProcessingConsent;
      }
    }

    const legalAcceptance = await LegalAcceptance.createOrUpdate(
      authUser.id,
      acceptanceData,
    );

    let userProfile = await UserProfile.findByAuthId(req.user.id);
    if (authUser && !userProfile) {
      userProfile = await UserProfile.create({
        authId: req.user.id,
      });
    }

    const combinedUser = {
      ...req.user,
      ...userProfile.toObject(),
      legalAcceptance: legalAcceptance.getAcceptanceStatus(),
    };

    res.status(200).json({
      success: true,
      data: combinedUser,
      message:
        'Terms of service, privacy policy, and data processing consent accepted successfully',
    });
  } catch (error) {
    logError('Error accepting terms:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

// @desc Get legal acceptance status
// @route GET /api/v1/users/legal-status
// @access Private - Only for logged in users
async function getLegalStatus(req, res) {
  try {
    // Check if user exists in Better Auth
    const authUser = await User.findById(req.user.id);
    if (!authUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const legalAcceptance = await LegalAcceptance.findByUserId(authUser.id);

    if (!legalAcceptance) {
      return res.status(200).json({
        success: true,
        data: {
          termsOfService: { accepted: false, acceptedAt: null, version: null },
          privacyPolicy: { accepted: false, acceptedAt: null, version: null },
          dataProcessingConsent: {
            accepted: false,
            acceptedAt: null,
            version: null,
          },
          allAccepted: false,
        },
        message: 'No legal acceptance record found',
      });
    }

    res.status(200).json({
      success: true,
      data: legalAcceptance.getAcceptanceStatus(),
    });
  } catch (error) {
    logError('Error getting legal status:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

export { getUser, getUserById, updateUser, acceptTerms, getLegalStatus };
