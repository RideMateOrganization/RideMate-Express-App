const { Types } = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { RideVisibility } = require('../utils/constants');
const Ride = require('../models/ride');
const RideRequest = require('../models/ride-requests');

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
      difficulty,
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
      difficulty: difficulty || 'easy',
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
      .populate('owner', 'name handle profileImage email')
      .populate('participants.user', 'name handle profileImage email')
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum);

    // Organize participants for each ride to match getRide structure
    const ridesWithOrganizedParticipants = rides.map((ride) => {
      const rideObj = ride.toObject();
      const approvedCount = rideObj.participants.filter(
        (p) => p.isApproved,
      ).length;
      const pendingCount = rideObj.participants.filter(
        (p) => !p.isApproved,
      ).length;

      rideObj.participants = {
        approved: approvedCount,
        pending: pendingCount,
        total: rideObj.maxParticipants || 0,
        available: rideObj.maxParticipants
          ? rideObj.maxParticipants - approvedCount
          : 0,
      };
      return rideObj;
    });

    res.status(200).json({
      success: true,
      count: ridesWithOrganizedParticipants.length,
      total: totalRides,
      data: ridesWithOrganizedParticipants,
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
      .populate('owner', 'name handle profileImage email')
      .populate('participants.user', 'name handle profileImage email');

    if (!ride) {
      return res.status(404).json({
        success: false,
        error: `Ride not found with id of ${req.params.id}`,
      });
    }

    const approvedCount = ride.participants.filter((p) => p.isApproved).length;
    const pendingCount = ride.participants.filter((p) => !p.isApproved).length;

    const organizedParticipants = {
      approved: approvedCount,
      pending: pendingCount,
      total: ride.maxParticipants || 0,
      available: ride.maxParticipants
        ? ride.maxParticipants - approvedCount
        : 0,
    };

    // Prepare response data
    const responseData = {
      ...ride.toObject(),
      participants: organizedParticipants,
    };

    res.status(200).json({
      success: true,
      data: responseData,
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
    const { id } = req.params;
    const userId = req.user.id;
    const message = req.body?.message ?? '';

    const ride = await Ride.findById(id);

    if (!ride) {
      return res
        .status(404)
        .json({ success: false, error: `Ride not found with ID ${id}` });
    }

    // Check if user is already a participant
    const isAlreadyParticipant = ride.participants.some(
      (p) => p.user.toString() === userId.toString(),
    );

    if (isAlreadyParticipant) {
      return res.status(400).json({
        success: false,
        error: 'You are already a participant of this ride.',
      });
    }

    // Check if there's already a pending request
    const existingRequest = await RideRequest.findOne({
      ride: ride.id,
      user: userId,
      status: 'pending',
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        error: 'You already have a pending request for this ride.',
      });
    }

    if (ride.visibility === RideVisibility.Public) {
      if (
        ride.maxParticipants &&
        ride.participants.length >= ride.maxParticipants
      ) {
        return res.status(400).json({
          success: false,
          error: 'This ride has reached its maximum number of participants.',
        });
      }

      ride.participants.push({
        user: new Types.ObjectId(userId),
        joinedAt: new Date(),
        role: 'member',
        isApproved: true,
      });

      await ride.save();

      res.status(200).json({
        success: true,
        message: 'Successfully joined the ride!',
        data: ride,
      });
    } else {
      // For private rides, create a join request
      const newRequest = new RideRequest({
        ride: ride.id,
        user: userId,
        message: message || '',
        status: 'pending',
      });

      await newRequest.save();

      res.status(200).json({
        success: true,
        message:
          'Your request to join this private ride has been sent to the owner for approval.',
        data: {
          requestId: newRequest.id,
          status: 'pending',
          rideId: ride.rideId,
          rideName: ride.name,
        },
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
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'You already have a pending request for this ride.',
      });
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
    const { id } = req.params;
    const userId = req.user.id;

    const ride = await Ride.findById(id);

    if (!ride) {
      return res
        .status(404)
        .json({ success: false, error: `Ride not found with ID ${id}` });
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

// @desc    Get pending join requests for rides owned by the user
// @route   GET /api/v1/rides/requests/pending
// @access  Private
async function getPendingRequests(req, res) {
  try {
    const userId = req.user.id;

    // Find all rides owned by the user
    const userRides = await Ride.find({ owner: userId }).select(
      '_id name rideId startTime',
    );
    const rideIds = userRides.map((ride) => ride.id);

    // Find all pending requests for these rides
    const pendingRequests = await RideRequest.find({
      ride: { $in: rideIds },
      status: 'pending',
    })
      .populate('ride', 'name rideId startTime')
      .populate('user', 'name handle profileImage email')
      .sort({ requestedAt: -1 });

    // Group requests by ride
    const requestsByRide = pendingRequests.reduce((acc, request) => {
      const { rideId } = request.ride;
      if (!acc[rideId]) {
        acc[rideId] = {
          rideId: request.ride.rideId,
          rideName: request.ride.name,
          startTime: request.ride.startTime,
          pendingRequests: [],
        };
      }
      acc[rideId].pendingRequests.push({
        requestId: request.id,
        user: request.user,
        message: request.message,
        requestedAt: request.requestedAt,
      });
      return acc;
    }, {});

    const result = Object.values(requestsByRide);

    res.status(200).json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (err) {
    console.error('Error getting pending requests:', err);
    res.status(500).json({
      success: false,
      error: 'Server Error getting pending requests.',
    });
  }
}

// @desc    Approve or reject a join request
// @route   POST /api/v1/rides/requests/:requestId
// @access  Private
async function approveRejectRequest(req, res) {
  try {
    const { requestId } = req.params;
    const { action, responseMessage } = req.body;
    const ownerId = req.user.id;

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Action must be either "approve" or "reject"',
      });
    }

    // Find the request and populate ride details
    const request = await RideRequest.findById(requestId)
      .populate('ride')
      .populate('user', 'name handle profileImage');

    if (!request) {
      return res
        .status(404)
        .json({ success: false, error: 'Request not found' });
    }

    // Verify the user owns the ride
    if (request.ride.owner.toString() !== ownerId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Only the ride owner can approve/reject requests',
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'This request has already been processed',
      });
    }

    // Update request status
    request.status = action === 'approve' ? 'approved' : 'rejected';
    request.respondedAt = new Date();
    request.respondedBy = ownerId;
    request.responseMessage = responseMessage || '';

    await request.save();

    if (action === 'approve') {
      // Check if ride has reached max participants
      const approvedParticipants = await RideRequest.countDocuments({
        ride: request.ride.id,
        status: 'approved',
      });

      if (
        request.ride.maxParticipants &&
        approvedParticipants >= request.ride.maxParticipants
      ) {
        // Revert the approval if max participants reached
        request.status = 'pending';
        request.respondedAt = undefined;
        request.respondedBy = undefined;
        request.responseMessage = undefined;
        await request.save();

        return res.status(400).json({
          success: false,
          error:
            'Cannot approve request: ride has reached maximum participants',
        });
      }

      // Add user to ride participants
      const ride = await Ride.findById(request.ride.id);
      ride.participants.push({
        user: request.user.id,
        joinedAt: new Date(),
        role: 'member',
        isApproved: true,
      });

      await ride.save();

      res.status(200).json({
        success: true,
        message: 'Join request approved successfully',
        data: {
          request,
          ride,
        },
      });
    } else {
      res.status(200).json({
        success: true,
        message: 'Join request rejected',
        data: request,
      });
    }
  } catch (err) {
    console.error('Error approving/rejecting request:', err);
    res
      .status(500)
      .json({ success: false, error: 'Server Error processing request.' });
  }
}

// @desc    Get user's ride requests
// @route   GET /api/v1/rides/requests/my-requests
// @access  Private
async function getMyRequests(req, res) {
  try {
    const userId = req.user.id;
    const requests = await RideRequest.find({ user: userId })
      .populate('ride', 'name rideId startTime owner')
      .populate('ride.owner', 'name handle')
      .sort({ requestedAt: -1 });

    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (err) {
    console.error('Error getting user requests:', err);
    res
      .status(500)
      .json({ success: false, error: 'Server Error getting user requests.' });
  }
}

// @desc    Get all participants for a specific ride (including pending requests)
// @route   GET /api/v1/rides/:rideId/participants
// @access  Private
async function getRideParticipants(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const ride = await Ride.findById(id)
      .populate('participants.user')
      .select('name rideId owner participants maxParticipants');

    if (!ride) {
      return res
        .status(404)
        .json({ success: false, error: `Ride not found with ID ${id}` });
    }

    // Check if user is owner or approved participant
    const isOwner = ride.owner.toString() === userId.toString();
    const isApprovedParticipant = ride.participants.some(
      (p) => p.user.toString() === userId.toString() && p.isApproved,
    );

    if (!isOwner && !isApprovedParticipant) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: not owner or approved participant',
      });
    }

    // Get pending requests from RideRequest model
    const pendingRequests = await RideRequest.find({
      ride: id,
      status: 'pending',
    }).populate('user');

    // Organize participants by status
    const participants = {
      owner: ride.participants.find((p) => p.role === 'owner'),
      approved: ride.participants.filter((p) => p.isApproved),
      pending: pendingRequests,
      total: ride.participants.length,
      maxParticipants: ride.maxParticipants,
      availableSpots: ride.maxParticipants
        ? ride.maxParticipants -
          ride.participants.filter((p) => p.isApproved).length
        : null,
    };

    res.status(200).json({
      success: true,
      data: {
        rideId: ride.rideId,
        rideName: ride.name,
        participants,
      },
    });
  } catch (err) {
    console.error('Error getting ride participants:', err);
    if (err.name === 'CastError') {
      return res
        .status(400)
        .json({ success: false, error: 'Invalid ride ID format.' });
    }
    res
      .status(500)
      .json({ success: false, error: 'Server Error getting participants.' });
  }
}

module.exports = {
  createRide,
  getRides,
  getRide,
  joinRide,
  leaveRide,
  getPendingRequests,
  approveRejectRequest,
  getMyRequests,
  getRideParticipants,
};
