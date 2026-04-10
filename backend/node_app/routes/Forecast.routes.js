const express = require('express');
const router = express.Router();
const forecastController = require('../controllers/Forecast.controller');

router.post('/', forecastController.getForecast);

module.exports = router;
