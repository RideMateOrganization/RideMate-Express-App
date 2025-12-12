import mongoose, { Types } from 'mongoose';

import Ride from '../models/ride.js';
import generateUniqueRideCode from '../utils/ride-code-generator.js';
import RideRequest from '../models/ride-requests.js';
import RideTracking from '../models/ride-tracking.js';
import UserDevice from '../models/user-device.js';
import { RideVisibility, RideStatus } from '../utils/constants.js';
import { sendPushNotification } from '../utils/expo-push-manager.js';
import {
  updateRideStats,
  updateParticipantStats,
} from '../utils/ride-stats-updater.js';
import { calculateRideStats } from '../utils/ride-stats-calculator.js';
import getDateRange from '../utils/date-filter.js';
import calculateDistance from '../utils/distance-calculator.js';
import {
  scheduleAllRemindersForRide,
  cancelAllRemindersForRide,
  rescheduleRemindersForRide,
} from '../services/ride-notification.service.js';
// Redis caching temporarily disabled - will be implemented later
// import {
//   invalidateRidesCache,
//   invalidateRideCache,
//   invalidateExpensesCache,
//   invalidateRideRequestsCache,
// } from '../utils/cache.js';

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
      bannerImage,
      waypoints,
    } = req.body;

    if (
      !name ||
      !startTime ||
      !startLocation ||
      !startLocation.coordinates ||
      !Array.isArray(startLocation.coordinates) ||
      startLocation.coordinates.length !== 2 ||
      !startLocation.address ||
      !startLocation.address.city ||
      !startLocation.address.country
    ) {
      return res.status(400).json({
        success: false,
        error:
          'Please provide ride name, start time, start location coordinates as [longitude, latitude] array, city, and country.',
      });
    }
    if (
      typeof startLocation.coordinates[0] !== 'number' ||
      typeof startLocation.coordinates[1] !== 'number'
    ) {
      return res.status(400).json({
        success: false,
        error:
          'Start location coordinates must be valid numbers in [longitude, latitude] format.',
      });
    }

    // Add more detailed validation for endLocation if it's provided
    if (endLocation) {
      if (
        !endLocation.coordinates ||
        !Array.isArray(endLocation.coordinates) ||
        endLocation.coordinates.length !== 2 ||
        typeof endLocation.coordinates[0] !== 'number' ||
        typeof endLocation.coordinates[1] !== 'number'
      ) {
        return res.status(400).json({
          success: false,
          error:
            'End location coordinates must be provided as [longitude, latitude] array if endLocation is provided.',
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

    // Validate waypoints if provided
    if (waypoints && Array.isArray(waypoints)) {
      for (let i = 0; i < waypoints.length; i += 1) {
        const waypoint = waypoints[i];
        if (
          !waypoint.coordinates ||
          !Array.isArray(waypoint.coordinates) ||
          waypoint.coordinates.length !== 2 ||
          typeof waypoint.coordinates[0] !== 'number' ||
          typeof waypoint.coordinates[1] !== 'number'
        ) {
          return res.status(400).json({
            success: false,
            error: `Waypoint ${i + 1} coordinates must be provided as [longitude, latitude] array.`,
          });
        }
        if (
          !waypoint.address ||
          !waypoint.address.city ||
          !waypoint.address.country
        ) {
          return res.status(400).json({
            success: false,
            error: `Waypoint ${i + 1} address must include city and country.`,
          });
        }
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
        coordinates: startLocation.coordinates, // Already in [longitude, latitude] format
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
          coordinates: endLocation.coordinates, // Already in [longitude, latitude] format
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
      maxParticipants: maxParticipants
        ? parseInt(maxParticipants, 10)
        : undefined,
      difficulty: difficulty || 'easy',
      visibility: visibility || RideVisibility.PUBLIC,
      bannerImage,
      waypoints: waypoints
        ? waypoints.map((waypoint) => ({
          type: 'Point',
          coordinates: waypoint.coordinates,
          address: {
            addressLine1: waypoint.address.addressLine1,
            addressLine2: waypoint.address.addressLine2,
            city: waypoint.address.city,
            stateProvince: waypoint.address.stateProvince,
            country: waypoint.address.country,
            postalCode: waypoint.address.postalCode,
            landmark: waypoint.address.landmark,
          },
        }))
        : undefined,
      status: 'planned',
    });

    newRide.rideId = await generateUniqueRideCode();
    await newRide.save();

    // Schedule ride reminder notifications
    try {
      const participantIds = newRide.participants.map((p) =>
        p.user.toString(),
      );
       
      await scheduleAllRemindersForRide(
        newRide._id.toString(),
        newRide.name,
        newRide.startTime,
        newRide.owner.toString(),
        participantIds,
      );
    } catch (error) {
      console.error('Failed to schedule ride reminders:', error);
      // Don't fail the request - reminders are non-critical
    }

    // Invalidate rides list cache after creating new ride
    // Redis caching temporarily disabled
    // await invalidateRidesCache();

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
// @query   {boolean} participant - Filter rides where user is owner or participant
// @query   {string} search - Search rides by name, description, start location, or end location (case-insensitive)
// @query   {string} status - Filter by status: 'planned', 'active', 'completed', 'cancelled' or comma-separated values (default: 'planned,active')
// @query   {string} dateFilter - Filter by date: 'today', 'tomorrow', 'this_week', 'next_week', 'this_month', 'any' (default: 'any')
// @query   {string} difficulty - Filter by difficulty: 'easy', 'medium', 'hard', 'extreme', 'any' (default: 'any')
// @query   {string} participantCount - Filter by participant count: 'small', 'medium', 'large', 'spots_available', 'any' (default: 'any')
async function getRides(req, res) {
  try {
    const {
      owner,
      startTime,
      page = 1,
      limit = 10,
      participant,
      search,
      status,
      dateFilter = 'any',
      difficulty = 'any',
      participantCount = 'any',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const filterObj = {};

    // Handle status filtering
    let statusFilter;
    if (status) {
      // Parse comma-separated status values
      const statusArray = status.split(',').map((s) => s.trim());
      const validStatuses = Object.values(RideStatus);
      const filteredStatuses = statusArray.filter((s) =>
        validStatuses.includes(s),
      );

      if (filteredStatuses.length > 0) {
        statusFilter = { status: { $in: filteredStatuses } };
      } else {
        return res.status(400).json({
          success: false,
          error: `Invalid status values. Valid options are: ${validStatuses.join(', ')}`,
        });
      }
    } else {
      // Default: show planned and active rides (exclude completed and cancelled)
      statusFilter = {
        status: { $in: [RideStatus.PLANNED, RideStatus.ACTIVE] },
      };
    }

    // Handle date filtering
    if (dateFilter && dateFilter !== 'any') {
      const dateRange = getDateRange(dateFilter);
      if (dateRange) {
        filterObj.startTime = dateRange;
      }
    }

    // Handle difficulty filtering
    if (difficulty && difficulty !== 'any') {
      filterObj.difficulty = difficulty;
    }

    // Apply user-based filters
    if (req.user) {
      if (owner === 'true') {
        filterObj.owner = req.user.id;
      } else if (owner === 'false' && participant === 'true') {
        filterObj.$and = [
          { owner: { $ne: req.user.id } },
          { 'participants.user': req.user.id },
        ];
      } else if (participant === 'true') {
        filterObj.$or = [
          { owner: req.user.id },
          { 'participants.user': req.user.id },
        ];
      } else if (participant === 'false') {
        filterObj.$and = [
          { owner: { $ne: req.user.id } },
          { 'participants.user': { $ne: req.user.id } },
        ];
      }
    }

    // Combine status filter with existing filters
    if (Object.keys(filterObj).length > 0) {
      if (filterObj.$and) {
        filterObj.$and.push(statusFilter);
      } else if (filterObj.$or) {
        const existingOrConditions = filterObj.$or;
        delete filterObj.$or;
        filterObj.$and = [{ $or: existingOrConditions }, statusFilter];
      } else {
        const existingConditions = { ...filterObj };
        filterObj.$and = [existingConditions, statusFilter];
        Object.keys(existingConditions).forEach((key) => {
          delete filterObj[key];
        });
      }
    } else {
      // No other filters, just apply status filter directly
      Object.assign(filterObj, statusFilter);
    }

    // Handle participant count filtering
    if (participantCount && participantCount !== 'any') {
      let participantCountExpr;

      switch (participantCount) {
        case 'small':
          participantCountExpr = { $lte: 5 };
          break;
        case 'medium':
          participantCountExpr = { $gte: 6, $lte: 15 };
          break;
        case 'large':
          participantCountExpr = { $gte: 16 };
          break;
        case 'spots_available':
          // Rides where available spots > 0 (maxParticipants - approvedParticipantsCount > 0)
          participantCountExpr = {
            $expr: {
              $gt: [
                { $ifNull: ['$maxParticipants', 0] },
                {
                  $size: {
                    $filter: {
                      input: '$participants',
                      cond: { $eq: ['$$this.isApproved', true] },
                    },
                  },
                },
              ],
            },
          };
          break;
        default:
          participantCountExpr = null;
      }

      if (participantCountExpr) {
        if (participantCount === 'spots_available') {
          filterObj.$expr = participantCountExpr.$expr;
        } else {
          filterObj.maxParticipants = participantCountExpr;
        }
      }
    }

    // Add search filter if search parameter is provided
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      const searchConditions = [
        { name: searchRegex },
        { description: searchRegex },
        { 'startLocation.address.city': searchRegex },
        { 'startLocation.address.stateProvince': searchRegex },
        { 'startLocation.address.country': searchRegex },
        { 'endLocation.address.city': searchRegex },
        { 'endLocation.address.stateProvince': searchRegex },
        { 'endLocation.address.country': searchRegex },
      ];

      if (Object.keys(filterObj).length > 0) {
        if (filterObj.$and) {
          filterObj.$and.push({ $or: searchConditions });
        } else if (filterObj.$or) {
          const existingOrConditions = filterObj.$or;
          delete filterObj.$or;
          filterObj.$and = [existingOrConditions, { $or: searchConditions }];
        } else {
          const existingConditions = { ...filterObj };
          filterObj.$and = [existingConditions, { $or: searchConditions }];
          Object.keys(existingConditions).forEach((key) => {
            delete filterObj[key];
          });
        }
      } else {
        filterObj.$or = searchConditions;
      }
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
      .populate({
        path: 'owner',
        select: 'name email image phoneNumber',
        populate: { path: 'profile', select: 'handle' },
      })
      .populate({
        path: 'participants.user',
        select: 'name email image phoneNumber',
        populate: { path: 'profile', select: 'handle' },
      })
      .lean() // Use lean() for read-only queries
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum);

    // Organize participants for each ride to match getRide structure
    const ridesWithOrganizedParticipants = rides.map((ride) => {
      const rideObj = ride; // lean() already returns plain objects
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
        participant: participant || 'false',
        search: search || null,
        status: status || 'planned,active',
        dateFilter: dateFilter || 'any',
        difficulty: difficulty || 'any',
        participantCount: participantCount || 'any',
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
    const ride = await Ride.findById(req.params.id);

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

// @desc    Join a ride by rideId (supports both MongoDB _id and 6-digit code)
// @route   POST /api/v1/rides/join/:rideId
// @access  Private
async function joinRide(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const message = req.body?.message ?? '';

    // Determine if the ID is a MongoDB ObjectId or a 6-digit ride code
    const isMongoId = mongoose.Types.ObjectId.isValid(id);
    let ride;

    if (isMongoId) {
      // Query by MongoDB _id
      ride = await Ride.findById(id);
    } else {
      // Query by 6-digit ride code (case insensitive)
      ride = await Ride.findOne({ rideId: id.toUpperCase() });
    }

    if (!ride) {
      const errorMessage = isMongoId
        ? `Ride not found with ID ${id}`
        : `Ride not found with code ${id}`;
      return res.status(404).json({ success: false, error: errorMessage });
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
    const existingPendingRequest = await RideRequest.findOne({
      ride: ride.id,
      user: userId,
      status: 'pending',
    });

    if (existingPendingRequest) {
      return res.status(400).json({
        success: false,
        error: 'You already have a pending request for this ride.',
      });
    }

    // Check if user already has an approved request (they're already in the ride)
    const existingApprovedRequest = await RideRequest.findOne({
      ride: ride.id,
      user: userId,
      status: 'approved',
    });

    if (existingApprovedRequest) {
      return res.status(400).json({
        success: false,
        error: 'You are already approved for this ride.',
      });
    }

    // Clean up any rejected requests to allow new requests
    await RideRequest.deleteMany({
      ride: ride.id,
      user: userId,
      status: 'rejected',
    });

    if (ride.visibility === RideVisibility.PUBLIC) {
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
      // Redis caching temporarily disabled
      // await invalidateRideCache(ride.id);

      return res.status(200).json({
        success: true,
        message: 'Successfully joined the ride!',
        data: ride,
      });
    }

    // For private rides, create a join request
    const newRequest = new RideRequest({
      ride: ride.id,
      user: userId,
      message: message || '',
      status: 'pending',
    });

    await newRequest.save();

    // Send push notification to the ride owner
    const rideOwner = ride.owner;
    const userDevice = await UserDevice.findOne({
      user: rideOwner,
      isActive: true,
    }).sort({ lastSeen: -1 });

    if (userDevice) {
      await sendPushNotification(
        userDevice.pushToken,
        'Ride Request',
        `You have a new ride request from ${req.user.name}`,
        message,
        {
          notificationType: 'NOTIFICATION__USER_RIDE_JOIN_REQUEST',
          rideId: ride.id,
          rideName: ride.name,
          requesterName: req.user.name,
          requesterId: userId,
        },
      );
    }

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
    // Redis caching temporarily disabled
    // await invalidateRideCache(ride.id);

    // Reschedule reminders with updated participant list
    try {
      const participantIds = ride.participants.map((p) => p.user.toString());
      // eslint-disable-next-line no-underscore-dangle
      await rescheduleRemindersForRide(ride._id.toString(), {
        rideName: ride.name,
        rideStartTime: ride.startTime,
        ownerId: ride.owner.toString(),
        participantIds,
      });
    } catch (error) {
      console.error(
        'Failed to reschedule reminders after participant left:',
        error,
      );
      // Don't fail the request - reminders are non-critical
    }

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
      .populate({
        path: 'user',
        select: 'name email image phoneNumber',
        populate: { path: 'profile', select: 'handle' },
      })
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
      .populate({
        path: 'user',
        select: '_id name email image phoneNumber',
        populate: { path: 'profile', select: 'handle' },
      });

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

    // Use the original user ID from the request document, not the populated user
    const userId = request.user.id || request.user;

    if (action === 'approve') {
      // Check if user already has an approved request for this ride
      const existingApprovedRequest = await RideRequest.findOne({
        ride: request.ride.id,
        user: userId,
        status: 'approved',
      });

      if (existingApprovedRequest) {
        return res.status(400).json({
          success: false,
          error: 'This user already has an approved request for this ride',
        });
      }

      // For approvals, we need to delete existing requests and create a new approved one
      // because approved requests can't coexist with pending ones due to unique constraint
      await RideRequest.deleteMany({
        ride: request.ride.id,
        user: userId,
      });

      // Create a new approved request
      const updatedRequest = await RideRequest.create({
        ride: request.ride.id,
        user: userId,
        status: 'approved',
        message: request.message,
        respondedAt: new Date(),
        respondedBy: ownerId,
        responseMessage: responseMessage || '',
      });

      // Check if ride has reached max participants by looking at actual ride participants
      const ride = await Ride.findById(request.ride.id);
      const approvedParticipantsCount = ride.participants.filter(
        (p) => p.isApproved,
      ).length;

      if (
        ride.maxParticipants &&
        approvedParticipantsCount >= ride.maxParticipants
      ) {
        return res.status(400).json({
          success: false,
          error:
            'Cannot approve request: ride has reached maximum participants',
        });
      }

      // Add user to ride participants
      ride.participants.push({
        user: userId,
        joinedAt: new Date(),
        role: 'member',
        isApproved: true,
      });

      await ride.save();
      // Redis caching temporarily disabled
      // await invalidateRideCache(ride.id);
      // Redis caching temporarily disabled
      // await invalidateRideRequestsCache(ownerId, ride.id);

      // Send push notification to the approved user
      const userDevice = await UserDevice.findOne({
        user: userId,
        isActive: true,
      }).sort({ lastSeen: -1 });

      if (userDevice) {
        await sendPushNotification(
          userDevice.pushToken,
          'Ride Request Approved!',
          `Your request to join "${ride.name}" has been approved!`,
          responseMessage || 'Welcome to the ride!',
          {
            notificationType: 'NOTIFICATION__USER_RIDE_REQUEST_APPROVED',
            rideId: ride.id,
            rideName: ride.name,
            ownerName: req.user.name,
            startTime: ride.startTime,
          },
        );
      }

      // Reschedule reminders with updated participant list
      try {
        const participantIds = ride.participants.map((p) => p.user.toString());
        // eslint-disable-next-line no-underscore-dangle
        await rescheduleRemindersForRide(ride._id.toString(), {
          rideName: ride.name,
          rideStartTime: ride.startTime,
          ownerId: ride.owner.toString(),
          participantIds,
        });
      } catch (error) {
        console.error(
          'Failed to reschedule reminders after participant join:',
          error,
        );
        // Don't fail the request - reminders are non-critical
      }

      res.status(200).json({
        success: true,
        message: 'Join request approved successfully',
        data: {
          request: updatedRequest,
          ride,
        },
      });
    } else {
      // For rejections, simply update the existing request status
      const updatedRequest = await RideRequest.findByIdAndUpdate(
        requestId,
        {
          status: 'rejected',
          respondedAt: new Date(),
          respondedBy: ownerId,
          responseMessage: responseMessage || '',
        },
        { new: true, runValidators: true },
      );

      if (!updatedRequest) {
        return res.status(500).json({
          success: false,
          error: 'Failed to reject request',
        });
      }

      // Redis caching temporarily disabled
      // await invalidateRideRequestsCache(ownerId, request.ride.id);

      // Send push notification to the rejected user
      const userDevice = await UserDevice.findOne({
        user: userId,
        isActive: true,
      }).sort({ lastSeen: -1 });

      if (userDevice) {
        await sendPushNotification(
          userDevice.pushToken,
          'Ride Request Rejected',
          `Your request to join "${request.ride.name}" has been rejected`,
          responseMessage || 'Your request was not approved',
          {
            notificationType: 'NOTIFICATION__USER_RIDE_REQUEST_REJECTED',
            rideId: request.ride.id,
            rideName: request.ride.name,
            ownerName: req.user.name,
            startTime: request.ride.startTime,
          },
        );
      }

      res.status(200).json({
        success: true,
        message: 'Join request rejected',
        data: updatedRequest,
      });
    }
  } catch (err) {
    console.error('Error approving/rejecting request:', err);

    // Handle duplicate key error specifically
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        error:
          'This request has already been processed or there is a duplicate request.',
      });
    }

    res
      .status(500)
      .json({ success: false, error: 'Server Error processing request.' });
  }
}

// @desc    Get user's ride requests categorized by status
// @route   GET /api/v1/rides/requests/my-requests
// @access  Private
async function getMyRequests(req, res) {
  try {
    const userId = req.user.id;
    const requests = await RideRequest.find({ user: userId })
      .populate({
        path: 'ride',
        populate: {
          path: 'owner',
          select: 'name email image phoneNumber',
          populate: { path: 'profile', select: 'handle' },
        },
      })
      .populate({
        path: 'respondedBy',
        select: 'name email image phoneNumber',
        populate: { path: 'profile', select: 'handle' },
      })
      .sort({ createdAt: -1 });

    // Categorize requests by status
    const categorizedRequests = {
      pending: [],
      accepted: [],
      closed: [],
    };

    requests.forEach((request) => {
      const requestData = {
        id: request.id,
        ride: request.ride,
        message: request.message,
        createdAt: request.createdAt,
        respondedAt: request.respondedAt,
        responseMessage: request.responseMessage,
        respondedBy: request.respondedBy,
      };

      if (request.status === 'pending') {
        categorizedRequests.pending.push(requestData);
      } else if (request.status === 'approved') {
        categorizedRequests.accepted.push(requestData);
      } else if (request.status === 'rejected') {
        categorizedRequests.closed.push(requestData);
      }
    });

    res.status(200).json({
      success: true,
      count: requests.length,
      data: categorizedRequests,
    });
  } catch (err) {
    console.error('Error getting user requests:', err);
    res
      .status(500)
      .json({ success: false, error: 'Server Error getting user requests.' });
  }
}

// @desc    Delete a ride request
// @route   DELETE /api/v1/ride-requests/:requestId
// @access  Private
async function deleteRideRequest(req, res) {
  try {
    const { requestId } = req.params;
    const userId = req.user.id;

    // Find the request
    const request = await RideRequest.findById(requestId)
      .populate('ride', 'name rideId owner')
      .populate({
        path: 'user',
        select: '_id name email image phoneNumber',
        populate: { path: 'profile', select: 'handle' },
      });

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Ride request not found',
      });
    }

    // Check if user is the one who made the request or the ride owner
    const requestUserId = request.user.id || request.user;
    const isRequestOwner = requestUserId.toString() === userId.toString();
    const isRideOwner = request.ride.owner.toString() === userId.toString();

    if (!isRequestOwner && !isRideOwner) {
      return res.status(403).json({
        success: false,
        error:
          'You can only delete your own requests or requests for rides you own',
      });
    }

    // If request is approved and user is trying to delete it, check if they're still in the ride
    if (request.status === 'approved') {
      const ride = await Ride.findById(request.ride.id);
      const isStillParticipant = ride.participants.some(
        (p) => p.user.toString() === requestUserId.toString(),
      );

      if (isStillParticipant) {
        return res.status(400).json({
          success: false,
          error:
            'Cannot delete approved request while still participating in the ride',
        });
      }
    }

    // Delete the request
    await RideRequest.findByIdAndDelete(requestId);

    res.status(200).json({
      success: true,
      message: 'Ride request deleted successfully',
      data: {
        deletedRequest: {
          id: request.id,
          ride: request.ride,
          user: request.user,
          status: request.status,
          message: request.message,
        },
      },
    });
  } catch (err) {
    console.error('Error deleting ride request:', err);
    if (err.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid request ID format',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server Error deleting ride request',
    });
  }
}

// @desc    Get all participants for a specific ride (including pending requests)
// @route   GET /api/v1/rides/:rideId/participants
// @access  Private
async function getRideParticipants(req, res) {
  try {
    const { id } = req.params;

    // Find the ride with populated participants
    const ride = await Ride.findById(id)
      .populate({
        path: 'participants.user',
        select: '_id name email image phoneNumber',
        populate: { path: 'profile', select: 'handle' },
      })
      .select('name rideId owner participants maxParticipants id');

    if (!ride) {
      return res
        .status(404)
        .json({ success: false, error: `Ride not found with ID ${id}` });
    }

    // Get pending requests for this ride
    const pendingRequests = await RideRequest.find({
      ride: id,
      status: 'pending',
    })
      .populate({
        path: 'user',
        select: '_id name email image phoneNumber',
        populate: { path: 'profile', select: 'handle' },
      })
      .sort({ createdAt: -1 });

    // Organize participants by status
    const participants = {
      owner: ride.participants.find((p) => p.role === 'owner')?.toObject(),
      approved: ride.participants
        .filter((p) => p.isApproved)
        .map((p) => p.toObject()),
      pending: pendingRequests.map((request) => request.toObject()),
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

// @desc    Remove a participant from a ride (owner only)
// @route   DELETE /api/v1/rides/:rideId/participants/:participantId
// @access  Private
async function removeParticipant(req, res) {
  try {
    const { id: rideId, participantId } = req.params;
    const ownerId = req.user.id;

    const ride = await Ride.findById(rideId);

    if (!ride) {
      return res
        .status(404)
        .json({ success: false, error: `Ride not found with ID ${rideId}` });
    }

    // Check if the user is the owner of the ride
    if (ride.owner.toString() !== ownerId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Only the ride owner can remove participants',
      });
    }

    // Find the participant to remove
    const participantIndex = ride.participants.findIndex(
      (p) => p.user.toString() === participantId.toString(),
    );

    if (participantIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Participant not found in this ride',
      });
    }

    const participant = ride.participants[participantIndex];

    // Prevent removing the owner
    if (participant.role === 'owner') {
      return res.status(400).json({
        success: false,
        error: 'Cannot remove the ride owner',
      });
    }

    // Remove the participant
    const removedParticipant = ride.participants.splice(participantIndex, 1)[0];
    await ride.save();
    // Redis caching temporarily disabled
    // await invalidateRideCache(ride.id);

    // Send push notification to the removed participant
    const userDevice = await UserDevice.findOne({
      user: participantId,
      isActive: true,
    }).sort({ lastSeen: -1 });

    if (userDevice) {
      await sendPushNotification(
        userDevice.pushToken,
        'Removed from Ride',
        `You have been removed from the ride "${ride.name}"`,
        `The ride owner has removed you from the ride scheduled for ${new Date(ride.startTime).toLocaleDateString()}`,
        {
          notificationType: 'NOTIFICATION__USER_REMOVED_FROM_RIDE',
          rideId: ride.id,
          rideName: ride.name,
          ownerName: req.user.name,
        },
      );
    }

    res.status(200).json({
      success: true,
      message: 'Participant removed successfully',
      data: {
        removedParticipant,
        ride: {
          id: ride.id,
          name: ride.name,
          participantsCount: ride.participants.length,
        },
      },
    });
  } catch (err) {
    console.error('Error removing participant:', err);
    if (err.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid ride ID or participant ID format',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server Error removing participant',
    });
  }
}

