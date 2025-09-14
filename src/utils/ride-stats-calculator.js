/**
 * Utility functions for calculating motorcycle ride statistics
 */

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in meters
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate speed from two GPS points and time difference
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @param {number} timeDiff - Time difference in milliseconds
 * @returns {number} Speed in m/s
 */
function calculateSpeed(lat1, lon1, lat2, lon2, timeDiff) {
  if (timeDiff <= 0) return 0;

  const distance = calculateDistance(lat1, lon1, lat2, lon2); // Already in meters
  const timeInSeconds = timeDiff / 1000;

  // If points are too close together, consider speed as 0
  if (distance < 1) return 0; // Less than 1 meter

  const speed = distance / timeInSeconds; // m/s

  return speed;
}

/**
 * Calculate acceleration from speed change and time difference
 * @param {number} speed1 - Initial speed in m/s
 * @param {number} speed2 - Final speed in m/s
 * @param {number} timeDiff - Time difference in milliseconds
 * @returns {number} Acceleration in m/s²
 */
function calculateAcceleration(speed1, speed2, timeDiff) {
  if (timeDiff <= 0) return 0;
  const speedDiff = ((speed2 - speed1) * 1000) / 3600; // Convert to m/s
  const timeInSeconds = timeDiff / 1000;
  return speedDiff / timeInSeconds;
}

/**
 * Calculate lean angle from heading change and speed
 * @param {number} heading1 - Initial heading in degrees
 * @param {number} heading2 - Final heading in degrees
 * @param {number} speed - Speed in m/s
 * @returns {number} Lean angle in degrees
 */
function calculateLeanAngle(heading1, heading2, speed) {
  if (speed < 5) return 0; // No meaningful lean angle at low speeds

  let headingDiff = heading2 - heading1;
  // Normalize heading difference to -180 to 180
  while (headingDiff > 180) headingDiff -= 360;
  while (headingDiff < -180) headingDiff += 360;

  // Calculate lean angle based on speed and turn rate
  const turnRate = Math.abs(headingDiff);
  const speedMs = (speed * 1000) / 3600; // Convert to m/s

  if (speedMs === 0) return 0;

  // Simplified lean angle calculation
  const leanAngle =
    (Math.atan((((turnRate * Math.PI) / 180) * speedMs) / 9.81) * 180) /
    Math.PI;
  return Math.min(Math.max(leanAngle, -45), 45); // Clamp to reasonable range
}

/**
 * Check if an event is a hard braking event
 * @param {number} deceleration - Deceleration in m/s²
 * @returns {boolean} True if hard braking
 */
function isHardBraking(deceleration) {
  return deceleration < -3.5; // Threshold for hard braking (m/s²)
}

/**
 * Check if an event is a hard acceleration event
 * @param {number} acceleration - Acceleration in m/s²
 * @returns {boolean} True if hard acceleration
 */
function isHardAcceleration(acceleration) {
  return acceleration > 2.5; // Threshold for hard acceleration (m/s²)
}

/**
 * Check if an event is a sharp turn
 * @param {number} leanAngle - Lean angle in degrees
 * @param {number} speed - Speed in m/s
 * @returns {boolean} True if sharp turn
 */
function isSharpTurn(leanAngle, speed) {
  return Math.abs(leanAngle) > 25 && speed > 20; // Sharp turn at reasonable speed
}

/**
 * Calculate comprehensive ride statistics from tracking data
 * @param {Array} pathData - Array of tracking points
 * @returns {Object} Calculated statistics
 */
