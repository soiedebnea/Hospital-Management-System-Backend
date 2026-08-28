// routes/patients.js
// CRUD endpoints for patients: GET /api/patients, GET /api/patients/:id,
// POST /api/patients, PUT /api/patients/:id, DELETE /api/patients/:id
// Deleting a patient cascades to their appointments, medical records,
// and uploaded files (including the files on disk).

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const MedicalRecord = require('../models/MedicalRecord');
const FileModel = require('../models/File');

const UPLOAD_DIR = path.resolve(__dirname, '..', process.env.UPLOAD_DIR || './uploads');

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// Mongoose documents serialize with `_id` by default. The frontend
// expects a plain `id` field (like the old SQLite version returned),
// so every response is passed through this serializer.
function serialize(patient) {
  const obj = patient.toObject ? patient.toObject() : patient;
  return {
    id: obj._id,
    name: obj.name,
    age: obj.age,
    gender: obj.gender,
    phone: obj.phone,
    email: obj.email,
    address: obj.address,
    blood_group: obj.blood_group,
    created_at: obj.created_at,
  };
}

// GET all patients (optional ?search=name/phone/email)
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};
    if (search) {
      const re = new RegExp(search, 'i');
      query = { $or: [{ name: re }, { phone: re }, { email: re }] };
    }
    const patients = await Patient.find(query).sort({ created_at: -1 });
    res.json(patients.map(serialize));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET one patient by id
router.get('/:id', async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(404).json({ error: 'Patient not found' });
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    res.json(serialize(patient));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create a new patient
router.post('/', async (req, res) => {
  try {
    const { name, age, gender, phone, email, address, blood_group } = req.body;
    if (!name) return res.status(400).json({ error: 'Patient name is required' });
    const patient = await Patient.create({ name, age, gender, phone, email, address, blood_group });
    res.status(201).json(serialize(patient));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update an existing patient
router.put('/:id', async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(404).json({ error: 'Patient not found' });
    const { name, age, gender, phone, email, address, blood_group } = req.body;
    const patient = await Patient.findByIdAndUpdate(
      req.params.id,
      { name, age, gender, phone, email, address, blood_group },
      { new: true, runValidators: true }
    );
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    res.json(serialize(patient));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE a patient, cascading to appointments, records, and files
router.delete('/:id', async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(404).json({ error: 'Patient not found' });
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const files = await FileModel.find({ patient: patient._id });
    await Promise.all(files.map((f) => fs.promises.unlink(path.join(UPLOAD_DIR, f.stored_name)).catch(() => {})));

    await Promise.all([
      Appointment.deleteMany({ patient: patient._id }),
      MedicalRecord.deleteMany({ patient: patient._id }),
      FileModel.deleteMany({ patient: patient._id }),
      Patient.deleteOne({ _id: patient._id }),
    ]);

    res.json({ message: 'Patient deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;