// @desc    Get nearby rides within specified radius
// @route   GET /api/v1/rides/nearby
// @access  Public
// @query   {number} latitude - Latitude coordinate
// @query   {number} longitude - Longitude coordinate
// @query   {number} radius - Search radius in meters (default: 50000)
async function getNearbyRides(req, res) {
  try {
    const {
      latitude: latStr,
      longitude: lngStr,
      radius: radiusStr = 50000,
      page: pageStr = 1,
      limit: limitStr = 10,
    } = req.query;

    // Validate required coordinates
    if (!latStr || !lngStr) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required',
      });
    }

    // Convert string parameters to numbers
    const latitude = parseFloat(latStr);
    const longitude = parseFloat(lngStr);
    const radius = parseFloat(radiusStr);
    const page = parseInt(pageStr, 10);
    const limit = parseInt(limitStr, 10);

    // Check if conversion was successful
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude must be valid numbers',
      });
    }

    if (Number.isNaN(radius) || Number.isNaN(page) || Number.isNaN(limit)) {
      return res.status(400).json({
        success: false,
        error: 'Radius, page, and limit must be valid numbers',
      });
    }

    if (latitude < -90 || latitude > 90) {
      return res.status(400).json({
        success: false,
        error: 'Latitude must be between -90 and 90',
      });
    }

    if (longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        error: 'Longitude must be between -180 and 180',
      });
    }

    // Validate radius
    const radiusM = Math.min(100000, Math.max(1000, radius)); // Limit radius between 1-100km

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    // Create a simple distance-based filter using coordinate bounds
    // This is more efficient than complex $expr calculations
    const latDelta = radiusM / 111000; // Rough conversion: 1 degree ≈ 111 km = 111000m
    const lngDelta = radiusM / (111000 * Math.cos((latitude * Math.PI) / 180)); // Adjust for longitude for latitude

    const filterObj = {
      'startLocation.coordinates.1': {
        // latitude is at index 1
        $gte: latitude - latDelta,
        $lte: latitude + latDelta,
      },
      'startLocation.coordinates.0': {
        // longitude is at index 0
        $gte: longitude - lngDelta,
        $lte: longitude + lngDelta,
      },
      // By default, exclude completed and cancelled rides
      status: { $nin: ['completed', 'cancelled'] },
    };

    // Exclude rides where user is owner or participant
    if (req.user) {
      filterObj.$and = [
        { owner: { $ne: req.user.id } },
        { 'participants.user': { $ne: req.user.id } },
      ];
    }

    // Get total count for pagination
    const totalRides = await Ride.countDocuments(filterObj);
    const totalPages = Math.ceil(totalRides / limitNum);

    // Find nearby rides with pagination
    const rides = await Ride.find(filterObj)
      .populate({
        path: 'owner',
        select: 'name email image phoneNumber',
        populate: { path: 'profile', select: 'handle' },
      })
      .populate({
        path: 'participants.user',
        select: 'name email image phoneNumber',
        populate: { path: 'profile', select: 'handle' },
      })
      .lean() // Use lean() for read-only queries
      .sort({ startTime: 1 })
      .skip(skip)
      .limit(limitNum);

    // Organize participants for each ride and calculate distance
    const ridesWithOrganizedParticipants = rides.map((ride) => {
      const rideObj = ride; // lean() already returns plain objects
      const approvedCount = rideObj.participants.filter(
        (p) => p.isApproved,
      ).length;
      const pendingCount = rideObj.participants.filter(
        (p) => !p.isApproved,
      ).length;

      // Calculate distance from user location to ride start location
      const rideLat = rideObj.startLocation.coordinates[1]; // latitude
      const rideLon = rideObj.startLocation.coordinates[0]; // longitude
      const distanceMeters = calculateDistance(
        latitude,
        longitude,
        rideLat,
        rideLon,
      );

      rideObj.participants = {
        approved: approvedCount,
        pending: pendingCount,
        total: rideObj.maxParticipants || 0,
        available: rideObj.maxParticipants
          ? rideObj.maxParticipants - approvedCount
          : 0,
      };

      // Add distance information
      rideObj.distanceFromUser = distanceMeters;

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
      search: {
        latitude,
        longitude,
        radius: radiusM,
        unit: 'meters',
      },
    });
  } catch (err) {
    console.error('Error getting nearby rides:', err);
    res.status(500).json({
      success: false,
      error: 'Server Error getting nearby rides',
    });
  }
}

