const { Book } = require('lms-database');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { str, escapeRegex, paginate, pageMeta } = require('../utils/helpers');
const { getEligibility, withNextAvailable } = require('../services/loanService');

const SORTS = {
  title: { title: 1 },
  author: { author: 1, title: 1 },
  newest: { createdAt: -1 },
  year: { publicationYear: -1, title: 1 },
  available: { availableCopies: -1, title: 1 },
};
const FIELDS = ['title', 'author', 'category', 'isbn', 'publicationYear', 'description'];

exports.list = asyncHandler(async (req, res) => {
  const pg = paginate(req.query, 12, 100);
  const isAdmin = req.user?.role === 'admin';
  const filter = {};

  const archived = str(req.query.archived);
  if (!isAdmin || archived === '' || archived === 'exclude') filter.isArchived = false;
  else if (archived === 'only') filter.isArchived = true;

  const q = str(req.query.q).slice(0, 100);
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ title: rx }, { author: rx }, { category: rx }, { isbn: rx }];
  }
  const category = str(req.query.category);
  if (category) filter.category = category;
  if (str(req.query.available) === 'true') filter.availableCopies = { $gt: 0 };

  const sort = SORTS[str(req.query.sort)] || SORTS.title;
  const [data, total] = await Promise.all([
    Book.find(filter).sort(sort).collation({ locale: 'en', strength: 2 }).skip(pg.skip).limit(pg.limit),
    Book.countDocuments(filter),
  ]);
  res.json({ data: await withNextAvailable(data), ...pageMeta(pg, total) });
});

exports.categories = asyncHandler(async (_req, res) => {
  const rows = await Book.aggregate([
    { $match: { isArchived: false } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  res.json({ data: rows.map((r) => ({ name: r._id, count: r.count })) });
});

exports.getOne = asyncHandler(async (req, res) => {
  const book = await Book.findById(req.params.id);
  if (!book || (book.isArchived && req.user?.role !== 'admin')) throw new AppError('Book not found.', 404);
  const eligibility = await getEligibility(req.user, book);
  res.json({ book: await withNextAvailable(book), eligibility });
});

exports.create = asyncHandler(async (req, res) => {
  const body = {};
  FIELDS.forEach((f) => req.body[f] !== undefined && (body[f] = req.body[f]));
  const book = await Book.create({ ...body, totalCopies: req.body.totalCopies }); // availableCopies defaults to total
  res.status(201).json({ book });
});

exports.update = asyncHandler(async (req, res) => {
  const book = await Book.findById(req.params.id);
  if (!book) throw new AppError('Book not found.', 404);

  FIELDS.forEach((f) => {
    if (req.body[f] !== undefined) book[f] = req.body[f] === null ? undefined : req.body[f];
  });
  await book.validate();

  // Copy counts move by a delta with atomic $inc, so concurrent borrows are never overwritten.
  if (req.body.totalCopies !== undefined) {
    const delta = Number(req.body.totalCopies) - book.totalCopies;
    if (delta !== 0) {
      const ok = await Book.findOneAndUpdate(
        { _id: book._id, totalCopies: book.totalCopies, availableCopies: { $gte: -delta } },
        { $inc: { totalCopies: delta, availableCopies: delta } },
        { new: true }
      );
      if (!ok) {
        const onLoan = book.totalCopies - book.availableCopies;
        throw new AppError(`${onLoan} ${onLoan === 1 ? 'copy is' : 'copies are'} on loan, so total copies cannot go lower than that.`, 409);
      }
    }
  }
  await book.save(); // persists the descriptive fields only
  res.json({ book: await Book.findById(book._id) });
});

/** DELETE = archive. History stays intact because loan records keep referencing the book. */
exports.archive = asyncHandler(async (req, res) => {
  const book = await Book.findByIdAndUpdate(req.params.id, { isArchived: true }, { new: true });
  if (!book) throw new AppError('Book not found.', 404);
  res.json({ book });
});

exports.restore = asyncHandler(async (req, res) => {
  const book = await Book.findByIdAndUpdate(req.params.id, { isArchived: false }, { new: true });
  if (!book) throw new AppError('Book not found.', 404);
  res.json({ book });
});
