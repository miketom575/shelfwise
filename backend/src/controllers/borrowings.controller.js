const { BorrowingRecord: Borrowing, Book, User } = require('lms-database');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { borrowBook, returnLoan } = require('../services/loanService');
const { str, escapeRegex, paginate, pageMeta, startOfToday, csvCell } = require('../utils/helpers');

const POPULATE = [
  { path: 'userId', select: 'name email' },
  { path: 'bookId', select: 'title author category isbn' },
];

async function buildFilter(req, { ignoreStatus = false } = {}) {
  const isAdmin = req.user.role === 'admin';
  const filter = {};
  const requested = str(req.query.userId);

  if (!isAdmin) {
    // T10: never let a regular user read someone else's history
    if (requested && requested !== String(req.user._id)) throw new AppError('You can only view your own borrowing history.', 403);
    filter.userId = req.user._id;
  } else if (requested) {
    filter.userId = requested;
  }

  const status = str(req.query.status);
  if (!ignoreStatus) {
    if (status === 'borrowed') filter.status = 'borrowed';
    if (status === 'returned') filter.status = 'returned';
    if (status === 'overdue') Object.assign(filter, { status: 'borrowed', dueDate: { $lt: startOfToday() } });
  }

  const q = str(req.query.q).slice(0, 100);
  if (isAdmin && q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    const [users, books] = await Promise.all([
      User.find({ $or: [{ name: rx }, { email: rx }] }).select('_id').limit(200),
      Book.find({ $or: [{ title: rx }, { author: rx }] }).select('_id').limit(200),
    ]);
    filter.$or = [{ userId: { $in: users.map((u) => u._id) } }, { bookId: { $in: books.map((b) => b._id) } }];
  }
  return filter;
}

exports.list = asyncHandler(async (req, res) => {
  const pg = paginate(req.query, 10, 50);
  const filter = await buildFilter(req);
  const scope = await buildFilter(req, { ignoreStatus: true });

  const [data, total, all, active, overdue] = await Promise.all([
    Borrowing.find(filter).sort({ borrowDate: -1 }).skip(pg.skip).limit(pg.limit).populate(POPULATE),
    Borrowing.countDocuments(filter),
    Borrowing.countDocuments(scope),
    Borrowing.countDocuments({ ...scope, status: 'borrowed' }),
    Borrowing.countDocuments({ ...scope, status: 'borrowed', dueDate: { $lt: startOfToday() } }),
  ]);
  res.json({
    data,
    ...pageMeta(pg, total),
    counts: { all, borrowed: active, overdue, returned: all - active },
  });
});

exports.exportCsv = asyncHandler(async (req, res) => {
  const filter = await buildFilter(req);
  const rows = await Borrowing.find(filter).sort({ borrowDate: -1 }).limit(5000).populate(POPULATE);
  const header = ['Borrower', 'Email', 'Book', 'Author', 'Borrowed', 'Due', 'Returned', 'Status'];
  const iso = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
  const lines = rows.map((r) =>
    [r.userId?.name, r.userId?.email, r.bookId?.title, r.bookId?.author, iso(r.borrowDate), iso(r.dueDate), iso(r.returnDate), r.displayStatus]
      .map(csvCell)
      .join(',')
  );
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="borrowings-${iso(new Date())}.csv"`);
  res.send(`\uFEFF${[header.map(csvCell).join(','), ...lines].join('\r\n')}`);
});

exports.getOne = asyncHandler(async (req, res) => {
  const loan = await Borrowing.findById(req.params.id).populate(POPULATE);
  const ownerId = loan?.userId?._id || loan?.userId;
  if (!loan || (req.user.role !== 'admin' && String(ownerId) !== String(req.user._id))) {
    throw new AppError('Loan not found.', 404); // same message either way: do not leak existence
  }
  res.json({ loan });
});

exports.create = asyncHandler(async (req, res) => {
  const { loan, book } = await borrowBook(req.user, req.body.bookId);
  await loan.populate(POPULATE);
  res.status(201).json({ loan, book });
});

exports.returnOne = asyncHandler(async (req, res) => {
  const { loan, book } = await returnLoan(req.params.id, req.user);
  await loan.populate(POPULATE);
  res.json({ loan, book });
});

/** Only already-returned (erroneous) records may be removed; active loans must be returned first. */
exports.remove = asyncHandler(async (req, res) => {
  const loan = await Borrowing.findById(req.params.id);
  if (!loan) throw new AppError('Loan not found.', 404);
  if (loan.status === 'borrowed') throw new AppError('Process the return first. Active loans cannot be deleted.', 409);
  await loan.deleteOne();
  res.json({ message: 'Record removed.' });
});
