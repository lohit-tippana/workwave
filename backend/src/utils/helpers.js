const jwt = require('jsonwebtoken');
const config = require('../config');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const ok = (res, data, message = 'OK', status = 200) =>
  res.status(status).json({ success: true, message, data });

const signToken = (user) =>
  jwt.sign({ id: user._id.toString(), role: user.role }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });

const parsePagination = (query, defaultLimit = 10, maxLimit = 50) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
};

const paginated = async (modelQuery, countQuery, { page, limit }) => {
  const [results, total] = await Promise.all([modelQuery, countQuery]);
  return { results, page, limit, total, totalPages: Math.ceil(total / limit) || 1 };
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = { asyncHandler, ok, signToken, parsePagination, paginated, escapeRegex };
