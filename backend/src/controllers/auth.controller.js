const { User } = require('lms-database');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { issueSession, clearSession } = require('../middleware/auth');
const { enforceOverdueSuspension, suspensionMessage } = require('../services/suspensionService');

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (await User.exists({ email })) throw new AppError('An account with this email already exists. Try signing in.', 409);
  // The role is NEVER read from the request: public sign-ups are always regular users.
  const user = await User.create({ name, email, passwordHash: await User.hashPassword(password), role: 'user' });
  issueSession(res, user);
  res.status(201).json({ user });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+passwordHash');
  const ok = user && (await user.verifyPassword(password));
  if (!ok) throw new AppError('Email or password is incorrect.', 401);
  await enforceOverdueSuspension(user);
  if (user.accountStatus !== 'active') throw suspended(user);
  issueSession(res, user);
  res.json({ user });
});

const suspended = (user) =>
  new AppError(suspensionMessage(user), 403, undefined, {
    suspended: true,
    reason: user.suspensionReason || 'admin',
    appealStatus: user.appeal?.status || null,
    appealMessage: user.appeal?.status === 'denied' ? user.appeal?.note || null : null,
  });

/**
 * A suspended reader can't sign in, so the appeal is sent with their email and password instead of a session.
 * Only the account's own credentials can file it, and only while it is suspended.
 */
exports.appeal = asyncHandler(async (req, res) => {
  const { email, password, message } = req.body;
  const user = await User.findOne({ email }).select('+passwordHash');
  const ok = user && (await user.verifyPassword(password));
  if (!ok) throw new AppError('Email or password is incorrect.', 401);
  if (user.accountStatus !== 'suspended') throw new AppError('Your account is not suspended, so there is nothing to appeal.', 409);
  if (user.appeal?.status === 'pending') throw new AppError('You already have an appeal waiting for a librarian. Please be patient.', 409);

  user.appeal = { message, submittedAt: new Date(), status: 'pending' };
  await user.save();
  res.status(201).json({ message: 'Appeal sent. A librarian will review it.', appealStatus: 'pending' });
});

exports.logout = (_req, res) => {
  clearSession(res);
  res.json({ message: 'Signed out.' });
};

exports.me = (req, res) => res.json({ user: req.user });
