const express = require('express');
const router = express.Router();
const forecastController = require('../controllers/Forecast.controller');

router.get('/search', forecastController.searchLocation);
router.post('/', forecastController.getForecast);

module.exports = router;
