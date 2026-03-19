import express from 'express';
import { body, validationResult } from 'express-validator';
import Machine from '../models/Machine.js';
import Rental from '../models/Rental.js'; // Imported to check active rentals
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

// GET /api/machines (Accessible by Admin, Staff, and Customers)
router.get('/', protect, async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.location) filter.location = new RegExp(req.query.location, 'i');

    const machines = await Machine.find(filter).sort('-createdAt');
    res.json({ success: true, count: machines.length, data: machines });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/machines/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const machine = await Machine.findById(req.params.id);
    if (!machine) {
      return res.status(404).json({ success: false, message: 'Machine not found.' });
    }
    res.json({ success: true, data: machine });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/machines (Admin only)
router.post(
  '/',
  protect,
  restrictTo('admin'),
  [
    body('name').trim().notEmpty().withMessage('Machine name is required'),
    body('capacity').trim().notEmpty().withMessage('Capacity is required'),
    body('rentalPricePerDay')
      .isNumeric()
      .withMessage('Rental price must be a valid number'),
    body('location').trim().notEmpty().withMessage('Location is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const machine = await Machine.create(req.body);
      res.status(201).json({ success: true, data: machine });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// PUT /api/machines/:id (Admin only)
router.put(
  '/:id', 
  protect, 
  restrictTo('admin'), 
  [
    body('name').optional().trim().notEmpty().withMessage('Machine name cannot be empty'),
    body('capacity').optional().trim().notEmpty().withMessage('Capacity cannot be empty'),
    body('rentalPricePerDay').optional().isNumeric().withMessage('Rental price must be a valid number'),
    body('location').optional().trim().notEmpty().withMessage('Location cannot be empty'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const machine = await Machine.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });
      
      if (!machine) {
        return res.status(404).json({ success: false, message: 'Machine not found.' });
      }
      res.json({ success: true, data: machine });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/machines/:id (Admin only)
router.delete('/:id', protect, restrictTo('admin'), async (req, res) => {
  try {
    // 1. Data Integrity Check: Prevent deletion if machine is currently rented
    const activeRentals = await Rental.countDocuments({
      machine: req.params.id,
      status: { $in: ['active', 'pending', 'overdue'] }
    });

    if (activeRentals > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete this machine because it is currently part of an active or pending rental.' 
      });
    }

    // 2. Perform Deletion
    const machine = await Machine.findByIdAndDelete(req.params.id);
    if (!machine) {
      return res.status(404).json({ success: false, message: 'Machine not found.' });
    }
    res.json({ success: true, message: 'Machine deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;