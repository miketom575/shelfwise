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
  adminCanBorrow: bool(process.env.ADMIN_CAN_BORROW, false),
  allowRoleChanges: bool(process.env.ALLOW_ROLE_CHANGES, false),
};

if (!config.jwtSecret) {
  if (config.env === 'production') throw new Error('JWT_SECRET must be set in production.');
  config.jwtSecret = 'dev-only-insecure-secret-change-me';
  if (config.env !== 'test') console.warn('JWT_SECRET is not set. Using an insecure development default.');
}

module.exports = config;
