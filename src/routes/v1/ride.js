const express = require('express');
const { protect } = require('../../middleware/auth');
const {
  createRide,
  getRides,
  getRide,
  joinRide,
  leaveRide,
  getRideParticipants,
} = require('../../controller/ride');

const router = express.Router();

router.use(protect);

router.route('/').get(getRides).post(createRide);
router.route('/:id').get(getRide);
router.post('/join/:rideId', joinRide);
router.post('/leave/:rideId', leaveRide);
router.get('/:rideId/participants', getRideParticipants);

module.exports = router;
