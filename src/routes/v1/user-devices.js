import express from 'express';
import protect from '../../middleware/auth.js';
import {
  registerDevice,
  getUserDevices,
  deactivateDevice,
  deactivateAllDevices,
} from '../../controller/user-device.js';

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(getUserDevices)
  .post(registerDevice)
  .delete(deactivateAllDevices);
router.route('/:pushToken').delete(deactivateDevice);

export default router;
