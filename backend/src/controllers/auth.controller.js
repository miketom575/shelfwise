const { User } = require('lms-database');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { issueSession, clearSession } = require('../middleware/auth');

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
  if (user.accountStatus !== 'active') throw new AppError('This account is suspended. Contact a librarian.', 403);
  issueSession(res, user);
  res.json({ user });
});

exports.logout = (_req, res) => {
  clearSession(res);
  res.json({ message: 'Signed out.' });
};

exports.me = (req, res) => res.json({ user: req.user });
