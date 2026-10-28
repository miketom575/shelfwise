const router = require('express').Router();
const { body, param, query } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, requireRole } = require('../middleware/auth');
const c = require('../controllers/borrowings.controller');

const id = param('id').isMongoId().withMessage('That loan identifier is not valid.');

router.use(protect);

router.get('/', query('userId').optional().isString().isMongoId().withMessage('That user identifier is not valid.'), validate, c.list);
router.get('/export', requireRole('admin'), c.exportCsv);
router.get('/:id', id, validate, c.getOne);

// borrower identity comes from the session; the body only names the book
router.post('/', body('bookId').isMongoId().withMessage('Choose a valid book.'), validate, c.create);

// reader: ask to return a book of their own (a librarian then approves or declines)
router.post('/:id/return-request', id, validate, c.requestReturn);

// admin: decline a pending return request
router.put('/:id/return-request', requireRole('admin'), id, body('decision').equals('declined').withMessage('Only declining is supported here.'), validate, c.declineReturn);

// admin: process a return (only once)
router.put('/:id', requireRole('admin'), id, body('status').equals('returned').withMessage('Only returning a loan is supported.'), validate, c.returnOne);
router.delete('/:id', requireRole('admin'), id, validate, c.remove);

module.exports = router;
