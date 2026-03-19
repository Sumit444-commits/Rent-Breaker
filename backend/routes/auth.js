const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect, restrictTo } = require('../middleware/auth');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const sendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  user.password = undefined;
  res.status(statusCode).json({ success: true, token, data: { user } });
};

// POST /api/auth/register  (admin only after first user)
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('role').optional().isIn(['admin', 'staff','customer']).withMessage('Invalid role'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { name, email, password, role } = req.body;

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res
          .status(400)
          .json({ success: false, message: 'Email already registered.' });
      }

      const user = await User.create({ name, email, password, role });
      sendToken(user, 201, res);
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email }).select('+password');
      if (!user || !(await user.comparePassword(password))) {
        return res
          .status(401)
          .json({ success: false, message: 'Invalid email or password.' });
      }

      sendToken(user, 200, res);
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  res.json({ success: true, data: { user: req.user } });
});

// GET /api/auth/users  (admin only)
router.get('/users', protect, restrictTo('admin'), async (req, res) => {
  try {
    const users = await User.find().select('-password').sort('-createdAt');
    res.json({ success: true, count: users.length, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/auth/users/:id  (admin only)
router.patch(
  '/users/:id',
  protect,
  restrictTo('admin'),
  async (req, res) => {
    try {
      const { name, role, isActive } = req.body;
      const user = await User.findByIdAndUpdate(
        req.params.id,
        { name, role, isActive },
        { new: true, runValidators: true }
      ).select('-password');

      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: 'User not found.' });
      }

      res.json({ success: true, data: user });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

module.exports = router;
