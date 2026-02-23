const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const {
  getPackages,
  getPackageById,
  addPackage,
  getMyPackages,
  EditPackage,
  deletePackage,
  updatePackageStatus,
  getCourierPackages,
  getMyDeliveries,
  PackagesNearMe,
} = require('../controllers/packageController');
const authenticateToken = require('../middleware/authMiddleware');

// Route to get all packages
router.get('/packages', getPackages);

// Route to get package by id (used by EditPackage frontend)
router.get(
  '/packages/:id',
  [param('id').notEmpty().withMessage('id is required')],
  validate,
  getPackageById
);

// Route to add a new package
router.post(
  '/packages',
  authenticateToken,
  [
    body('pickupLocation').notEmpty().withMessage('pickupLocation is required'),
    body('destination').notEmpty().withMessage('destination is required'),
    body('estimatedDeliveryTime').notEmpty().withMessage('estimatedDeliveryTime is required'),
    body('estimatedPrice').notEmpty().withMessage('estimatedPrice is required').isNumeric().withMessage('estimatedPrice must be numeric'),
    body('deliverTo').notEmpty().withMessage('deliverTo is required'),
  ],
  validate,
  addPackage
);

router.get('/my-packages', authenticateToken,getMyPackages);

router.put(
  '/packages/:id',
  authenticateToken,
  [
    param('id').notEmpty().withMessage('id is required'),
    body().custom((_, { req }) => {
      const { pickupLocation, destination, estimatedPrice } = req.body || {};
      const hasAny =
        (typeof pickupLocation === 'string' && pickupLocation.trim() !== '') ||
        (typeof destination === 'string' && destination.trim() !== '') ||
        estimatedPrice !== undefined;
      if (!hasAny) {
        throw new Error('At least one of pickupLocation, destination, estimatedPrice must be provided');
      }
      return true;
    }),
    body('estimatedPrice').optional().isNumeric().withMessage('estimatedPrice must be numeric'),
  ],
  validate,
  EditPackage
);

router.delete(
  '/packages/:id',
  authenticateToken,
  [param('id').notEmpty().withMessage('id is required')],
  validate,
  deletePackage
);

router.patch(
  '/packages/:id/status',
  authenticateToken,
  [
    param('id').notEmpty().withMessage('id is required'),
    body('status')
      .notEmpty()
      .withMessage('status is required')
      .isIn(['pending', 'accepted', 'in_transit', 'delivered', 'cancelled'])
      .withMessage('status must be one of: pending, accepted, in_transit, delivered, cancelled'),
  ],
  validate,
  updatePackageStatus
);

router.get('/courier/packages', authenticateToken, getCourierPackages);
router.get('/courier/my-deliveries', authenticateToken, getMyDeliveries);

router.post('/packages/near-me', PackagesNearMe);
module.exports = router;
