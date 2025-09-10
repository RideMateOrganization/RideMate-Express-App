// routes/pusherRoutes.js
const express = require('express');
const {
  authenticatePusherChannel,
  handlePusherWebhook,
} = require('../../controller/pusher');
const { protect } = require('../../middleware/auth');

const router = express.Router();

router.post('/auth', protect, authenticatePusherChannel);
router.post('/webhook', handlePusherWebhook);

module.exports = router;
