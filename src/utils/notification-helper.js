import Notification from '../models/notification.js';
import { logInfo, logError } from './logger.js';
import UserDevice from '../models/user-device.js';
import { sendPushNotification } from './expo-push-manager.js';

/**
 * Send push notification and save to database in a single operation.
 * This is the unified function that should be used instead of calling sendPushNotification directly.
 *
 * @param {Object} params
 * @param {string|string[]} params.userId - User ID(s) to notify
 * @param {string} params.type - Notification type from NOTIFICATION_TYPES enum
 * @param {string} params.title - Notification title
 * @param {string} params.body - Notification body
 * @param {string} [params.subtitle] - Optional subtitle
 * @param {Object} [params.data={}] - Additional data payload
 * @returns {Promise<{notifications: Notification[], pushResults: any}>}
 */
export async function sendAndSaveNotification(params) {
  const { userId, type, title, body, subtitle, data = {} } = params;

  // Normalize userId to array
  const userIds = Array.isArray(userId) ? userId : [userId];

  // Step 1: Create notification records in database
  const notifications = await Promise.all(
    userIds.map((uid) =>
      Notification.create({
        user: uid,
        type,
        title,
        body,
        subtitle,
        data,
        pushSent: false,
      }),
    ),
  );

  logInfo(
    `[NOTIFICATION] Created ${notifications.length} notification record(s) of type ${type}`,
  );

  // Step 2: Get push tokens for all users
  const pushTokens = await UserDevice.getPushTokensForUsers(userIds);

  // Step 3: Send push notifications if tokens exist
  let pushResults = { tickets: [], invalidTokens: [] };
  if (pushTokens.length > 0) {
    try {
      pushResults = await sendPushNotification(
        pushTokens,
        title,
        body,
        subtitle,
        data,
      );

      logInfo(
        `[NOTIFICATION] Sent push notifications to ${pushTokens.length} device(s)`,
      );

      // Step 4: Mark notifications as pushed
      await Notification.updateMany(
        { _id: { $in: notifications.map((n) => n._id) } },
        { pushSent: true, pushSentAt: new Date() },
      );
    } catch (error) {
      logError('[NOTIFICATION] Error sending push notifications:', error);
      // Don't throw - notifications are saved in DB even if push fails
    }
  } else {
    logInfo(
      '[NOTIFICATION] No active devices found for user(s), skipping push notification',
    );
  }

  return { notifications, pushResults };
}

export default sendAndSaveNotification;
