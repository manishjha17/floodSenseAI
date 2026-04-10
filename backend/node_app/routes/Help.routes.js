const express = require('express');
const router = express.Router();
const helpController = require('../controllers/Help.controller');
const { verifyToken, verifyAdmin } = require('../middlewares/Auth.middleware');

router.post('/submit', verifyToken, helpController.submitRequest);
router.get('/requests', verifyToken, helpController.getRequests);
router.patch('/requests/:id/fulfill', verifyToken, helpController.fulfillRequest);
router.delete('/requests/:id', verifyAdmin, helpController.deleteRequest);

module.exports = router;
