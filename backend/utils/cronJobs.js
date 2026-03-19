const cron = require('node-cron');
const Rental = require('../models/Rental');

const startCronJobs = () => {
  // This cron expression '0 0 * * *' means: Run every day at 00:00 (Midnight)
  cron.schedule('0 0 * * *', async () => {
    console.log('⏳ Running Overdue Rental Checker...');
    try {
      const now = new Date();
      
      // Find rentals that are 'active' but their endDate is in the past
      const result = await Rental.updateMany(
        {
          status: 'active',
          endDate: { $lt: now }
        },
        {
          $set: { status: 'overdue' }
        }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`✅ Updated ${result.modifiedCount} rentals to overdue.`);
      } else {
        console.log('✅ No overdue rentals found today.');
      }
    } catch (error) {
      console.error('❌ Error updating overdue rentals:', error);
    }
  });
};

module.exports = startCronJobs;