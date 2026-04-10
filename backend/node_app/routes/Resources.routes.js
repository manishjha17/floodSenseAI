const express = require('express');
const router = express.Router();
const resourcesController = require('../controllers/Resources.controller');

router.get('/locations', resourcesController.getLocations);

module.exports = router;
