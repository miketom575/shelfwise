const mongoose = require('mongoose');
const cleanJSON = require('./plugins');
const { startOfToday } = require('../utils');

const borrowingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
    borrowDate: { type: Date, required: true, default: Date.now },
    dueDate: { type: Date, required: true },
    returnDate: { type: Date, default: null },
    returnedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: { type: String, enum: ['borrowed', 'returned'], default: 'borrowed' },
  },
  { timestamps: true }
);

borrowingSchema.pre('validate', function checkDates(next) {
  if (this.dueDate && this.borrowDate && this.dueDate <= this.borrowDate) {
    this.invalidate('dueDate', 'Due date must be after the borrow date');
  }
  if (this.status === 'returned' && !this.returnDate) this.invalidate('returnDate', 'A returned loan needs a return date');
  if (this.status === 'borrowed' && this.returnDate) this.invalidate('returnDate', 'An active loan cannot have a return date');
  next();
});

/** Overdue = active loan whose due date is before today (proposal section III.C, step 5). */
borrowingSchema.virtual('isOverdue').get(function isOverdue() {
  return this.status === 'borrowed' && this.dueDate < startOfToday();
});
borrowingSchema.virtual('displayStatus').get(function displayStatus() {
  if (this.status === 'returned') return 'returned';
  return this.isOverdue ? 'overdue' : 'borrowed';
});

borrowingSchema.index({ userId: 1, status: 1 });
borrowingSchema.index({ bookId: 1, status: 1 });
borrowingSchema.index({ status: 1, dueDate: 1 });
borrowingSchema.index({ borrowDate: -1 });
// Database-level guard: a user can hold only one active loan per book (stops double-click races)
borrowingSchema.index({ userId: 1, bookId: 1 }, { unique: true, partialFilterExpression: { status: 'borrowed' } });

borrowingSchema.plugin(cleanJSON);

module.exports = mongoose.model('BorrowingRecord', borrowingSchema);
