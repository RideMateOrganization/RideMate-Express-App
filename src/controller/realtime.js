// controllers/realtimeController.js
import mongoose from 'mongoose';
import Ride from '../models/ride.js';
import RideTracking from '../models/ride-tracking.js';
import { calculateRideStats } from '../utils/ride-stats-calculator.js';

async function handlePusherWebhook(req, res) {
  const webhookData = req.body;

  if (
    !webhookData.items ||
    !Array.isArray(webhookData.items) ||
    webhookData.items.length === 0
  ) {
    return res.status(400).json({
      success: false,
      error: 'No items found in webhook payload',
    });
  }

  webhookData.items.forEach(async (item) => {
    if (item.name === 'channel.message' && item.data && item.data.messages) {
      item.data.messages.forEach(async (message) => {
        try {
          const messageData = JSON.parse(message.data);
          const { coordinates, timestamp } = messageData;
          const { channelId } = item.data;
          const messageName = message.name;

          const channelMatch = channelId.match(/^ride:live-location:(.*)$/);
          if (!channelMatch || !channelMatch[1]) {
            console.error(
              'Webhook: Invalid channel ID for location update',
              channelId,
            );
            return;
          }

          const rideId = channelMatch[1];
          if (!mongoose.Types.ObjectId.isValid(rideId)) {
            console.error('Webhook: Invalid Ride ID in channel ID', rideId);
            return;
          }

          if (
            messageName === 'ride:location-update' &&
            coordinates &&
            Array.isArray(coordinates) &&
            coordinates.length === 2
          ) {
            const [longitude, latitude] = coordinates;
            const userId = message.clientId;

            if (!mongoose.Types.ObjectId.isValid(userId)) {
              console.error('Webhook: Invalid User ID (clientId)', userId);
              return;
            }

            if (typeof latitude !== 'number' || typeof longitude !== 'number') {
              console.error(
                'Webhook: Invalid coordinates in location update data',
                coordinates,
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
                },
              );
            } catch (dbError) {
              console.error(
                'Database error creating/updating tracking document:',
                dbError,
              );
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
          } else if (messageName === 'ride:stop-tracking') {
            const stopUserId = message.clientId;
            const stopChannelMatch = channelId.match(
              /^ride:live-location:(.*)$/,
            );
            if (!stopChannelMatch || !stopChannelMatch[1]) {
              console.error(
                'Webhook: Invalid channel ID for stop tracking event',
                channelId,
              );
              return;
            }
            const stopRideId = stopChannelMatch[1];

            if (!mongoose.Types.ObjectId.isValid(stopRideId)) {
              console.error(
                'Webhook: Invalid Ride ID in channel ID',
                stopRideId,
              );
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
              { new: true, runValidators: true },
            );
          }
        } catch (parseError) {
          console.error('Error parsing message data:', parseError);
        }
      });
    }
  });

  res.status(200).send('Webhook received and processed');
}

export { handlePusherWebhook };
