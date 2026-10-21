# Database layer

Everything about the data lives here: the MongoDB connection, the Mongoose schemas and the demo data.

| File | Purpose |
| --- | --- |
| `.env` | `MONGODB_URI` (local MongoDB or Atlas) |
| `connection.js` | `connectDB()` / `disconnectDB()` |
| `models/User.js` | users, hashed passwords, roles, account status |
| `models/Book.js` | books, copy counts, ISBN checksum, archive flag, indexes |
| `models/BorrowingRecord.js` | loans, due/return dates, overdue virtuals, unique active-loan index |
| `seed/seed.js` | 40 books, 6 users, sample loans |
| `index.js` | the only file the backend imports |

Re-seed from the project root with `npm run seed` (this wipes existing data).
