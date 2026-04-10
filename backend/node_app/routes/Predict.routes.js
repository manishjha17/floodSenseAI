const express = require('express');
const router = express.Router();
const upload = require('../middlewares/Upload.middleware');
const predictController = require('../controllers/Predict.controller');

router.post('/image', upload.single('file'), predictController.predictImage);
router.post('/text', upload.none(), predictController.predictText);
router.get('/geocode', predictController.geocode);

module.exports = router;
