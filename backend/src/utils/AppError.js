class AppError extends Error {
  constructor(message, status = 500, errors, extra) {
    super(message);
    this.status = status;
    this.errors = errors;
    this.extra = extra; // merged into the JSON body (e.g. { suspended: true })
    this.isOperational = true;
  }
}
module.exports = AppError;
