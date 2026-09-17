const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema(
  {
    freelancerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    file: { url: String, publicId: String, name: String },
    extractedText: { type: String, select: false },
    parsed: { type: mongoose.Schema.Types.Mixed }, // AI-parsed structured resume
    lastAnalysisId: { type: mongoose.Schema.Types.ObjectId, ref: 'AIAnalysis' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Resume', resumeSchema);
