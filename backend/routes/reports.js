// const express = require('express');
// const router = express.Router();
// const Rental = require('../models/Rental');
// const Machine = require('../models/Machine');
// const Customer = require('../models/Customer');
// const Maintenance = require('../models/Maintenance');
// const { protect } = require('../middleware/auth');

// // GET /api/reports/dashboard  — summary stats
// router.get('/dashboard', protect, async (req, res) => {
//   try {
//     const now = new Date();
//     const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
//     const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
//     const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

//     const [
//       totalMachines,
//       availableMachines,
//       rentedMachines,
//       maintenanceMachines,
//       activeRentals,
//       totalCustomers,
//       monthlyRentals,
//       lastMonthRentals,
//       pendingBalance,
//       maintenanceCostThisMonth,
//     ] = await Promise.all([
//       Machine.countDocuments(),
//       Machine.countDocuments({ status: 'available' }),
//       Machine.countDocuments({ status: 'rented' }),
//       Machine.countDocuments({ status: 'maintenance' }),
//       Rental.countDocuments({ status: 'active' }),
//       Customer.countDocuments(),
//       Rental.aggregate([
//         { $match: { createdAt: { $gte: startOfMonth }, status: { $ne: 'pending' } } },
//         { $group: { _id: null, total: { $sum: '$totalRent' }, count: { $sum: 1 } } },
//       ]),
//       Rental.aggregate([
//         {
//           $match: {
//             createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
//             status: { $ne: 'pending' },
//           },
//         },
//         { $group: { _id: null, total: { $sum: '$totalRent' }, count: { $sum: 1 } } },
//       ]),
//       Rental.aggregate([
//         { $match: { status: { $in: ['active', 'overdue'] } } },
//         { $group: { _id: null, total: { $sum: '$remainingBalance' } } },
//       ]),
//       Maintenance.aggregate([
//         { $match: { date: { $gte: startOfMonth } } },
//         { $group: { _id: null, total: { $sum: '$cost' } } },
//       ]),
//     ]);

//     const thisMonthRevenue = monthlyRentals[0]?.total || 0;
//     const lastMonthRevenue = lastMonthRentals[0]?.total || 0;
//     const revenueChange =
//       lastMonthRevenue > 0
//         ? (((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1)
//         : 0;

//     res.json({
//       success: true,
//       data: {
//         machines: {
//           total: totalMachines,
//           available: availableMachines,
//           rented: rentedMachines,
//           maintenance: maintenanceMachines,
//         },
//         rentals: { active: activeRentals },
//         customers: { total: totalCustomers },
//         revenue: {
//           thisMonth: thisMonthRevenue,
//           lastMonth: lastMonthRevenue,
//           changePercent: revenueChange,
//           thisMonthRentalCount: monthlyRentals[0]?.count || 0,
//         },
//         billing: { pendingBalance: pendingBalance[0]?.total || 0 },
//         maintenance: { costThisMonth: maintenanceCostThisMonth[0]?.total || 0 },
//       },
//     });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// });

// // GET /api/reports/revenue?months=6  — monthly revenue trend
// router.get('/revenue', protect, async (req, res) => {
//   try {
//     const months = parseInt(req.query.months) || 6;
//     const result = await Rental.aggregate([
//       {
//         $match: {
//           status: { $in: ['active', 'completed'] },
//           createdAt: {
//             $gte: new Date(new Date().setMonth(new Date().getMonth() - months)),
//           },
//         },
//       },
//       {
//         $group: {
//           _id: {
//             year: { $year: '$createdAt' },
//             month: { $month: '$createdAt' },
//           },
//           revenue: { $sum: '$totalRent' },
//           rentalCount: { $sum: 1 },
//         },
//       },
//       { $sort: { '_id.year': 1, '_id.month': 1 } },
//     ]);

//     res.json({ success: true, data: result });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// });

// // GET /api/reports/utilization  — per-machine utilization
// router.get('/utilization', protect, async (req, res) => {
//   try {
//     const now = new Date();
//     const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
//     const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

//     const machines = await Machine.find();
//     const utilizationData = await Promise.all(
//       machines.map(async (m) => {
//         const rentals = await Rental.find({
//           machine: m._id,
//           status: { $in: ['active', 'completed'] },
//           startDate: { $lte: now },
//           endDate: { $gte: startOfMonth },
//         });
//         const rentedDays = rentals.reduce((acc, r) => acc + (r.totalDays || 0), 0);
//         return {
//           machine: { id: m._id, name: m.name, status: m.status },
//           rentedDays: Math.min(rentedDays, daysInMonth),
//           totalDays: daysInMonth,
//           utilizationPercent: Math.min(
//             Math.round((rentedDays / daysInMonth) * 100),
//             100
//           ),
//         };
//       })
//     );

