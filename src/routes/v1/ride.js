const express = require('express');
const { protect } = require('../../middleware/auth');
const {
  createRide,
  getRides,
  getRide,
  joinRide,
  leaveRide,
} = require('../../controller/ride');

const router = express.Router();

router.use(protect);

router.route('/').get(getRides).post(createRide);
router.route('/:id').get(getRide);
router.post('/join/:rideId', joinRide);
router.post('/leave/:rideId', leaveRide);

module.exports = router;
