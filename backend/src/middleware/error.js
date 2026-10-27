const config = require('../config/env');

exports.notFound = (req, res) => res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });

// eslint-disable-next-line no-unused-vars
exports.errorHandler = (err, req, res, _next) => {
  let status = err.status || 500;
  let message = err.isOperational ? err.message : 'Something went wrong on our side. Try again in a moment.';
  let errors = err.errors;

  if (err.name === 'ValidationError' && err.errors) {
    status = 422;
    errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    message = errors[0]?.message || 'Check the highlighted fields.';
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'That identifier is not valid.';
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || {})[0];
    message =
      field === 'email' ? 'An account with this email already exists.' :
      field === 'isbn' ? 'A book with this ISBN already exists.' :
      'That record already exists.';
  } else if (/^Mongo(Server|Network|Topology|NotConnected)/.test(err.name || '') || err.name === 'MongooseServerSelectionError' || /buffering timed out/i.test(err.message || '')) {
    status = 503;
    message = 'The database is unavailable right now. Try again in a moment.';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'The request body is not valid JSON.';
  }

  if (status >= 500 && config.env !== 'test') console.error(err);
  const body = { message };
  if (errors) body.errors = errors;
  if (err.extra && err.isOperational) Object.assign(body, err.extra);
  if (config.env === 'development' && status >= 500) body.debug = err.message; // never in production
  res.status(status).json(body);
};
