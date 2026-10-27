/**
 * Public entry point of the database layer.
 * The backend imports everything it needs from here:
 *   const { connectDB, User, Book, BorrowingRecord } = require('lms-database');
 * The backend never imports mongoose directly, so there is only ever one Mongoose instance.
 */
const { mongoose, connectDB, disconnectDB } = require('./connection');
const User = require('./models/User');
const Book = require('./models/Book');
const BorrowingRecord = require('./models/BorrowingRecord');
const { ensureSeeded } = require('./seed/autoSeed');

/** Make sure every index (including the partial unique ones) exists. */
const syncIndexes = () => Promise.all([User.syncIndexes(), Book.syncIndexes(), BorrowingRecord.syncIndexes()]);

module.exports = { mongoose, connectDB, disconnectDB, syncIndexes, ensureSeeded, User, Book, BorrowingRecord };
