// routes/appointments.js
// CRUD endpoints for appointments. Populates patient/doctor so the
// response includes readable names, and serializes to the same flat
// shape the frontend already expects (id, patient_id, patient_name, ...).

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function serialize(appt) {
  const obj = appt.toObject();
  return {
    id: obj._id,
    patient_id: obj.patient?._id || obj.patient,
    doctor_id: obj.doctor?._id || obj.doctor,
    patient_name: obj.patient?.name || null,
    doctor_name: obj.doctor?.name || null,
    specialization: obj.doctor?.specialization || null,
    appointment_date: obj.appointment_date,
    appointment_time: obj.appointment_time,
    reason: obj.reason,
    status: obj.status,
    created_at: obj.created_at,
  };
}

// GET all appointments (optional ?patient_id=, ?doctor_id=, ?status=, ?date=)
router.get('/', async (req, res) => {
  try {
    const { patient_id, doctor_id, status, date } = req.query;
    const query = {};
    if (patient_id && isValidId(patient_id)) query.patient = patient_id;
    if (doctor_id && isValidId(doctor_id)) query.doctor = doctor_id;
    if (status) query.status = status;
    if (date) query.appointment_date = date;

    const appointments = await Appointment.find(query)
      .populate('patient', 'name')
      .populate('doctor', 'name specialization')
      .sort({ appointment_date: -1, appointment_time: -1 });

    res.json(appointments.map(serialize));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET one appointment
router.get('/:id', async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(404).json({ error: 'Appointment not found' });
    const appt = await Appointment.findById(req.params.id).populate('patient', 'name').populate('doctor', 'name specialization');
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });
    res.json(serialize(appt));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create a new appointment
router.post('/', async (req, res) => {
  try {
    const { patient_id, doctor_id, appointment_date, appointment_time, reason, status } = req.body;
    if (!patient_id || !doctor_id || !appointment_date || !appointment_time) {
      return res.status(400).json({ error: 'patient_id, doctor_id, appointment_date and appointment_time are required' });
    }
    let appt = await Appointment.create({
      patient: patient_id,
      doctor: doctor_id,
      appointment_date,
      appointment_time,
      reason,
      status: status || 'Scheduled',
    });
    appt = await appt.populate([{ path: 'patient', select: 'name' }, { path: 'doctor', select: 'name specialization' }]);
    res.status(201).json(serialize(appt));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update an appointment (e.g. reschedule or change status)
router.put('/:id', async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(404).json({ error: 'Appointment not found' });
    const { patient_id, doctor_id, appointment_date, appointment_time, reason, status } = req.body;
    const appt = await Appointment.findByIdAndUpdate(
      req.params.id,
      { patient: patient_id, doctor: doctor_id, appointment_date, appointment_time, reason, status: status || 'Scheduled' },
      { new: true, runValidators: true }
    ).populate('patient', 'name').populate('doctor', 'name specialization');
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });
    res.json(serialize(appt));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE an appointment
router.delete('/:id', async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(404).json({ error: 'Appointment not found' });
    const appt = await Appointment.findByIdAndDelete(req.params.id);
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });
    res.json({ message: 'Appointment deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;