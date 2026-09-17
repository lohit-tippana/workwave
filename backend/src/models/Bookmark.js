const mongoose = require('mongoose');

const bookmarkSchema = new mongoose.Schema(
  {
    freelancerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  },
  { timestamps: true }
);

bookmarkSchema.index({ freelancerId: 1, jobId: 1 }, { unique: true });

module.exports = mongoose.model('Bookmark', bookmarkSchema);
