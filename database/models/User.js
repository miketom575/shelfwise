const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cleanJSON = require('./plugins');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, minlength: 2, maxlength: 80 },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Enter a valid email address'],
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['admin', 'user'], default: 'user' },
    accountStatus: { type: String, enum: ['active', 'suspended'], default: 'active' },
    // Why the account is suspended: 'overdue' (automatic, too many overdue books) or 'admin' (a librarian did it).
    suspensionReason: { type: String, enum: ['overdue', 'admin'], default: undefined },
    suspendedAt: { type: Date, default: undefined },
    // After an appeal is approved the overdue rule is paused until this date, so the reader can return the books.
    overdueGraceUntil: { type: Date, default: undefined },
    appeal: {
      message: { type: String, trim: true, maxlength: 1000, default: undefined },
      submittedAt: { type: Date, default: undefined },
      status: { type: String, enum: ['pending', 'approved', 'denied'], default: undefined },
      decidedAt: { type: Date, default: undefined },
      decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: undefined },
      note: { type: String, trim: true, maxlength: 500, default: undefined },
    },
  },
  { timestamps: true }
);

userSchema.statics.hashPassword = (plain) => bcrypt.hash(plain, 12);
userSchema.methods.verifyPassword = function verifyPassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};
userSchema.plugin(cleanJSON);

module.exports = mongoose.model('User', userSchema);
