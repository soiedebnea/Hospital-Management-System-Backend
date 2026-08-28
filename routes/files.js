// routes/files.js
// File management: lets staff upload documents (lab reports, scans,
// prescriptions) and attach them to a patient and, optionally, a
// specific medical record. Binaries are stored on disk; MongoDB stores
// only the metadata (original name, stored name, size, mimetype, links).

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const mongoose = require('mongoose');
const FileModel = require('../models/File');

const UPLOAD_DIR = path.resolve(__dirname, '..', process.env.UPLOAD_DIR || './uploads');
const MAX_FILE_SIZE_MB = Number(process.env.MAX_FILE_SIZE_MB || 10);

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Unsupported file type. Allowed: PDF, images, Word docs, plain text.'));
  },
});

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function serialize(file) {
  const obj = file.toObject ? file.toObject() : file;
  return {
    id: obj._id,
    patient_id: obj.patient,
    record_id: obj.record,
    original_name: obj.original_name,
    stored_name: obj.stored_name,
    mimetype: obj.mimetype,
    size: obj.size,
    uploaded_at: obj.uploaded_at,
  };
}

// GET list files (optional ?patient_id= or ?record_id=)
router.get('/', async (req, res) => {
  try {
    const { patient_id, record_id } = req.query;
    const query = {};
    if (patient_id && isValidId(patient_id)) query.patient = patient_id;
    if (record_id && isValidId(record_id)) query.record = record_id;

    const files = await FileModel.find(query).sort({ uploaded_at: -1 });
    res.json(files.map(serialize));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST upload a new file. Expects multipart/form-data with fields:
// file (the binary), patient_id (required), record_id (optional)
router.post('/upload', (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file was uploaded' });

    const { patient_id, record_id } = req.body;
    if (!patient_id || !isValidId(patient_id)) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: 'A valid patient_id is required' });
    }

    try {
      const file = await FileModel.create({
        patient: patient_id,
        record: record_id && isValidId(record_id) ? record_id : null,
        original_name: req.file.originalname,
        stored_name: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size,
      });
      res.status(201).json(serialize(file));
    } catch (dbErr) {
      fs.unlink(req.file.path, () => {});
      res.status(500).json({ error: dbErr.message });
    }
  });
});

// GET download a file by id
router.get('/download/:id', async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(404).json({ error: 'File not found' });
    const file = await FileModel.findById(req.params.id);
    if (!file) return res.status(404).json({ error: 'File not found' });
    const filePath = path.join(UPLOAD_DIR, file.stored_name);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File missing from storage' });
    res.download(filePath, file.original_name);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE a file (removes the MongoDB document and the file on disk)
router.delete('/:id', async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(404).json({ error: 'File not found' });
    const file = await FileModel.findByIdAndDelete(req.params.id);
    if (!file) return res.status(404).json({ error: 'File not found' });
    fs.unlink(path.join(UPLOAD_DIR, file.stored_name), () => {});
    res.json({ message: 'File deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;