const User = require('../models/User');
const PortfolioItem = require('../models/PortfolioItem');
const Review = require('../models/Review');
const ApiError = require('../utils/ApiError');
const { asyncHandler, ok, parsePagination, escapeRegex } = require('../utils/helpers');
const storageService = require('../services/storageService');

const PROFILE_FIELDS = [
  'name', 'headline', 'bio', 'skills', 'yearsOfExperience', 'hourlyRate',
  'location', 'languages', 'education', 'certifications', 'workHistory',
  'availability', 'company',
];

const updateProfile = asyncHandler(async (req, res) => {
  const updates = {};
  for (const f of PROFILE_FIELDS) if (req.body[f] !== undefined) updates[f] = req.body[f];
  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
  ok(res, { user: user.toSafeObject() }, 'Profile updated');
});

const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No image provided');
  const stored = await storageService.uploadFile(req.file, { folder: 'avatars', resourceType: 'image' });
  if (req.user.profileImage?.publicId) {
    await storageService.deleteFile(req.user.profileImage.publicId, { resourceType: 'image' });
  }
  req.user.profileImage = { url: stored.url, publicId: stored.publicId };
  await req.user.save();
  ok(res, { profileImage: req.user.profileImage }, 'Profile image updated');
});

// Public freelancer directory (search/filter/pagination).
const listFreelancers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = { role: 'freelancer', isSuspended: false };
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(req.query.q), 'i');
    filter.$or = [{ name: rx }, { headline: rx }, { skills: rx }];
  }
  if (req.query.skill) filter.skills = { $in: [new RegExp(escapeRegex(req.query.skill), 'i')] };
  if (req.query.minRating) filter.rating = { $gte: Number(req.query.minRating) };
  if (req.query.maxRate) filter.hourlyRate = { $lte: Number(req.query.maxRate) };
  if (req.query.availability) filter.availability = req.query.availability;
  const [results, total] = await Promise.all([
    User.find(filter).sort({ rating: -1, reviewCount: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  ok(res, {
    results: results.map((u) => u.toSafeObject()),
    page, limit, total, totalPages: Math.ceil(total / limit) || 1,
  });
});

// Public profile + portfolio + reviews for a freelancer.
const getFreelancerProfile = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: 'freelancer', isSuspended: false });
  if (!user) throw ApiError.notFound('Freelancer not found');
  const [portfolio, reviews] = await Promise.all([
    PortfolioItem.find({ freelancerId: user._id }).sort({ createdAt: -1 }),
    Review.find({ reviewedUserId: user._id })
      .populate('reviewerId', 'name profileImage')
      .sort({ createdAt: -1 })
      .limit(10),
  ]);
  ok(res, { user: user.toSafeObject(), portfolio, reviews });
});

// ---- portfolio CRUD (owner only) ----
const addPortfolioItem = asyncHandler(async (req, res) => {
  const { title, description, technologies, projectUrl } = req.body;
  const item = await PortfolioItem.create({
    freelancerId: req.user._id,
    title, description,
    technologies: Array.isArray(technologies) ? technologies : String(technologies || '').split(',').map((s) => s.trim()).filter(Boolean),
    projectUrl,
  });
  ok(res, { item }, 'Portfolio item added', 201);
});

const updatePortfolioItem = asyncHandler(async (req, res) => {
  const item = await PortfolioItem.findOne({ _id: req.params.id, freelancerId: req.user._id });
  if (!item) throw ApiError.notFound('Portfolio item not found');
  ['title', 'description', 'technologies', 'projectUrl'].forEach((f) => {
    if (req.body[f] !== undefined) item[f] = req.body[f];
  });
  await item.save();
  ok(res, { item }, 'Portfolio item updated');
});

const deletePortfolioItem = asyncHandler(async (req, res) => {
  const item = await PortfolioItem.findOneAndDelete({ _id: req.params.id, freelancerId: req.user._id });
  if (!item) throw ApiError.notFound('Portfolio item not found');
  ok(res, null, 'Portfolio item deleted');
});

const uploadPortfolioImage = asyncHandler(async (req, res) => {
  const item = await PortfolioItem.findOne({ _id: req.params.id, freelancerId: req.user._id });
  if (!item) throw ApiError.notFound('Portfolio item not found');
  if (!req.file) throw ApiError.badRequest('No image provided');
  const stored = await storageService.uploadFile(req.file, { folder: 'portfolio', resourceType: 'image' });
  item.images.push({ url: stored.url, publicId: stored.publicId });
  await item.save();
  ok(res, { item }, 'Image added');
});

const myPortfolio = asyncHandler(async (req, res) => {
  const items = await PortfolioItem.find({ freelancerId: req.user._id }).sort({ createdAt: -1 });
  ok(res, { items });
});

module.exports = {
  updateProfile, uploadAvatar, listFreelancers, getFreelancerProfile,
  addPortfolioItem, updatePortfolioItem, deletePortfolioItem, uploadPortfolioImage, myPortfolio,
};
