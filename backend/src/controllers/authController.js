const crypto = require('crypto');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { asyncHandler, ok, signToken } = require('../utils/helpers');

const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!['client', 'freelancer'].includes(role)) {
    throw ApiError.badRequest('Role must be client or freelancer');
  }
  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) throw ApiError.conflict('An account with this email already exists');
  const passwordHash = await User.hashPassword(password);
  const user = await User.create({ name, email, passwordHash, role });
  const token = signToken(user);
  ok(res, { user: user.toSafeObject(), token }, 'Registration successful', 201);
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  if (user.isSuspended) throw ApiError.forbidden('Account suspended. Contact support.');
  const token = signToken(user);
  ok(res, { user: user.toSafeObject(), token }, 'Login successful');
});

const getMe = asyncHandler(async (req, res) => {
  ok(res, { user: req.user.toSafeObject() });
});

// Generates a reset token. In production this is emailed; in dev the token is
// returned in the response (documented, NODE_ENV-gated) so the flow is testable.
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() });
  // Always respond the same way to avoid account enumeration.
  if (!user) return ok(res, null, 'If that email exists, a reset link has been sent.');
  const token = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
  user.resetPasswordExpires = Date.now() + 1000 * 60 * 30; // 30 min
  await user.save();
  const payload =
    process.env.NODE_ENV === 'production'
      ? null
      : { resetToken: token, note: 'Dev mode: token returned instead of emailed.' };
  ok(res, payload, 'If that email exists, a reset link has been sent.');
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const hashed = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    resetPasswordToken: hashed,
    resetPasswordExpires: { $gt: Date.now() },
  }).select('+resetPasswordToken +resetPasswordExpires');
  if (!user) throw ApiError.badRequest('Invalid or expired reset token');
  user.passwordHash = await User.hashPassword(password);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();
  ok(res, null, 'Password reset successful. You can now log in.');
});

module.exports = { register, login, getMe, forgotPassword, resetPassword };
