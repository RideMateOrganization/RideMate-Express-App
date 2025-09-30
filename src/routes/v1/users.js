import express from 'express';
import protect from '../../middleware/auth.js';
import {
  getUser,
  getUserById,
  updateUser,
  acceptTerms,
  getLegalStatus,
} from '../../controller/user.js';

const router = express.Router();

router.use(protect);

router.route('/me').get(getUser).put(updateUser);
router.route('/accept-terms').post(acceptTerms);
router.route('/legal-status').get(getLegalStatus);
router.route('/:id').get(getUserById);

export default router;
