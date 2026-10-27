const { User, BorrowingRecord: Borrowing } = require('lms-database');
const config = require('../config/env');
const { startOfToday, addDays } = require('../utils/helpers');

/**
 * Overdue rule: a reader with OVERDUE_SUSPEND_LIMIT (default 5) or more overdue books is suspended automatically.
 * It is checked whenever the reader signs in or makes an authenticated request, so no background job is needed
 * (which also suits serverless hosting). Librarians are never suspended by this rule.
 * Returns true when the account was suspended just now.
 */
async function enforceOverdueSuspension(user) {
  if (!user || user.role !== 'user' || user.accountStatus !== 'active') return false;
  if (user.overdueGraceUntil && user.overdueGraceUntil > new Date()) return false; // an approved appeal pauses the rule

  const overdue = await Borrowing.countDocuments({ userId: user._id, status: 'borrowed', dueDate: { $lt: startOfToday() } });
  if (overdue < config.overdueSuspendLimit) return false;

  const now = new Date();
  await User.updateOne({ _id: user._id, accountStatus: 'active' }, { $set: { accountStatus: 'suspended', suspensionReason: 'overdue', suspendedAt: now } });
  user.accountStatus = 'suspended';
  user.suspensionReason = 'overdue';
  user.suspendedAt = now;
  return true;
}

/** Plain-language reason shown to a suspended reader. */
const suspensionMessage = (user) =>
  user.suspensionReason === 'overdue'
    ? `Your account is suspended because you have ${config.overdueSuspendLimit} or more overdue books. Return them to the library, then send an appeal below so a librarian can restore your account.`
    : 'Your account is suspended by a librarian. You can send an appeal below to ask for it to be restored.';

const graceUntil = () => addDays(new Date(), config.appealGraceDays);

module.exports = { enforceOverdueSuspension, suspensionMessage, graceUntil };
