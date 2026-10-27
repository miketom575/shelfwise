const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');

const DEFAULT_URI = 'mongodb://127.0.0.1:27017/library_management';
const onServer = () => process.env.NODE_ENV === 'production' || !!process.env.VERCEL;

// Reuse one connection per process. On Vercel a warm function instance keeps it between requests.
let connecting = null;

/** Connects to MongoDB. Pass a URI to override (the tests use an in-memory server). Safe to call many times. */
async function connectDB(uri) {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (connecting) return connecting;

  const target = uri || process.env.MONGODB_URI || (onServer() ? '' : DEFAULT_URI);
  if (!target) {
    throw new Error('MONGODB_URI is not set. Add your MongoDB Atlas connection string in Vercel: Project Settings > Environment Variables.');
  }

  connecting = mongoose
    .connect(target, { serverSelectionTimeoutMS: 8000, connectTimeoutMS: 8000, maxPoolSize: onServer() ? 5 : 10 })
    .then(() => {
      if (process.env.NODE_ENV !== 'test') console.log(`MongoDB connected: ${mongoose.connection.name}`);
      return mongoose.connection;
    })
    .catch((err) => {
      connecting = null; // let the next request try again
      throw err;
    });
  return connecting;
}

const disconnectDB = async () => {
  connecting = null;
  await mongoose.disconnect();
};

module.exports = { mongoose, connectDB, disconnectDB, DEFAULT_URI };
