require('dotenv').config();

const bool = (v, d) => (v === undefined ? d : String(v).toLowerCase() === 'true');
const int = (v, d) => (v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : d);

const config = {
  env: process.env.NODE_ENV || 'development',
  port: int(process.env.PORT, 5000),
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cookieMaxAgeMs: 7 * 24 * 60 * 60 * 1000,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  loanDays: int(process.env.LOAN_DAYS, 14),
  maxActiveLoans: int(process.env.MAX_ACTIVE_LOANS, 5),
  overdueSuspendLimit: int(process.env.OVERDUE_SUSPEND_LIMIT, 5), // this many overdue books suspends the account
  appealGraceDays: int(process.env.APPEAL_GRACE_DAYS, 7),         // after an approved appeal, days before the rule applies again
  adminCanBorrow: bool(process.env.ADMIN_CAN_BORROW, false),
  allowRoleChanges: bool(process.env.ALLOW_ROLE_CHANGES, false),
};

if (!config.jwtSecret) {
  if (config.env === 'production') {
    // Do not crash every request (the public catalog does not need it). Derive a stable secret from the
    // database URI, which is already private, so sign-in keeps working across serverless cold starts.
    const seed = process.env.MONGODB_URI || require('crypto').randomBytes(32).toString('hex');
    config.jwtSecret = require('crypto').createHmac('sha256', seed).update('shelfwise-jwt-secret').digest('hex');
    console.warn('JWT_SECRET is not set. Using a secret derived from MONGODB_URI. Set JWT_SECRET in your environment variables.');
  } else {
    config.jwtSecret = 'dev-only-insecure-secret-change-me';
    if (config.env !== 'test') console.warn('JWT_SECRET is not set. Using an insecure development default.');
  }
}

module.exports = config;
