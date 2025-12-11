
/**
 * Create BullMQ connection options from Redis client
 * @returns {Object} BullMQ connection config
 */
function getQueueConnection() {
  const redisClient = getRedisClient();

  if (!redisClient) {
    throw new Error('Redis client not initialized. Cannot create queue.');
  }

  // BullMQ requires connection options, not the client instance
  return {
    host: redisClient.options.host,
    port: redisClient.options.port,
    password: redisClient.options.password,
    username: redisClient.options.username,
    db: redisClient.options.db,
  };
}

/**
 * Ride Reminders Queue
 * Handles scheduling and processing of ride reminder notifications
 */
export const rideRemindersQueue = new Queue('ride-reminders', {
  connection: getQueueConnection(),
  defaultJobOptions: {
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs for debugging
      age: 24 * 60 * 60, // Keep for 24 hours
    },
    removeOnFail: {
      count: 500, // Keep last 500 failed jobs for debugging
      age: 7 * 24 * 60 * 60, // Keep for 7 days
    },
    attempts: 3, // Retry up to 3 times on failure
    backoff: {
      type: 'exponential',
      delay: 5000, // Start with 5 second delay
    },
  },
});

/**
 * Notification types for ride reminders
 */
export const ReminderType = {
  DAY_BEFORE: '24h',
  HOUR_BEFORE: '1h',
  FIVE_MIN_BEFORE: '5min',
};

/**
 * Calculate delay in milliseconds for a reminder
 * @param {Date} rideStartTime - When the ride starts
 * @param {string} reminderType - Type of reminder (24h, 1h, 5min)
 * @returns {number} Delay in milliseconds
 */
export function calculateReminderDelay(rideStartTime, reminderType) {
  const startTime = new Date(rideStartTime).getTime();
  const now = Date.now();

  let reminderTime;
  switch (reminderType) {
    case ReminderType.DAY_BEFORE:
      reminderTime = startTime - 24 * 60 * 60 * 1000; // 24 hours before
      break;
    case ReminderType.HOUR_BEFORE:
      reminderTime = startTime - 60 * 60 * 1000; // 1 hour before
      break;
    case ReminderType.FIVE_MIN_BEFORE:
      reminderTime = startTime - 5 * 60 * 1000; // 5 minutes before
      break;
    default:
      throw new Error(`Invalid reminder type: ${reminderType}`);
  }

  const delay = reminderTime - now;
  return Math.max(0, delay); // Don't return negative delays
}

/**
 * Schedule a ride reminder notification
 * @param {Object} data - Job data
 * @param {string} data.rideId - MongoDB ObjectId of the ride
 * @param {string} data.reminderType - Type of reminder (24h, 1h, 5min)
 * @param {Date} data.rideStartTime - When the ride starts
 * @param {string} data.rideName - Name of the ride
 * @param {string} data.ownerId - MongoDB ObjectId of ride owner
 * @param {Array<string>} data.participantIds - Array of participant user IDs
 * @returns {Promise<Object>} BullMQ job
 */
export async function scheduleRideReminder(data) {
  const { rideId, reminderType, rideStartTime } = data;

  // Calculate delay
  const delay = calculateReminderDelay(rideStartTime, reminderType);

  // If the reminder time has already passed, don't schedule
  if (delay <= 0) {
    console.log(
      `⏰ Skipping ${reminderType} reminder for ride ${rideId} - time has passed`,
    );
    return null;
  }

  // Create unique job ID to prevent duplicates
  const jobId = `${rideId}-${reminderType}`;

  try {
    const job = await rideRemindersQueue.add(
      'send-reminder',
      data,
      {
        delay,
        jobId,
      },
    );

    console.log(
      `✅ Scheduled ${reminderType} reminder for ride ${rideId} (job: ${job.id}) - will fire in ${Math.round(delay / 1000 / 60)} minutes`,
    );

    return job;
  } catch (error) {
    console.error(
      `❌ Failed to schedule ${reminderType} reminder for ride ${rideId}:`,
      error.message,
    );
    throw error;
  }
}

/**
 * Cancel all reminders for a ride
 * @param {string} rideId - MongoDB ObjectId of the ride
 * @returns {Promise<void>}
 */
export async function cancelRideReminders(rideId) {
  try {
    // Remove all jobs for this ride
    const jobIds = [
      `${rideId}-${ReminderType.DAY_BEFORE}`,
      `${rideId}-${ReminderType.HOUR_BEFORE}`,
      `${rideId}-${ReminderType.FIVE_MIN_BEFORE}`,
    ];

    for (const jobId of jobIds) {
      try {
        const job = await rideRemindersQueue.getJob(jobId);
        if (job) {
          await job.remove();
          console.log(`✅ Cancelled reminder job: ${jobId}`);
        }
      } catch (error) {
        // Job might not exist, which is fine
        console.log(`⚠️  Job ${jobId} not found or already removed`);
      }
    }

    console.log(`✅ Cancelled all reminders for ride ${rideId}`);
  } catch (error) {
    console.error(
      `❌ Failed to cancel reminders for ride ${rideId}:`,
      error.message,
    );
    throw error;
  }
}

/**
 * Reschedule reminders for a ride (used when ride time is updated)
 * @param {string} rideId - MongoDB ObjectId of the ride
 * @param {Object} rideData - New ride data
 * @returns {Promise<Array>} Array of scheduled jobs
 */
export async function rescheduleRideReminders(rideId, rideData) {
  // Cancel existing reminders
  await cancelRideReminders(rideId);

  // Schedule new reminders
  const jobs = await Promise.all([
    scheduleRideReminder({
      rideId,
      reminderType: ReminderType.DAY_BEFORE,
      ...rideData,
    }),
    scheduleRideReminder({
      rideId,
      reminderType: ReminderType.HOUR_BEFORE,
      ...rideData,
    }),
    scheduleRideReminder({
      rideId,
      reminderType: ReminderType.FIVE_MIN_BEFORE,
      ...rideData,
    }),
  ]);

  return jobs.filter(Boolean); // Remove null jobs (skipped reminders)
}

export default rideRemindersQueue;
