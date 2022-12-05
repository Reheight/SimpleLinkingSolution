const router = require('express').Router();
const authentication = require('./authentication');
const fetch = require('./fetching');

router.use('/authentication', authentication);
router.use('/fetch', fetch);

module.exports = router;