const Job = require('../models/Job');
const Proposal = require('../models/Proposal');
const Project = require('../models/Project');
const Payment = require('../models/Payment');
const Message = require('../models/Message');
const AIAnalysis = require('../models/AIAnalysis');
const Resume = require('../models/Resume');
const { asyncHandler, ok } = require('../utils/helpers');

const clientDashboard = asyncHandler(async (req, res) => {
  const uid = req.user._id;
  const [activeJobs, openJobs, proposalsReceived, activeProjects, completedProjects, spending, pendingPayments, recentJobs] =
    await Promise.all([
      Job.countDocuments({ clientId: uid, status: 'IN_PROGRESS' }),
      Job.countDocuments({ clientId: uid, status: 'OPEN' }),
      Proposal.countDocuments({ status: 'PENDING', jobId: { $in: await Job.find({ clientId: uid }).distinct('_id') } }),
      Project.countDocuments({ clientId: uid, status: { $in: ['ACTIVE', 'IN_REVIEW', 'REVISION_REQUESTED'] } }),
      Project.countDocuments({ clientId: uid, status: 'COMPLETED' }),
      Payment.aggregate([
        { $match: { clientId: uid, status: 'SUCCESS' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Payment.countDocuments({ clientId: uid, status: 'CREATED' }),
      Job.find({ clientId: uid }).sort({ createdAt: -1 }).limit(5),
    ]);
  ok(res, {
    stats: {
      activeJobs, openJobs, proposalsReceived, activeProjects, completedProjects,
      totalSpent: (spending[0]?.total || 0) / 100,
      pendingPayments,
    },
    recentJobs,
  });
});

const freelancerDashboard = asyncHandler(async (req, res) => {
  const uid = req.user._id;
  const [activeProposals, activeProjects, completedProjects, earnings, unreadMessages, latestAnalysis, resume, upcoming] =
    await Promise.all([
      Proposal.countDocuments({ freelancerId: uid, status: { $in: ['PENDING', 'SHORTLISTED'] } }),
      Project.countDocuments({ freelancerId: uid, status: { $in: ['ACTIVE', 'IN_REVIEW', 'REVISION_REQUESTED'] } }),
      Project.countDocuments({ freelancerId: uid, status: 'COMPLETED' }),
      Payment.aggregate([
        { $match: { freelancerId: uid, status: 'SUCCESS' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Message.countDocuments({ readBy: { $ne: uid }, senderId: { $ne: uid } }),
      AIAnalysis.findOne({ userId: uid, type: 'RESUME_ANALYSIS' }).sort({ createdAt: -1 }),
      Resume.findOne({ freelancerId: uid }),
      Project.find({ freelancerId: uid, deadline: { $gte: new Date() }, status: { $in: ['ACTIVE', 'IN_REVIEW'] } })
        .sort({ deadline: 1 }).limit(5).select('title deadline status'),
    ]);
  // Rough profile completion heuristic.
  const u = req.user;
  const fields = [u.headline, u.bio, u.skills?.length, u.hourlyRate, u.location, u.profileImage?.url, u.yearsOfExperience];
  const profileCompletion = Math.round((fields.filter(Boolean).length / fields.length) * 100);
  ok(res, {
    stats: {
      activeProposals, activeProjects, completedProjects,
      totalEarned: (earnings[0]?.total || 0) / 100,
      unreadMessages, profileCompletion,
      resumeScore: latestAnalysis?.result?.overallScore ?? null,
      hasResume: Boolean(resume),
    },
    upcomingDeadlines: upcoming,
  });
});

module.exports = { clientDashboard, freelancerDashboard };
