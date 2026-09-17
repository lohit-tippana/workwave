const Review = require('../models/Review');
const Project = require('../models/Project');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { asyncHandler, ok, parsePagination } = require('../utils/helpers');
const { notify } = require('../services/notificationService');

// Reviews are allowed only between participants of a COMPLETED project,
// once per direction per project.
const createReview = asyncHandler(async (req, res) => {
  const { projectId, rating, text } = req.body;
  const project = await Project.findById(projectId);
  if (!project) throw ApiError.notFound('Project not found');
  if (project.status !== 'COMPLETED') {
    throw ApiError.badRequest('Reviews are only allowed after project completion');
  }
  const isClient = project.clientId.equals(req.user._id);
  const isFreelancer = project.freelancerId.equals(req.user._id);
  if (!isClient && !isFreelancer) throw ApiError.forbidden();
  const reviewedUserId = isClient ? project.freelancerId : project.clientId;

  const existing = await Review.findOne({ projectId, reviewerId: req.user._id });
  if (existing) throw ApiError.conflict('You already reviewed this project');

  const review = await Review.create({
    projectId, reviewerId: req.user._id, reviewedUserId, rating, text,
  });

  if (isClient) project.clientReviewed = true; else project.freelancerReviewed = true;
  await project.save();

  // Recompute the reviewed user's aggregate rating.
  const agg = await Review.aggregate([
    { $match: { reviewedUserId } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  if (agg.length) {
    await User.findByIdAndUpdate(reviewedUserId, {
      rating: Math.round(agg[0].avg * 10) / 10,
      reviewCount: agg[0].count,
    });
  }
  await notify(reviewedUserId, {
    type: 'REVIEW_RECEIVED', title: 'New review received',
    body: `${req.user.name} left you a ${rating}-star review.`,
    link: `/${isClient ? 'freelancer' : 'client'}/profile`,
  });
  ok(res, { review }, 'Review submitted', 201);
});

const userReviews = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const [results, total] = await Promise.all([
    Review.find({ reviewedUserId: req.params.userId })
      .populate('reviewerId', 'name profileImage role')
      .populate('projectId', 'title')
      .sort({ createdAt: -1 }).skip(skip).limit(limit),
    Review.countDocuments({ reviewedUserId: req.params.userId }),
  ]);
  ok(res, { results, page, limit, total, totalPages: Math.ceil(total / limit) || 1 });
});

module.exports = { createReview, userReviews };
