const router = require('express').Router();
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, optionalAuth, requireRole } = require('../middleware/auth');
const c = require('../controllers/books.controller');

const id = param('id').isMongoId().withMessage('That book identifier is not valid.');
const required = (opt) => (chain) => (opt ? chain.optional() : chain);

const rules = (partial) => [
  required(partial)(body('title').isString().trim().notEmpty().withMessage('Title is required.')).isLength({ max: 200 }).withMessage('Title is too long.'),
  required(partial)(body('author').isString().trim().notEmpty().withMessage('Author is required.')).isLength({ max: 120 }).withMessage('Author is too long.'),
  required(partial)(body('category').isString().trim().notEmpty().withMessage('Category is required.')).isLength({ max: 60 }).withMessage('Category is too long.'),
  body('isbn').optional({ values: 'falsy' }).isString().withMessage('ISBN must be text.'),
  body('publicationYear').optional({ values: 'falsy' }).isInt({ min: 1, max: new Date().getFullYear() + 1 }).withMessage('Enter a valid publication year.').toInt(),
  body('description').optional().isString().isLength({ max: 1200 }).withMessage('Description is limited to 1200 characters.'),
  required(partial)(body('totalCopies')).isInt({ min: 0, max: 1000 }).withMessage('Total copies must be a whole number from 0 to 1000.').toInt(),
];

// Public read access (catalog browsing); optionalAuth lets us tailor borrow eligibility.
router.get('/', optionalAuth, c.list);
router.get('/categories', c.categories);
router.get('/:id', optionalAuth, id, validate, c.getOne);

// Admin only
router.post('/', protect, requireRole('admin'), rules(false), validate, c.create);
router.put('/:id', protect, requireRole('admin'), id, rules(true), validate, c.update);
router.delete('/:id', protect, requireRole('admin'), id, validate, c.archive); // archive, never erase history
router.patch('/:id/restore', protect, requireRole('admin'), id, validate, c.restore);

module.exports = router;
