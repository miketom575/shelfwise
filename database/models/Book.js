const mongoose = require('mongoose');
const cleanJSON = require('./plugins');

const cleanIsbn = (v) => {
  const s = typeof v === 'string' ? v.replace(/[\s-]/g, '').toUpperCase() : '';
  return s || undefined;
};

function isValidIsbn(v) {
  if (!v) return true; // optional
  if (/^\d{9}[\dX]$/.test(v)) {
    const sum = [...v].reduce((acc, ch, i) => acc + (ch === 'X' ? 10 : Number(ch)) * (10 - i), 0);
    return sum % 11 === 0;
  }
  if (/^\d{13}$/.test(v)) {
    const sum = [...v].reduce((acc, ch, i) => acc + Number(ch) * (i % 2 === 0 ? 1 : 3), 0);
    return sum % 10 === 0;
  }
  return false;
}

const bookSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Title is required'], trim: true, maxlength: 200 },
    author: { type: String, required: [true, 'Author is required'], trim: true, maxlength: 120 },
    category: { type: String, required: [true, 'Category is required'], trim: true, maxlength: 60 },
    isbn: { type: String, set: cleanIsbn, validate: { validator: isValidIsbn, message: 'Enter a valid ISBN-10 or ISBN-13' } },
    publicationYear: {
      type: Number,
      min: [1, 'Enter a valid year'],
      max: [new Date().getFullYear() + 1, 'Publication year cannot be in the future'],
    },
    description: { type: String, trim: true, maxlength: 1200, default: '' },
    totalCopies: {
      type: Number,
      required: [true, 'Total copies is required'],
      min: [0, 'Total copies cannot be negative'],
      validate: { validator: Number.isInteger, message: 'Total copies must be a whole number' },
    },
    availableCopies: {
      type: Number,
      min: [0, 'Available copies cannot be negative'],
      validate: {
        validator(v) {
          return Number.isInteger(v) && v <= this.totalCopies;
        },
        message: 'Available copies must be a whole number and cannot exceed total copies',
      },
    },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

bookSchema.pre('validate', function setDefaultAvailability(next) {
  if (this.isNew && (this.availableCopies === undefined || this.availableCopies === null)) {
    this.availableCopies = this.totalCopies;
  }
  next();
});

// Query indexes
bookSchema.index({ isArchived: 1, category: 1, title: 1 });
bookSchema.index({ title: 1 });
bookSchema.index({ author: 1 });
bookSchema.index({ createdAt: -1 });
// ISBN is optional, but unique when present
bookSchema.index({ isbn: 1 }, { unique: true, partialFilterExpression: { isbn: { $type: 'string' } } });

bookSchema.plugin(cleanJSON);

module.exports = mongoose.model('Book', bookSchema);
module.exports.isValidIsbn = isValidIsbn;
