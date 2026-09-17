const mongoose = require('mongoose');

const aiAnalysisSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['RESUME_ANALYSIS', 'JOB_ANALYSIS', 'JOB_MATCH', 'RECOMMENDATIONS', 'PROPOSAL_DRAFT'],
      required: true,
      index: true,
    },
    relatedJobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
    relatedResumeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume' },
    provider: { type: String, enum: ['gemini', 'fallback'], required: true },
    result: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

aiAnalysisSchema.index({ userId: 1, type: 1, createdAt: -1 });

module.exports = mongoose.model('AIAnalysis', aiAnalysisSchema);
