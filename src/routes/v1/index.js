const express = require('express');

const router = express.Router();

router.use('/auth', require('./auth'));
router.use('/users', require('./users'));

router.get('/', (req, res) => {
  res.send('Roadmate API - Version 1');
});

module.exports = router;
