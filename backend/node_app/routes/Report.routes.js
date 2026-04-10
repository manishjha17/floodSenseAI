const express = require('express');
const router = express.Router();
const reportController = require('../controllers/Report.controller');
const { verifyToken } = require('../middlewares/Auth.middleware');

router.post('/generate', verifyToken, reportController.generateReport);

module.exports = router;
