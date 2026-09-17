const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    milestoneId: { type: mongoose.Schema.Types.ObjectId },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    freelancerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    razorpayOrderId: { type: String, index: true },
    razorpayPaymentId: String,
    razorpaySignature: { type: String, select: false },
    amount: { type: Number, required: true }, // in smallest currency unit (paise)
    currency: { type: String, default: 'INR' },
    status: {
      type: String,
      enum: ['CREATED', 'SUCCESS', 'FAILED', 'VERIFICATION_FAILED'],
      default: 'CREATED',
      index: true,
    },
    failureReason: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
