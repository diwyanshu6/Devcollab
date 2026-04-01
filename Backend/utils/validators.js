const AppError = require("./AppError");

exports.validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email)) {
    throw new AppError("Invalid email format", 400);
  }
};

exports.validateId = (id) => {
  if (isNaN(id) || parseInt(id) <= 0) {
    throw new AppError("Invalid ID format, must be a number", 400);
  }
};