// @desc    Start a ride (change status from 'planned' to 'active')
// @route   POST /api/v1/rides/:id/start
// @access  Private
async function startRide(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const ride = await Ride.findById(id);

    if (!ride) {
      return res
        .status(404)
        .json({ success: false, error: `Ride not found with ID ${id}` });
    }

    // Check if the user is the owner of the ride
    if (ride.owner.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only the ride owner can start the ride',
      });
    }

    // Check if the ride is in 'planned' status
    if (ride.status !== 'planned') {
      return res.status(400).json({
        success: false,
        error: `Cannot start ride. Current status is '${ride.status}'. Only planned rides can be started.`,
      });
    }

     // Check if the start time is within acceptable range (allow starting within 5 minutes before scheduled start)
     const now = new Date();
     const timeDiff = ride.startTime.getTime() - now.getTime();
     const EARLY_START_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes in milliseconds
     
     if (timeDiff > EARLY_START_THRESHOLD_MS) {
       return res.status(400).json({
         success: false,
         error: `Cannot start ride. Ride is scheduled for ${ride.startTime.toLocaleString()}. Please wait until 5 minutes before the scheduled start time.`,
       });
     }

    // Update ride status to 'active'
    ride.status = 'active';
    await ride.save();
    // Redis caching temporarily disabled
    // await invalidateRideCache(ride.id);

    // Send push notification to all participants
    const participantIds = ride.participants
      .filter((p) => p.isApproved && p.user.toString() !== userId.toString())
      .map((p) => p.user);

    // Collect all push tokens first
    const userDevices = await Promise.all(
      participantIds.map(async (participantId) =>
        UserDevice.findOne({
          user: participantId,
          isActive: true,
        }).sort({ lastSeen: -1 }),
      ),
    );

    // Filter out devices without tokens and collect all valid tokens
    const validDevices = userDevices.filter(
      (device) => device && device.pushToken,
    );
    const pushTokens = validDevices.map((device) => device.pushToken);

    if (pushTokens.length > 0) {
      // Send all notifications in a single batch
      const { tickets, invalidTokens } = await sendPushNotification(
        pushTokens,
        'Ride Started! 🚴‍♂️',
        `The ride "${ride.name}" has started!. Safe travels ahead`,
        `Your ride is now active. Have a great time!`,
        {
          notificationType: 'NOTIFICATION__RIDE_STARTED',
          rideId: ride.id,
          rideName: ride.name,
          ownerName: req.user.name,
          startTime: ride.startTime,
        },
      );

      // Log results
      console.log(
        `Sent ${tickets.length} notifications, ${invalidTokens.length} invalid tokens`,
      );
    }

    res.status(200).json({
      success: true,
      message: 'Ride started successfully!',
      data: {
        ride: {
          id: ride.id,
          name: ride.name,
          status: ride.status,
          startedAt: new Date(),
        },
      },
    });
  } catch (err) {
    console.error('Error starting ride:', err);
    if (err.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid ride ID format',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server Error starting ride',
    });
  }
}

