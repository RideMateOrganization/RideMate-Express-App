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
} = require('../../controller/ride');

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

module.exports = router;
