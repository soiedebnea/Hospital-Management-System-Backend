// models/MedicalRecord.js
const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', default: null },
    visit_date: { type: String, required: true }, // stored as 'YYYY-MM-DD'
    diagnosis: { type: String, default: null, trim: true },
    prescription: { type: String, default: null, trim: true },
    notes: { type: String, default: null, trim: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);