// @desc    Complete a ride (change status from 'active' to 'completed')
// @route   POST /api/v1/rides/:id/complete
// @access  Private
async function completeRide(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const ride = await Ride.findById(id);

    if (!ride) {
      return res
        .status(404)
        .json({ success: false, error: `Ride not found with ID ${id}` });
    }

    // Check if the user is the owner of the ride
    if (ride.owner.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only the ride owner can complete the ride',
      });
    }

    // Check if the ride is in 'active' status
    if (ride.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: `Cannot complete ride. Current status is '${ride.status}'. Only active rides can be completed.`,
      });
    }

    // Update ride status to 'completed' and set end time
    ride.status = 'completed';
    ride.endTime = new Date();
    await ride.save();
    // Redis caching temporarily disabled
    // await invalidateRideCache(ride.id);

    // Calculate and update statistics for all participants
    const allTrackingData = await RideTracking.find({
      ride: id,
    });

    // Calculate stats for each participant and update their records
    await Promise.all(
      allTrackingData
        .filter((trackingData) => trackingData.path.length > 0)
        .map(async (trackingData) => {
          const stats = calculateRideStats(trackingData.path);

          // Update calculated stats in tracking document
          await RideTracking.findByIdAndUpdate(trackingData.id, {
            $set: {
              calculatedStats: stats,
            },
          });

          // Update participant stats in the ride
          await updateParticipantStats(id, trackingData.user, stats);
        }),
    );

    // Update aggregated ride statistics
    await updateRideStats(id);

    // Send push notification to all participants
    const participantIds = ride.participants
      .filter((p) => p.isApproved && p.user.toString() !== userId.toString())
      .map((p) => p.user);

    // Collect all push tokens first
    const userDevices = await Promise.all(
      participantIds.map(async (participantId) =>
        UserDevice.findOne({
          user: participantId,
          isActive: true,
        }).sort({ lastSeen: -1 }),
      ),
    );

    // Filter out devices without tokens and collect all valid tokens
    const validDevices = userDevices.filter(
      (device) => device && device.pushToken,
    );
    const pushTokens = validDevices.map((device) => device.pushToken);

    if (pushTokens.length > 0) {
      // Send all notifications in a single batch
      const { tickets, invalidTokens } = await sendPushNotification(
        pushTokens,
        'Ride Completed! 🎉',
        `The ride "${ride.name}" has been completed!`,
        `Great job completing the ride! Hope you had a wonderful time.`,
        {
          notificationType: 'NOTIFICATION__RIDE_COMPLETED',
          rideId: ride.id,
          rideName: ride.name,
          ownerName: req.user.name,
          endTime: ride.endTime,
        },
      );

      // Log results
      console.log(
        `Sent ${tickets.length} completion notifications, ${invalidTokens.length} invalid tokens`,
      );
    }

    res.status(200).json({
      success: true,
      message: 'Ride completed successfully!',
      data: {
        ride: {
          id: ride.id,
          name: ride.name,
          status: ride.status,
          completedAt: ride.endTime,
        },
      },
    });
  } catch (err) {
    console.error('Error completing ride:', err);
    if (err.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid ride ID format',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server Error completing ride',
    });
  }
}

