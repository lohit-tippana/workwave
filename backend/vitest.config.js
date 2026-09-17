module.exports = {
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 60000,
    hookTimeout: 60000,
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-secret',
      RAZORPAY_KEY_ID: 'rzp_test_fake',
      RAZORPAY_KEY_SECRET: 'test-razorpay-secret',
    },
  },
};
