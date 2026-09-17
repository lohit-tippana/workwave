const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
  {
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, required: true, maxlength: 10000 },
    category: { type: String, required: true, index: true },
    requiredSkills: [{ type: String, trim: true }],
    experienceLevel: {
      type: String,
      enum: ['entry', 'intermediate', 'expert'],
      default: 'intermediate',
    },
    budget: { type: Number, required: true, min: 0 },
    budgetType: { type: String, enum: ['fixed', 'hourly'], default: 'fixed' },
    deadline: Date,
    attachments: [{ url: String, publicId: String, name: String }],
    status: {
      type: String,
      enum: ['DRAFT', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'],
      default: 'DRAFT',
      index: true,
    },
    aiAnalysis: { type: mongoose.Schema.Types.Mixed }, // output of AIService.analyzeJobDescription
    proposalCount: { type: Number, default: 0 },
    isRemoved: { type: Boolean, default: false }, // admin moderation
  },
  { timestamps: true }
);

jobSchema.index({ title: 'text', description: 'text', requiredSkills: 'text' });
jobSchema.index({ status: 1, createdAt: -1 });
jobSchema.index({ requiredSkills: 1 });

module.exports = mongoose.model('Job', jobSchema);
