const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const config = require('./config');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
if (config.nodeEnv !== 'test') app.use(morgan('dev'));

app.use(cors({
  origin: config.clientUrl.split(','),
  credentials: true,
}));

// Global API rate limit (auth endpoints have a stricter limiter).
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000, max: config.nodeEnv === 'test' ? 100000 : 500, standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many requests, slow down' },
}));

// Local-upload fallback storage (only used when Cloudinary is not configured).
app.use('/uploads', express.static(config.uploadDir));

app.get('/api/health', (req, res) => res.json({ success: true, message: 'WorkWave API is healthy', data: { uptime: process.uptime() } }));

app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
