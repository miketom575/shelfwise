/**
 * First-run seeding. If the database has no users and no books at all, load the demo data so a freshly
 * deployed site is never empty (no `npm run seed` needed).
 *
 *  - Safe with several serverless instances starting at once: a unique "lock" document means only one wins.
 *  - Never touches a database that already has data, and never re-seeds after the lock exists
 *    (so deleting every book later will not bring the demo books back).
 *  - Turn it off with AUTO_SEED=false.
 */
const mongoose = require('mongoose');
const User = require('../models/User');
const Book = require('../models/Book');
const Borrowing = require('../models/BorrowingRecord');
const { insertDemoData, topUpCatalog, MIN_BOOKS } = require('./data');

async function ensureSeeded() {
  if (String(process.env.AUTO_SEED || 'true').toLowerCase() === 'false') return { seeded: false, reason: 'disabled' };

  // Build the unique indexes first so concurrent seeders cannot create duplicates.
  await Promise.all([User.init(), Book.init(), Borrowing.init()]);

  const [users, books] = await Promise.all([User.estimatedDocumentCount(), Book.estimatedDocumentCount()]);
  const meta = mongoose.connection.collection('lms_meta');

  if (users > 0 || books > 0) {
    // Existing database with fewer than MIN_BOOKS titles: add the extra sample books once.
    if (books < MIN_BOOKS) {
      try {
        await meta.insertOne({ _id: 'catalog-top-up', at: new Date() });
        const added = await topUpCatalog();
        if (added) console.log(`Catalog top-up: added ${added} sample books.`);
        return { seeded: false, reason: 'has-data', added };
      } catch (err) {
        if (err.code !== 11000) throw err;
      }
    }
    return { seeded: false, reason: 'has-data' };
  }

  try {
    await meta.insertOne({ _id: 'demo-seed', startedAt: new Date() });
  } catch (err) {
    if (err.code === 11000) return { seeded: false, reason: 'another-instance' };
    throw err;
  }
  try {
    const counts = await insertDemoData();
    console.log(`First run: loaded demo data (${counts.users} users, ${counts.books} books, ${counts.loans} loans).`);
    return { seeded: true, ...counts };
  } catch (err) {
    // Roll back so the next start can try again from a clean slate.
    await Promise.all([User.deleteMany({}), Book.deleteMany({}), Borrowing.deleteMany({}), meta.deleteOne({ _id: 'demo-seed' })]).catch(() => {});
    throw err;
  }
}

module.exports = { ensureSeeded };
