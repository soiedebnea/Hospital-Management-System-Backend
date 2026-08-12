// db.js
// Establishes the Mongoose connection to MongoDB. Import this once from
// server.js before anything touches the models.

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hospital_management';

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
    console.log(`Connected to MongoDB at ${MONGODB_URI}`);
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    console.error('Make sure MongoDB is running locally, or set MONGODB_URI in .env to an Atlas connection string.');
    process.exit(1);
  }
}

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected.');
});

module.exports = connectDB;