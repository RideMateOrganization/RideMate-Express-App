const RideTracking = require('../models/ride-tracking');
const Ride = require('../models/ride');

// @desc Get travelled route for a ride by current user
// @route GET /api/v1/ride-tracking/:rideId/route
// @access Private
async function getTravelledRoute(req, res) {
  try {
    const { id: rideId } = req.params;
    const userId = req.user.id;

    // Check if the ride exists
    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({
        success: false,
        error: 'Ride not found',
      });
    }

    // Check if user is a participant in the ride
    const isParticipant = ride.participants.some(
      (participant) => participant.user.toString() === userId,
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You are not a participant in this ride.',
      });
    }

    // Get the tracking data for this user and ride
    const trackingData = await RideTracking.findOne({
      ride: rideId,
      user: userId,
    }).populate('user', 'name email handle');

    if (!trackingData) {
      return res.status(404).json({
        success: false,
        error: 'No tracking data found for this ride',
      });
    }

    res.status(200).json({
      success: true,
      data: trackingData,
    });
  } catch (err) {
    console.error('Error getting travelled route:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

// @desc Get all tracking data for a ride (for ride organizers)
// @route GET /api/v1/ride-tracking/:rideId/all
// @access Private
async function getAllTrackingData(req, res) {
  try {
    const { id: rideId } = req.params;
    const userId = req.user.id;

    // Validate rideId format
    if (!rideId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ride ID format',
      });
    }

    // Check if the ride exists and user is the organizer
    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({
        success: false,
        error: 'Ride not found',
      });
    }

    if (ride.organizer.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error:
          'Access denied. Only the ride organizer can view all tracking data.',
      });
    }

    // Get all tracking data for this ride
    const allTrackingData = await RideTracking.find({ ride: rideId })
      .populate('user', 'name email handle')
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      data: {
        rideId,
        totalParticipants: allTrackingData.length,
        trackingData: allTrackingData,
      },
    });
  } catch (err) {
    console.error('Error getting all tracking data:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

module.exports = {
  getTravelledRoute,
  getAllTrackingData,
};
