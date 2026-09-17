const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, restrictTo } = require('../middleware/auth');
const { uploadImage, uploadDocument, uploadAny } = require('../middleware/upload');

const auth = require('../controllers/authController');
const users = require('../controllers/userController');
const jobs = require('../controllers/jobController');
const proposals = require('../controllers/proposalController');
const projects = require('../controllers/projectController');
const messages = require('../controllers/messageController');
const reviews = require('../controllers/reviewController');
const payments = require('../controllers/paymentController');
const resumes = require('../controllers/resumeController');
const ai = require('../controllers/aiController');
const misc = require('../controllers/miscControllers');
const admin = require('../controllers/adminController');
const dashboard = require('../controllers/dashboardController');

const router = Router();

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: process.env.NODE_ENV === 'test' ? 10000 : 30, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many attempts, try again later' } });
const objectId = (name) => param(name).isMongoId().withMessage(`Invalid ${name}`);

// ---------- auth ----------
router.post('/auth/register', authLimiter, [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name is required (2-100 chars)'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').isIn(['client', 'freelancer']).withMessage('Role must be client or freelancer'),
], validate, auth.register);

router.post('/auth/login', authLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], validate, auth.login);

router.post('/auth/forgot-password', authLimiter, [body('email').isEmail().normalizeEmail()], validate, auth.forgotPassword);
router.post('/auth/reset-password', authLimiter, [
  body('token').notEmpty(), body('password').isLength({ min: 8 }),
], validate, auth.resetPassword);
router.get('/auth/me', protect, auth.getMe);

// ---------- users / profiles ----------
router.get('/users/freelancers', users.listFreelancers);
router.get('/users/freelancers/:id', objectId('id'), validate, users.getFreelancerProfile);
router.put('/users/profile', protect, users.updateProfile);
router.post('/users/avatar', protect, uploadImage.single('image'), users.uploadAvatar);
router.get('/users/portfolio/me', protect, restrictTo('freelancer'), users.myPortfolio);
router.post('/users/portfolio', protect, restrictTo('freelancer'), [
  body('title').trim().isLength({ min: 2, max: 150 }),
], validate, users.addPortfolioItem);
router.put('/users/portfolio/:id', protect, restrictTo('freelancer'), objectId('id'), validate, users.updatePortfolioItem);
router.delete('/users/portfolio/:id', protect, restrictTo('freelancer'), objectId('id'), validate, users.deletePortfolioItem);
router.post('/users/portfolio/:id/images', protect, restrictTo('freelancer'), objectId('id'), validate, uploadImage.single('image'), users.uploadPortfolioImage);

// ---------- dashboard ----------
router.get('/dashboard/client', protect, restrictTo('client'), dashboard.clientDashboard);
router.get('/dashboard/freelancer', protect, restrictTo('freelancer'), dashboard.freelancerDashboard);

// ---------- jobs ----------
router.get('/jobs', jobs.listJobs);
router.get('/jobs/mine', protect, restrictTo('client'), jobs.myJobs);
router.get('/jobs/:id', objectId('id'), validate, optionalAuth, jobs.getJob);
router.post('/jobs', protect, restrictTo('client'), [
  body('title').trim().isLength({ min: 5, max: 150 }),
  body('description').trim().isLength({ min: 30 }),
  body('category').trim().notEmpty(),
  body('budget').isFloat({ min: 1 }),
  body('budgetType').optional().isIn(['fixed', 'hourly']),
  body('experienceLevel').optional().isIn(['entry', 'intermediate', 'expert']),
], validate, jobs.createJob);
router.put('/jobs/:id', protect, restrictTo('client'), objectId('id'), validate, jobs.updateJob);
router.delete('/jobs/:id', protect, restrictTo('client'), objectId('id'), validate, jobs.deleteJob);
router.post('/jobs/:id/status', protect, restrictTo('client'), [
  objectId('id'), body('action').isIn(['publish', 'unpublish', 'close']),
], validate, jobs.setJobStatus);
router.post('/jobs/:id/analyze', protect, restrictTo('client'), objectId('id'), validate, jobs.analyzeJob);
router.post('/jobs/:id/attachments', protect, restrictTo('client'), objectId('id'), validate, uploadAny.single('file'), jobs.uploadJobAttachment);

