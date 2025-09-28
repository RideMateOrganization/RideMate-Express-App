/**
 * Utility functions for updating ride statistics in the database
 */

import Ride from '../models/ride.js';
import RideTracking from '../models/ride-tracking.js';
import { calculateAggregatedRideStats } from './ride-stats-calculator.js';

/**
 * Update participant statistics in the ride document
 * @param {string} rideId - Ride ID
 * @param {string} userId - User ID
 * @param {Object} stats - Calculated statistics
 */
async function updateParticipantStats(rideId, userId, stats) {
  try {
    const ride = await Ride.findById(rideId);
    if (!ride) return;

    // Find the participant and update their stats
    const participantIndex = ride.participants.findIndex(
      (p) => p.user.toString() === userId.toString(),
    );

    if (participantIndex !== -1) {
      ride.participants[participantIndex].rideStats = {
        totalDistance: stats.totalDistance,
        averageSpeed: stats.averageSpeed,
        maxSpeed: stats.maxSpeed,
        totalDuration: stats.totalDuration,
      };

      await ride.save();
    }
  } catch (err) {
    console.error('Error updating participant stats:', err);
  }
}

/**
 * Update aggregated ride statistics across all participants
 * @param {string} rideId - Ride ID
 */
async function updateRideStats(rideId) {
  try {
    const ride = await Ride.findById(rideId);
    if (!ride) return;

    // Get all tracking data for this ride
    const allTrackingData = await RideTracking.find({
      ride: rideId,
      trackingStatus: 'completed',
    });

    if (allTrackingData.length === 0) return;

    // Extract participant statistics
    const participantStats = allTrackingData.map(
      (tracking) => tracking.calculatedStats,
    );

    // Calculate aggregated statistics
    const aggregatedStats = calculateAggregatedRideStats(participantStats);

    // Update ride statistics
    ride.rideStats = {
      totalDistance: aggregatedStats.totalDistance,
      averageSpeed: aggregatedStats.averageSpeed,
      maxSpeed: aggregatedStats.maxSpeed,
      totalDuration: aggregatedStats.totalDuration,
      completionRate: aggregatedStats.completionRate,
      averageParticipantDistance: aggregatedStats.averageParticipantDistance,
    };

    await ride.save();
  } catch (err) {
    console.error('Error updating ride stats:', err);
  }
}

export { updateParticipantStats, updateRideStats };
