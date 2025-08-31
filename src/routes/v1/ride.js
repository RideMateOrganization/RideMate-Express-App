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
} = require('../../controller/ride');

const router = express.Router();

router.use(protect);

router.get('/nearby', getNearbyRides);
router.route('/').get(getRides).post(createRide);
router.route('/:id').get(getRide);
router.post('/join/:id', joinRide);
router.post('/leave/:id', leaveRide);
router.get('/:id/participants', getRideParticipants);
router.delete('/:id/participants/:participantId', removeParticipant);

module.exports = router;
