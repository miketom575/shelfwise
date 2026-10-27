/**
 * Vercel serverless entry point: every /api/* request lands here.
 * The database connection is created once per warm function instance and reused.
 * On the very first request to an empty database, the demo books and accounts are loaded automatically.
 */
const { connectDB, ensureSeeded } = require('lms-database');
const app = require('../backend/src/app');

let ready = null;

const prepare = async () => {
  await connectDB();
  try {
    await ensureSeeded();
  } catch (err) {
    // A failed seed must not take the whole API down; the next cold start tries again.
    console.error('Automatic seeding failed:', err.message);
  }
};

module.exports = async (req, res) => {
  try {
    ready = ready || prepare();
    await ready;
  } catch (err) {
    ready = null; // try again on the next request
    console.error('MongoDB connection failed:', err.message);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    return res.end(JSON.stringify({
      message: 'The database is unavailable right now. Try again in a moment.',
      hint: /MONGODB_URI is not set/.test(err.message) ? err.message : undefined,
    }));
  }
  return app(req, res);
};
