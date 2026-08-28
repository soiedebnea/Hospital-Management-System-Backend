// seed.js
// Inserts sample patients, doctors, an appointment, and a medical record
// if the database is empty, so the app is immediately usable. Runs
// automatically on server startup, and can also be run standalone with
// `npm run seed`.

const Patient = require('./models/Patient');
const Doctor = require('./models/Doctor');
const Appointment = require('./models/Appointment');
const MedicalRecord = require('./models/MedicalRecord');

async function seed() {
  const patientCount = await Patient.countDocuments();
  if (patientCount > 0) {
    console.log('Database already has data, skipping seed.');
    return;
  }

  console.log('Seeding sample data...');

  const doctors = await Doctor.insertMany([
    { name: 'Dr. Amina Rahman', specialization: 'Cardiology', department: 'Cardiac Care', phone: '01711000001', email: 'amina.rahman@hospital.com' },
    { name: 'Dr. Farhan Kabir', specialization: 'Orthopedics', department: 'Orthopedic Surgery', phone: '01711000002', email: 'farhan.kabir@hospital.com' },
    { name: 'Dr. Nusrat Jahan', specialization: 'Pediatrics', department: 'Child Health', phone: '01711000003', email: 'nusrat.jahan@hospital.com' },
  ]);

  const patients = await Patient.insertMany([
    { name: 'Karim Hossain', age: 34, gender: 'Male', phone: '01911000001', email: 'karim@example.com', address: 'Savar, Dhaka', blood_group: 'B+' },
    { name: 'Fatima Begum', age: 27, gender: 'Female', phone: '01911000002', email: 'fatima@example.com', address: 'Mirpur, Dhaka', blood_group: 'O+' },
    { name: 'Rakibul Islam', age: 45, gender: 'Male', phone: '01911000003', email: 'rakibul@example.com', address: 'Gazipur', blood_group: 'A-' },
  ]);

  const fmt = (d) => d.toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000);
  const dayAfter = new Date(Date.now() + 2 * 86400000);
  const yesterday = new Date(Date.now() - 86400000);

  await Appointment.insertMany([
    { patient: patients[0]._id, doctor: doctors[0]._id, appointment_date: fmt(tomorrow), appointment_time: '10:00', reason: 'Chest pain follow-up', status: 'Scheduled' },
    { patient: patients[1]._id, doctor: doctors[2]._id, appointment_date: fmt(dayAfter), appointment_time: '11:30', reason: 'Routine child checkup', status: 'Scheduled' },
    { patient: patients[2]._id, doctor: doctors[1]._id, appointment_date: fmt(yesterday), appointment_time: '09:15', reason: 'Knee pain', status: 'Completed' },
  ]);

  await MedicalRecord.insertMany([
    { patient: patients[2]._id, doctor: doctors[1]._id, visit_date: fmt(yesterday), diagnosis: 'Mild knee osteoarthritis', prescription: 'Ibuprofen 400mg twice daily for 5 days', notes: 'Recommend physiotherapy and weight management.' },
  ]);

  console.log('Seed complete.');
}

module.exports = seed;

// Allow running directly: `node seed.js` or `npm run seed`
if (require.main === module) {
  const connectDB = require('./db');
  connectDB()
    .then(seed)
    .then(() => process.exit(0))
    .catch((err) => { console.error(err); process.exit(1); });
}