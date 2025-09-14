const express = require('express');
const { protect } = require('../../middleware/auth');
const {
  createRide,
  getRides,
  getRide,
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
} = require('../../controller/ride');

const {
  uploadRideImage,
  getRideImages,
  deleteRideImage,
} = require('../../controller/ride-image');

const {
  addComment,
  getComments,
  updateComment,
  deleteComment,
  getComment,
  toggleLike,
  getCommentLikes,
} = require('../../controller/ride-comments');

const router = express.Router();

router.use(protect);

router.get('/nearby', getNearbyRides);
router.route('/').get(getRides).post(createRide);
router.route('/:id').get(getRide);
router.post('/join/:id', joinRide);
router.post('/leave/:id', leaveRide);
router.post('/:id/start', startRide);
router.post('/:id/complete', completeRide);
router.post('/:id/cancel', cancelRide);
router.get('/:id/participants', getRideParticipants);
router.delete('/:id/participants/:participantId', removeParticipant);
router.get('/:id/tracking', getRideTracking);
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

module.exports = router;
