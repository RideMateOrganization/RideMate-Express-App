const express = require('express');
const { protect } = require('../../middleware/auth');
const {
  getPendingRequests,
  approveRejectRequest,
  getMyRequests,
} = require('../../controller/ride');

const router = express.Router();

router.use(protect);

router.get('/pending', getPendingRequests);
router.get('/my-requests', getMyRequests);
router.post('/:requestId', approveRejectRequest);

module.exports = router;
