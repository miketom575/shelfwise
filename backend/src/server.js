const config = require('./config/env');
const { connectDB, disconnectDB, syncIndexes, ensureSeeded } = require('lms-database');
const app = require('./app');

async function start() {
  try {
    await connectDB();
  } catch (err) {
    console.error('\nCould not connect to MongoDB.');
    console.error(`  Reason: ${err.message}`);
    console.error('  Start MongoDB locally (mongod), or set MONGODB_URI in database/.env to a MongoDB Atlas string.\n');
    process.exit(1);
  }
  await syncIndexes(); // make sure the partial unique indexes exist
  try { await ensureSeeded(); } catch (err) { console.error('Automatic seeding failed:', err.message); } // empty database -> demo data
  const server = app.listen(config.port, () => console.log(`API ready on http://localhost:${config.port}`));
  const shutdown = () => server.close(() => disconnectDB().then(() => process.exit(0)));
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
start();
