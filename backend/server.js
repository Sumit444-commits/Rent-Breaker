import mongoose from "mongoose";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// 1. Load environment variables FIRST
dotenv.config();

// 2. Import utilities and routes (Must include .js extensions)
import startCronJobs from "./utils/cronJobs.js";
import authRoutes from "./routes/auth.js";
import machineRoutes from "./routes/machines.js";
import customerRoutes from "./routes/customers.js";
import rentalRoutes from "./routes/rentals.js";
import maintenanceRoutes from "./routes/maintenance.js";
import reportRoutes from "./routes/reports.js";

const app = express();

// 3. Middleware
app.use(cors(
  {origin:["https://rent-breaker.vercel.app", "http://localhost:5173",process.env.CLIENT_URL],
    credentials:true
  }
));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 4. Start background jobs
startCronJobs();

// 5. Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/machines', machineRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/reports', reportRoutes);

// 6. Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Rent Breaker API is running' });
});

// 7. Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// 8. 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// 9. Connect to MongoDB then start server
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

export default app;