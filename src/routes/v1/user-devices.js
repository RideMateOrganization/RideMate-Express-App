const express = require('express');
const { protect } = require('../../middleware/auth');
const {
  registerDevice,
  getUserDevices,
  deactivateDevice,
  deactivateAllDevices,
} = require('../../controller/user-device');

const router = express.Router();

router.use(protect);

router.route('/').post(registerDevice);
router.route('/').get(getUserDevices);
router.route('/').delete(deactivateAllDevices);
router.route('/:pushToken').delete(deactivateDevice);

module.exports = router;
