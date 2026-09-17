const Job = require('../models/Job');
const Bookmark = require('../models/Bookmark');
const ApiError = require('../utils/ApiError');
const { asyncHandler, ok, parsePagination, escapeRegex } = require('../utils/helpers');
const aiService = require('../services/aiService');
const storageService = require('../services/storageService');
const AIAnalysis = require('../models/AIAnalysis');

const JOB_FIELDS = [
  'title', 'description', 'category', 'requiredSkills', 'experienceLevel',
  'budget', 'budgetType', 'deadline',
];

const createJob = asyncHandler(async (req, res) => {
  const data = {};
  for (const f of JOB_FIELDS) if (req.body[f] !== undefined) data[f] = req.body[f];
  const job = await Job.create({ ...data, clientId: req.user._id, status: req.body.publish ? 'OPEN' : 'DRAFT' });
  ok(res, { job }, 'Job created', 201);
});

const updateJob = asyncHandler(async (req, res) => {
  const job = await Job.findOne({ _id: req.params.id, clientId: req.user._id });
  if (!job) throw ApiError.notFound('Job not found');
  if (['COMPLETED', 'CLOSED'].includes(job.status)) {
    throw ApiError.badRequest(`Cannot edit a ${job.status.toLowerCase()} job`);
  }
  for (const f of JOB_FIELDS) if (req.body[f] !== undefined) job[f] = req.body[f];
  await job.save();
  ok(res, { job }, 'Job updated');
});

const deleteJob = asyncHandler(async (req, res) => {
  const job = await Job.findOne({ _id: req.params.id, clientId: req.user._id });
  if (!job) throw ApiError.notFound('Job not found');
  if (job.status === 'IN_PROGRESS') throw ApiError.badRequest('Cannot delete a job with an active project');
  await job.deleteOne();
  ok(res, null, 'Job deleted');
});

const setJobStatus = asyncHandler(async (req, res) => {
  const { action } = req.body; // publish | unpublish | close
  const job = await Job.findOne({ _id: req.params.id, clientId: req.user._id });
  if (!job) throw ApiError.notFound('Job not found');
  const transitions = {
    publish: { from: ['DRAFT', 'CLOSED'], to: 'OPEN' },
    unpublish: { from: ['OPEN'], to: 'DRAFT' },
    close: { from: ['OPEN', 'DRAFT'], to: 'CLOSED' },
  };
  const t = transitions[action];
  if (!t) throw ApiError.badRequest('Invalid action. Use publish, unpublish, or close.');
  if (!t.from.includes(job.status)) {
    throw ApiError.badRequest(`Cannot ${action} a job with status ${job.status}`);
  }
  job.status = t.to;
  await job.save();
  ok(res, { job }, `Job ${action}ed`);
});

// Public job search with filters + pagination.
const listJobs = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, 10);
  const filter = { status: 'OPEN', isRemoved: false };
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(req.query.q), 'i');
    filter.$or = [{ title: rx }, { description: rx }, { requiredSkills: rx }];
  }
  if (req.query.category) filter.category = req.query.category;
  if (req.query.skill) filter.requiredSkills = { $in: [new RegExp(escapeRegex(req.query.skill), 'i')] };
  if (req.query.experienceLevel) filter.experienceLevel = req.query.experienceLevel;
  if (req.query.budgetType) filter.budgetType = req.query.budgetType;
  if (req.query.minBudget) filter.budget = { ...(filter.budget || {}), $gte: Number(req.query.minBudget) };
  if (req.query.maxBudget) filter.budget = { ...(filter.budget || {}), $lte: Number(req.query.maxBudget) };
  if (req.query.deadlineBefore) filter.deadline = { $lte: new Date(req.query.deadlineBefore) };

  const sortMap = { newest: { createdAt: -1 }, budget_high: { budget: -1 }, budget_low: { budget: 1 }, deadline: { deadline: 1 } };
  const sort = sortMap[req.query.sort] || sortMap.newest;

  const [results, total] = await Promise.all([
    Job.find(filter).populate('clientId', 'name profileImage rating company').sort(sort).skip(skip).limit(limit),
    Job.countDocuments(filter),
  ]);
  ok(res, { results, page, limit, total, totalPages: Math.ceil(total / limit) || 1 });
});

const getJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id).populate('clientId', 'name profileImage rating reviewCount company location createdAt');
  if (!job || job.isRemoved) throw ApiError.notFound('Job not found');
  // Non-owners only see publicly visible jobs.
  const isOwner = req.user && job.clientId._id.equals(req.user._id);
  if (!isOwner && !['OPEN', 'IN_PROGRESS', 'COMPLETED'].includes(job.status)) {
    throw ApiError.notFound('Job not found');
  }
  let bookmarked = false;
  if (req.user?.role === 'freelancer') {
    bookmarked = Boolean(await Bookmark.exists({ freelancerId: req.user._id, jobId: job._id }));
  }
  ok(res, { job, bookmarked });
});

// Client's own jobs (all statuses).
const myJobs = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = { clientId: req.user._id };
  if (req.query.status) filter.status = req.query.status;
  const [results, total] = await Promise.all([
    Job.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Job.countDocuments(filter),
  ]);
  ok(res, { results, page, limit, total, totalPages: Math.ceil(total / limit) || 1 });
});

const analyzeJob = asyncHandler(async (req, res) => {
  const job = await Job.findOne({ _id: req.params.id, clientId: req.user._id });
  if (!job) throw ApiError.notFound('Job not found');
  const { provider, result } = await aiService.analyzeJobDescription(job.description);
  job.aiAnalysis = { ...result, provider, analyzedAt: new Date() };
  await job.save();
  await AIAnalysis.create({
    userId: req.user._id, type: 'JOB_ANALYSIS', relatedJobId: job._id, provider, result,
  });
  ok(res, { analysis: job.aiAnalysis, provider }, 'Job description analyzed');
});

const uploadJobAttachment = asyncHandler(async (req, res) => {
  const job = await Job.findOne({ _id: req.params.id, clientId: req.user._id });
  if (!job) throw ApiError.notFound('Job not found');
  if (!req.file) throw ApiError.badRequest('No file provided');
  const stored = await storageService.uploadFile(req.file, { folder: 'job-attachments' });
  job.attachments.push({ url: stored.url, publicId: stored.publicId, name: stored.name });
  await job.save();
  ok(res, { attachments: job.attachments }, 'Attachment uploaded');
});

module.exports = {
  createJob, updateJob, deleteJob, setJobStatus, listJobs, getJob, myJobs,
  analyzeJob, uploadJobAttachment,
};
