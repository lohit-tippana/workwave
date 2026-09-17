const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    targetType: { type: String, enum: ['job', 'user', 'proposal', 'message'], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    reason: { type: String, required: true, maxlength: 200 },
    description: { type: String, maxlength: 2000 },
    status: { type: String, enum: ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'], default: 'OPEN', index: true },
    resolutionNote: String,
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Report', reportSchema);
