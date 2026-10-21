const { User, BorrowingRecord: Borrowing } = require('lms-database');
const config = require('../config/env');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { str, escapeRegex, paginate, pageMeta, startOfToday } = require('../utils/helpers');

exports.list = asyncHandler(async (req, res) => {
  const pg = paginate(req.query, 10, 50);
  const filter = {};
  const q = str(req.query.q).slice(0, 100);
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }
  if (['admin', 'user'].includes(str(req.query.role))) filter.role = str(req.query.role);
  if (['active', 'suspended'].includes(str(req.query.status))) filter.accountStatus = str(req.query.status);

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit),
    User.countDocuments(filter),
  ]);

  const counts = await Borrowing.aggregate([
    { $match: { userId: { $in: users.map((u) => u._id) }, status: 'borrowed' } },
    { $group: { _id: '$userId', active: { $sum: 1 }, overdue: { $sum: { $cond: [{ $lt: ['$dueDate', startOfToday()] }, 1, 0] } } } },
  ]);
  const byUser = Object.fromEntries(counts.map((c) => [String(c._id), c]));
  const data = users.map((u) => ({
    ...u.toJSON(),
    activeLoans: byUser[String(u._id)]?.active || 0,
    overdueLoans: byUser[String(u._id)]?.overdue || 0,
  }));
  res.json({ data, ...pageMeta(pg, total), canChangeRoles: config.allowRoleChanges });
});

exports.getMe = (req, res) => res.json({ user: req.user });

exports.updateMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (req.body.name !== undefined) user.name = req.body.name;
  if (req.body.newPassword) {
    if (!req.body.currentPassword || !(await user.verifyPassword(req.body.currentPassword))) {
      throw new AppError('Your current password is incorrect.', 403);
    }
    user.passwordHash = await User.hashPassword(req.body.newPassword);
  }
  await user.save();
  res.json({ user });
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const target = await User.findById(req.params.id);
  if (!target) throw new AppError('User not found.', 404);
  if (String(target._id) === String(req.user._id)) throw new AppError('You cannot change your own account status or role.', 409);

  if (req.body.role !== undefined && req.body.role !== target.role) {
    if (!config.allowRoleChanges) throw new AppError('Role changes are turned off by library policy.', 403);
    target.role = req.body.role;
  }
  if (req.body.accountStatus !== undefined) target.accountStatus = req.body.accountStatus;
  await target.save();
  res.json({ user: target });
});
