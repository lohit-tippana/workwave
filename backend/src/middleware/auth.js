const jwt = require('jsonwebtoken');
const config = require('../config');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');

// Authentication: verifies the JWT and attaches the fresh user document.
const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw ApiError.unauthorized('No authentication token provided');
    let payload;
    try {
      payload = jwt.verify(token, config.jwt.secret);
    } catch {
      throw ApiError.unauthorized('Invalid or expired token');
    }
    const user = await User.findById(payload.id);
    if (!user) throw ApiError.unauthorized('User no longer exists');
    if (user.isSuspended) throw ApiError.forbidden('Account suspended. Contact support.');
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

// Authorization: role gate. Must run after `protect`.
const restrictTo = (...roles) => (req, res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!roles.includes(req.user.role)) return next(ApiError.forbidden());
  next();
};

module.exports = { protect, restrictTo };
