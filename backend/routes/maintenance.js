// const express = require('express');
// const router = express.Router();
// const { body, validationResult } = require('express-validator');
// const Maintenance = require('../models/Maintenance');
// const Machine = require('../models/Machine');
// const { protect } = require('../middleware/auth');

// // GET /api/maintenance
// router.get('/', protect, async (req, res) => {
//   try {
//     const filter = {};
//     if (req.query.status) filter.status = req.query.status;
//     if (req.query.machine) filter.machine = req.query.machine;

//     const records = await Maintenance.find(filter)
//       .populate('machine', 'name capacity location')
//       .populate('createdBy', 'name')
//       .sort('-date');

//     res.json({ success: true, count: records.length, data: records });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// });

// // GET /api/maintenance/:id
// router.get('/:id', protect, async (req, res) => {
//   try {
//     const record = await Maintenance.findById(req.params.id)
//       .populate('machine', 'name capacity location status')
//       .populate('createdBy', 'name email');

//     if (!record) {
//       return res
//         .status(404)
//         .json({ success: false, message: 'Maintenance record not found.' });
//     }
//     res.json({ success: true, data: record });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// });

// // POST /api/maintenance
// router.post(
//   '/',
//   protect,
//   [
//     body('machine').notEmpty().withMessage('Machine is required'),
//     body('issue').trim().notEmpty().withMessage('Issue description is required'),
//     body('cost').isNumeric().withMessage('Cost must be a number'),
//   ],
//   async (req, res) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({ success: false, errors: errors.array() });
//     }

//     try {
//       const machine = await Machine.findById(req.body.machine);
//       if (!machine) {
//         return res
//           .status(404)
//           .json({ success: false, message: 'Machine not found.' });
//       }

//       const record = await Maintenance.create({
//         ...req.body,
//         createdBy: req.user._id,
//       });

//       // Set machine status to maintenance
//       await Machine.findByIdAndUpdate(req.body.machine, {
//         status: 'maintenance',
//       });

//       const populated = await Maintenance.findById(record._id).populate(
//         'machine',
//         'name capacity'
//       );

//       res.status(201).json({ success: true, data: populated });
//     } catch (err) {
//       res.status(500).json({ success: false, message: err.message });
//     }
//   }
// );

// // PUT /api/maintenance/:id
// router.put('/:id', protect, async (req, res) => {
//   try {
//     const record = await Maintenance.findById(req.params.id);
//     if (!record) {
//       return res
//         .status(404)
//         .json({ success: false, message: 'Maintenance record not found.' });
//     }

//     const updated = await Maintenance.findByIdAndUpdate(
//       req.params.id,
//       req.body,
//       { new: true, runValidators: true }
//     ).populate('machine', 'name capacity');

//     // If maintenance completed, set machine back to available
//     if (req.body.status === 'completed' && record.status !== 'completed') {
//       await Machine.findByIdAndUpdate(record.machine, { status: 'available' });
//     }

//     res.json({ success: true, data: updated });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// });

// // DELETE /api/maintenance/:id
// router.delete('/:id', protect, async (req, res) => {
//   try {
//     const record = await Maintenance.findByIdAndDelete(req.params.id);
//     if (!record) {
//       return res
//         .status(404)
//         .json({ success: false, message: 'Maintenance record not found.' });
//     }
//     res.json({ success: true, message: 'Record deleted.' });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// });

// module.exports = router;








const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Maintenance = require('../models/Maintenance');
const Machine = require('../models/Machine');
const { protect, restrictTo } = require('../middleware/auth');

// Apply protection and RBAC to all maintenance routes
router.use(protect);
router.use(restrictTo('admin', 'staff'));

// GET /api/maintenance
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.machine) filter.machine = req.query.machine;

    const records = await Maintenance.find(filter)
      .populate('machine', 'name capacity location status')
      .populate('createdBy', 'name')
      .sort('-date');

    res.json({ success: true, count: records.length, data: records });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/maintenance/:id
router.get('/:id', async (req, res) => {
  try {
    const record = await Maintenance.findById(req.params.id)
      .populate('machine', 'name capacity location status')
      .populate('createdBy', 'name email');

    if (!record) {
      return res.status(404).json({ success: false, message: 'Maintenance record not found.' });
    }
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/maintenance
router.post(
  '/',
  [
    body('machine').notEmpty().withMessage('Machine is required'),
    body('issue').trim().notEmpty().withMessage('Issue description is required'),
    body('cost').isNumeric().withMessage('Cost must be a valid number'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const machine = await Machine.findById(req.body.machine);
      if (!machine) {
        return res.status(404).json({ success: false, message: 'Machine not found.' });
      }

      // Data Integrity Check: Cannot maintain a machine that is currently rented out
      if (machine.status === 'rented') {
        return res.status(400).json({ 
          success: false, 
          message: 'Cannot log maintenance for a machine that is currently rented. Complete the rental first.' 
        });
      }

      const record = await Maintenance.create({
        ...req.body,
        createdBy: req.user._id,
      });

      // Set machine status to maintenance
      await Machine.findByIdAndUpdate(req.body.machine, {
        status: 'maintenance',
      });

      const populated = await Maintenance.findById(record._id).populate(
        'machine',
        'name capacity'
      );

      res.status(201).json({ success: true, data: populated });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// PUT /api/maintenance/:id
router.put('/:id', async (req, res) => {
  try {
    const record = await Maintenance.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Maintenance record not found.' });
    }

    const wasInProgress = record.status === 'in-progress';
    
    const updated = await Maintenance.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('machine', 'name capacity');

    // If maintenance was marked as completed, set the machine back to available
    if (req.body.status === 'completed' && wasInProgress) {
      await Machine.findByIdAndUpdate(record.machine, { status: 'available' });
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/maintenance/:id (Admin only)
router.delete('/:id', restrictTo('admin'), async (req, res) => {
  try {
    const record = await Maintenance.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Maintenance record not found.' });
    }

    // If we delete an in-progress maintenance record, free up the machine
    if (record.status === 'in-progress') {
      await Machine.findByIdAndUpdate(record.machine, { status: 'available' });
    }

    await record.deleteOne();
    res.json({ success: true, message: 'Maintenance record deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;