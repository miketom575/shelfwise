const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const config = require('../config/env');
const c = require('../controllers/auth.controller');

// Restrict login attempts (proposal VI.A)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.env === 'test',
  message: { message: 'Too many attempts. Wait a few minutes and try again.' },
});

const email = body('email').isString().trim().toLowerCase().isEmail().withMessage('Enter a valid email address.');

router.post(
  '/register',
  authLimiter,
  [
    body('name').isString().trim().isLength({ min: 2, max: 80 }).withMessage('Enter your full name (2 to 80 characters).'),
    email,
    body('password')
      .isString()
      .isLength({ min: 8, max: 72 }).withMessage('Password must be 8 to 72 characters.')
      .matches(/[A-Za-z]/).withMessage('Password needs at least one letter.')
      .matches(/\d/).withMessage('Password needs at least one number.'),
  ],
  validate,
  c.register
);
router.post('/login', authLimiter, [email, body('password').isString().notEmpty().withMessage('Enter your password.')], validate, c.login);
router.post(
  '/appeal',
  authLimiter,
  [
    email,
    body('password').isString().notEmpty().withMessage('Enter your password.'),
    body('message').isString().trim().isLength({ min: 10, max: 1000 }).withMessage('Explain your situation in 10 to 1000 characters.'),
  ],
  validate,
  c.appeal
);
router.post('/logout', c.logout);
router.get('/me', protect, c.me);

module.exports = router;
