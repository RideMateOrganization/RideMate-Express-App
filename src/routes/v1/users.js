import express from 'express';
import protect from '../../middleware/auth.js';
import { getUser, getUserById, updateUser } from '../../controller/user.js';

const router = express.Router();

router.use(protect);

router.route('/me').get(getUser).put(updateUser);
router.route('/:id').get(getUserById);

export default router;
