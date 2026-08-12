// server.js
// Entry point for the Hospital Management System API (MongoDB edition).
// Connects to MongoDB, seeds sample data if empty, mounts routes.

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./db');
const seed = require('./seed');

const Patient = require('./models/Patient');
const Doctor = require('./models/Doctor');
const Appointment = require('./models/Appointment');
const MedicalRecord = require('./models/MedicalRecord');

const patientsRouter = require('./routes/patients');
const doctorsRouter = require('./routes/doctors');
const appointmentsRouter = require('./routes/appointments');
const recordsRouter = require('./routes/records');
const filesRouter = require('./routes/files');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple request logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  next();
});

// API routes
app.use('/api/patients', patientsRouter);
app.use('/api/doctors', doctorsRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/records', recordsRouter);
app.use('/api/files', filesRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Hospital Management API is running' });
});

// Dashboard summary (counts used by the frontend's vitals strip)
app.get('/api/dashboard/summary', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const [patients, doctors, todays_appointments, medical_records] = await Promise.all([
      Patient.countDocuments(),
      Doctor.countDocuments(),
      Appointment.countDocuments({ appointment_date: today }),
      MedicalRecord.countDocuments(),
    ]);
    res.json({ patients, doctors, todays_appointments, medical_records });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 404 handler for unknown API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

connectDB()
  .then(seed)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Hospital Management API listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  });