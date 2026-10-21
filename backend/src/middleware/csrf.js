const config = require('../config/env');
const AppError = require('../utils/AppError');

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Lightweight CSRF defence on top of SameSite cookies:
 *  1. state-changing requests must carry a custom header (cannot be sent cross-site without CORS approval)
 *  2. if the browser sends an Origin, it must be our client or our own host.
 */
module.exports = (req, _res, next) => {
  if (SAFE.has(req.method)) return next();
  if (req.get('x-requested-with') !== 'XMLHttpRequest') {
    return next(new AppError('Request blocked by CSRF protection.', 403));
  }
  const origin = req.get('origin');
  if (origin) {
    let host = '';
    try {
      host = new URL(origin).host;
    } catch {
      /* ignore */
    }
    if (origin !== config.clientOrigin && host !== req.get('host')) {
      return next(new AppError('Request blocked by CSRF protection.', 403));
    }
  }
  next();
};
