// routes/realtimeRoutes.js
import express from 'express';
import { handlePusherWebhook } from '../../controller/realtime.js';

const router = express.Router();

router.post('/webhook', handlePusherWebhook);

export default router;
