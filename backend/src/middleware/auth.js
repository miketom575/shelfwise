const jwt = require('jsonwebtoken');
const { User } = require('lms-database');
const config = require('../config/env');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { enforceOverdueSuspension } = require('../services/suspensionService');

async function authenticate(req) {
  const header = req.get('authorization') || '';
  const token = req.cookies?.token || (header.startsWith('Bearer ') ? header.slice(7) : null);
  if (!token) return null;

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw new AppError('Your session has ended. Sign in again.', 401);
  }
  const user = await User.findById(payload.sub);
  if (!user) throw new AppError('Your session has ended. Sign in again.', 401);
  await enforceOverdueSuspension(user);
  if (user.accountStatus !== 'active') throw new AppError('This account is suspended. Sign in to send an appeal.', 403, undefined, { suspended: true });
  return user;
}

/** Requires a valid session; attaches req.user (always read fresh from the database). */
exports.protect = asyncHandler(async (req, _res, next) => {
  const user = await authenticate(req);
  if (!user) throw new AppError('Sign in to continue.', 401);
  req.user = user;
  next();
});

/** Attaches req.user when signed in; never blocks the request. */
exports.optionalAuth = asyncHandler(async (req, _res, next) => {
  try {
    req.user = await authenticate(req);
  } catch {
    req.user = null;
  }
  next();
});

/** Server-side role enforcement. Hiding buttons in React is NOT security. */
exports.requireRole =
  (...roles) =>
  (req, _res, next) =>
    roles.includes(req.user?.role) ? next() : next(new AppError('You do not have permission to do that.', 403));

exports.issueSession = (res, user) => {
  const token = jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.env === 'production',
    path: '/',
    maxAge: config.cookieMaxAgeMs,
  });
};

exports.clearSession = (res) =>
  res.clearCookie('token', { httpOnly: true, sameSite: 'lax', secure: config.env === 'production', path: '/' });
