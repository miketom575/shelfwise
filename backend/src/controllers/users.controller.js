const { User, BorrowingRecord: Borrowing } = require('lms-database');
const config = require('../config/env');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { str, escapeRegex, paginate, pageMeta, startOfToday } = require('../utils/helpers');
const { graceUntil } = require('../services/suspensionService');

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
  if (str(req.query.appeal) === 'pending') filter['appeal.status'] = 'pending';

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
  if (req.body.accountStatus !== undefined && req.body.accountStatus !== target.accountStatus) {
    if (req.body.accountStatus === 'suspended') {
      target.accountStatus = 'suspended';
      target.suspensionReason = 'admin';
      target.suspendedAt = new Date();
    } else {
      restore(target, req.user);
    }
  }
  await target.save();
  res.json({ user: target });
});

/** Reactivates a suspended account. If the overdue rule caused it, the rule pauses for a few days so books can be returned. */
function restore(target, admin) {
  if (target.suspensionReason === 'overdue') target.overdueGraceUntil = graceUntil();
  target.accountStatus = 'active';
  target.suspensionReason = undefined;
  target.suspendedAt = undefined;
  if (target.appeal?.status === 'pending') {
    target.appeal.status = 'approved';
    target.appeal.decidedAt = new Date();
    target.appeal.decidedBy = admin._id;
  }
}

/** A librarian approves (restores the account) or denies a reader's appeal. */
exports.decideAppeal = asyncHandler(async (req, res) => {
  const target = await User.findById(req.params.id);
  if (!target) throw new AppError('User not found.', 404);
  if (target.accountStatus !== 'suspended' || target.appeal?.status !== 'pending') throw new AppError('This account has no appeal waiting for a decision.', 409);

  if (req.body.decision === 'approve') {
    restore(target, req.user);
    if (req.body.note) target.appeal.note = req.body.note;
  } else {
    target.appeal.status = 'denied';
    target.appeal.decidedAt = new Date();
    target.appeal.decidedBy = req.user._id;
    target.appeal.note = req.body.note || undefined;
  }
  await target.save();
  res.json({ user: target });
});
