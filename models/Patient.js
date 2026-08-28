// models/Patient.js
const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    age: { type: Number, default: null },
    gender: { type: String, enum: ['Male', 'Female', 'Other', null], default: null },
    phone: { type: String, default: null, trim: true },
    email: { type: String, default: null, trim: true, lowercase: true },
    address: { type: String, default: null, trim: true },
    blood_group: { type: String, default: null, trim: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Lets the frontend keep using search across name/phone/email
patientSchema.index({ name: 'text', phone: 'text', email: 'text' });

module.exports = mongoose.model('Patient', patientSchema);