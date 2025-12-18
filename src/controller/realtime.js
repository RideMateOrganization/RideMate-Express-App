// controllers/realtimeController.js
import mongoose from 'mongoose';
import { logError } from '../utils/logger.js';
import Ride from '../models/ride.js';
import RideTracking from '../models/ride-tracking.js';
import RideChatMessage from '../models/ride-comments.js';
import { calculateRideStats } from '../utils/ride-stats-calculator.js';

/**
 * Process a single message from the webhook
 */
async function processMessage(message, channelId) {
  const messageData = JSON.parse(message.data);
  const messageName = message.name;

  // Handle chat messages (ride:chat:{rideId} channel)
  if (messageName === 'chat:message') {
    const channelMatch = channelId.match(/^ride:chat:(.*)$/);
    if (!channelMatch || !channelMatch[1]) {
      // Not a chat channel, skip
      return;
    }

    const rideId = channelMatch[1];
    if (!mongoose.Types.ObjectId.isValid(rideId)) {
      logError('Webhook: Invalid Ride ID for chat message', rideId);
      return;
    }

    // Validate the message has required fields
    if (!messageData._id || !messageData.text || !messageData.user) {
      logError('Webhook: Invalid chat message data', messageData);
      return;
    }

    // Upsert with message ID as idempotency key
    // This prevents duplicate messages if the webhook is called multiple times
    await RideChatMessage.findOneAndUpdate(
      { _id: messageData._id },
      {
        $setOnInsert: {
          ride: rideId,
          text: messageData.text,
          user: {
            _id: messageData.user._id,
            name: messageData.user.name || 'Unknown',
            avatar: messageData.user.avatar || null,
          },
          createdAt: new Date(messageData.createdAt),
          image: messageData.image || null,
          video: messageData.video || null,
          audio: messageData.audio || null,
          system: messageData.system || false,
          sent: true,
          received: false,
          pending: false,
        },
      },
      { upsert: true, setDefaultsOnInsert: true }
    );

    return;
  }

  // Handle location updates (ride:live-location:{rideId} channel)
  if (messageName === 'ride:location-update') {
    const { coordinates, timestamp } = messageData;

    const channelMatch = channelId.match(/^ride:live-location:(.*)$/);
    if (!channelMatch || !channelMatch[1]) {
      logError('Webhook: Invalid channel ID for location update', channelId);
      return;
    }

    const rideId = channelMatch[1];
    if (!mongoose.Types.ObjectId.isValid(rideId)) {
      logError('Webhook: Invalid Ride ID in channel ID', rideId);
      return;
    }

    if (
      !coordinates ||
      !Array.isArray(coordinates) ||
      coordinates.length !== 2
    ) {
      logError('Webhook: Invalid coordinates in location update', coordinates);
      return;
    }

    const [longitude, latitude] = coordinates;
    const userId = message.clientId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      logError('Webhook: Invalid User ID (clientId)', userId);
      return;
    }

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      logError(
        'Webhook: Invalid coordinates in location update data',
        coordinates
      );
      return;
    }

    const ride = await Ride.findById(rideId);
    if (!ride || ride.status !== 'active') {
      return;
    }

    let updatedTracking;
    try {
      updatedTracking = await RideTracking.findOneAndUpdate(
        { ride: rideId, user: userId },
        {
          $push: {
            path: {
              timestamp: new Date(timestamp),
              coordinates: {
                type: 'Point',
                coordinates: [longitude, latitude],
              },
            },
          },
          $set: {
            lastKnownPosition: {
              type: 'Point',
              coordinates: [Number(longitude), Number(latitude)],
              timestamp: new Date(timestamp),
            },
          },
          $setOnInsert: {
            ride: rideId,
            user: userId,
            trackingStatus: 'active',
            startTime: new Date(),
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
          runValidators: true,
        }
      );
    } catch (dbError) {
      logError('Database error creating/updating tracking document:', dbError);
      return;
    }

    if (updatedTracking && updatedTracking.path.length > 0) {
      const stats = calculateRideStats(updatedTracking.path);
      await RideTracking.findByIdAndUpdate(updatedTracking.id, {
        $set: {
          calculatedStats: stats,
        },
      });
    }

    return;
  }

  // Handle stop tracking (ride:live-location:{rideId} channel)
  if (messageName === 'ride:stop-tracking') {
    const stopUserId = message.clientId;

    const channelMatch = channelId.match(/^ride:live-location:(.*)$/);
    if (!channelMatch || !channelMatch[1]) {
      logError('Webhook: Invalid channel ID for stop tracking event', channelId);
      return;
    }

    const stopRideId = channelMatch[1];
    if (!mongoose.Types.ObjectId.isValid(stopRideId)) {
      logError('Webhook: Invalid Ride ID in channel ID', stopRideId);
      return;
    }

    await RideTracking.findOneAndUpdate(
      { ride: stopRideId, user: stopUserId },
      {
        $set: {
          trackingStatus: 'completed',
          endTime: new Date(),
        },
      },
      { new: true, runValidators: true }
    );

    return;
  }
}

/**
 * Handle Ably webhook for realtime events
 * Properly handles async operations with Promise.all
 */
export async function handlePusherWebhook(req, res) {
  const webhookData = req.body;

  if (!webhookData.items?.length) {
    return res.status(400).json({
      success: false,
      error: 'No items found in webhook payload',
    });
  }

  try {
    await Promise.all(
      webhookData.items.map(async (item) => {
        if (item.name === 'channel.message' && item.data?.messages) {
          await Promise.all(
            item.data.messages.map(async (message) => {
              try {
                await processMessage(message, item.data.channelId);
              } catch (error) {
                logError('Message processing failed:', error);
              }
            })
          );
        }
      })
    );

    res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    logError('Webhook processing failed:', error);
    res.status(500).json({ success: false, error: 'Processing failed' });
  }
}

export default handlePusherWebhook;
