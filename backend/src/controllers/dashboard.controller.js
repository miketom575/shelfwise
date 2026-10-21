const { Book, User, BorrowingRecord: Borrowing } = require('lms-database');
const asyncHandler = require('../utils/asyncHandler');
const { startOfToday, addDays } = require('../utils/helpers');

exports.stats = asyncHandler(async (_req, res) => {
  const today = startOfToday();
  const since = addDays(today, -13);

  const [inventory, activeLoans, overdueLoans, returnedLoans, totalUsers, borrowedByDay, returnedByDay, recent, popular, categories] =
    await Promise.all([
      Book.aggregate([
        { $match: { isArchived: false } },
        { $group: { _id: null, titles: { $sum: 1 }, copies: { $sum: '$totalCopies' }, available: { $sum: '$availableCopies' } } },
      ]),
      Borrowing.countDocuments({ status: 'borrowed' }),
      Borrowing.countDocuments({ status: 'borrowed', dueDate: { $lt: today } }),
      Borrowing.countDocuments({ status: 'returned' }),
      User.countDocuments({ role: 'user' }),
      Borrowing.aggregate([
        { $match: { borrowDate: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$borrowDate' } }, n: { $sum: 1 } } },
      ]),
      Borrowing.aggregate([
        { $match: { returnDate: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$returnDate' } }, n: { $sum: 1 } } },
      ]),
      Borrowing.find().sort({ updatedAt: -1 }).limit(8).populate('userId', 'name').populate('bookId', 'title author category'),
      Borrowing.aggregate([
        { $group: { _id: '$bookId', loans: { $sum: 1 } } },
        { $sort: { loans: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'books', localField: '_id', foreignField: '_id', as: 'book' } },
        { $unwind: '$book' },
        { $project: { loans: 1, 'book.title': 1, 'book.author': 1, 'book.category': 1 } },
      ]),
      Book.aggregate([
        { $match: { isArchived: false } },
        { $group: { _id: '$category', titles: { $sum: 1 }, copies: { $sum: '$totalCopies' }, available: { $sum: '$availableCopies' } } },
        { $sort: { titles: -1 } },
      ]),
    ]);

  const fmt = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const bMap = Object.fromEntries(borrowedByDay.map((r) => [r._id, r.n]));
  const rMap = Object.fromEntries(returnedByDay.map((r) => [r._id, r.n]));
  const activity = Array.from({ length: 14 }, (_, i) => {
    const key = fmt(addDays(since, i));
    return { date: key, borrowed: bMap[key] || 0, returned: rMap[key] || 0 };
  });

  const inv = inventory[0] || { titles: 0, copies: 0, available: 0 };
  res.json({
    totals: {
      titles: inv.titles,
      copies: inv.copies,
      availableCopies: inv.available,
      activeLoans,
      overdueLoans,
      returnedLoans,
      members: totalUsers,
    },
    activity,
    categories: categories.map((c) => ({ name: c._id, titles: c.titles, copies: c.copies, available: c.available })),
    popular: popular.map((p) => ({ id: String(p._id), title: p.book.title, author: p.book.author, category: p.book.category, loans: p.loans })),
    recent: recent.map((r) => ({
      id: String(r._id),
      user: r.userId?.name || 'Deleted user',
      book: r.bookId?.title || 'Deleted book',
      bookId: r.bookId?._id ? String(r.bookId._id) : null,
      event: r.displayStatus === 'returned' ? 'returned' : r.displayStatus === 'overdue' ? 'overdue' : 'borrowed',
      at: r.returnDate || r.borrowDate,
      dueDate: r.dueDate,
    })),
  });
});
