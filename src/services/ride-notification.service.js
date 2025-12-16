/**
 * Ride Notification Service
 *
 * Helper service for scheduling, cancelling, and rescheduling
 * ride reminder notifications via BullMQ.
 *
 * Used by ride controllers to manage notification lifecycle.
 */

import {
  scheduleRideReminder,
  cancelRideReminders,
  rescheduleRideReminders,
  ReminderType,
} from '../queues/ride-reminders.queue.js';
import { logInfo, logError } from '../utils/logger.js';

/**
 * Schedule all reminder notifications for a ride (24h, 1h, 5min)
 *
 * @param {string} rideId - MongoDB ObjectId of the ride
 * @param {string} rideName - Name of the ride
 * @param {Date} rideStartTime - When the ride starts
 * @param {string} ownerId - MongoDB ObjectId of ride owner
 * @param {Array<string>} participantIds - Array of participant user IDs
 * @returns {Promise<Object>} Result with scheduled job IDs
 */
export async function scheduleAllRemindersForRide(
  rideId,
  rideName,
  rideStartTime,
  ownerId,
  participantIds,
) {
  try {
    logInfo(
      `[RIDE NOTIFICATION SERVICE] Scheduling reminders for ride ${rideId}`,
    );

    const baseData = {
      rideId,
      rideName,
      rideStartTime,
      ownerId,
      participantIds,
    };

    // Schedule all 3 reminders in parallel
    const [dayBeforeJob, hourBeforeJob, fiveMinBeforeJob] = await Promise.all([
      scheduleRideReminder({
        ...baseData,
        reminderType: ReminderType.DAY_BEFORE,
      }),
      scheduleRideReminder({
        ...baseData,
        reminderType: ReminderType.HOUR_BEFORE,
      }),
      scheduleRideReminder({
        ...baseData,
        reminderType: ReminderType.FIVE_MIN_BEFORE,
      }),
    ]);

    const result = {
      success: true,
      scheduled: {
        dayBefore: dayBeforeJob?.id || null,
        hourBefore: hourBeforeJob?.id || null,
        fiveMinBefore: fiveMinBeforeJob?.id || null,
      },
    };

    logInfo(
      `[RIDE NOTIFICATION SERVICE] Scheduled reminders for ride ${rideId}:`,
      result.scheduled,
    );

    return result;
  } catch (error) {
    logError(
      `[RIDE NOTIFICATION SERVICE] Failed to schedule reminders for ride ${rideId}:`,
      error.message,
    );
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Cancel all scheduled reminder notifications for a ride
 *
 * @param {string} rideId - MongoDB ObjectId of the ride
 * @returns {Promise<Object>} Result of cancellation
 */
export async function cancelAllRemindersForRide(rideId) {
  try {
    logInfo(
      `[RIDE NOTIFICATION SERVICE] Cancelling reminders for ride ${rideId}`,
    );

    await cancelRideReminders(rideId);

    logInfo(
      `[RIDE NOTIFICATION SERVICE] ✅ Cancelled all reminders for ride ${rideId}`,
    );

    return {
      success: true,
      message: `Cancelled all reminders for ride ${rideId}`,
    };
  } catch (error) {
    logError(
      `[RIDE NOTIFICATION SERVICE] Failed to cancel reminders for ride ${rideId}:`,
      error.message,
    );
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Reschedule all reminders for a ride (cancel old ones, schedule new ones)
 * Used when ride time changes or participants change
 *
 * @param {string} rideId - MongoDB ObjectId of the ride
 * @param {Object} rideData - Updated ride data
 * @param {string} rideData.rideName - Name of the ride
 * @param {Date} rideData.rideStartTime - When the ride starts
 * @param {string} rideData.ownerId - MongoDB ObjectId of ride owner
 * @param {Array<string>} rideData.participantIds - Array of participant user IDs
 * @returns {Promise<Object>} Result with new job IDs
 */
export async function rescheduleRemindersForRide(rideId, rideData) {
  try {
    logInfo(
      `[RIDE NOTIFICATION SERVICE] Rescheduling reminders for ride ${rideId}`,
    );

    const jobs = await rescheduleRideReminders(rideId, rideData);

    const result = {
      success: true,
      rescheduled: {
        dayBefore: jobs[0]?.id || null,
        hourBefore: jobs[1]?.id || null,
        fiveMinBefore: jobs[2]?.id || null,
      },
    };

    logInfo(
      `[RIDE NOTIFICATION SERVICE] ✅ Rescheduled reminders for ride ${rideId}:`,
      result.rescheduled,
    );

    return result;
  } catch (error) {
    logError(
      `[RIDE NOTIFICATION SERVICE] Failed to reschedule reminders for ride ${rideId}:`,
      error.message,
    );
    return {
      success: false,
      error: error.message,
    };
  }
}

export default {
  scheduleAllRemindersForRide,
  cancelAllRemindersForRide,
  rescheduleRemindersForRide,
};
