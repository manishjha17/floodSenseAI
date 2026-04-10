const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/Feedback.controller');
const { verifyToken, verifyAdmin } = require('../middlewares/Auth.middleware');

router.post('/submit', verifyToken, feedbackController.submitFeedback);
router.get('/all', verifyAdmin, feedbackController.getAllFeedback);
router.post('/update-label', verifyAdmin, feedbackController.updateLabel);
router.get('/export', verifyAdmin, feedbackController.exportCorrectedImages);
router.get('/approved', verifyAdmin, feedbackController.getApprovedTrainingData);

module.exports = router;
