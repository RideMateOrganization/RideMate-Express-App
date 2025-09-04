const express = require('express');
const { protect } = require('../../middleware/auth');
const { getUser, getUserById, updateUser } = require('../../controller/user');

const router = express.Router();

router.use(protect);

router.route('/me').get(getUser).put(updateUser);
router.route('/:id').get(getUserById);

module.exports = router;
