const { Expo } = require('expo-server-sdk');

const expo = new Expo();

/**
 * Sends a single push notification or a batch of notifications.
 * It also handles invalid tokens by marking them for removal.
 *
 * @param {string | string[]} to - Single Expo Push Token or array of tokens.
 * @param {string} title - Notification title.
 * @param {string} subtitle - Notification subtitle.
 * @param {string} body - Notification body.
 * @param {object} data - Custom data payload.
 * @param {string} sound - Notification sound ('default' or custom).
 * @returns {Promise<object>} An object containing `tickets` (from Expo) and `invalidTokens` found.
 */
const sendPushNotification = async (
  to,
  title,
  body,
  subtitle,
  data = {},
  sound = 'default',
) => {
  const pushTokens = Array.isArray(to) ? to : [to];

  // Validate push tokens and create messages
  const { messages, invalidTokens } = pushTokens.reduce(
    (acc, pushToken) => {
      if (!Expo.isExpoPushToken(pushToken)) {
        // eslint-disable-next-line no-console
        console.error(
          `Push token ${pushToken} is not a valid Expo push token.`,
        );
        acc.invalidTokens.push(pushToken);
        return acc;
      }

      // Construct a message with all the push token data.
      acc.messages.push({
        to: pushToken,
        sound,
        subtitle,
        title,
        body,
        data,
        priority: 'high',
        // _displayInForeground: true, // This ensures it displays when the app is open
        channelId: 'default', // Make sure this matches your app's notification channel
      });
      return acc;
    },
    { messages: [], invalidTokens: [] },
  );

  // The Expo push notification service accepts batches of notifications up to 100.
  // So we know if we have 1000 tokens, we will send 10 batches.
  // After sending a batch, the Expo push notification service will respond with a list of push tickets.
  const chunks = expo.chunkPushNotifications(messages);

  // Send all chunks in parallel
  const ticketChunks = await Promise.all(
    chunks.map(async (chunk) => {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        // eslint-disable-next-line no-console
        console.log('Sent push notification chunk. Tickets:', ticketChunk);
        return ticketChunk;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error sending push notification chunk:', error);
        // Handle transient errors here (e.g., network issues) - the SDK has built-in retries
        // but if an error still propagates, it might need higher-level attention.
        return [];
      }
    }),
  );

  const tickets = ticketChunks.flat();
  return { tickets, invalidTokens };
};

module.exports = { sendPushNotification };
