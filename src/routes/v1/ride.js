import express from 'express';
import protect from '../../middleware/auth.js';
import {
  createRide,
  getRides,
  getRide,
  updateRide,
  joinRide,
  leaveRide,
  getRideParticipants,
  removeParticipant,
  getNearbyRides,
  startRide,
  completeRide,
  cancelRide,
  getRideTracking,
  updateLocationTracking,
} from '../../controller/ride.js';

import {
  uploadRideImage,
  getRideImages,
  deleteRideImage,
} from '../../controller/ride-image.js';

import {
  addComment,
  getComments,
  updateComment,
  deleteComment,
  getComment,
  toggleLike,
  getCommentLikes,
} from '../../controller/ride-comments.js';

import {
  getTravelledRoute,
  getAllTrackingData,
} from '../../controller/ride-tracking.js';

import {
  createExpense,
  updateExpense,
  listRideExpenses,
  getExpense,
  deleteExpense,
  getRideExpenseStatistics,
} from '../../controller/expense.js';

const router = express.Router();

router.use(protect);

router.get('/nearby', getNearbyRides);
router.route('/').get(getRides).post(createRide);
router.route('/:id').get(getRide).put(updateRide);
router.post('/join/:id', joinRide);
router.post('/leave/:id', leaveRide);
router.post('/:id/start', startRide);
router.post('/:id/complete', completeRide);
router.post('/:id/cancel', cancelRide);
router.get('/:id/participants', getRideParticipants);
router.delete('/:id/participants/:participantId', removeParticipant);
router.get('/:id/tracking', getRideTracking);
router.get('/:id/route', getTravelledRoute);
router.get('/:id/tracking/all', getAllTrackingData);
router.post('/:id/ping', updateLocationTracking);

router.route('/:id/images').get(getRideImages).post(uploadRideImage);
router.delete('/:id/images/:imageId', deleteRideImage);

// Comment routes
router.route('/:rideId/comments').get(getComments).post(addComment);
router
  .route('/:rideId/comments/:commentId')
  .get(getComment)
  .put(updateComment)
  .delete(deleteComment);
router.post('/:rideId/comments/:commentId/like', toggleLike);
router.get('/:rideId/comments/:commentId/likes', getCommentLikes);

// Expense routes
router.route('/:rideId/expenses').get(listRideExpenses).post(createExpense);
router.get('/:rideId/expenses/statistics', getRideExpenseStatistics);
router
  .route('/:rideId/expenses/:expenseId')
  .get(getExpense)
  .put(updateExpense)
  .delete(deleteExpense);

export default router;
