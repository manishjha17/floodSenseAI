const express = require('express');
const router = express.Router();
const authController = require('../controllers/Auth.controller');
const { verifyToken, verifyAdmin } = require('../middlewares/Auth.middleware');

router.post('/login', authController.login);
router.post('/register', authController.register);
router.get('/pending-rescuers', verifyAdmin, authController.getPendingRescuers);
router.post('/verify-rescuer', verifyAdmin, authController.verifyRescuer);
router.post('/forgot-password-question', authController.getSecurityQuestion);
router.post('/reset-password', authController.resetPassword);
router.post('/forgot-password-otp', authController.forgotPasswordOtp);
router.post('/reset-password-otp', authController.resetPasswordOtp);
router.get('/profile/:username', verifyToken, authController.getProfile);

module.exports = router;
