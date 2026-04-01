const AppError = require("../utils/AppError");

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || "Server error";

  let error = { ...err };
  error.message = err.message;
  error.name = err.name;

  // Postgres Error: Unique Constraint (e.g. Duplicate Email)
  if (err.code === "23505") {
    const message = `Duplicate field value entered`;
    error = new AppError(message, 400);
  }

  // Postgres Error: Foreign Key Violation
  if (err.code === "23503") {
    const message = `Related record not found`;
    error = new AppError(message, 400);
  }

  // Postgres Error: Invalid Text Representation (Invalid UUID/ID format)
  if (err.code === "22P02") {
    const message = `Invalid data format`;
    error = new AppError(message, 400);
  }

  // JWT Errors
  if (err.name === "JsonWebTokenError") {
    const message = "Invalid token";
    error = new AppError(message, 403);
  }

  if (err.name === "TokenExpiredError") {
    const message = "Token expired";
    error = new AppError(message, 403);
  }

  // Standard output format as requested: { success: false, message }
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Server error",
  });
};

module.exports = errorHandler;
