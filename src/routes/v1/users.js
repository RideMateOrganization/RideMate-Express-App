const express = require('express');
const { protect } = require('../../middleware/auth');
const { getUser, getUserById } = require('../../controller/user');

const router = express.Router();

router.get('/me', protect, getUser);
router.get('/:id', protect, getUserById);

module.exports = router;
