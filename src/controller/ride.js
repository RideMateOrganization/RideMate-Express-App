const { Types } = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { RideVisibility } = require('../utils/constants');
const Ride = require('../models/ride');

// Create a new ride
// @route POST /api/rides
// @access Private
async function createRide(req, res) {
  try {
    const {
      name,
      description,
      startTime,
      endTime,
      startLocation,
      endLocation,
      maxParticipants,
      visibility,
      route,
    } = req.body;

    if (
      !name ||
      !startTime ||
      !startLocation ||
      !startLocation.coordinates ||
      !startLocation.address ||
      !startLocation.address.city ||
      !startLocation.address.country
    ) {
      return res.status(400).json({
        success: false,
        error:
          'Please provide ride name, start time, start location coordinates, city, and country.',
      });
    }
    if (
      !Array.isArray(startLocation.coordinates) ||
      startLocation.coordinates.length !== 2
    ) {
      return res.status(400).json({
        success: false,
        error:
          'Start location coordinates must be an array of [longitude, latitude].',
      });
    }

    // Add more detailed validation for endLocation if it's provided
    if (endLocation) {
      if (
        !endLocation.coordinates ||
        !Array.isArray(endLocation.coordinates) ||
        endLocation.coordinates.length !== 2
      ) {
        return res.status(400).json({
          success: false,
          error:
            'End location coordinates must be an array of [longitude, latitude] if endLocation is provided.',
        });
      }
      if (
        !endLocation.address ||
        !endLocation.address.city ||
        !endLocation.address.country
      ) {
        return res.status(400).json({
          success: false,
          error:
            'End location address must include city and country if endLocation is provided.',
        });
      }
    }

    // Create a new Ride instance
    const newRide = new Ride({
      name,
      description,
      owner: req.user.id,
      startTime: new Date(startTime),
      endTime: endTime ? new Date(endTime) : undefined,
      startLocation: {
        type: 'Point',
        coordinates: startLocation.coordinates,
        address: {
          addressLine1: startLocation.address.addressLine1,
          addressLine2: startLocation.address.addressLine2,
          city: startLocation.address.city,
          stateProvince: startLocation.address.stateProvince,
          country: startLocation.address.country,
          postalCode: startLocation.address.postalCode,
          landmark: startLocation.address.landmark,
        },
      },
      endLocation: endLocation
        ? {
            type: 'Point',
            coordinates: endLocation.coordinates,
            address: {
              addressLine1: endLocation.address.addressLine1,
              addressLine2: endLocation.address.addressLine2,
              city: endLocation.address.city,
              stateProvince: endLocation.address.stateProvince,
              country: endLocation.address.country,
              postalCode: endLocation.address.postalCode,
              landmark: endLocation.address.landmark,
            },
          }
        : undefined,
      route,
      maxParticipants,
      visibility: visibility || RideVisibility.Public,
      status: 'planned',
    });

    newRide.rideId = uuidv4().toUpperCase();
    await newRide.save();

    res.status(201).json({
      success: true,
      data: newRide,
    });
  } catch (error) {
    console.error(error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        error: messages.join(', '),
      });
    }
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

// @desc    Get all rides (e.g., for discovery)
// @route   GET /api/v1/rides
// @access  Private
// @query   {string} owner - Filter rides by owner ID
// @query   {string} startTime - Sort rides: 'asc' (default) or 'desc' by startTime
// @query   {number} page - Page number for pagination (default: 1)
// @query   {number} limit - Number of rides per page (default: 10, max: 50)
async function getRides(req, res) {
  try {
    const { owner, startTime, page = 1, limit = 10 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const filterObj = {};
    if (owner && req.user) {
      filterObj.owner = req.user.id;
    }

    let sortObj = { startTime: 1 };
    if (startTime === 'desc') {
      sortObj = { startTime: -1 };
    } else if (startTime === 'asc') {
      sortObj = { startTime: 1 };
    }

    const totalRides = await Ride.countDocuments(filterObj);
    const totalPages = Math.ceil(totalRides / limitNum);

    const rides = await Ride.find(filterObj)
      .populate('owner', 'name handle profileImage')
      .populate('participants.user', 'name handle profileImage')
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      count: rides.length,
      total: totalRides,
      data: rides,
      pagination: {
        currentPage: pageNum,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
        nextPage: pageNum < totalPages ? pageNum + 1 : null,
        prevPage: pageNum > 1 ? pageNum - 1 : null,
        limit: limitNum,
      },
      filters: {
        owner: owner || 'all',
        startTime: startTime || 'asc',
      },
    });
  } catch (err) {
    console.error('Error getting rides:', err);
    res
      .status(500)
      .json({ success: false, error: 'Server Error getting rides.' });
  }
}

