const Project = require('../models/Project');
const Payment = require('../models/Payment');
const ApiError = require('../utils/ApiError');
const { asyncHandler, ok, parsePagination } = require('../utils/helpers');
const { notify } = require('../services/notificationService');
const storageService = require('../services/storageService');

// Loads a project and verifies the requester is a participant (or admin).
async function loadProject(req) {
  const project = await Project.findById(req.params.id)
    .populate('clientId', 'name profileImage rating company')
    .populate('freelancerId', 'name profileImage rating headline skills')
    .populate('jobId', 'title category');
  if (!project) throw ApiError.notFound('Project not found');
  const uid = req.user._id;
  const isParticipant =
    project.clientId._id.equals(uid) || project.freelancerId._id.equals(uid) || req.user.role === 'admin';
  if (!isParticipant) throw ApiError.forbidden();
  return project;
}

const listProjects = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = req.user.role === 'client' ? { clientId: req.user._id } : { freelancerId: req.user._id };
  if (req.query.status) filter.status = req.query.status;
  const [results, total] = await Promise.all([
    Project.find(filter)
      .populate('clientId', 'name profileImage')
      .populate('freelancerId', 'name profileImage headline')
      .sort({ createdAt: -1 }).skip(skip).limit(limit),
    Project.countDocuments(filter),
  ]);
  ok(res, { results, page, limit, total, totalPages: Math.ceil(total / limit) || 1 });
});

const getProject = asyncHandler(async (req, res) => {
  const project = await loadProject(req);
  const payments = await Payment.find({ projectId: project._id }).sort({ createdAt: -1 });
  ok(res, { project, payments });
});

// ---- milestones ----
const addMilestone = asyncHandler(async (req, res) => {
  const project = await loadProject(req);
  if (!project.clientId._id.equals(req.user._id) && req.user.role !== 'admin') {
    throw ApiError.forbidden('Only the client can define milestones');
  }
  if (!['ACTIVE', 'PENDING'].includes(project.status)) {
    throw ApiError.badRequest('Milestones can only be added to an active project');
  }
  const { title, description, amount, dueDate } = req.body;
  project.milestones.push({ title, description, amount, dueDate });
  await project.save();
  await notify(project.freelancerId._id, {
    type: 'MILESTONE_CREATED', title: 'New milestone added',
    body: `"${title}" was added to project "${project.title}".`,
    link: `/freelancer/projects/${project._id}`,
  });
  ok(res, { project }, 'Milestone added', 201);
});

function getMilestone(project, milestoneId) {
  const m = project.milestones.id(milestoneId);
  if (!m) throw ApiError.notFound('Milestone not found');
  return m;
}

const startMilestone = asyncHandler(async (req, res) => {
  const project = await loadProject(req);
  if (!project.freelancerId._id.equals(req.user._id)) throw ApiError.forbidden('Only the assigned freelancer can start a milestone');
  const m = getMilestone(project, req.params.milestoneId);
  if (m.status !== 'PENDING') throw ApiError.badRequest(`Milestone is ${m.status}`);
  m.status = 'IN_PROGRESS';
  await project.save();
  ok(res, { project }, 'Milestone started');
});

const submitMilestone = asyncHandler(async (req, res) => {
  const project = await loadProject(req);
  if (!project.freelancerId._id.equals(req.user._id)) throw ApiError.forbidden();
  const m = getMilestone(project, req.params.milestoneId);
  if (!['IN_PROGRESS', 'REVISION_REQUESTED'].includes(m.status)) {
    throw ApiError.badRequest(`Milestone is ${m.status} - start it first`);
  }
  const files = [];
  if (req.files?.length) {
    for (const f of req.files) {
      const stored = await storageService.uploadFile(f, { folder: 'submissions' });
      files.push({ url: stored.url, publicId: stored.publicId, name: stored.name });
    }
  }
  m.submission = { note: req.body.note || '', files, submittedAt: new Date() };
  m.status = 'SUBMITTED';
  project.status = 'IN_REVIEW';
  await project.save();
  await notify(project.clientId._id, {
    type: 'MILESTONE_SUBMITTED', title: 'Milestone submitted',
    body: `"${m.title}" was submitted for review on "${project.title}".`,
    link: `/client/projects/${project._id}`,
  });
  ok(res, { project }, 'Milestone submitted for review');
});

