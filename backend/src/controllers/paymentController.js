const Payment = require('../models/Payment');
const Project = require('../models/Project');
const ApiError = require('../utils/ApiError');
const { asyncHandler, ok, parsePagination } = require('../utils/helpers');
const paymentService = require('../services/paymentService');
const config = require('../config');
const { notify } = require('../services/notificationService');

// Creates a Razorpay order for a project or milestone payment.
const createOrder = asyncHandler(async (req, res) => {
  const { projectId, milestoneId } = req.body;
  const project = await Project.findById(projectId);
  if (!project) throw ApiError.notFound('Project not found');
  if (!project.clientId.equals(req.user._id)) throw ApiError.forbidden('Only the project client can pay');
  if (project.status === 'CANCELLED') throw ApiError.badRequest('Cannot pay for a cancelled project');

  let amount = project.budget;
  if (milestoneId) {
    const m = project.milestones.id(milestoneId);
    if (!m) throw ApiError.notFound('Milestone not found');
    if (!['APPROVED'].includes(m.status)) {
      throw ApiError.badRequest('Milestone must be approved before payment');
    }
    const alreadyPaid = await Payment.findOne({ milestoneId: m._id, status: 'SUCCESS' });
    if (alreadyPaid) throw ApiError.conflict('This milestone is already paid');
    amount = m.amount;
  }

  const order = await paymentService.createOrder({
    amount, currency: 'INR', receipt: `proj_${project._id}`,
  });
  const payment = await Payment.create({
    projectId: project._id,
    milestoneId: milestoneId || undefined,
    clientId: req.user._id,
    freelancerId: project.freelancerId,
    razorpayOrderId: order.id,
    amount: order.amount,
    currency: order.currency,
    status: 'CREATED',
  });
  ok(res, {
    paymentId: payment._id,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: config.razorpay.keyId,
  }, 'Order created', 201);
});

// Verifies Razorpay checkout signature server-side, then marks the payment.
const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
  const payment = await Payment.findOne({ razorpayOrderId });
  if (!payment) throw ApiError.notFound('Payment record not found');
  if (!payment.clientId.equals(req.user._id)) throw ApiError.forbidden();
  if (payment.status === 'SUCCESS') return ok(res, { payment }, 'Payment already verified');

  const valid = paymentService.verifyPaymentSignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature });
  if (!valid) {
    payment.status = 'VERIFICATION_FAILED';
    payment.failureReason = 'Signature mismatch';
    await payment.save();
    throw ApiError.badRequest('Payment verification failed - signature mismatch');
  }
  payment.razorpayPaymentId = razorpayPaymentId;
  payment.razorpaySignature = razorpaySignature;
  payment.status = 'SUCCESS';
  await payment.save();

  const project = await Project.findById(payment.projectId);
  if (project && payment.milestoneId) {
    const m = project.milestones.id(payment.milestoneId);
    if (m && m.status === 'APPROVED') m.status = 'COMPLETED';
    const done = project.milestones.filter((x) => x.status === 'COMPLETED').length;
    if (project.milestones.length) project.progress = Math.round((done / project.milestones.length) * 100);
    await project.save();
  }
  await notify(payment.freelancerId, {
    type: 'PAYMENT_SUCCESS', title: 'Payment received',
    body: `A payment of ${payment.currency} ${(payment.amount / 100).toFixed(2)} was completed for "${project?.title || 'a project'}".`,
    link: `/freelancer/projects/${payment.projectId}`,
  });
  ok(res, { payment }, 'Payment verified');
});

const markFailed = asyncHandler(async (req, res) => {
  const { razorpayOrderId, reason } = req.body;
  const payment = await Payment.findOne({ razorpayOrderId });
  if (!payment) throw ApiError.notFound('Payment record not found');
  if (!payment.clientId.equals(req.user._id)) throw ApiError.forbidden();
  if (payment.status === 'CREATED') {
    payment.status = 'FAILED';
    payment.failureReason = reason || 'Checkout cancelled or failed';
    await payment.save();
  }
  ok(res, { payment }, 'Payment marked failed');
});

const listPayments = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter =
    req.user.role === 'client' ? { clientId: req.user._id }
    : req.user.role === 'freelancer' ? { freelancerId: req.user._id }
    : {};
  const [results, total] = await Promise.all([
    Payment.find(filter)
      .populate('projectId', 'title')
      .populate('clientId', 'name').populate('freelancerId', 'name')
      .sort({ createdAt: -1 }).skip(skip).limit(limit),
    Payment.countDocuments(filter),
  ]);
  ok(res, { results, page, limit, total, totalPages: Math.ceil(total / limit) || 1 });
});

const paymentConfig = asyncHandler(async (req, res) => {
  ok(res, { enabled: paymentService.isConfigured(), keyId: paymentService.isConfigured() ? config.razorpay.keyId : null });
});

module.exports = { createOrder, verifyPayment, markFailed, listPayments, paymentConfig };
