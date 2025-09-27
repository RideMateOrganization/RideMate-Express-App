const express = require('express');

const router = express.Router();

router.use('/auth', require('./auth'));
router.use('/users', require('./users'));
router.use('/rides', require('./ride'));
router.use('/ride-requests', require('./ride-requests'));
router.use('/devices', require('./user-devices'));
router.use('/realtime', require('./realtime'));
router.use('/privacy-policy', require('./privacy-policy'));

router.get('/', (req, res) => {
  res.send('Roadmate API - Version 1');
});

module.exports = router;