// @desc    Cancel a ride (change status to 'cancelled')
// @route   POST /api/v1/rides/:id/cancel
// @access  Private
async function cancelRide(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const ride = await Ride.findById(id);

    if (!ride) {
      return res
        .status(404)
        .json({ success: false, error: `Ride not found with ID ${id}` });
    }

    // Check if the user is the owner of the ride
    if (ride.owner.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only the ride owner can cancel the ride',
      });
    }

    // Check if the ride can be cancelled (only planned rides can be cancelled)
    if (ride.status !== 'planned') {
      return res.status(400).json({
        success: false,
        error: `Cannot cancel ride. Current status is '${ride.status}'. Only planned rides can be cancelled.`,
      });
    }

    // Update ride status to 'cancelled'
    ride.status = 'cancelled';
    await ride.save();
    // Redis caching temporarily disabled
    // await invalidateRideCache(ride.id);

    // Cancel all scheduled reminder notifications
    try {
      // eslint-disable-next-line no-underscore-dangle
      await cancelAllRemindersForRide(ride._id.toString());
      // eslint-disable-next-line no-underscore-dangle
      console.log(`✅ Cancelled all reminders for ride ${ride._id}`);
    } catch (error) {
      console.error('Failed to cancel ride reminders:', error);
      // Don't fail the cancellation - reminders will just fire and be ignored
    }

    // Send push notification to all participants
    const participantIds = ride.participants
      .filter((p) => p.isApproved && p.user.toString() !== userId.toString())
      .map((p) => p.user);

    // Collect all push tokens first
    const userDevices = await Promise.all(
      participantIds.map(async (participantId) =>
        UserDevice.findOne({
          user: participantId,
          isActive: true,
        }).sort({ lastSeen: -1 }),
      ),
    );

    // Filter out devices without tokens and collect all valid tokens
    const validDevices = userDevices.filter(
      (device) => device && device.pushToken,
    );
    const pushTokens = validDevices.map((device) => device.pushToken);

    if (pushTokens.length > 0) {
      // Send all notifications in a single batch
      const { tickets, invalidTokens } = await sendPushNotification(
        pushTokens,
        'Ride Cancelled ❌',
        `The ride "${ride.name}" has been cancelled`,
        `The ride owner has cancelled this ride.`,
        {
          notificationType: 'NOTIFICATION__RIDE_CANCELLED',
          rideId: ride.id,
          rideName: ride.name,
          ownerName: req.user.name,
          startTime: ride.startTime,
        },
      );

      // Log results
      console.log(
        `Sent ${tickets.length} cancellation notifications, ${invalidTokens.length} invalid tokens`,
      );
    }

    res.status(200).json({
      success: true,
      message: 'Ride cancelled successfully',
      data: {
        ride: {
          id: ride.id,
          name: ride.name,
          status: ride.status,
          cancelledAt: new Date(),
        },
      },
    });
  } catch (err) {
    console.error('Error cancelling ride:', err);
    if (err.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid ride ID format',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server Error cancelling ride',
    });
  }
}

