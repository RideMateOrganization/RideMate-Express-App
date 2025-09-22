// routes/realtimeRoutes.js
const express = require('express');
const { handlePusherWebhook } = require('../../controller/realtime');

const router = express.Router();

router.post('/webhook', handlePusherWebhook);

module.exports = router;
