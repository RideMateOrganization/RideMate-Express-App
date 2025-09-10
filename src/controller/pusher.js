// controllers/pusherController.js
const mongoose = require('mongoose');
const pusher = require('../utils/pusher');
const Ride = require('../models/ride');
const RideTracking = require('../models/ride-tracking');

// @desc    Authenticate Pusher channel
// @route   POST /api/v1/pusher/auth
// @access  Private
async function authenticatePusherChannel(req, res) {
  const socketId = req.body.socket_id;
  const channelName = req.body.channel_name; // e.g., 'private-ride-tracking-654321098765432109876543'
  const userId = req.user.id; // From your `protect` middleware

  // 1. Extract rideId from channelName and validate
  const match = channelName.match(/^private-ride-tracking-(.*)$/);
  if (!match || !match[1]) {
    return res.status(400).json({
      success: false,
      error: 'Invalid channel name for authentication',
    });
  }
  const rideId = match[1];
  if (!mongoose.Types.ObjectId.isValid(rideId)) {
    return res.status(400).json({
      success: false,
      error: `Invalid Ride ID in channel name: ${rideId}`,
    });
  }

  // 2. Verify user authorization (e.g., is the user a participant of the ride?)
  const ride = await Ride.findById(rideId);
  if (!ride) {
    return res.status(404).json({
      success: false,
      error: `Ride not found for channel ${channelName}`,
    });
  }

  const isParticipant = ride.participants.some((p) => p.user.equals(userId));

  if (!isParticipant) {
    return res.status(403).json({
      success: false,
      error: `User ${userId} is not authorized to subscribe to channel ${channelName}`,
    });
  }

  // 3. If authorized, generate the authentication signature for Pusher
  const auth = pusher.authorizeChannel(socketId, channelName);
  res.send(auth); // Send the authentication signature back to the client
}

async function handlePusherWebhook(req, res) {
  // For now, we'll skip webhook signature verification
  // In production, you should implement proper webhook signature verification
  // using the webhook secret from Pusher dashboard

  const webhooks = {
    events: req.body.events || [],
  };

  if (!webhooks.events || webhooks.events.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No events found in webhook payload',
    });
  }

  // 2. Process each event in the webhook payload
  webhooks.events.forEach(async (event) => {
    // We are interested in 'client-location-update' events
    if (event.event === 'client-location-update') {
      try {
        // Parse the data field which is a JSON string
        const eventData = JSON.parse(event.data);
        const { userId, latitude, longitude } = eventData; // Data sent by the client
        const channelName = event.channel; // e.g., 'private-ride-tracking-...'

        // Extract rideId from channelName and validate
        const match = channelName.match(/^private-ride-tracking-(.*)$/);
        if (!match || !match[1]) {
          console.error(
            'Webhook: Invalid channel name for location update',
            channelName,
          );
          return; // Skip to next event
        }
        const rideId = match[1];

        // Validate IDs and coordinates
        if (!mongoose.Types.ObjectId.isValid(rideId)) {
          console.error('Webhook: Invalid Ride ID in channel name', rideId);
          return;
        }
        if (!mongoose.Types.ObjectId.isValid(userId)) {
          console.error(
            'Webhook: Invalid User ID in client-location-update data',
            userId,
          );
          return;
        }
        if (typeof latitude !== 'number' || typeof longitude !== 'number') {
          console.error(
            'Webhook: Invalid coordinates in client-location-update data',
          );
          return;
        }
        // 3. Save location to MongoDB
        await RideTracking.findOneAndUpdate(
          { ride: rideId, user: userId },
          {
            $push: {
              path: {
                timestamp: new Date(), // Use server timestamp for consistency
                coordinates: {
                  type: 'Point',
                  coordinates: [longitude, latitude], // GeoJSON order: [longitude, latitude]
                },
              },
            },
            $setOnInsert: {
              ride: rideId,
              user: userId,
              trackingStatus: 'active',
            },
          },
          {
            upsert: true, // Create the document if it doesn't exist
            new: true, // Return the updated document
            setDefaultsOnInsert: true, // Apply default values if upserting a new document
            runValidators: true, // Run schema validators
          },
        );
        console.log(`Location updated for user ${userId} on ride ${rideId}`);
      } catch (parseError) {
        console.error('Error parsing location update data:', parseError);
        // Skip this event by not executing the rest of the logic
      }
    } else if (event.event === 'client-user-stopped-tracking') {
      try {
        // Parse the data field which is a JSON string
        const eventData = JSON.parse(event.data);
        const { userId } = eventData;
        const channelName = event.channel;
        const match = channelName.match(/^private-ride-tracking-(.*)$/);
        if (!match || !match[1]) {
          console.error(
            'Webhook: Invalid channel name for stop tracking event',
            channelName,
          );
          return;
        }
        const rideId = match[1];

        if (!mongoose.Types.ObjectId.isValid(rideId)) {
          console.error('Webhook: Invalid Ride ID in channel name', rideId);
          return;
        }
        if (!mongoose.Types.ObjectId.isValid(userId)) {
          console.error(
            'Webhook: Invalid User ID in client-user-stopped-tracking data',
            userId,
          );
          return;
        }

        // Update tracking status in MongoDB
        await RideTracking.findOneAndUpdate(
          { ride: rideId, user: userId },
          { $set: { trackingStatus: 'stopped' } },
          { new: true, runValidators: true },
        );
        console.log(
          `Tracking status set to stopped for user ${userId} on ride ${rideId}`,
        );
      } catch (parseError) {
        console.error('Error parsing stop tracking data:', parseError);
        // Skip this event by not executing the rest of the logic
      }
    }
  });

  res.status(200).send('Webhook received and processed');
}

module.exports = {
  authenticatePusherChannel,
  handlePusherWebhook,
};
