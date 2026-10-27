const { Book, BorrowingRecord: Borrowing } = require('lms-database');
const config = require('../config/env');
const AppError = require('../utils/AppError');
const { startOfToday, addDays } = require('../utils/helpers');

/**
 * Borrowing rules (proposal section III.C):
 *  1. Check  – signed in, book exists, availableCopies > 0, user is eligible
 *  2. Borrow – reserve a copy ATOMICALLY, then create the loan (roll back on failure)
 *  4. Return – close an active loan exactly once and restore exactly one copy
 *
 * MongoDB multi-document transactions need a replica set, which a default local install is not.
 * Instead we use single-document atomic operators plus compensating rollback, which is safe
 * on standalone servers and still prevents negative stock under concurrent requests.
 */

async function getEligibility(user, book) {
  if (!user) return { canBorrow: false, code: 'AUTH', reason: 'Sign in to borrow this book.' };
  if (user.role === 'admin' && !config.adminCanBorrow) {
    return { canBorrow: false, code: 'ADMIN', reason: 'Admin accounts manage loans from the workspace.' };
  }
  if (book.isArchived) return { canBorrow: false, code: 'ARCHIVED', reason: 'This book has been archived and cannot be borrowed.' };

  const active = await Borrowing.find({ userId: user._id, status: 'borrowed' }).select('bookId dueDate');
  if (active.some((l) => String(l.bookId) === String(book._id))) {
    return { canBorrow: false, code: 'HAS_COPY', reason: 'You already have this book on loan.' };
  }
  if (active.some((l) => l.dueDate < startOfToday())) {
    return { canBorrow: false, code: 'OVERDUE', reason: 'Return your overdue books before borrowing again.' };
  }
  if (active.length >= config.maxActiveLoans) {
    return { canBorrow: false, code: 'LIMIT', reason: `You have reached the limit of ${config.maxActiveLoans} active loans.` };
  }
  if (book.availableCopies <= 0) {
    const n = book.totalCopies;
    return { canBorrow: false, code: 'NO_COPIES', reason: `All ${n} ${n === 1 ? 'copy is' : 'copies are'} on loan right now.` };
  }
  return { canBorrow: true, code: 'OK', reason: null };
}

/**
 * Adds `nextAvailableDate` (earliest due date among the active loans) to every book that is fully on loan.
 * The shelves and the book page use it for the "back in ..." countdowns.
 */
async function withNextAvailable(input) {
  const list = Array.isArray(input) ? input : [input];
  const out = list.filter((b) => b.availableCopies <= 0).map((b) => b._id);
  let next = {};
  if (out.length) {
    const rows = await Borrowing.aggregate([
      { $match: { status: 'borrowed', bookId: { $in: out } } },
      { $group: { _id: '$bookId', next: { $min: '$dueDate' } } },
    ]);
    next = Object.fromEntries(rows.map((r) => [String(r._id), r.next]));
  }
  const plain = list.map((b) => ({ ...b.toJSON(), nextAvailableDate: next[String(b._id)] || null }));
  return Array.isArray(input) ? plain : plain[0];
}

async function borrowBook(user, bookId) {
  const book = await Book.findById(bookId);
  if (!book) throw new AppError('Book not found.', 404);

  const eligibility = await getEligibility(user, book);
  if (!eligibility.canBorrow) throw new AppError(eligibility.reason, 409);

  // Atomic reservation: only succeeds while a copy is still available.
  const reserved = await Book.findOneAndUpdate(
    { _id: book._id, isArchived: false, availableCopies: { $gt: 0 } },
    { $inc: { availableCopies: -1 } },
    { new: true }
  );
  if (!reserved) throw new AppError('Someone just borrowed the last copy. Check back soon.', 409);

  try {
    const borrowDate = new Date(); // server-generated, never trusted from the client
    const loan = await Borrowing.create({
      userId: user._id, // from the session, never from the request body
      bookId: book._id,
      borrowDate,
      dueDate: addDays(borrowDate, config.loanDays),
    });
    return { loan, book: reserved };
  } catch (err) {
    // Compensating rollback so inventory never drifts
    await Book.updateOne({ _id: book._id, $expr: { $lt: ['$availableCopies', '$totalCopies'] } }, { $inc: { availableCopies: 1 } });
    if (err.code === 11000) throw new AppError('You already have this book on loan.', 409);
    throw err;
  }
}

async function returnLoan(loanId, adminUser) {
  // Flip status only if still active -> a repeat/double return can never match twice.
  const loan = await Borrowing.findOneAndUpdate(
    { _id: loanId, status: 'borrowed' },
    { $set: { status: 'returned', returnDate: new Date(), returnedBy: adminUser._id } },
    { new: true }
  );
  if (!loan) {
    const exists = await Borrowing.exists({ _id: loanId });
    throw exists ? new AppError('This loan has already been returned.', 409) : new AppError('Loan not found.', 404);
  }
  // Restore one copy, but never above totalCopies.
  const book = await Book.findOneAndUpdate(
    { _id: loan.bookId, $expr: { $lt: ['$availableCopies', '$totalCopies'] } },
    { $inc: { availableCopies: 1 } },
    { new: true }
  );
  return { loan, book: book || (await Book.findById(loan.bookId)) };
}

module.exports = { getEligibility, withNextAvailable, borrowBook, returnLoan };
