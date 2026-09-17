const app = require('./app');
const config = require('./config');
const { connectDB, isMemoryDb } = require('./config/db');

async function main() {
  await connectDB();
  if (isMemoryDb() && process.env.SEED_DEMO !== 'false') {
    // In-memory mode is for local demos — seed it so the app is usable immediately.
    await require('./seed/seed').seedData();
  }
  app.listen(config.port, () => {
    console.log(`[server] WorkWave API listening on http://localhost:${config.port}`);
    console.log(`[server] AI: ${config.isGeminiConfigured() ? 'Gemini' : 'local fallback analyzer'} | Payments: ${config.isRazorpayConfigured() ? 'Razorpay' : 'disabled'} | Storage: ${config.isCloudinaryConfigured() ? 'Cloudinary' : 'local disk'}`);
  });
}

main().catch((err) => {
  console.error('[server] fatal startup error:', err);
  process.exit(1);
});
