# Hospital Management System — Backend (MongoDB edition)

Node.js + Express REST API backed by **MongoDB** (via Mongoose). Handles
patients, doctors, appointments, medical records, and file management
(uploading/downloading documents like lab reports and prescriptions).

## Prerequisites

You need a MongoDB server to connect to — this project does not bundle
one. Pick one:

- **Local MongoDB**: install MongoDB Community Server for your OS from
  https://www.mongodb.com/try/download/community and run `mongod`.
- **MongoDB Atlas** (free hosted tier): create a cluster at
  https://www.mongodb.com/cloud/atlas and copy its connection string.

## Setup

```bash
cd backend
npm install
```

Edit `.env` and set `MONGODB_URI`:

```
# Local MongoDB (default):
MONGODB_URI=mongodb://127.0.0.1:27017/hospital_management

# Or MongoDB Atlas:
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/hospital_management
```

Then start the API:

```bash
npm start
```

The API listens on **http://localhost:5000**. On first run (when the
`patients` collection is empty) it automatically seeds a few sample
patients, doctors, appointments, and one medical record. You can also
run the seed manually at any time with `npm run seed`. Uploaded files
are stored in `uploads/`.

## Project structure

```
backend/
├── server.js             # App entry point: connects to MongoDB, seeds data, mounts routes
├── db.js                 # Mongoose connection setup
├── seed.js                # Sample-data seeding (auto-run on startup, or `npm run seed`)
├── models/
│   ├── Patient.js
│   ├── Doctor.js
│   ├── Appointment.js     # References Patient and Doctor by ObjectId
│   ├── MedicalRecord.js   # References Patient and (optionally) Doctor
│   └── File.js             # File metadata; references Patient and (optionally) MedicalRecord
├── routes/
│   ├── patients.js        # /api/patients        (CRUD)
│   ├── doctors.js         # /api/doctors         (CRUD)
│   ├── appointments.js    # /api/appointments     (CRUD, populated with patient/doctor names)
│   ├── records.js         # /api/records          (CRUD, medical records)
│   └── files.js            # /api/files            (upload, list, download, delete)
├── uploads/                # Uploaded documents are stored here (binaries live on disk, not in MongoDB)
├── package.json
└── .env
```

## API reference

Identical to before, but every `:id` is now a MongoDB ObjectId string
rather than an integer.

| Method | Endpoint                          | Description                               |
|--------|------------------------------------|--------------------------------------------|
| GET    | /api/health                        | Health check                              |
| GET    | /api/dashboard/summary             | Counts used by the frontend's header      |
| GET    | /api/patients?search=              | List / search patients                    |
| GET    | /api/patients/:id                  | Get one patient                           |
| POST   | /api/patients                      | Create a patient                          |
| PUT    | /api/patients/:id                  | Update a patient                          |
| DELETE | /api/patients/:id                  | Delete a patient (cascades appointments, records, files) |
| GET    | /api/doctors?search=                | List / search doctors                     |
| POST/PUT/DELETE /api/doctors(/:id)  | Same CRUD pattern as patients (deleting cascades their appointments, and detaches — doesn't delete — their medical records) |
| GET    | /api/appointments?patient_id=&doctor_id=&status=&date= | List / filter appointments |
| POST/PUT/DELETE /api/appointments(/:id) | Book, reschedule/update status, cancel/delete |
| GET    | /api/records?patient_id=            | List medical records (optionally by patient) |
| POST/PUT/DELETE /api/records(/:id)  | File, update, or delete a medical record  |
| GET    | /api/files?patient_id=&record_id=   | List uploaded files                       |
| POST   | /api/files/upload                   | Upload a file (multipart: `file`, `patient_id`, optional `record_id`) |
| GET    | /api/files/download/:id             | Download a file                           |
| DELETE | /api/files/:id                      | Delete a file (removes the MongoDB document and the file on disk) |

Allowed upload types: PDF, PNG/JPEG/WEBP images, Word documents, and plain
text, up to 10 MB (configurable in `.env`). Response JSON is shaped the
same as the SQLite version (`id`, `patient_id`, `patient_name`, etc.) so
the existing frontend works with this backend without any changes.

## A note on testing

This code was syntax-checked, and every model/route was loaded into a
live Express app to confirm nothing throws at require-time. I wasn't
able to run it against a live MongoDB instance in the environment I
built it in (no internet access to a Mongo server there), so please do
a quick smoke test — create a patient, book an appointment, upload a
file — once you have it running against your own MongoDB, and let me
know if anything misbehaves.
