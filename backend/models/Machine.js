const mongoose = require('mongoose');

const machineSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Machine name is required'],
      trim: true,
    },
    capacity: {
      type: String,
      required: [true, 'Capacity is required'],
      trim: true,
    },
    rentalPricePerDay: {
      type: Number,
      required: [true, 'Rental price per day is required'],
      min: 0,
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['available', 'rented', 'maintenance'],
      default: 'available',
    },
    description: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Machine', machineSchema);