// @desc    Update location tracking for a ride
// @route   POST /api/v1/rides/:id/location
// @access  Private
async function updateLocationTracking(req, res) {
  try {
    const { id: rideId } = req.params;
    const { userId, latitude, longitude, timestamp } = req.body;

    // Validate required fields
    if (!userId || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'userId, latitude, and longitude are required',
      });
    }

    // Validate data types
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'latitude and longitude must be numbers',
      });
    }

    // Validate coordinate ranges
    if (latitude < -90 || latitude > 90) {
      return res.status(400).json({
        success: false,
        error: 'latitude must be between -90 and 90',
      });
    }

    if (longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        error: 'longitude must be between -180 and 180',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(rideId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ride ID format',
      });
    }

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format',
      });
    }

    // Verify the ride exists and user has access
    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({
        success: false,
        error: `Ride not found with ID ${rideId}`,
      });
    }

    // Check if ride is still active
    if (ride.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: `Cannot update location. Ride status is '${ride.status}'. Only active rides can be tracked.`,
      });
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

    // Parse timestamp if provided, otherwise use current time
    const trackingTimestamp = timestamp ? new Date(timestamp) : new Date();

    // Update or create tracking data
    const updatedTracking = await RideTracking.findOneAndUpdate(
      { ride: rideId, user: userId },
      {
        $push: {
          path: {
            timestamp: trackingTimestamp,
            coordinates: {
              type: 'Point',
              coordinates: [longitude, latitude], // GeoJSON order: [longitude, latitude]
            },
          },
        },
        $set: {
          lastKnownPosition: {
            type: 'Point',
            coordinates: [Number(longitude), Number(latitude)],
            timestamp: trackingTimestamp,
          },
        },
        $setOnInsert: {
          ride: rideId,
          user: userId,
          trackingStatus: 'active',
          startTime: trackingTimestamp,
        },
      },
      {
        upsert: true, // Create the document if it doesn't exist
        new: true, // Return the updated document
        setDefaultsOnInsert: true, // Apply default values if upserting a new document
        runValidators: true, // Run schema validators
      },
    );

    // Calculate and update statistics if we have path data
    if (updatedTracking && updatedTracking.path.length > 0) {
      const stats = calculateRideStats(updatedTracking.path);
      await RideTracking.findByIdAndUpdate(updatedTracking.id, {
        $set: {
          calculatedStats: stats,
        },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Location updated successfully',
      data: {
        rideId,
        userId,
        coordinates: [longitude, latitude],
        timestamp: trackingTimestamp,
        trackingStatus: updatedTracking.trackingStatus,
        totalPoints: updatedTracking.path.length,
      },
    });
  } catch (err) {
    console.error('Error updating location tracking:', err);
    if (err.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID format',
      });
    }
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        error: messages.join(', '),
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server Error updating location tracking',
    });
  }
}