function calculateRideStats(pathData) {
  if (!pathData || pathData.length < 2) {
    return {
      totalDistance: 0,
      averageSpeed: 0,
      maxSpeed: 0,
      totalDuration: 0,
    };
  }

  let totalDistance = 0;
  let totalSpeed = 0;
  let speedCount = 0;
  let maxSpeed = 0;

  // Sort by timestamp to ensure correct order
  const sortedPath = [...pathData].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
  );

  for (let i = 1; i < sortedPath.length; i += 1) {
    const prev = sortedPath[i - 1];
    const curr = sortedPath[i];

    // Skip if timestamps are identical (duplicate points)
    if (
      new Date(curr.timestamp).getTime() !== new Date(prev.timestamp).getTime()
    ) {
      // Calculate distance
      if (prev.coordinates && curr.coordinates) {
        const distance = calculateDistance(
          prev.coordinates.coordinates[1], // lat
          prev.coordinates.coordinates[0], // lon
          curr.coordinates.coordinates[1], // lat
          curr.coordinates.coordinates[0], // lon
        );
        totalDistance += distance;
      }

      // Calculate speed if not provided
      if (curr.speed !== undefined && curr.speed !== null) {
        // Use the provided speed
        totalSpeed += curr.speed;
        speedCount += 1;
        maxSpeed = Math.max(maxSpeed, curr.speed);
      } else if (prev.coordinates && curr.coordinates) {
        const timeDiff = new Date(curr.timestamp) - new Date(prev.timestamp);

        // Only process if time difference is reasonable (at least 1 second)
        if (timeDiff >= 1000) {
          const speed = calculateSpeed(
            prev.coordinates.coordinates[1], // lat
            prev.coordinates.coordinates[0], // lon
            curr.coordinates.coordinates[1], // lat
            curr.coordinates.coordinates[0], // lon
            timeDiff,
          );

          // Add speed if it's valid (not 0 from distance filtering)
          if (speed > 0) {
            totalSpeed += speed;
            speedCount += 1;
            maxSpeed = Math.max(maxSpeed, speed);
          }
        }
      }
    }
  }

  const totalDuration =
    sortedPath.length > 0
      ? (new Date(sortedPath[sortedPath.length - 1].timestamp) -
          new Date(sortedPath[0].timestamp)) /
        1000 // in seconds
      : 0;

  return {
    totalDistance: Math.round(totalDistance * 100) / 100, // in meters
    averageSpeed:
      speedCount > 0 ? Math.round((totalSpeed / speedCount) * 100) / 100 : 0, // in m/s
    maxSpeed: Math.round(maxSpeed * 100) / 100, // in m/s
    totalDuration: Math.round(totalDuration * 100) / 100, // in seconds
  };
}

/**
 * Calculate aggregated ride statistics from multiple participants
 * @param {Array} participantStats - Array of participant statistics
 * @returns {Object} Aggregated statistics
 */
function calculateAggregatedRideStats(participantStats) {
  if (!participantStats || participantStats.length === 0) {
    return {
      totalDistance: 0,
      averageSpeed: 0,
      maxSpeed: 0,
      totalDuration: 0,
      completionRate: 0,
      averageParticipantDistance: 0,
    };
  }

  const validStats = participantStats.filter((stat) => stat.totalDistance > 0);
  const completionRate = (validStats.length / participantStats.length) * 100;

  const aggregated = {
    totalDistance: Math.max(...participantStats.map((s) => s.totalDistance)),
    averageSpeed:
      participantStats.reduce((sum, s) => sum + s.averageSpeed, 0) /
      participantStats.length,
    maxSpeed: Math.max(...participantStats.map((s) => s.maxSpeed)),
    totalDuration: Math.max(...participantStats.map((s) => s.totalDuration)),
    completionRate: Math.round(completionRate * 100) / 100,
    averageParticipantDistance:
      validStats.length > 0
        ? validStats.reduce((sum, s) => sum + s.totalDistance, 0) /
          validStats.length
        : 0,
  };

  // Round numeric values
  Object.keys(aggregated).forEach((key) => {
    if (typeof aggregated[key] === 'number' && !Number.isNaN(aggregated[key])) {
      aggregated[key] = Math.round(aggregated[key] * 100) / 100;
    }
  });

  return aggregated;
}

module.exports = {
  calculateDistance,
  calculateSpeed,
  calculateAcceleration,
  calculateLeanAngle,
  isHardBraking,
  isHardAcceleration,
  isSharpTurn,
  calculateRideStats,
  calculateAggregatedRideStats,
};
