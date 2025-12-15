/**
 * BullMQ Worker for Ride Reminder Notifications
 *
 * Processes scheduled ride reminder jobs and sends push notifications
 * to ride owners and participants at 24h, 1h, and 5min before ride starts.
 */

import { Worker } from 'bullmq';

import { getRedisClient } from '../config/redis.js';
import Ride from '../models/ride.js';
import { User } from '../models/user.js';
import UserDevice from '../models/user-device.js';
import { sendPushNotification } from '../utils/expo-push-manager.js';
import { ReminderType } from '../queues/ride-reminders.queue.js';

/**
 * Format timeframe text based on reminder type
 * @param {string} reminderType - Type of reminder (24h, 1h, 5min)
 * @returns {string} Human-readable timeframe
 */
function formatTimeframe(reminderType) {
  switch (reminderType) {
    case ReminderType.DAY_BEFORE:
      return '24 hours';
    case ReminderType.HOUR_BEFORE:
      return '1 hour';
    case ReminderType.FIVE_MIN_BEFORE:
      return '5 minutes';
    default:
      return 'soon';
  }
}

/**
 * Process a ride reminder job
 * @param {Object} job - BullMQ job
 */
async function processRideReminder(job) {
  const { rideId, reminderType, rideName, ownerId, participantIds } = job.data;

  console.log(
    `[RIDE REMINDER] Processing ${reminderType} reminder for ride ${rideId}`,
  );
  console.log(
    `[RIDE REMINDER] DEBUG - ownerId: ${ownerId} (type: ${typeof ownerId}), participantIds: ${JSON.stringify(participantIds)}`,
  );

  try {
    // Verify ride still exists and is in planned status
    const ride = await Ride.findById(rideId).select('status name owner');

    if (!ride) {
      console.log(
        `[RIDE REMINDER] Ride ${rideId} not found - skipping notification`,
      );
      return { success: false, reason: 'Ride not found' };
    }

    if (ride.status !== 'planned') {
      console.log(
        `[RIDE REMINDER] Ride ${rideId} status is '${ride.status}' - skipping notification`,
      );
      return { success: false, reason: `Ride status is ${ride.status}` };
    }

    // Get owner details for personalized messages
    const owner = await User.findById(ownerId)
      .select('name')
      .populate('profile', 'handle');

    const ownerName = owner?.name || owner?.profile?.handle || 'Ride organizer';
    const timeframe = formatTimeframe(reminderType);

    // Collect all user IDs (owner + participants)
    const allUserIds = [ownerId, ...participantIds];
    console.log(
      `[RIDE REMINDER] DEBUG - Looking for devices for userIds: ${JSON.stringify(allUserIds)}`,
    );

    // Get push tokens for all users
    const devices = await UserDevice.find({
      user: { $in: allUserIds },
      isActive: true,
    }).select('user pushToken');

    console.log(
      `[RIDE REMINDER] DEBUG - Found ${devices.length} active devices`,
    );

    // Debug: Check all devices for this user regardless of isActive status
    const allDevicesForUser = await UserDevice.find({
      user: { $in: allUserIds },
    }).select('user pushToken isActive');

    console.log(
      `[RIDE REMINDER] DEBUG - All devices for user (regardless of isActive): ${JSON.stringify(allDevicesForUser.map((d) => ({ user: d.user.toString(), isActive: d.isActive })))}`,
    );

    if (devices.length === 0) {
      console.log(
        `[RIDE REMINDER] No active devices found for ride ${rideId} - skipping`,
      );
      return { success: false, reason: 'No active devices' };
    }

    // Group devices by user to send personalized messages
    const devicesByUser = devices.reduce((acc, device) => {
      const userId = device.user.toString();
      if (!acc[userId]) {
        acc[userId] = [];
      }
      acc[userId].push(device.pushToken);
      return acc;
    }, {});

    // Send notifications with different messages for owner vs participants
    const notificationPromises = Object.entries(devicesByUser).map(
      async ([userId, pushTokens]) => {
        const isOwner = userId === ownerId.toString();

        const title = isOwner
          ? '🏍️ Your Ride Starts Soon!'
          : '🏍️ Upcoming Ride!';

        const body = isOwner
          ? `Your ride "${rideName}" starts in ${timeframe}! Make sure everything is ready.`
          : `${ownerName}'s ride "${rideName}" starts in ${timeframe}! Get ready to ride.`;

        try {
          await sendPushNotification(
            pushTokens,
            title,
            body,
            '', // subtitle
            {
              type: 'ride_reminder',
              rideId,
              reminderType,
            },
          );

          console.log(
            `[RIDE REMINDER] Sent ${reminderType} reminder to user ${userId} (${pushTokens.length} device(s))`,
          );

          return { userId, success: true };
        } catch (error) {
          console.error(
            `[RIDE REMINDER] Failed to send notification to user ${userId}:`,
            error.message,
          );
          return { userId, success: false, error: error.message };
        }
      },
    );

    const results = await Promise.all(notificationPromises);
    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    console.log(
      `[RIDE REMINDER] Completed ${reminderType} reminder for ride ${rideId}:`,
      `${successCount} sent, ${failCount} failed`,
    );

    return {
      success: true,
      sentCount: successCount,
      failedCount: failCount,
      results,
    };
  } catch (error) {
    console.error(
      `[RIDE REMINDER] Error processing ${reminderType} reminder for ride ${rideId}:`,
      error,
    );
    throw error; // Let BullMQ handle retries
  }
}

/**
 * Create BullMQ worker connection options from Redis client
 * @returns {Object} BullMQ connection config
 */
function getWorkerConnection() {
  const redisClient = getRedisClient();

  if (!redisClient) {
    throw new Error('Redis client not initialized. Cannot create worker.');
  }

  return {
    host: redisClient.options.host,
    port: redisClient.options.port,
    password: redisClient.options.password,
    username: redisClient.options.username,
    db: redisClient.options.db,
  };
}

// Create and start worker
const startWorker = () => {
  const worker = new Worker('ride-reminders', processRideReminder, {
    connection: getWorkerConnection(),
    concurrency: 5, // Process up to 5 jobs concurrently
  });

  worker.on('completed', (job, result) => {
    console.log(
      `[RIDE REMINDER WORKER] Job ${job.id} completed:`,
      result.success ? `✅ ${result.sentCount} notifications sent` : '⚠️ Skipped',
    );
  });

  worker.on('failed', (job, err) => {
    console.error(
      `[RIDE REMINDER WORKER] Job ${job?.id} failed after ${job?.attemptsMade} attempts:`,
      err.message,
    );
  });

  worker.on('error', (err) => {
    console.error('[RIDE REMINDER WORKER] Worker error:', err);
  });

  console.log('✅ Ride Reminders Worker started successfully');
  return worker;
};

// Start the worker and export reference
let workerInstance;
try {
  workerInstance = startWorker();
} catch (error) {
  console.error('❌ Failed to start Ride Reminders Worker:', error.message);
  // Don't crash the app if worker fails to start - Redis might be unavailable
}

/**
 * Graceful shutdown for worker
 */
export async function shutdownWorker() {
  if (workerInstance) {
    console.log('📦 Shutting down Ride Reminders Worker...');
    try {
      await workerInstance.close();
      console.log('✅ Ride Reminders Worker shut down gracefully');
    } catch (error) {
      console.error('Error shutting down worker:', error.message);
    }
  }
}

 
export default workerInstance;
