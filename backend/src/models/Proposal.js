const mongoose = require('mongoose');

const proposalSchema = new mongoose.Schema(
  {
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
    freelancerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    coverLetter: { type: String, required: true, maxlength: 5000 },
    proposedAmount: { type: Number, required: true, min: 0 },
    estimatedDays: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ['PENDING', 'SHORTLISTED', 'REJECTED', 'ACCEPTED', 'WITHDRAWN'],
      default: 'PENDING',
      index: true,
    },
    aiMatch: { type: mongoose.Schema.Types.Mixed }, // output of AIService.matchResumeToJob
  },
  { timestamps: true }
);

// One active proposal per freelancer per job (re-application allowed after withdraw/reject).
proposalSchema.index(
  { jobId: 1, freelancerId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['PENDING', 'SHORTLISTED', 'ACCEPTED'] } },
    name: 'unique_active_proposal',
  }
);

module.exports = mongoose.model('Proposal', proposalSchema);
