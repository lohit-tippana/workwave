const User = require('../models/User');
const Job = require('../models/Job');
const Project = require('../models/Project');
const Payment = require('../models/Payment');
const Report = require('../models/Report');
const Proposal = require('../models/Proposal');
const Category = require('../models/Category');
const ApiError = require('../utils/ApiError');
const { asyncHandler, ok, parsePagination, escapeRegex } = require('../utils/helpers');
const { notify } = require('../services/notificationService');

const stats = asyncHandler(async (req, res) => {
  const [users, clients, freelancers, jobs, activeJobs, projects, completedProjects, payments, openReports, proposals] =
    await Promise.all([
      User.countDocuments({ role: { $ne: 'admin' } }),
      User.countDocuments({ role: 'client' }),
      User.countDocuments({ role: 'freelancer' }),
      Job.countDocuments(),
      Job.countDocuments({ status: 'OPEN' }),
      Project.countDocuments(),
      Project.countDocuments({ status: 'COMPLETED' }),
      Payment.aggregate([
        { $match: { status: 'SUCCESS' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Report.countDocuments({ status: 'OPEN' }),
      Proposal.countDocuments(),
    ]);
  const recentUsers = await User.find({ role: { $ne: 'admin' } }).sort({ createdAt: -1 }).limit(5).select('name email role createdAt');
  const recentJobs = await Job.find().sort({ createdAt: -1 }).limit(5).select('title status createdAt');
  ok(res, {
    totals: {
      users, clients, freelancers, jobs, activeJobs, projects, completedProjects,
      transactionVolume: payments[0]?.total || 0,
      successfulPayments: payments[0]?.count || 0,
      openReports, proposals,
    },
    recentUsers, recentJobs,
  });
});

const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, 15);
  const filter = { role: { $ne: 'admin' } };
  if (req.query.role) filter.role = req.query.role;
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(req.query.q), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }
  if (req.query.suspended !== undefined && req.query.suspended !== '') {
    filter.isSuspended = req.query.suspended === 'true';
  }
  const [results, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  ok(res, { results: results.map((u) => u.toSafeObject()), page, limit, total, totalPages: Math.ceil(total / limit) || 1 });
});

const setUserSuspended = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user || user.role === 'admin') throw ApiError.notFound('User not found');
  user.isSuspended = Boolean(req.body.suspended);
  await user.save();
  ok(res, { user: user.toSafeObject() }, user.isSuspended ? 'User suspended' : 'User activated');
});

const listJobs = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, 15);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.q) filter.title = new RegExp(escapeRegex(req.query.q), 'i');
  const [results, total] = await Promise.all([
    Job.find(filter).populate('clientId', 'name email').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Job.countDocuments(filter),
  ]);
  ok(res, { results, page, limit, total, totalPages: Math.ceil(total / limit) || 1 });
});

const setJobRemoved = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) throw ApiError.notFound('Job not found');
  job.isRemoved = Boolean(req.body.removed);
  await job.save();
  if (job.isRemoved) {
    await notify(job.clientId, {
      type: 'JOB_REMOVED', title: 'Job removed by moderation',
      body: `Your job "${job.title}" was removed for violating platform guidelines.`,
      link: '/client/jobs',
    });
  }
  ok(res, { job }, job.isRemoved ? 'Job removed' : 'Job restored');
});

const listReports = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, 15);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const [results, total] = await Promise.all([
    Report.find(filter).populate('reporterId', 'name email').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Report.countDocuments(filter),
  ]);
  ok(res, { results, page, limit, total, totalPages: Math.ceil(total / limit) || 1 });
});

const resolveReport = asyncHandler(async (req, res) => {
  const { status, resolutionNote } = req.body;
  if (!['RESOLVED', 'DISMISSED', 'UNDER_REVIEW'].includes(status)) {
    throw ApiError.badRequest('Status must be RESOLVED, DISMISSED, or UNDER_REVIEW');
  }
  const report = await Report.findByIdAndUpdate(
    req.params.id,
    { status, resolutionNote, resolvedBy: req.user._id },
    { new: true }
  );
  if (!report) throw ApiError.notFound('Report not found');
  ok(res, { report }, 'Report updated');
});

const listPayments = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, 15);
  const [results, total] = await Promise.all([
    Payment.find().populate('clientId', 'name email').populate('freelancerId', 'name email')
      .populate('projectId', 'title').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Payment.countDocuments(),
  ]);
  ok(res, { results, page, limit, total, totalPages: Math.ceil(total / limit) || 1 });
});

// ---- category management ----
const createCategory = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const cat = await Category.create({ name, slug, description });
  ok(res, { category: cat }, 'Category created', 201);
});
const updateCategory = asyncHandler(async (req, res) => {
  const cat = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!cat) throw ApiError.notFound('Category not found');
  ok(res, { category: cat }, 'Category updated');
});
const deleteCategory = asyncHandler(async (req, res) => {
  const cat = await Category.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!cat) throw ApiError.notFound('Category not found');
  ok(res, { category: cat }, 'Category deactivated');
});
const listAllCategories = asyncHandler(async (req, res) => {
  ok(res, { results: await Category.find().sort({ name: 1 }) });
});

module.exports = {
  stats, listUsers, setUserSuspended, listJobs, setJobRemoved,
  listReports, resolveReport, listPayments,
  createCategory, updateCategory, deleteCategory, listAllCategories,
};
