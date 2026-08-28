// routes/doctors.js
// CRUD endpoints for doctors. Deleting a doctor cascades to their
// appointments; medical records keep the reference but it becomes null
// (a record shouldn't disappear just because the doctor left).

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const MedicalRecord = require('../models/MedicalRecord');

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// Mongoose documents serialize with `_id` by default. The frontend
// expects a plain `id` field (like the old SQLite version returned),
// so every response is passed through this serializer.
function serialize(doctor) {
  const obj = doctor.toObject ? doctor.toObject() : doctor;
  return {
    id: obj._id,
    name: obj.name,
    specialization: obj.specialization,
    department: obj.department,
    phone: obj.phone,
    email: obj.email,
    created_at: obj.created_at,
  };
}

// GET all doctors (optional ?search=name/specialization/department)
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};
    if (search) {
      const re = new RegExp(search, 'i');
      query = { $or: [{ name: re }, { specialization: re }, { department: re }] };
    }
    const doctors = await Doctor.find(query).sort({ created_at: -1 });
    res.json(doctors.map(serialize));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET one doctor by id
router.get('/:id', async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(404).json({ error: 'Doctor not found' });
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
    res.json(serialize(doctor));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create a new doctor
router.post('/', async (req, res) => {
  try {
    const { name, specialization, department, phone, email } = req.body;
    if (!name) return res.status(400).json({ error: 'Doctor name is required' });
    const doctor = await Doctor.create({ name, specialization, department, phone, email });
    res.status(201).json(serialize(doctor));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update an existing doctor
router.put('/:id', async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(404).json({ error: 'Doctor not found' });
    const { name, specialization, department, phone, email } = req.body;
    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      { name, specialization, department, phone, email },
      { new: true, runValidators: true }
    );
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
    res.json(serialize(doctor));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE a doctor, cascading to their appointments and detaching records
router.delete('/:id', async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(404).json({ error: 'Doctor not found' });
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

    await Promise.all([
      Appointment.deleteMany({ doctor: doctor._id }),
      MedicalRecord.updateMany({ doctor: doctor._id }, { doctor: null }),
      Doctor.deleteOne({ _id: doctor._id }),
    ]);

    res.json({ message: 'Doctor deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;