const Job = require('../models/Job');
const Resume = require('../models/Resume');
const AIAnalysis = require('../models/AIAnalysis');
const Proposal = require('../models/Proposal');
const ApiError = require('../utils/ApiError');
const { asyncHandler, ok } = require('../utils/helpers');
const aiService = require('../services/aiService');

// Freelancer: match analysis between their profile/resume and a job.
const matchJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.jobId);
  if (!job || job.isRemoved) throw ApiError.notFound('Job not found');
  const resume = await Resume.findOne({ freelancerId: req.user._id }).select('+extractedText');
  const { provider, result } = await aiService.matchProfileToJob({
    profile: req.user, resumeText: resume?.extractedText || '', job,
  });
  await AIAnalysis.create({
    userId: req.user._id, type: 'JOB_MATCH', relatedJobId: job._id, provider, result,
  });
  ok(res, { match: result, provider }, 'Match analysis complete');
});

// Freelancer: recommended jobs with per-job reasons.
const recommendations = asyncHandler(async (req, res) => {
  const resume = await Resume.findOne({ freelancerId: req.user._id }).select('+extractedText');
  const appliedJobIds = await Proposal.distinct('jobId', { freelancerId: req.user._id });
  const jobs = await Job.find({
    status: 'OPEN', isRemoved: false, _id: { $nin: appliedJobIds },
  }).sort({ createdAt: -1 }).limit(100);
  const recs = await aiService.generateJobRecommendations({
    profile: req.user, resumeText: resume?.extractedText || '', jobs,
  });
  const jobMap = new Map(jobs.map((j) => [String(j._id), j]));
  const results = recs
    .map((r) => ({ ...r, job: jobMap.get(String(r.jobId)) }))
    .filter((r) => r.job);
  ok(res, { results });
});

// Freelancer: draft proposal text (assistant only - never auto-submitted).
const proposalDraft = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.body.jobId);
  if (!job || job.isRemoved) throw ApiError.notFound('Job not found');
  if (job.status !== 'OPEN') throw ApiError.badRequest('Job is not open');
  const { provider, result } = await aiService.generateProposalDraft({ job, profile: req.user });
  ok(res, { draft: result, provider }, 'Draft generated - review and edit before submitting');
});

// Ad-hoc job description analysis (before a job is saved).
const analyzeDescription = asyncHandler(async (req, res) => {
  const { description } = req.body;
  if (!description || description.length < 30) {
    throw ApiError.badRequest('Provide a longer description to analyze');
  }
  const { provider, result } = await aiService.analyzeJobDescription(description);
  ok(res, { analysis: result, provider }, 'Description analyzed');
});

module.exports = { matchJob, recommendations, proposalDraft, analyzeDescription };