// @desc    Get ride tracking data for the logged-in user
// @route   GET /api/v1/rides/:id/tracking
// @access  Private
async function getRideTracking(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // First, verify the ride exists and user has access
    const ride = await Ride.findById(id);

    if (!ride) {
      return res.status(404).json({
        success: false,
        error: `Ride not found with ID ${id}`,
      });
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

    // Get tracking data for the current user
    const trackingData = await RideTracking.findOne({
      ride: new Types.ObjectId(id),
      user: new Types.ObjectId(userId),
    });

    if (!trackingData) {
      return res.status(404).json({
        success: false,
        error: 'No tracking data found for this ride',
      });
    }

    // Prepare response data
    const responseData = {
      ride: {
        id: ride.id,
        rideId: ride.rideId,
        name: ride.name,
        status: ride.status,
        startTime: ride.startTime,
        endTime: ride.endTime,
        owner: ride.owner,
      },
      tracking: {
        trackingStatus: trackingData.trackingStatus,
        startTime: trackingData.startTime,
        endTime: trackingData.endTime,
        lastKnownPosition: trackingData.lastKnownPosition,
        calculatedStats: trackingData.calculatedStats,
        path: trackingData.path,
        totalPoints: trackingData.path.length,
        lastUpdated: trackingData.updatedAt,
      },
    };

    res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (err) {
    console.error('Error getting ride tracking data:', err);
    if (err.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid ride ID format',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server Error getting ride tracking data',
    });
  }
}

