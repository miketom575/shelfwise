const router = require('express').Router();
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, requireRole } = require('../middleware/auth');
const c = require('../controllers/users.controller');

router.use(protect);

router.get('/me', c.getMe);
router.put(
  '/me',
  [
    body('name').optional().isString().trim().isLength({ min: 2, max: 80 }).withMessage('Enter your full name (2 to 80 characters).'),
    body('newPassword')
      .optional({ values: 'falsy' })
      .isString()
      .isLength({ min: 8, max: 72 }).withMessage('New password must be 8 to 72 characters.')
      .matches(/[A-Za-z]/).withMessage('New password needs at least one letter.')
      .matches(/\d/).withMessage('New password needs at least one number.'),
  ],
  validate,
  c.updateMe
);

router.get('/', requireRole('admin'), c.list);
router.patch(
  '/:id/status',
  requireRole('admin'),
  [
    param('id').isMongoId().withMessage('That user identifier is not valid.'),
    body('accountStatus').optional().isIn(['active', 'suspended']).withMessage('Status must be active or suspended.'),
    body('role').optional().isIn(['admin', 'user']).withMessage('Role must be admin or user.'),
  ],
  validate,
  c.updateStatus
);

router.patch(
  '/:id/appeal',
  requireRole('admin'),
  [
    param('id').isMongoId().withMessage('That user identifier is not valid.'),
    body('decision').isIn(['approve', 'deny']).withMessage('Decision must be approve or deny.'),
    body('note').optional({ values: 'falsy' }).isString().trim().isLength({ max: 500 }).withMessage('The note is limited to 500 characters.'),
  ],
  validate,
  c.decideAppeal
);

module.exports = router;
