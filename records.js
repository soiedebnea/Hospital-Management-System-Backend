// routes/records.js
// CRUD endpoints for medical records. Each record belongs to a patient
// and optionally a doctor, and may have file attachments (see files.js).

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const MedicalRecord = require('../models/MedicalRecord');
const FileModel = require('../models/File');

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function serialize(record) {
  const obj = record.toObject();
  return {
    id: obj._id,
    patient_id: obj.patient?._id || obj.patient,
    doctor_id: obj.doctor?._id || obj.doctor,
    patient_name: obj.patient?.name || null,
    doctor_name: obj.doctor?.name || null,
    visit_date: obj.visit_date,
    diagnosis: obj.diagnosis,
    prescription: obj.prescription,
    notes: obj.notes,
    created_at: obj.created_at,
  };
}

// GET all medical records (optional ?patient_id=)
router.get('/', async (req, res) => {
  try {
    const { patient_id } = req.query;
    const query = {};
    if (patient_id && isValidId(patient_id)) query.patient = patient_id;

    const records = await MedicalRecord.find(query)
      .populate('patient', 'name')
      .populate('doctor', 'name')
      .sort({ visit_date: -1 });

    res.json(records.map(serialize));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET one medical record, including its attached files
router.get('/:id', async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(404).json({ error: 'Medical record not found' });
    const record = await MedicalRecord.findById(req.params.id).populate('patient', 'name').populate('doctor', 'name');
    if (!record) return res.status(404).json({ error: 'Medical record not found' });
    const files = await FileModel.find({ record: record._id });
    const filesSerialized = files.map((f) => ({
      id: f._id,
      patient_id: f.patient,
      record_id: f.record,
      original_name: f.original_name,
      stored_name: f.stored_name,
      mimetype: f.mimetype,
      size: f.size,
      uploaded_at: f.uploaded_at,
    }));
    res.json({ ...serialize(record), files: filesSerialized });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create a new medical record
router.post('/', async (req, res) => {
  try {
    const { patient_id, doctor_id, visit_date, diagnosis, prescription, notes } = req.body;
    if (!patient_id || !visit_date) {
      return res.status(400).json({ error: 'patient_id and visit_date are required' });
    }
    let record = await MedicalRecord.create({ patient: patient_id, doctor: doctor_id || null, visit_date, diagnosis, prescription, notes });
    record = await record.populate([{ path: 'patient', select: 'name' }, { path: 'doctor', select: 'name' }]);
    res.status(201).json(serialize(record));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update a medical record
router.put('/:id', async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(404).json({ error: 'Medical record not found' });
    const { patient_id, doctor_id, visit_date, diagnosis, prescription, notes } = req.body;
    const record = await MedicalRecord.findByIdAndUpdate(
      req.params.id,
      { patient: patient_id, doctor: doctor_id || null, visit_date, diagnosis, prescription, notes },
      { new: true, runValidators: true }
    ).populate('patient', 'name').populate('doctor', 'name');
    if (!record) return res.status(404).json({ error: 'Medical record not found' });
    res.json(serialize(record));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE a medical record (does not delete attached files; unlink them via the files route if desired)
router.delete('/:id', async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(404).json({ error: 'Medical record not found' });
    const record = await MedicalRecord.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ error: 'Medical record not found' });
    await FileModel.updateMany({ record: record._id }, { record: null });
    res.json({ message: 'Medical record deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;