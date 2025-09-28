import express from 'express';
import protect from '../../middleware/auth.js';
import {
  getPendingRequests,
  approveRejectRequest,
  getMyRequests,
  deleteRideRequest,
} from '../../controller/ride.js';

const router = express.Router();

router.use(protect);

router.get('/pending', getPendingRequests);
router.get('/my-requests', getMyRequests);
router
  .route('/:requestId')
  .post(approveRejectRequest)
  .delete(deleteRideRequest);

export default router;
