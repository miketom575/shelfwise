/**
 * Vercel serverless entry point: every /api/* request lands here.
 * The database connection is created once per warm function instance and reused.
 */
const { connectDB } = require('lms-database');
const app = require('../backend/src/app');

let ready = null;

module.exports = async (req, res) => {
  try {
    ready = ready || connectDB();
    await ready;
  } catch (err) {
    ready = null; // try again on the next request
    console.error('MongoDB connection failed:', err.message);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ message: 'The database is unavailable right now. Try again in a moment.' }));
  }
  return app(req, res);
};
