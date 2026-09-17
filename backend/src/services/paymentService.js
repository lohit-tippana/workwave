const crypto = require('crypto');
const config = require('../config');
const ApiError = require('../utils/ApiError');

let razorpay = null;
function getClient() {
  if (!config.isRazorpayConfigured()) {
    throw ApiError.serviceUnavailable(
      'Payments are not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to enable Razorpay checkout.'
    );
  }
  if (!razorpay) {
    const Razorpay = require('razorpay');
    razorpay = new Razorpay({ key_id: config.razorpay.keyId, key_secret: config.razorpay.keySecret });
  }
  return razorpay;
}

// Creates a Razorpay order. amount is in major units (e.g. INR rupees).
async function createOrder({ amount, currency = 'INR', receipt }) {
  const client = getClient();
  const order = await client.orders.create({
    amount: Math.round(amount * 100), // paise
    currency,
    receipt: String(receipt).slice(0, 40),
  });
  return order;
}

/**
 * Verifies checkout signature: HMAC-SHA256(order_id + "|" + payment_id, secret).
 * This is the server-side trust anchor - frontend payment status is never trusted.
 */
function verifyPaymentSignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
  if (!config.isRazorpayConfigured()) return false;
  const expected = crypto
    .createHmac('sha256', config.razorpay.keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');
  // Constant-time comparison to avoid timing attacks.
  const a = Buffer.from(expected);
  const b = Buffer.from(String(razorpaySignature || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { createOrder, verifyPaymentSignature, isConfigured: () => config.isRazorpayConfigured() };
