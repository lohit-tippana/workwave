const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: String,
    amount: { type: Number, required: true, min: 0 },
    dueDate: Date,
    status: {
      type: String,
      enum: ['PENDING', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REVISION_REQUESTED', 'COMPLETED'],
      default: 'PENDING',
    },
    submission: {
      note: String,
      files: [{ url: String, publicId: String, name: String }],
      submittedAt: Date,
    },
    revisionNote: String,
  },
  { timestamps: true }
);

const projectSchema = new mongoose.Schema(
  {
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    proposalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Proposal', required: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    freelancerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    description: String,
    budget: { type: Number, required: true, min: 0 },
    deadline: Date,
    progress: { type: Number, default: 0, min: 0, max: 100 },
    status: {
      type: String,
      enum: ['PENDING', 'ACTIVE', 'IN_REVIEW', 'REVISION_REQUESTED', 'COMPLETED', 'CANCELLED'],
      default: 'ACTIVE',
      index: true,
    },
    milestones: [milestoneSchema],
    clientReviewed: { type: Boolean, default: false },
    freelancerReviewed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Project', projectSchema);