const reviewMilestone = asyncHandler(async (req, res) => {
  const { action, note } = req.body; // approve | request_revision
  const project = await loadProject(req);
  if (!project.clientId._id.equals(req.user._id)) throw ApiError.forbidden('Only the client can review milestones');
  const m = getMilestone(project, req.params.milestoneId);
  if (m.status !== 'SUBMITTED') throw ApiError.badRequest('Milestone is not awaiting review');
  if (action === 'approve') {
    m.status = 'APPROVED';
    project.status = 'ACTIVE';
    await notify(project.freelancerId._id, {
      type: 'MILESTONE_APPROVED', title: 'Milestone approved',
      body: `"${m.title}" on "${project.title}" was approved.`,
      link: `/freelancer/projects/${project._id}`,
    });
  } else if (action === 'request_revision') {
    m.status = 'REVISION_REQUESTED';
    m.revisionNote = note || '';
    project.status = 'REVISION_REQUESTED';
    await notify(project.freelancerId._id, {
      type: 'REVISION_REQUESTED', title: 'Revision requested',
      body: `Changes requested on "${m.title}": ${note || 'see project details'}`,
      link: `/freelancer/projects/${project._id}`,
    });
  } else {
    throw ApiError.badRequest('Invalid action. Use approve or request_revision.');
  }
  recalcProgress(project);
  await project.save();
  ok(res, { project }, `Milestone ${action === 'approve' ? 'approved' : 'sent back for revision'}`);
});

const completeMilestone = asyncHandler(async (req, res) => {
  const project = await loadProject(req);
  if (!project.clientId._id.equals(req.user._id)) throw ApiError.forbidden();
  const m = getMilestone(project, req.params.milestoneId);
  if (m.status !== 'APPROVED') throw ApiError.badRequest('Milestone must be approved (and paid) before completion');
  m.status = 'COMPLETED';
  recalcProgress(project);
  await project.save();
  ok(res, { project }, 'Milestone completed');
});

function recalcProgress(project) {
  if (!project.milestones.length) return;
  const done = project.milestones.filter((m) => ['APPROVED', 'COMPLETED'].includes(m.status)).length;
  project.progress = Math.round((done / project.milestones.length) * 100);
}

const updateProgress = asyncHandler(async (req, res) => {
  const project = await loadProject(req);
  if (!project.freelancerId._id.equals(req.user._id)) throw ApiError.forbidden();
  const p = Number(req.body.progress);
  if (Number.isNaN(p) || p < 0 || p > 100) throw ApiError.badRequest('Progress must be 0-100');
  project.progress = p;
  await project.save();
  ok(res, { project }, 'Progress updated');
});

const completeProject = asyncHandler(async (req, res) => {
  const project = await loadProject(req);
  if (!project.clientId._id.equals(req.user._id)) throw ApiError.forbidden('Only the client can complete a project');
  if (!['ACTIVE', 'IN_REVIEW', 'REVISION_REQUESTED'].includes(project.status)) {
    throw ApiError.badRequest(`Project is ${project.status}`);
  }
  project.status = 'COMPLETED';
  project.progress = 100;
  await project.save();
  // Reflect completion on the originating job.
  const Job = require('../models/Job');
  await Job.findByIdAndUpdate(project.jobId._id || project.jobId, { status: 'COMPLETED' });
  await notify(project.freelancerId._id, {
    type: 'PROJECT_COMPLETED', title: 'Project completed',
    body: `"${project.title}" was marked complete.`,
    link: `/freelancer/projects/${project._id}`,
  });
  ok(res, { project }, 'Project completed');
});

const cancelProject = asyncHandler(async (req, res) => {
  const project = await loadProject(req);
  const uid = req.user._id;
  if (!project.clientId._id.equals(uid) && req.user.role !== 'admin') {
    throw ApiError.forbidden('Only the client or admin can cancel a project');
  }
  if (project.status === 'COMPLETED') throw ApiError.badRequest('Cannot cancel a completed project');
  project.status = 'CANCELLED';
  await project.save();
  ok(res, { project }, 'Project cancelled');
});

module.exports = {
  listProjects, getProject, addMilestone, startMilestone, submitMilestone,
  reviewMilestone, completeMilestone, updateProgress, completeProject, cancelProject,
};
