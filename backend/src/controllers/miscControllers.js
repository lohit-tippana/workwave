const Bookmark = require('../models/Bookmark');
const Job = require('../models/Job');
const Report = require('../models/Report');
const Category = require('../models/Category');
const ApiError = require('../utils/ApiError');
const { asyncHandler, ok, parsePagination } = require('../utils/helpers');
const notificationService = require('../services/notificationService');

// ---------- notifications ----------
const listNotifications = asyncHandler(async (req, res) => {
  const p = parsePagination(req.query, 15);
  ok(res, await notificationService.listForUser(req.user._id, p));
});
const markNotificationRead = asyncHandler(async (req, res) => {
  const n = await notificationService.markRead(req.params.id, req.user._id);
  if (!n) throw ApiError.notFound('Notification not found');
  ok(res, { notification: n });
});
const markAllNotificationsRead = asyncHandler(async (req, res) => {
  await notificationService.markAllRead(req.user._id);
  ok(res, null, 'All notifications marked read');
});

// ---------- bookmarks (freelancer) ----------
const toggleBookmark = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.jobId);
  if (!job || job.isRemoved) throw ApiError.notFound('Job not found');
  const existing = await Bookmark.findOne({ freelancerId: req.user._id, jobId: job._id });
  if (existing) {
    await existing.deleteOne();
    return ok(res, { bookmarked: false }, 'Bookmark removed');
  }
  await Bookmark.create({ freelancerId: req.user._id, jobId: job._id });
  ok(res, { bookmarked: true }, 'Job bookmarked');
});
const listBookmarks = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = { freelancerId: req.user._id };
  const [results, total] = await Promise.all([
    Bookmark.find(filter).populate({ path: 'jobId', populate: { path: 'clientId', select: 'name profileImage' } })
      .sort({ createdAt: -1 }).skip(skip).limit(limit),
    Bookmark.countDocuments(filter),
  ]);
  ok(res, { results: results.map((b) => b.jobId).filter(Boolean), page, limit, total, totalPages: Math.ceil(total / limit) || 1 });
});

// ---------- reports ----------
const createReport = asyncHandler(async (req, res) => {
  const { targetType, targetId, reason, description } = req.body;
  const report = await Report.create({
    reporterId: req.user._id, targetType, targetId, reason, description,
  });
  ok(res, { report }, 'Report submitted. Our team will review it.', 201);
});
const myReports = asyncHandler(async (req, res) => {
  const results = await Report.find({ reporterId: req.user._id }).sort({ createdAt: -1 });
  ok(res, { results });
});

// ---------- categories ----------
const listCategories = asyncHandler(async (req, res) => {
  const results = await Category.find({ isActive: true }).sort({ name: 1 });
  ok(res, { results });
});

module.exports = {
  listNotifications, markNotificationRead, markAllNotificationsRead,
  toggleBookmark, listBookmarks, createReport, myReports, listCategories,
};
