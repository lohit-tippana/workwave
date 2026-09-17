const mongoose = require('mongoose');
const Proposal = require('../models/Proposal');
const Job = require('../models/Job');
const Project = require('../models/Project');
const Resume = require('../models/Resume');
const ApiError = require('../utils/ApiError');
const { asyncHandler, ok, parsePagination } = require('../utils/helpers');
const aiService = require('../services/aiService');
const { notify } = require('../services/notificationService');

// Freelancer submits a proposal (with AI match snapshot attached).
const createProposal = asyncHandler(async (req, res) => {
  const { coverLetter, proposedAmount, estimatedDays } = req.body;
  const job = await Job.findById(req.body.jobId);
  if (!job || job.isRemoved) throw ApiError.notFound('Job not found');
  if (job.status !== 'OPEN') throw ApiError.badRequest('This job is not accepting proposals');
  if (job.clientId.equals(req.user._id)) throw ApiError.forbidden('You cannot propose on your own job');

  const duplicate = await Proposal.findOne({
    jobId: job._id,
    freelancerId: req.user._id,
    status: { $in: ['PENDING', 'SHORTLISTED', 'ACCEPTED'] },
  });
  if (duplicate) throw ApiError.conflict('You already have an active proposal for this job');

  const resume = await Resume.findOne({ freelancerId: req.user._id }).select('+extractedText');
  const match = await aiService.matchProfileToJob({
    profile: req.user,
    resumeText: resume?.extractedText || '',
    job,
  });

  const proposal = await Proposal.create({
    jobId: job._id,
    freelancerId: req.user._id,
    coverLetter,
    proposedAmount,
    estimatedDays,
    aiMatch: { ...match.result, provider: match.provider },
  });
  job.proposalCount += 1;
  await job.save();
  await notify(job.clientId, {
    type: 'NEW_PROPOSAL',
    title: 'New proposal received',
    body: `${req.user.name} submitted a proposal on "${job.title}"`,
    link: `/client/jobs/${job._id}/proposals`,
  });
  ok(res, { proposal }, 'Proposal submitted', 201);
});

// Freelancer's own proposals.
const myProposals = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = { freelancerId: req.user._id };
  if (req.query.status) filter.status = req.query.status;
  const [results, total] = await Promise.all([
    Proposal.find(filter)
      .populate('jobId', 'title budget budgetType status category deadline')
      .sort({ createdAt: -1 }).skip(skip).limit(limit),
    Proposal.countDocuments(filter),
  ]);
  ok(res, { results, page, limit, total, totalPages: Math.ceil(total / limit) || 1 });
});

// Client views proposals for their job.
const jobProposals = asyncHandler(async (req, res) => {
  const job = await Job.findOne({ _id: req.params.jobId, clientId: req.user._id });
  if (!job) throw ApiError.notFound('Job not found');
  const filter = { jobId: job._id };
  if (req.query.status) filter.status = req.query.status;
  const results = await Proposal.find(filter)
    .populate('freelancerId', 'name headline skills yearsOfExperience hourlyRate rating reviewCount profileImage location bio')
    .sort({ createdAt: -1 });
  ok(res, { results, job: { _id: job._id, title: job.title, status: job.status } });
});

// Freelancer edits a pending/shortlisted proposal.
const updateProposal = asyncHandler(async (req, res) => {
  const proposal = await Proposal.findOne({ _id: req.params.id, freelancerId: req.user._id });
  if (!proposal) throw ApiError.notFound('Proposal not found');
  if (!['PENDING', 'SHORTLISTED'].includes(proposal.status)) {
    throw ApiError.badRequest('Only pending or shortlisted proposals can be edited');
  }
  ['coverLetter', 'proposedAmount', 'estimatedDays'].forEach((f) => {
    if (req.body[f] !== undefined) proposal[f] = req.body[f];
  });
  await proposal.save();
  ok(res, { proposal }, 'Proposal updated');
});

const withdrawProposal = asyncHandler(async (req, res) => {
  const proposal = await Proposal.findOne({ _id: req.params.id, freelancerId: req.user._id });
  if (!proposal) throw ApiError.notFound('Proposal not found');
  if (!['PENDING', 'SHORTLISTED'].includes(proposal.status)) {
    throw ApiError.badRequest('This proposal can no longer be withdrawn');
  }
  proposal.status = 'WITHDRAWN';
  await proposal.save();
  ok(res, { proposal }, 'Proposal withdrawn');
});

