import mongoose from "mongoose";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

import startCronJobs from "./utils/cronJobs.js";
import authRoutes from "./routes/auth.js";
import machineRoutes from "./routes/machines.js";
import customerRoutes from "./routes/customers.js";
import rentalRoutes from "./routes/rentals.js";
import maintenanceRoutes from "./routes/maintenance.js";
import reportRoutes from "./routes/reports.js";

const app = express();

// ✅ Fixed CORS
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ⚠️ Optional: disable cron in serverless
if (process.env.NODE_ENV !== "production") {
  startCronJobs();
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/machines', machineRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/reports', reportRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Rent Breaker API is running' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ✅ Connect DB (NO app.listen)
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB error:", err));

export default app;