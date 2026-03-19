const mongoose = require('mongoose');

const maintenanceSchema = new mongoose.Schema(
  {
    machine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Machine',
      required: [true, 'Machine is required'],
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      default: Date.now,
    },
    issue: {
      type: String,
      required: [true, 'Issue description is required'],
      trim: true,
    },
    cost: {
      type: Number,
      required: [true, 'Cost is required'],
      min: 0,
    },
    nextMaintenanceDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['in-progress', 'completed'],
      default: 'in-progress',
    },
    notes: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Maintenance', maintenanceSchema);
