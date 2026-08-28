// models/File.js
// Stores metadata for uploaded documents (lab reports, scans,
// prescriptions). The binary itself lives on disk in uploads/;
// this collection just tracks it and links it to a patient / record.
const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    record: { type: mongoose.Schema.Types.ObjectId, ref: 'MedicalRecord', default: null },
    original_name: { type: String, required: true },
    stored_name: { type: String, required: true },
    mimetype: { type: String, default: null },
    size: { type: Number, default: null },
  },
  { timestamps: { createdAt: 'uploaded_at', updatedAt: false } }
);

module.exports = mongoose.model('File', fileSchema);