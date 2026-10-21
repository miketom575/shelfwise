class AppError extends Error {
  constructor(message, status = 500, errors) {
    super(message);
    this.status = status;
    this.errors = errors;
    this.isOperational = true;
  }
}
module.exports = AppError;
