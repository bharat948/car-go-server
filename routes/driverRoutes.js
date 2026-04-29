const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { updateDriverLocation, getDriverById } = require('../controllers/driverController');
const authenticateToken = require('../middleware/authMiddleware');

const router = express.Router();

const requireCourierRole = (req, res, next) => {
  if (req.userRole !== 'courier') {
    return res.status(403).json({ message: 'Forbidden: courier role required' });
  }
  return next();
};

router.post(
  '/driver/location',
  authenticateToken,
  requireCourierRole,
  [
    body('id').optional().isString().notEmpty().withMessage('id must be a non-empty string when provided'),
    body('lat')
      .notEmpty()
      .withMessage('lat is required')
      .isFloat({ min: -90, max: 90 })
      .withMessage('lat must be between -90 and 90'),
    body('lng')
      .notEmpty()
      .withMessage('lng is required')
      .isFloat({ min: -180, max: 180 })
      .withMessage('lng must be between -180 and 180'),
    body('isOnline')
      .optional()
      .custom((value) => {
        if (typeof value === 'boolean') {
          return true;
        }
        if (value === 'true' || value === 'false' || value === '1' || value === '0') {
          return true;
        }
        throw new Error('isOnline must be boolean');
      }),
  ],
  validate,
  updateDriverLocation
);

router.get(
  '/driver/:id',
  authenticateToken,
  requireCourierRole,
  [param('id').notEmpty().withMessage('id is required')],
  validate,
  getDriverById
);

module.exports = router;
