const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Rental = require('../models/Rental');
const Machine = require('../models/Machine');
const { protect, restrictTo } = require('../middleware/auth');

// GET /api/rentals
router.get('/', protect, async (req, res) => {
  try {
    const filter = {};
    
    // Role-based access: Customers only see their own rentals
    if (req.user.role === 'customer') {
      filter.customer = req.user._id;
    } else if (req.query.customer) {
      filter.customer = req.query.customer;
    }

    if (req.query.status) filter.status = req.query.status;
    if (req.query.machine) filter.machine = req.query.machine;

    const rentals = await Rental.find(filter)
      .populate('machine', 'name capacity rentalPricePerDay location status')
      .populate('customer', 'name phone cnic address')
      .populate('createdBy', 'name')
      .sort('-createdAt');

    res.json({ success: true, count: rentals.length, data: rentals });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/rentals/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id)
      .populate('machine', 'name capacity rentalPricePerDay location status')
      .populate('customer', 'name phone cnic address')
      .populate('createdBy', 'name email');

    if (!rental) {
      return res.status(404).json({ success: false, message: 'Rental not found.' });
    }

    // Security check: Prevent customers from viewing other people's rental details
    if (req.user.role === 'customer' && rental.customer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    res.json({ success: true, data: rental });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/rentals
router.post(
  '/',
  protect,
  [
    body('machine').notEmpty().withMessage('Machine is required'),
    body('customer').notEmpty().withMessage('Customer is required'),
    body('startDate').isISO8601().withMessage('Valid start date is required'),
    body('endDate').isISO8601().withMessage('Valid end date is required'),
    body('advancePayment').optional().isNumeric().withMessage('Advance payment must be a number'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      // 1. Check machine availability
      const machine = await Machine.findById(req.body.machine);
      if (!machine) {
        return res.status(404).json({ success: false, message: 'Machine not found.' });
      }
      if (machine.status !== 'available') {
        return res.status(400).json({
          success: false,
          message: `Machine is currently ${machine.status} and not available for rental.`,
        });
      }

      // 2. Validate dates
      const start = new Date(req.body.startDate);
      const end = new Date(req.body.endDate);
      if (end <= start) {
        return res.status(400).json({
          success: false,
          message: 'End date must be after start date.',
        });
      }

      // 3. Auto-calculate pricing (Backend Source of Truth)
      const diffTime = Math.abs(end - start);
      const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
      const totalRent = totalDays * machine.rentalPricePerDay;
      const advancePayment = req.body.advancePayment ? parseFloat(req.body.advancePayment) : 0;
      const remainingBalance = totalRent - advancePayment;

      if (advancePayment > totalRent) {
        return res.status(400).json({
          success: false,
          message: 'Advance payment cannot exceed total rent.',
        });
      }

      // 4. Create rental
      const rental = await Rental.create({
        ...req.body,
        totalDays,
        totalRent,
        advancePayment,
        remainingBalance,
        createdBy: req.user._id,
        status: 'active',
      });

      // 5. Update machine status to rented
      await Machine.findByIdAndUpdate(req.body.machine, { status: 'rented' });

      const populated = await Rental.findById(rental._id)
        .populate('machine', 'name capacity rentalPricePerDay')
        .populate('customer', 'name phone');

      res.status(201).json({ success: true, data: populated });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// PUT /api/rentals/:id (Update status and handle machine availability)
router.put('/:id', protect, async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id);
    if (!rental) {
      return res.status(404).json({ success: false, message: 'Rental not found.' });
    }

    const wasActiveOrOverdue = rental.status === 'active' || rental.status === 'overdue';
    
    const updatedRental = await Rental.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('machine', 'name capacity rentalPricePerDay')
      .populate('customer', 'name phone');

    // If rental is marked as completed, free up the machine
    if (req.body.status === 'completed' && wasActiveOrOverdue) {
      await Machine.findByIdAndUpdate(rental.machine, { status: 'available' });
    }

    res.json({ success: true, data: updatedRental });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/rentals/:id/payment — Record advance/partial payments
router.patch('/:id/payment', protect, async (req, res) => {
  try {
    const { advancePayment } = req.body;
    const rental = await Rental.findById(req.params.id);
    if (!rental) {
      return res.status(404).json({ success: false, message: 'Rental not found.' });
    }

    if (advancePayment > rental.totalRent) {
      return res.status(400).json({ success: false, message: 'Payment cannot exceed total rent.' });
    }

    rental.advancePayment = advancePayment;
    rental.remainingBalance = rental.totalRent - advancePayment;
    await rental.save();

    res.json({ success: true, data: rental });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/rentals/:id (Admin only)
router.delete('/:id', protect, restrictTo('admin'), async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id);
    if (!rental) {
      return res.status(404).json({ success: false, message: 'Rental not found.' });
    }

    // If the rental was active, we must make the machine available again before deleting
    if (rental.status === 'active' || rental.status === 'overdue') {
      await Machine.findByIdAndUpdate(rental.machine, { status: 'available' });
    }

    await rental.deleteOne();
    res.json({ success: true, message: 'Rental deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;