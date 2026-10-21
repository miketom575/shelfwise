const router = require('express').Router();
const { protect, requireRole } = require('../middleware/auth');
const { stats } = require('../controllers/dashboard.controller');

router.get('/dashboard', protect, requireRole('admin'), stats);

module.exports = router;