// optional auth: attaches req.user when a valid token exists, never rejects
const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');
async function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(header.slice(7), config.jwt.secret);
      req.user = (await User.findById(payload.id)) || undefined;
    } catch { /* anonymous */ }
  }
  next();
}

// ---------- proposals ----------
router.post('/proposals', protect, restrictTo('freelancer'), [
  body('jobId').isMongoId(),
  body('coverLetter').trim().isLength({ min: 30, max: 5000 }).withMessage('Cover letter must be 30-5000 chars'),
  body('proposedAmount').isFloat({ min: 1 }),
  body('estimatedDays').isInt({ min: 1 }),
], validate, proposals.createProposal);
router.get('/proposals/mine', protect, restrictTo('freelancer'), proposals.myProposals);
router.get('/proposals/job/:jobId', protect, restrictTo('client'), objectId('jobId'), validate, proposals.jobProposals);
router.get('/proposals/:id', protect, objectId('id'), validate, proposals.getProposal);
router.put('/proposals/:id', protect, restrictTo('freelancer'), objectId('id'), validate, proposals.updateProposal);
router.post('/proposals/:id/withdraw', protect, restrictTo('freelancer'), objectId('id'), validate, proposals.withdrawProposal);
router.post('/proposals/:id/status', protect, restrictTo('client'), [
  objectId('id'), body('action').isIn(['shortlist', 'reject']),
], validate, proposals.setProposalStatus);
router.post('/proposals/:id/accept', protect, restrictTo('client'), objectId('id'), validate, proposals.acceptProposal);

// ---------- projects & milestones ----------
router.get('/projects', protect, projects.listProjects);
router.get('/projects/:id', protect, objectId('id'), validate, projects.getProject);
router.post('/projects/:id/milestones', protect, restrictTo('client'), [
  objectId('id'),
  body('title').trim().isLength({ min: 2, max: 150 }),
  body('amount').isFloat({ min: 1 }),
], validate, projects.addMilestone);
router.post('/projects/:id/milestones/:milestoneId/start', protect, restrictTo('freelancer'), projects.startMilestone);
router.post('/projects/:id/milestones/:milestoneId/submit', protect, restrictTo('freelancer'), uploadAny.array('files', 5), projects.submitMilestone);
router.post('/projects/:id/milestones/:milestoneId/review', protect, restrictTo('client'), [
  body('action').isIn(['approve', 'request_revision']),
], validate, projects.reviewMilestone);
router.post('/projects/:id/milestones/:milestoneId/complete', protect, restrictTo('client'), projects.completeMilestone);
router.put('/projects/:id/progress', protect, restrictTo('freelancer'), objectId('id'), validate, projects.updateProgress);
router.post('/projects/:id/complete', protect, restrictTo('client'), objectId('id'), validate, projects.completeProject);
router.post('/projects/:id/cancel', protect, objectId('id'), validate, projects.cancelProject);

// ---------- messages ----------
router.post('/messages/conversations', protect, [body('otherUserId').isMongoId()], validate, messages.startConversation);
router.get('/messages/conversations', protect, messages.listConversations);
router.get('/messages/conversations/:conversationId/messages', protect, objectId('conversationId'), validate, messages.listMessages);
router.post('/messages/conversations/:conversationId/messages', protect, [
  objectId('conversationId'), body('text').trim().isLength({ min: 1, max: 4000 }),
], validate, messages.sendMessage);

// ---------- reviews ----------
router.post('/reviews', protect, [
  body('projectId').isMongoId(),
  body('rating').isInt({ min: 1, max: 5 }),
  body('text').optional().isLength({ max: 2000 }),
], validate, reviews.createReview);
router.get('/reviews/user/:userId', objectId('userId'), validate, reviews.userReviews);