// @desc    Update a ride
// @route   PUT /api/v1/rides/:id
// @access  Private
async function updateRide(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
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
      bannerImage,
      waypoints,
    } = req.body;

    // Find the ride
    const ride = await Ride.findById(id);

    if (!ride) {
      return res.status(404).json({
        success: false,
        error: `Ride not found with ID ${id}`,
      });
    }

    // Check if the user is the owner of the ride
    if (ride.owner.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Only the ride owner can edit the ride',
      });
    }

    // Check if the ride is in 'planned' status
    if (ride.status !== 'planned') {
      return res.status(400).json({
        success: false,
        error: `Cannot edit ride. Current status is '${ride.status}'. Only planned rides can be edited.`,
      });
    }

    // Validate required fields
    if (
      !name ||
      !startTime ||
      !startLocation ||
      !startLocation.coordinates ||
      !Array.isArray(startLocation.coordinates) ||
      startLocation.coordinates.length !== 2 ||
      !startLocation.address ||
      !startLocation.address.city ||
      !startLocation.address.country
    ) {
      return res.status(400).json({
        success: false,
        error:
          'Please provide ride name, start time, start location coordinates as [longitude, latitude] array, city, and country.',
      });
    }

    if (
      typeof startLocation.coordinates[0] !== 'number' ||
      typeof startLocation.coordinates[1] !== 'number'
    ) {
      return res.status(400).json({
        success: false,
        error:
          'Start location coordinates must be valid numbers in [longitude, latitude] format.',
      });
    }

    // Add more detailed validation for endLocation if it's provided
    if (endLocation) {
      if (
        !endLocation.coordinates ||
        !Array.isArray(endLocation.coordinates) ||
        endLocation.coordinates.length !== 2 ||
        typeof endLocation.coordinates[0] !== 'number' ||
        typeof endLocation.coordinates[1] !== 'number'
      ) {
        return res.status(400).json({
          success: false,
          error:
            'End location coordinates must be provided as [longitude, latitude] array if endLocation is provided.',
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

    // Validate waypoints if provided
    if (waypoints && Array.isArray(waypoints)) {
      for (let i = 0; i < waypoints.length; i += 1) {
        const waypoint = waypoints[i];
        if (
          !waypoint.coordinates ||
          !Array.isArray(waypoint.coordinates) ||
          waypoint.coordinates.length !== 2 ||
          typeof waypoint.coordinates[0] !== 'number' ||
          typeof waypoint.coordinates[1] !== 'number'
        ) {
          return res.status(400).json({
            success: false,
            error: `Waypoint ${i + 1} coordinates must be provided as [longitude, latitude] array.`,
          });
        }
        if (
          !waypoint.address ||
          !waypoint.address.city ||
          !waypoint.address.country
        ) {
          return res.status(400).json({
            success: false,
            error: `Waypoint ${i + 1} address must include city and country.`,
          });
        }
      }
    }

    // Store original values to detect changes
    const originalRide = {
      startTime: ride.startTime,
      endTime: ride.endTime,
      startLocation: ride.startLocation,
      endLocation: ride.endLocation,
      waypoints: ride.waypoints,
      route: ride.route,
    };

    // Prepare update data
    const updateData = {
      name,
      description,
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
      maxParticipants: maxParticipants
        ? parseInt(maxParticipants, 10)
        : undefined,
      difficulty: difficulty || 'easy',
      visibility: visibility || RideVisibility.PUBLIC,
      bannerImage,
      waypoints: waypoints
        ? waypoints.map((waypoint) => ({
          type: 'Point',
          coordinates: waypoint.coordinates,
          address: {
            addressLine1: waypoint.address.addressLine1,
            addressLine2: waypoint.address.addressLine2,
            city: waypoint.address.city,
            stateProvince: waypoint.address.stateProvince,
            country: waypoint.address.country,
            postalCode: waypoint.address.postalCode,
            landmark: waypoint.address.landmark,
          },
        }))
        : undefined,
    };

    // Update the ride
    const updatedRide = await Ride.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    // Redis caching temporarily disabled
    // await invalidateRideCache(id);

    // Detect changes to key fields
    const keyFieldsChanged = [];
    const changes = [];

    // Check startTime
    if (originalRide.startTime.getTime() !== new Date(startTime).getTime()) {
      keyFieldsChanged.push('startTime');
      changes.push('start time');
    }

    // Check endTime
    const newEndTime = endTime ? new Date(endTime) : undefined;
    if (originalRide.endTime?.getTime() !== newEndTime?.getTime()) {
      keyFieldsChanged.push('endTime');
      changes.push('end time');
    }

    // Check startLocation
    if (
      JSON.stringify(originalRide.startLocation.coordinates) !==
      JSON.stringify(startLocation.coordinates)
    ) {
      keyFieldsChanged.push('startLocation');
      changes.push('start location');
    }

    // Check endLocation
    if (endLocation && originalRide.endLocation) {
      if (
        JSON.stringify(originalRide.endLocation.coordinates) !==
        JSON.stringify(endLocation.coordinates)
      ) {
        keyFieldsChanged.push('endLocation');
        changes.push('end location');
      }
    } else if (endLocation && !originalRide.endLocation) {
      keyFieldsChanged.push('endLocation');
      changes.push('end location');
    } else if (!endLocation && originalRide.endLocation) {
      keyFieldsChanged.push('endLocation');
      changes.push('end location');
    }

    // Check waypoints
    if (JSON.stringify(originalRide.waypoints) !== JSON.stringify(waypoints)) {
      keyFieldsChanged.push('waypoints');
      changes.push('waypoints');
    }

    // Check route
    if (JSON.stringify(originalRide.route) !== JSON.stringify(route)) {
      keyFieldsChanged.push('route');
      changes.push('route');
    }

    // Send notifications if key fields changed
    if (keyFieldsChanged.length > 0) {
      const participantIds = ride.participants
        .filter((p) => p.isApproved && p.user.toString() !== userId.toString())
        .map((p) => p.user);

      // Collect all push tokens first
      const userDevices = await Promise.all(
        participantIds.map(async (participantId) =>
          UserDevice.findOne({
            user: participantId,
            isActive: true,
          }).sort({ lastSeen: -1 }),
        ),
      );

      // Filter out devices without tokens and collect all valid tokens
      const validDevices = userDevices.filter(
        (device) => device && device.pushToken,
      );
      const pushTokens = validDevices.map((device) => device.pushToken);

      if (pushTokens.length > 0) {
        // Send all notifications in a single batch
        const { tickets, invalidTokens } = await sendPushNotification(
          pushTokens,
          'Ride Updated 📝',
          `The ride "${updatedRide.name}" has been updated`,
          `The following changes were made: ${changes.join(', ')}`,
          {
            notificationType: 'NOTIFICATION__RIDE_UPDATED',
            rideId: updatedRide.id,
            rideName: updatedRide.name,
            ownerName: req.user.name,
            startTime: updatedRide.startTime,
            changes,
          },
        );

        // Log results
        console.log(
          `Sent ${tickets.length} update notifications, ${invalidTokens.length} invalid tokens`,
        );
      }
    }

    // Reschedule reminders if startTime changed
    if (keyFieldsChanged.includes('startTime')) {
      try {
        const participantIds = updatedRide.participants.map((p) =>
          p.user.toString(),
        );
        // eslint-disable-next-line no-underscore-dangle
        await rescheduleRemindersForRide(updatedRide._id.toString(), {
          rideName: updatedRide.name,
          rideStartTime: updatedRide.startTime,
          ownerId: updatedRide.owner.toString(),
          participantIds,
        });
      } catch (error) {
        console.error('Failed to reschedule ride reminders:', error);
        // Don't fail the request - reminders are non-critical
      }
    }

    res.status(200).json({
      success: true,
      message: 'Ride updated successfully',
      data: updatedRide,
      changes: keyFieldsChanged.length > 0 ? changes : null,
    });
  } catch (err) {
    console.error('Error updating ride:', err);
    if (err.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid ride ID format',
      });
    }
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        error: messages.join(', '),
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server Error updating ride',
    });
  }
}

export {
  createRide,
  getRides,
  getRide,
  updateRide,
  joinRide,
  leaveRide,
  getPendingRequests,
  approveRejectRequest,
  getMyRequests,
  getRideParticipants,
  deleteRideRequest,
  removeParticipant,
  getNearbyRides,
  startRide,
  completeRide,
  cancelRide,
  getRideTracking,
  updateLocationTracking,
};
