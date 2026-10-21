const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');

const DEFAULT_URI = 'mongodb://127.0.0.1:27017/library_management';

/** Connects to MongoDB. Pass a URI to override (the tests use an in-memory server). */
async function connectDB(uri) {
  const target = uri || process.env.MONGODB_URI || DEFAULT_URI;
  await mongoose.connect(target, { serverSelectionTimeoutMS: 8000, maxPoolSize: 10 });
  if (process.env.NODE_ENV !== 'test') console.log(`MongoDB connected: ${mongoose.connection.name}`);
  return mongoose.connection;
}

const disconnectDB = () => mongoose.disconnect();

module.exports = { mongoose, connectDB, disconnectDB, DEFAULT_URI };