// ---------- payments ----------
router.get('/payments/config', payments.paymentConfig);
router.get('/payments', protect, payments.listPayments);
router.post('/payments/order', protect, restrictTo('client'), [
  body('projectId').isMongoId(), body('milestoneId').optional().isMongoId(),
], validate, payments.createOrder);
router.post('/payments/verify', protect, restrictTo('client'), [
  body('razorpayOrderId').notEmpty(), body('razorpayPaymentId').notEmpty(), body('razorpaySignature').notEmpty(),
], validate, payments.verifyPayment);
router.post('/payments/failed', protect, restrictTo('client'), [body('razorpayOrderId').notEmpty()], validate, payments.markFailed);

// ---------- resume & AI ----------
router.post('/resumes', protect, restrictTo('freelancer'), uploadDocument.single('resume'), resumes.uploadResume);
router.get('/resumes/mine', protect, restrictTo('freelancer'), resumes.getMyResume);
router.delete('/resumes/mine', protect, restrictTo('freelancer'), resumes.deleteResume);
router.post('/resumes/analyze', protect, restrictTo('freelancer'), resumes.analyzeMyResume);
router.get('/resumes/analysis/latest', protect, restrictTo('freelancer'), resumes.latestAnalysis);

router.get('/ai/match/:jobId', protect, restrictTo('freelancer'), objectId('jobId'), validate, ai.matchJob);
router.get('/ai/recommendations', protect, restrictTo('freelancer'), ai.recommendations);
router.post('/ai/proposal-draft', protect, restrictTo('freelancer'), [body('jobId').isMongoId()], validate, ai.proposalDraft);
router.post('/ai/analyze-description', protect, restrictTo('client'), ai.analyzeDescription);

// ---------- notifications, bookmarks, reports, categories ----------
router.get('/notifications', protect, misc.listNotifications);
router.post('/notifications/:id/read', protect, misc.markNotificationRead);
router.post('/notifications/read-all', protect, misc.markAllNotificationsRead);

router.post('/bookmarks/:jobId', protect, restrictTo('freelancer'), objectId('jobId'), validate, misc.toggleBookmark);
router.get('/bookmarks', protect, restrictTo('freelancer'), misc.listBookmarks);

router.post('/reports', protect, [
  body('targetType').isIn(['job', 'user', 'proposal', 'message']),
  body('targetId').isMongoId(),
  body('reason').trim().isLength({ min: 3, max: 200 }),
], validate, misc.createReport);
router.get('/reports/mine', protect, misc.myReports);

router.get('/categories', misc.listCategories);

// ---------- admin ----------
router.get('/admin/stats', protect, restrictTo('admin'), admin.stats);
router.get('/admin/users', protect, restrictTo('admin'), admin.listUsers);
router.post('/admin/users/:id/suspension', protect, restrictTo('admin'), [objectId('id'), body('suspended').isBoolean()], validate, admin.setUserSuspended);
router.get('/admin/jobs', protect, restrictTo('admin'), admin.listJobs);
router.post('/admin/jobs/:id/moderation', protect, restrictTo('admin'), [objectId('id'), body('removed').isBoolean()], validate, admin.setJobRemoved);
router.get('/admin/reports', protect, restrictTo('admin'), admin.listReports);
router.post('/admin/reports/:id/resolve', protect, restrictTo('admin'), objectId('id'), validate, admin.resolveReport);
router.get('/admin/payments', protect, restrictTo('admin'), admin.listPayments);
router.get('/admin/categories', protect, restrictTo('admin'), admin.listAllCategories);
router.post('/admin/categories', protect, restrictTo('admin'), [body('name').trim().isLength({ min: 2, max: 60 })], validate, admin.createCategory);
router.put('/admin/categories/:id', protect, restrictTo('admin'), objectId('id'), validate, admin.updateCategory);
router.delete('/admin/categories/:id', protect, restrictTo('admin'), objectId('id'), validate, admin.deleteCategory);

module.exports = router;
