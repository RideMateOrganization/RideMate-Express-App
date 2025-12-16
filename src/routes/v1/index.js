import express from 'express';

import userRoutes from './users.js';
import rideRoutes from './ride.js';
import rideRequestRoutes from './ride-requests.js';
import deviceRoutes from './user-devices.js';
import notificationRoutes from './notification.js';
import realtimeRoutes from './realtime.js';
import privacyPolicyRoutes from './privacy-policy.js';
import termsOfServiceRoutes from './terms-of-service.js';
import dataProcessingConsentRoutes from './data-processing-consent.js';
import expenseRoutes from './expense.js';

const router = express.Router();
router.use('/users', userRoutes);
router.use('/rides', rideRoutes);
router.use('/ride-requests', rideRequestRoutes);
router.use('/devices', deviceRoutes);
router.use('/notifications', notificationRoutes);
router.use('/realtime', realtimeRoutes);
router.use('/privacy-policy', privacyPolicyRoutes);
router.use('/terms-of-service', termsOfServiceRoutes);
router.use('/data-processing-consent', dataProcessingConsentRoutes);
router.use('/expenses', expenseRoutes);

router.get('/', (req, res) => {
  res.send('Roadmate API - Version 1');
});

export default router;