// Client changes proposal status: shortlist | reject.
const setProposalStatus = asyncHandler(async (req, res) => {
  const { action } = req.body;
  const proposal = await Proposal.findById(req.params.id).populate('jobId');
  if (!proposal) throw ApiError.notFound('Proposal not found');
  if (!proposal.jobId.clientId.equals(req.user._id)) throw ApiError.forbidden();

  const transitions = {
    shortlist: { from: ['PENDING'], to: 'SHORTLISTED' },
    reject: { from: ['PENDING', 'SHORTLISTED'], to: 'REJECTED' },
  };
  const t = transitions[action];
  if (!t) throw ApiError.badRequest('Invalid action. Use shortlist or reject.');
  if (!t.from.includes(proposal.status)) {
    throw ApiError.badRequest(`Cannot ${action} a ${proposal.status.toLowerCase()} proposal`);
  }
  proposal.status = t.to;
  await proposal.save();
  await notify(proposal.freelancerId, {
    type: action === 'shortlist' ? 'PROPOSAL_SHORTLISTED' : 'PROPOSAL_REJECTED',
    title: action === 'shortlist' ? 'Proposal shortlisted' : 'Proposal update',
    body: `Your proposal on "${proposal.jobId.title}" was ${action === 'shortlist' ? 'shortlisted' : 'rejected'}.`,
    link: '/freelancer/proposals',
  });
  ok(res, { proposal }, `Proposal ${action}ed`);
});

// Client accepts a proposal -> transactionally creates the project.
const acceptProposal = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  let project;
  try {
    await session.withTransaction(async () => {
      const proposal = await Proposal.findById(req.params.id).populate('jobId').session(session);
      if (!proposal) throw ApiError.notFound('Proposal not found');
      const job = proposal.jobId;
      if (!job.clientId.equals(req.user._id)) throw ApiError.forbidden();
      if (!['PENDING', 'SHORTLISTED'].includes(proposal.status)) {
        throw ApiError.badRequest(`Cannot accept a ${proposal.status.toLowerCase()} proposal`);
      }
      if (['IN_PROGRESS', 'COMPLETED'].includes(job.status)) {
        throw ApiError.badRequest('This job already has an active project');
      }
      proposal.status = 'ACCEPTED';
      await proposal.save({ session });
      await Proposal.updateMany(
        { jobId: job._id, _id: { $ne: proposal._id }, status: { $in: ['PENDING', 'SHORTLISTED'] } },
        { status: 'REJECTED' },
        { session }
      );
      job.status = 'IN_PROGRESS';
      await job.save({ session });
      [project] = await Project.create(
        [{
          jobId: job._id,
          proposalId: proposal._id,
          clientId: job.clientId,
          freelancerId: proposal.freelancerId,
          title: job.title,
          description: job.description,
          budget: proposal.proposedAmount,
          deadline: job.deadline,
          status: 'ACTIVE',
        }],
        { session }
      );
    });
  } finally {
    session.endSession();
  }
  const proposal = await Proposal.findById(req.params.id);
  await notify(proposal.freelancerId, {
    type: 'PROPOSAL_ACCEPTED',
    title: 'Proposal accepted!',
    body: `You were hired for "${project.title}".`,
    link: `/freelancer/projects/${project._id}`,
  });
  ok(res, { project, proposal }, 'Proposal accepted - project created', 201);
});

const getProposal = asyncHandler(async (req, res) => {
  const proposal = await Proposal.findById(req.params.id)
    .populate('jobId', 'title status clientId budget budgetType deadline category')
    .populate('freelancerId', 'name headline skills rating reviewCount profileImage yearsOfExperience hourlyRate location bio');
  if (!proposal) throw ApiError.notFound('Proposal not found');
  const isFreelancer = proposal.freelancerId._id.equals(req.user._id);
  const isClient = proposal.jobId.clientId.equals(req.user._id);
  if (!isFreelancer && !isClient) throw ApiError.forbidden();
  ok(res, { proposal });
});

module.exports = {
  createProposal, myProposals, jobProposals, updateProposal,
  withdrawProposal, setProposalStatus, acceptProposal, getProposal,
};
