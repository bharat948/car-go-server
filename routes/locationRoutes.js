const express = require('express');
const authenticateToken = require('../middleware/authMiddleware');
const { suggestLocations } = require('../controllers/locationController');

const router = express.Router();

router.get('/locations/suggest', authenticateToken, suggestLocations);

module.exports = router;
