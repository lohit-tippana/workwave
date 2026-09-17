const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    lastMessage: { text: String, senderId: mongoose.Schema.Types.ObjectId, createdAt: Date },
    unreadCounts: { type: Map, of: Number, default: {} },
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1 });
conversationSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
