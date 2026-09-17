const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

// Collects express-validator results into a consistent 400 response.
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      ApiError.badRequest('Validation failed', errors.array().map((e) => ({ field: e.path, message: e.msg })))
    );
  }
  next();
};

module.exports = validate;