// @desc    Get single ride by ID
// @route   GET /api/v1/rides/:id
// @access  Public
async function getRide(req, res) {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate('owner', 'name handle profileImage')
      .populate('participants.user', 'name handle profileImage');

    if (!ride) {
      return res.status(404).json({
        success: false,
        error: `Ride not found with id of ${req.params.id}`,
      });
    }

    res.status(200).json({
      success: true,
      data: ride,
    });
  } catch (err) {
    console.error('Error getting single ride:', err);
    if (err.name === 'CastError') {
      return res
        .status(400)
        .json({ success: false, error: 'Invalid ride ID format.' });
    }
    res
      .status(500)
      .json({ success: false, error: 'Server Error getting ride.' });
  }
}

// @desc    Join a ride by rideId
// @route   POST /api/v1/rides/join/:rideId
// @access  Private
async function joinRide(req, res) {
  try {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, error: 'Not authorized, no user found' });
    }

    const { rideId } = req.params;
    const userId = req.user.id;

    const ride = await Ride.findOne({ rideId: rideId.toUpperCase() });

    if (!ride) {
      return res
        .status(404)
        .json({ success: false, error: `Ride not found with ID ${rideId}` });
    }

    const isAlreadyParticipant = ride.participants.some(
      (p) => p.user.toString() === userId.toString(),
    );

    if (isAlreadyParticipant) {
      return res.status(400).json({
        success: false,
        error: 'You are already a participant of this ride.',
      });
    }

    if (
      ride.maxParticipants &&
      ride.participants.length >= ride.maxParticipants
    ) {
      return res.status(400).json({
        success: false,
        error: 'This ride has reached its maximum number of participants.',
      });
    }

    let isApproved = false;
    if (ride.visibility === RideVisibility.Public) {
      isApproved = true;
    } else {
      isApproved = false;
    }

    ride.participants.push({
      user: new Types.ObjectId(userId),
      joinedAt: new Date(),
      role: 'member',
      isApproved,
    });

    await ride.save();

    if (isApproved) {
      res.status(200).json({
        success: true,
        message: 'Successfully joined the ride!',
        data: ride,
      });
    } else {
      res.status(200).json({
        success: false,
        message:
          'Your request to join this private ride has been sent to the owner for approval.',
        data: ride,
      });
    }
  } catch (err) {
    console.error('Error joining ride:', err);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((val) => val.message);
      return res
        .status(400)
        .json({ success: false, error: messages.join(', ') });
    }
    res
      .status(500)
      .json({ success: false, error: 'Server Error joining ride.' });
  }
}

// @desc    Leave a ride
// @route   POST /api/v1/rides/leave/:rideId
// @access  Private
async function leaveRide(req, res) {
  try {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, error: 'Not authorized, no user found' });
    }

    const { rideId } = req.params;
    const userId = req.user.id;

    const ride = await Ride.findOne({ rideId: rideId.toUpperCase() });

    if (!ride) {
      return res
        .status(404)
        .json({ success: false, error: `Ride not found with ID ${rideId}` });
    }

    const participantIndex = ride.participants.findIndex(
      (p) => p.user.toString() === userId.toString(),
    );

    if (participantIndex === -1) {
      return res.status(400).json({
        success: false,
        error: 'You are not a participant of this ride.',
      });
    }

    if (ride.participants[participantIndex].role === 'owner') {
      return res.status(403).json({
        success: false,
        error:
          'Owners cannot leave a ride. Consider canceling or transferring ownership.',
      });
    }

    ride.participants.splice(participantIndex, 1);

    await ride.save();

    res.status(200).json({
      success: true,
      data: ride,
    });
  } catch (err) {
    console.error('Error leaving ride:', err);
    res
      .status(500)
      .json({ success: false, error: 'Server Error leaving ride.' });
  }
}

module.exports = {
  createRide,
  getRides,
  getRide,
  joinRide,
  leaveRide,
};
