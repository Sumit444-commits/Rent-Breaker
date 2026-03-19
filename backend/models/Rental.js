import mongoose from 'mongoose';

const rentalSchema = new mongoose.Schema(
  {
    machine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Machine',
      required: [true, 'Machine is required'],
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer is required'],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    totalDays: {
      type: Number,
    },
    totalRent: {
      type: Number,
    },
    advancePayment: {
      type: Number,
      default: 0,
    },
    remainingBalance: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'completed', 'overdue'],
      default: 'pending',
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

// Auto-calculate totalDays, totalRent, and remainingBalance before save
rentalSchema.pre('save', async function (next) {
  if (this.startDate && this.endDate) {
    const msPerDay = 1000 * 60 * 60 * 24;
    this.totalDays = Math.ceil((this.endDate - this.startDate) / msPerDay);

    const Machine = mongoose.model('Machine');
    const machine = await Machine.findById(this.machine);
    if (machine) {
      this.totalRent = this.totalDays * machine.rentalPricePerDay;
      this.remainingBalance = this.totalRent - (this.advancePayment || 0);
    }
  }
  next();
});

export default mongoose.model('Rental', rentalSchema);