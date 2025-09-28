import UserDevice from '../models/user-device.js';

// @desc Register/Update a user device with push token
// @route POST /api/v1/devices
// @access Private - Only for logged in users
async function registerDevice(req, res) {
  try {
    const { pushToken, deviceType = 'android' } = req.body;
    const userId = req.user.id;

    // Validate required field
    if (!pushToken) {
      return res.status(400).json({
        success: false,
        error: 'pushToken is required',
      });
    }

    // Check if device already exists for this user
    let device = await UserDevice.findOne({ user: userId, pushToken });

    if (device) {
      // Update existing device
      device.deviceType = deviceType;
      device.isActive = true;
      await device.save();
    } else {
      // Create new device
      device = await UserDevice.create({
        user: userId,
        pushToken,
        deviceType,
      });
    }

    res.status(200).json({
      success: true,
      data: device,
      message: 'Device registered/updated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

// @desc Get all devices for current user
// @route GET /api/v1/devices
// @access Private - Only for logged in users
async function getUserDevices(req, res) {
  try {
    const userId = req.user.id;
    const devices = await UserDevice.find({ user: userId }).sort({
      lastSeen: -1,
    });

    res.status(200).json({
      success: true,
      count: devices.length,
      data: devices,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

// @desc Deactivate a device
// @route DELETE /api/v1/devices/:pushToken
// @access Private - Only for logged in users
async function deactivateDevice(req, res) {
  try {
    const { pushToken } = req.params;
    const userId = req.user.id;

    const device = await UserDevice.deactivateDevice(userId, pushToken);

    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found',
      });
    }

    res.status(200).json({
      success: true,
      data: device,
      message: 'Device deactivated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

// @desc Deactivate all devices for current user
// @route DELETE /api/v1/devices
// @access Private - Only for logged in users
async function deactivateAllDevices(req, res) {
  try {
    const userId = req.user.id;

    const result = await UserDevice.deactivateAllDevicesForUser(userId);

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} devices deactivated successfully`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

export {
  registerDevice,
  getUserDevices,
  deactivateDevice,
  deactivateAllDevices,
};
