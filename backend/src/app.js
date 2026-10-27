const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const { mongoose } = require('lms-database');
const config = require('./config/env');
const csrf = require('./middleware/csrf');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: config.clientOrigin, credentials: true }));
if (config.env === 'development') app.use(morgan('dev'));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use(mongoSanitize()); // strips $ and . operators from user input (NoSQL injection)
app.use('/api', rateLimit({ windowMs: 60 * 1000, limit: 300, skip: () => config.env === 'test' }));
app.use('/api', csrf);

app.get('/api/health', (_req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({ status: 'ok', database: states[mongoose.connection.readyState] || 'unknown', time: new Date().toISOString() });
});
app.get('/api/config', (_req, res) => res.json({ loanDays: config.loanDays, maxActiveLoans: config.maxActiveLoans }));
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/books', require('./routes/books.routes'));
app.use('/api/users', require('./routes/users.routes'));
app.use('/api/borrowings', require('./routes/borrowings.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api', notFound);

// Optional: serve the built React app from the same server in production
const dist = path.join(__dirname, '../../frontend/dist');
if (config.env === 'production' && fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use(errorHandler);
module.exports = app;
