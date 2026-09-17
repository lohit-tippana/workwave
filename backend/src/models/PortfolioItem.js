const mongoose = require('mongoose');

const portfolioItemSchema = new mongoose.Schema(
  {
    freelancerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, maxlength: 2000 },
    technologies: [String],
    projectUrl: String,
    images: [{ url: String, publicId: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('PortfolioItem', portfolioItemSchema);
