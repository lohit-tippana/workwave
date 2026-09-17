const Resume = require('../models/Resume');
const AIAnalysis = require('../models/AIAnalysis');
const ApiError = require('../utils/ApiError');
const { asyncHandler, ok } = require('../utils/helpers');
const storageService = require('../services/storageService');
const resumeService = require('../services/resumeService');
const aiService = require('../services/aiService');

// Upload (or replace) the freelancer's resume: store file + extract text.
const uploadResume = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No resume file provided (PDF or DOCX)');
  const extractedText = await resumeService.extractText(req.file);
  const existing = await Resume.findOne({ freelancerId: req.user._id });
  if (existing?.file?.publicId) {
    await storageService.deleteFile(existing.file.publicId, { resourceType: 'raw' });
  }
  const stored = await storageService.uploadFile(req.file, { folder: 'resumes', resourceType: 'raw' });
  const resume = await Resume.findOneAndUpdate(
    { freelancerId: req.user._id },
    {
      freelancerId: req.user._id,
      file: { url: stored.url, publicId: stored.publicId, name: stored.name },
      extractedText,
      lastAnalysisId: undefined,
    },
    { upsert: true, new: true }
  );
  ok(res, {
    resume: { _id: resume._id, file: resume.file, updatedAt: resume.updatedAt },
    extractedLength: extractedText.length,
  }, 'Resume uploaded', 201);
});

const getMyResume = asyncHandler(async (req, res) => {
  const resume = await Resume.findOne({ freelancerId: req.user._id });
  if (!resume) return ok(res, { resume: null });
  ok(res, { resume: { _id: resume._id, file: resume.file, parsed: resume.parsed, lastAnalysisId: resume.lastAnalysisId, updatedAt: resume.updatedAt } });
});

const deleteResume = asyncHandler(async (req, res) => {
  const resume = await Resume.findOne({ freelancerId: req.user._id });
  if (!resume) throw ApiError.notFound('No resume on file');
  if (resume.file?.publicId) {
    await storageService.deleteFile(resume.file.publicId, { resourceType: 'raw' });
  }
  await resume.deleteOne();
  ok(res, null, 'Resume deleted');
});

// Runs AI (or fallback) ATS-style analysis on the uploaded resume.
const analyzeMyResume = asyncHandler(async (req, res) => {
  const resume = await Resume.findOne({ freelancerId: req.user._id }).select('+extractedText');
  if (!resume) throw ApiError.badRequest('Upload a resume first');
  const { provider, result } = await aiService.analyzeResume(resume.extractedText);
  const analysis = await AIAnalysis.create({
    userId: req.user._id, type: 'RESUME_ANALYSIS', relatedResumeId: resume._id, provider, result,
  });
  resume.parsed = {
    technicalSkills: result.technicalSkills,
    softSkills: result.softSkills,
    education: result.education,
    experience: result.experience,
    certifications: result.certifications,
  };
  resume.lastAnalysisId = analysis._id;
  await resume.save();
  ok(res, { analysis: { _id: analysis._id, provider, result, createdAt: analysis.createdAt } }, 'Resume analyzed');
});

const latestAnalysis = asyncHandler(async (req, res) => {
  const analysis = await AIAnalysis.findOne({ userId: req.user._id, type: 'RESUME_ANALYSIS' }).sort({ createdAt: -1 });
  ok(res, { analysis });
});

module.exports = { uploadResume, getMyResume, deleteResume, analyzeMyResume, latestAnalysis };
