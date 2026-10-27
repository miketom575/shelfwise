/* Resets the database and loads the demo data. Usage:  npm run seed   (from the project root; wipes users, books and loans first)
 * You normally do NOT need this: the app seeds an empty database by itself on first start (see seed/autoSeed.js). */
const { connectDB, disconnectDB } = require('../connection');
const User = require('../models/User');
const Book = require('../models/Book');
const Borrowing = require('../models/BorrowingRecord');
const { insertDemoData } = require('./data');

(async () => {
  await connectDB();
  console.log('Resetting collections…');
  await Promise.all([User.deleteMany({}), Book.deleteMany({}), Borrowing.deleteMany({})]);
  await Promise.all([User.syncIndexes(), Book.syncIndexes(), Borrowing.syncIndexes()]);

  const n = await insertDemoData();
  console.log(`Seeded ${n.users} users, ${n.books} books, ${n.loans} loans.\n`);
  console.log('Demo accounts');
  console.log('  Admin : admin@library.test  / Admin@12345');
  console.log('  User  : reader@library.test / Reader@12345\n');
  await disconnectDB();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
