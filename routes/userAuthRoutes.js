const express = require('express');
const router = express.Router();
const { login,register,logoutUser} = require('../controllers/userController');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

router.post(
  '/register',
  [
    body('username')
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage('username must be 3-50 characters'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('password must be at least 8 characters'),
    body('role')
      .optional()
      .isIn(['sender', 'courier'])
      .withMessage('role must be sender or courier'),
  ],
  validate,
  register
);

router.post(
  '/login',
  [
    body('username').trim().notEmpty().withMessage('username is required'),
    body('password').notEmpty().withMessage('password is required'),
  ],
  validate,
  login
);

router.post('/logout', logoutUser);


module.exports = router;