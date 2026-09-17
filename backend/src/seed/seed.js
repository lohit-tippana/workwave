// Seeds demo accounts, categories, jobs and a portfolio so the app is
// demonstrable end-to-end. Safe to re-run (upserts by email/slug).
require('../config');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const Category = require('../models/Category');
const Job = require('../models/Job');
const PortfolioItem = require('../models/PortfolioItem');

const CATEGORIES = [
  ['Web Development', 'Full-stack, frontend and backend web projects'],
  ['Mobile Development', 'iOS, Android and cross-platform apps'],
  ['Design & Creative', 'UI/UX, branding, illustration'],
  ['Writing & Content', 'Copywriting, technical writing, blogs'],
  ['Data & AI', 'Machine learning, data analysis, AI integrations'],
  ['DevOps & Cloud', 'CI/CD, cloud infrastructure, containers'],
];

const SKILLS = {
  web: ['react', 'node.js', 'express', 'mongodb', 'typescript', 'tailwind', 'rest api'],
  mobile: ['react native', 'flutter', 'typescript', 'firebase'],
  ai: ['python', 'machine learning', 'pandas', 'nlp', 'fastapi'],
};

async function upsertUser(data, plainPassword) {
  const passwordHash = await User.hashPassword(plainPassword);
  return User.findOneAndUpdate(
    { email: data.email },
    { ...data, passwordHash },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

// Seeds demo data into the CURRENT connection (caller must be connected).
async function seedData() {
  console.log('[seed] seeding WorkWave demo data...');

  for (const [name, description] of CATEGORIES) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    await Category.findOneAndUpdate({ slug }, { name, slug, description, isActive: true }, { upsert: true });
  }

  const admin = await upsertUser(
    { name: 'WorkWave Admin', email: process.env.SEED_ADMIN_EMAIL || 'admin@workwave.dev', role: 'admin' },
    process.env.SEED_ADMIN_PASSWORD || 'Admin@12345'
  );

  const client = await upsertUser(
    {
      name: 'Acme Corp', email: 'client@workwave.dev', role: 'client',
      company: 'Acme Corp', location: 'Remote', bio: 'Product company hiring freelance talent.',
    },
    'Client@12345'
  );

  const freelancers = await Promise.all([
    upsertUser({
      name: 'Priya Sharma', email: 'freelancer@workwave.dev', role: 'freelancer',
      headline: 'Full-stack React & Node.js developer', location: 'Bengaluru, IN',
      bio: '5+ years building SaaS products with React, Node.js and MongoDB.',
      skills: SKILLS.web, yearsOfExperience: 5, hourlyRate: 35, languages: ['English', 'Hindi'],
      availability: 'available',
    }, 'Freelance@12345'),
    upsertUser({
      name: 'Rahul Verma', email: 'freelancer2@workwave.dev', role: 'freelancer',
      headline: 'Mobile app developer (Flutter / React Native)',
      bio: 'Cross-platform mobile specialist.', skills: SKILLS.mobile,
      yearsOfExperience: 4, hourlyRate: 30, availability: 'available',
    }, 'Freelance@12345'),
    upsertUser({
      name: 'Ananya Iyer', email: 'freelancer3@workwave.dev', role: 'freelancer',
      headline: 'ML engineer & data scientist',
      bio: 'NLP and ML pipelines in Python.', skills: SKILLS.ai,
      yearsOfExperience: 6, hourlyRate: 55, availability: 'busy',
    }, 'Freelance@12345'),
  ]);

  const jobs = [
    {
      title: 'Build a React + Node.js analytics dashboard',
      description: 'We need a freelancer to build a responsive analytics dashboard using React, Node.js, Express and MongoDB. REST API integration required. Deliverables: dashboard UI, API endpoints, tests.',
      category: 'Web Development', requiredSkills: ['react', 'node.js', 'express', 'mongodb', 'rest api'],
      experienceLevel: 'intermediate', budget: 1500, budgetType: 'fixed',
      deadline: new Date(Date.now() + 30 * 86400000), status: 'OPEN',
    },
    {
      title: 'Flutter mobile app for booking appointments',
      description: 'Cross-platform mobile app in Flutter with Firebase backend. Features: booking calendar, push notifications, payments.',
      category: 'Mobile Development', requiredSkills: ['flutter', 'firebase', 'typescript'],
      experienceLevel: 'intermediate', budget: 60, budgetType: 'hourly',
      deadline: new Date(Date.now() + 45 * 86400000), status: 'OPEN',
    },
    {
      title: 'NLP resume parser microservice',
      description: 'Python microservice (FastAPI) that extracts skills and entities from resumes using NLP. Docker deployment on AWS.',
      category: 'Data & AI', requiredSkills: ['python', 'nlp', 'fastapi', 'docker', 'aws'],
      experienceLevel: 'expert', budget: 3000, budgetType: 'fixed',
      deadline: new Date(Date.now() + 60 * 86400000), status: 'OPEN',
    },
  ];
  for (const j of jobs) {
    await Job.findOneAndUpdate(
      { clientId: client._id, title: j.title },
      { ...j, clientId: client._id },
      { upsert: true, new: true }
    );
  }

  await PortfolioItem.findOneAndUpdate(
    { freelancerId: freelancers[0]._id, title: 'SaaS analytics platform' },
    {
      freelancerId: freelancers[0]._id, title: 'SaaS analytics platform',
      description: 'Multi-tenant analytics dashboard built with React, Node.js and MongoDB.',
      technologies: ['react', 'node.js', 'mongodb'], projectUrl: 'https://example.com',
    },
    { upsert: true }
  );

  console.log('[seed] done.');
  console.log('  Admin:      admin@workwave.dev / Admin@12345');
  console.log('  Client:     client@workwave.dev / Client@12345');
  console.log('  Freelancer: freelancer@workwave.dev / Freelance@12345');
}

async function main() {
  await connectDB();
  await seedData();
  await disconnectDB();
  process.exit(0);
}

if (require.main === module) {
  main().catch(async (e) => { console.error(e); await disconnectDB(); process.exit(1); });
}

module.exports = { seedData };
