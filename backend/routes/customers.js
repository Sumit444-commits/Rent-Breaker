import express from 'express';
import { body, validationResult } from 'express-validator';
import Customer from '../models/Customer.js';
import Rental from '../models/Rental.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

// Apply protection and RBAC to all customer routes
router.use(protect);
router.use(restrictTo('admin', 'staff'));

// GET /api/customers
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.search) {
      filter.$or = [
        { name: new RegExp(req.query.search, 'i') },
        { phone: new RegExp(req.query.search, 'i') },
        { cnic: new RegExp(req.query.search, 'i') },
      ];
    }

    const customers = await Customer.find(filter).sort('-createdAt');
    res.json({ success: true, count: customers.length, data: customers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/customers/:id (Includes Rental History)
router.get('/:id', async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    // Fetch the customer's rental history
    const rentals = await Rental.find({ customer: req.params.id })
      .populate('machine', 'name capacity status')
      .sort('-createdAt');

    // The frontend expects historyData to be { customer, rentals }
    res.json({ success: true, data: { customer, rentals } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/customers
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('phone').trim().notEmpty().withMessage('Phone is required'),
    body('cnic').trim().notEmpty().withMessage('CNIC is required'),
    body('address').trim().notEmpty().withMessage('Address is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const existing = await Customer.findOne({ cnic: req.body.cnic });
      if (existing) {
        return res.status(400).json({ success: false, message: 'CNIC already registered.' });
      }

      const customer = await Customer.create(req.body);
      res.status(201).json({ success: true, data: customer });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// PUT /api/customers/:id
router.put('/:id', async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }
    res.json({ success: true, data: customer });
  } catch (err) {
    // Handle Mongoose duplicate key error specifically for CNIC updates
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'CNIC already registered to another customer.' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/customers/:id
router.delete('/:id', restrictTo('admin'), async (req, res) => {
  try {
    // Prevent deletion if the customer owes money or has machines out
    const unresolvedRentals = await Rental.countDocuments({
      customer: req.params.id,
      status: { $in: ['active', 'overdue', 'pending'] },
    });
    
    if (unresolvedRentals > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete customer with active or unresolved rentals.',
      });
    }

    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }
    
    // Optional: Clean up completed rental records associated with this customer
    await Rental.deleteMany({ customer: req.params.id });

    res.json({ success: true, message: 'Customer deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;