//     res.json({ success: true, data: utilizationData });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// });

// module.exports = router;


const express = require('express');
const router = express.Router();
const Rental = require('../models/Rental');
const Machine = require('../models/Machine');
const Customer = require('../models/Customer');
const Maintenance = require('../models/Maintenance');
const { protect, restrictTo } = require('../middleware/auth');

// GET /api/reports/dashboard — summary stats (Accessible by Admin and Staff)
router.get('/dashboard', protect, restrictTo('admin', 'staff'), async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalMachines,
      availableMachines,
      rentedMachines,
      maintenanceMachines,
      activeRentals,
      totalCustomers,
      monthlyRentals,
      lastMonthRentals,
      pendingBalance,
      maintenanceCostThisMonth,
    ] = await Promise.all([
      Machine.countDocuments(),
      Machine.countDocuments({ status: 'available' }),
      Machine.countDocuments({ status: 'rented' }),
      Machine.countDocuments({ status: 'maintenance' }),
      Rental.countDocuments({ status: 'active' }),
      Customer.countDocuments(),
      Rental.aggregate([
        { $match: { createdAt: { $gte: startOfMonth }, status: { $ne: 'pending' } } },
        { $group: { _id: null, total: { $sum: '$totalRent' }, count: { $sum: 1 } } },
      ]),
      Rental.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
            status: { $ne: 'pending' },
          },
        },
        { $group: { _id: null, total: { $sum: '$totalRent' }, count: { $sum: 1 } } },
      ]),
      Rental.aggregate([
        { $match: { status: { $in: ['active', 'overdue'] } } },
        { $group: { _id: null, total: { $sum: '$remainingBalance' } } },
      ]),
      Maintenance.aggregate([
        { $match: { date: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$cost' } } },
      ]),
    ]);

    const thisMonthRevenue = monthlyRentals[0]?.total || 0;
    const lastMonthRevenue = lastMonthRentals[0]?.total || 0;
    const revenueChange =
      lastMonthRevenue > 0
        ? (((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1)
        : 0;

    res.json({
      success: true,
      data: {
        machines: {
          total: totalMachines,
          available: availableMachines,
          rented: rentedMachines,
          maintenance: maintenanceMachines,
        },
        rentals: { active: activeRentals },
        customers: { total: totalCustomers },
        // If staff, we can omit revenue to keep it strictly for Admin, 
        // but passing it here and hiding it on the frontend is also an approach.
        revenue: {
          thisMonth: thisMonthRevenue,
          lastMonth: lastMonthRevenue,
          changePercent: revenueChange,
          thisMonthRentalCount: monthlyRentals[0]?.count || 0,
        },
        billing: { pendingBalance: pendingBalance[0]?.total || 0 },
        maintenance: { costThisMonth: maintenanceCostThisMonth[0]?.total || 0 },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/reports/revenue?months=6 — monthly revenue trend (Admin Only)
router.get('/revenue', protect, restrictTo('admin'), async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 6;
    const result = await Rental.aggregate([
      {
        $match: {
          status: { $in: ['active', 'completed'] },
          createdAt: {
            $gte: new Date(new Date().setMonth(new Date().getMonth() - months)),
          },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          revenue: { $sum: '$totalRent' },
          rentalCount: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/reports/utilization — per-machine utilization (Admin Only)
router.get('/utilization', protect, restrictTo('admin'), async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    const machines = await Machine.find();
    const utilizationData = await Promise.all(
      machines.map(async (m) => {
        const rentals = await Rental.find({
          machine: m._id,
          status: { $in: ['active', 'completed'] },
          startDate: { $lte: now },
          endDate: { $gte: startOfMonth },
        });
        const rentedDays = rentals.reduce((acc, r) => acc + (r.totalDays || 0), 0);
        return {
          machine: { id: m._id, name: m.name, status: m.status },
          rentedDays: Math.min(rentedDays, daysInMonth),
          totalDays: daysInMonth,
          utilizationPercent: Math.min(
            Math.round((rentedDays / daysInMonth) * 100),
            100
          ),
        };
      })
    );

    res.json({ success: true, data: utilizationData });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;