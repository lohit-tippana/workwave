/* globals describe, it, expect, beforeAll, afterAll, beforeEach */
const crypto = require('crypto');
const { start, stop, clear, registerUser, authed, request, app } = require('./setup');

beforeAll(start);
afterAll(stop);
beforeEach(clear);

const JOB = {
  title: 'Build a React dashboard',
  description: 'Need a dashboard with React, Node.js and MongoDB. REST API experience required for integration work.',
  category: 'Web Development',
  requiredSkills: ['react', 'node.js', 'mongodb'],
  experienceLevel: 'intermediate',
  budget: 1000,
  budgetType: 'fixed',
};

async function makeOpenJob(clientToken) {
  const res = await authed(clientToken).post('/api/jobs').send({ ...JOB, publish: true });
  expect(res.status).toBe(201);
  return res.body.data.job;
}

async function makeProposal(freelancerToken, jobId) {
  return authed(freelancerToken).post('/api/proposals').send({
    jobId, coverLetter: 'I have 5 years of experience with React and Node.js and can deliver this quickly.',
    proposedAmount: 900, estimatedDays: 14,
  });
}

describe('auth', () => {
  it('registers and logs in a user, returns JWT, hides password hash', async () => {
    const { token, user } = await registerUser('freelancer', { email: 'f@test.dev' });
    expect(token).toBeTruthy();
    expect(user.passwordHash).toBeUndefined();
    const login = await request(app).post('/api/auth/login').send({ email: 'f@test.dev', password: 'Password@123' });
    expect(login.status).toBe(200);
    const me = await authed(login.body.data.token).get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe('f@test.dev');
  });

  it('rejects duplicate emails and bad logins', async () => {
    await registerUser('client', { email: 'dup@test.dev' });
    const dup = await request(app).post('/api/auth/register').send({
      name: 'Dup', email: 'dup@test.dev', password: 'Password@123', role: 'client',
    });
    expect(dup.status).toBe(409);
    const bad = await request(app).post('/api/auth/login').send({ email: 'dup@test.dev', password: 'wrong' });
    expect(bad.status).toBe(401);
  });

  it('rejects requests without/with invalid tokens', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
    expect((await request(app).get('/api/auth/me').set('Authorization', 'Bearer junk')).status).toBe(401);
  });
});

describe('authorization', () => {
  it('blocks freelancers from client routes and vice versa', async () => {
    const f = await registerUser('freelancer');
    const c = await registerUser('client');
    expect((await authed(f.token).post('/api/jobs').send(JOB)).status).toBe(403);
    expect((await authed(c.token).post('/api/proposals').send({ jobId: '507f1f77bcf86cd799439011', coverLetter: 'x'.repeat(40), proposedAmount: 10, estimatedDays: 1 })).status).toBe(403);
    expect((await authed(f.token).get('/api/admin/stats')).status).toBe(403);
  });

  it('prevents non-owners from editing jobs', async () => {
    const c1 = await registerUser('client');
    const c2 = await registerUser('client');
    const job = await makeOpenJob(c1.token);
    expect((await authed(c2.token).put(`/api/jobs/${job._id}`).send({ title: 'hacked title' })).status).toBe(404);
  });
});

describe('jobs', () => {
  it('client creates draft then publishes; public listing only shows OPEN', async () => {
    const c = await registerUser('client');
    const draft = await authed(c.token).post('/api/jobs').send(JOB);
    expect(draft.body.data.job.status).toBe('DRAFT');
    let list = await request(app).get('/api/jobs');
    expect(list.body.data.total).toBe(0);
    await authed(c.token).post(`/api/jobs/${draft.body.data.job._id}/status`).send({ action: 'publish' });
    list = await request(app).get('/api/jobs');
    expect(list.body.data.total).toBe(1);
  });

  it('search, filter and pagination work', async () => {
    const c = await registerUser('client');
    await makeOpenJob(c.token);
    await authed(c.token).post('/api/jobs').send({ ...JOB, title: 'Python ETL pipeline', description: 'Build an ETL pipeline in Python with scheduled jobs and data validation for warehouse loads.', requiredSkills: ['python'], category: 'Data & AI', publish: true });
    const res = await request(app).get('/api/jobs?q=react');
    expect(res.body.data.total).toBe(1);
    const filtered = await request(app).get('/api/jobs?category=Data%20%26%20AI');
    expect(filtered.body.data.total).toBe(1);
    const paged = await request(app).get('/api/jobs?page=1&limit=1');
    expect(paged.body.data.results).toHaveLength(1);
    expect(paged.body.data.totalPages).toBe(2);
  });
});

const setSkills = (token, skills) =>
  authed(token).put('/api/users/profile').send({ skills });

describe('proposals and hiring workflow', () => {
  it('full flow: propose -> duplicate blocked -> shortlist -> message -> accept -> project', async () => {
    const c = await registerUser('client');
    const f = await registerUser('freelancer');
    await setSkills(f.token, ['react', 'node.js', 'mongodb']);
    const job = await makeOpenJob(c.token);

    const p = await makeProposal(f.token, job._id);
    expect(p.status).toBe(201);
    expect(p.body.data.proposal.aiMatch.matchedSkills).toContain('react');

    // duplicate prevention
    const dup = await makeProposal(f.token, job._id);
    expect(dup.status).toBe(409);

    // messaging blocked before shortlist
    const blocked = await authed(c.token).post('/api/messages/conversations').send({ otherUserId: f.user._id });
    expect(blocked.status).toBe(403);

    // shortlist enables messaging
    const pid = p.body.data.proposal._id;
    await authed(c.token).post(`/api/proposals/${pid}/status`).send({ action: 'shortlist' });
    const convo = await authed(c.token).post('/api/messages/conversations').send({ otherUserId: f.user._id });
    expect(convo.status).toBe(200);
    const convoId = convo.body.data.conversation._id;
    const msg = await authed(c.token).post(`/api/messages/conversations/${convoId}/messages`).send({ text: 'Hi, tell me about your approach' });
    expect(msg.status).toBe(201);
    const fetched = await authed(f.token).get(`/api/messages/conversations/${convoId}/messages`);
    expect(fetched.body.data.results).toHaveLength(1);

    // accept -> project created, job in progress, other proposals rejected
    const accept = await authed(c.token).post(`/api/proposals/${pid}/accept`);
    expect(accept.status).toBe(201);
    const project = accept.body.data.project;
    expect(project.status).toBe('ACTIVE');
    const jobAfter = await authed(c.token).get(`/api/jobs/${job._id}`);
    expect(jobAfter.body.data.job.status).toBe('IN_PROGRESS');

    // freelancer cannot propose on in-progress job
    const f2 = await registerUser('freelancer');
    expect((await makeProposal(f2.token, job._id)).status).toBe(400);
  });
});

describe('projects, milestones, reviews', () => {
  async function setupProject() {
    const c = await registerUser('client');
    const f = await registerUser('freelancer');
    await setSkills(f.token, ['react']);
    const job = await makeOpenJob(c.token);
    const p = await makeProposal(f.token, job._id);
    const accept = await authed(c.token).post(`/api/proposals/${p.body.data.proposal._id}/accept`);
    return { c, f, project: accept.body.data.project };
  }

  it('milestone lifecycle: add -> start -> submit -> approve -> complete', async () => {
    const { c, f, project } = await setupProject();
    const m = await authed(c.token).post(`/api/projects/${project._id}/milestones`).send({ title: 'MVP', amount: 500 });
    const mid = m.body.data.project.milestones[0]._id;
    // freelancer cannot add milestones
    expect((await authed(f.token).post(`/api/projects/${project._id}/milestones`).send({ title: 'x', amount: 1 })).status).toBe(403);
    await authed(f.token).post(`/api/projects/${project._id}/milestones/${mid}/start`);
    await authed(f.token).post(`/api/projects/${project._id}/milestones/${mid}/submit`).send({ note: 'done' });
    const reviewed = await authed(c.token).post(`/api/projects/${project._id}/milestones/${mid}/review`).send({ action: 'approve' });
    expect(reviewed.body.data.project.milestones[0].status).toBe('APPROVED');
    const completed = await authed(c.token).post(`/api/projects/${project._id}/milestones/${mid}/complete`);
    expect(completed.body.data.project.progress).toBe(100);
  });

  it('revision request sends milestone back', async () => {
    const { c, f, project } = await setupProject();
    const m = await authed(c.token).post(`/api/projects/${project._id}/milestones`).send({ title: 'M1', amount: 100 });
    const mid = m.body.data.project.milestones[0]._id;
    await authed(f.token).post(`/api/projects/${project._id}/milestones/${mid}/start`);
    await authed(f.token).post(`/api/projects/${project._id}/milestones/${mid}/submit`).send({ note: 'v1' });
    const res = await authed(c.token).post(`/api/projects/${project._id}/milestones/${mid}/review`).send({ action: 'request_revision', note: 'fix bugs' });
    expect(res.body.data.project.milestones[0].status).toBe('REVISION_REQUESTED');
  });

  it('reviews require completion and are one-per-direction', async () => {
    const { c, f, project } = await setupProject();
    const early = await authed(c.token).post('/api/reviews').send({ projectId: project._id, rating: 5, text: 'great' });
    expect(early.status).toBe(400);
    await authed(c.token).post(`/api/projects/${project._id}/complete`);
    const r = await authed(c.token).post('/api/reviews').send({ projectId: project._id, rating: 5, text: 'great work' });
    expect(r.status).toBe(201);
    const dup = await authed(c.token).post('/api/reviews').send({ projectId: project._id, rating: 4 });
    expect(dup.status).toBe(409);
    const back = await authed(f.token).post('/api/reviews').send({ projectId: project._id, rating: 4, text: 'good client' });
    expect(back.status).toBe(201);
  });
});

describe('payments', () => {
  it('verifies a valid signature and rejects forged ones', async () => {
    const c = await registerUser('client');
    const f = await registerUser('freelancer');
    await setSkills(f.token, ['react']);
    const job = await makeOpenJob(c.token);
    const p = await makeProposal(f.token, job._id);
    const accept = await authed(c.token).post(`/api/proposals/${p.body.data.proposal._id}/accept`);
    const project = accept.body.data.project;

    // Stub the Razorpay order creation (no network) by creating the record the
    // same way the controller does, then exercise signature verification.
    const Payment = require('../src/models/Payment');
    const orderId = 'order_test_123';
    await Payment.create({
      projectId: project._id, clientId: c.user._id, freelancerId: f.user._id,
      razorpayOrderId: orderId, amount: 90000, currency: 'INR', status: 'CREATED',
    });

    const payId = 'pay_test_456';
    const goodSig = crypto.createHmac('sha256', 'test-razorpay-secret').update(`${orderId}|${payId}`).digest('hex');
    const forged = await authed(c.token).post('/api/payments/verify').send({
      razorpayOrderId: orderId, razorpayPaymentId: payId, razorpaySignature: 'deadbeef',
    });
    expect(forged.status).toBe(400);
    const okRes = await authed(c.token).post('/api/payments/verify').send({
      razorpayOrderId: orderId, razorpayPaymentId: payId, razorpaySignature: goodSig,
    });
    expect(okRes.status).toBe(200);
    expect(okRes.body.data.payment.status).toBe('SUCCESS');
  });
});

describe('ai (fallback provider)', () => {
  it('analyzes a job description and matches a profile', async () => {
    const c = await registerUser('client');
    const job = await makeOpenJob(c.token);
    const analysis = await authed(c.token).post(`/api/jobs/${job._id}/analyze`);
    expect(analysis.status).toBe(200);
    expect(analysis.body.data.provider).toBe('fallback');
    expect(analysis.body.data.analysis.requiredSkills).toContain('react');

    const f = await registerUser('freelancer');
    await setSkills(f.token, ['react', 'node.js']);
    const match = await authed(f.token).get(`/api/ai/match/${job._id}`);
    expect(match.status).toBe(200);
    expect(match.body.data.match.matchedSkills).toContain('react');
    expect(match.body.data.match.missingSkills).toContain('mongodb');
    expect(match.body.data.match.disclaimer).toMatch(/decision support/i);
  });

  it('generates job recommendations with reasons', async () => {
    const c = await registerUser('client');
    await makeOpenJob(c.token);
    const f = await registerUser('freelancer');
    await setSkills(f.token, ['react', 'node.js', 'mongodb']);
    const recs = await authed(f.token).get('/api/ai/recommendations');
    expect(recs.status).toBe(200);
    expect(recs.body.data.results.length).toBeGreaterThan(0);
    expect(recs.body.data.results[0].reason).toMatch(/because/i);
  });
});

describe('notifications and misc', () => {
  it('creates notifications through the workflow and marks them read', async () => {
    const c = await registerUser('client');
    const f = await registerUser('freelancer');
    const job = await makeOpenJob(c.token);
    await makeProposal(f.token, job._id);
    const notifs = await authed(c.token).get('/api/notifications');
    expect(notifs.body.data.unread).toBeGreaterThan(0);
    await authed(c.token).post('/api/notifications/read-all');
    const after = await authed(c.token).get('/api/notifications');
    expect(after.body.data.unread).toBe(0);
  });

  it('bookmarks toggle and list', async () => {
    const c = await registerUser('client');
    const f = await registerUser('freelancer');
    const job = await makeOpenJob(c.token);
    const on = await authed(f.token).post(`/api/bookmarks/${job._id}`);
    expect(on.body.data.bookmarked).toBe(true);
    const list = await authed(f.token).get('/api/bookmarks');
    expect(list.body.data.results).toHaveLength(1);
    await authed(f.token).post(`/api/bookmarks/${job._id}`);
    const empty = await authed(f.token).get('/api/bookmarks');
    expect(empty.body.data.results).toHaveLength(0);
  });
});

describe('admin', () => {
  it('admin can view stats and suspend users; suspended users cannot log in', async () => {
    const User = require('../src/models/User');
    const admin = await User.create({
      name: 'Admin', email: 'admin@test.dev',
      passwordHash: await User.hashPassword('Admin@12345'), role: 'admin',
    });
    const login = await request(app).post('/api/auth/login').send({ email: 'admin@test.dev', password: 'Admin@12345' });
    const adminToken = login.body.data.token;
    const c = await registerUser('client');
    const stats = await authed(adminToken).get('/api/admin/stats');
    expect(stats.body.data.totals.clients).toBe(1);
    const susp = await authed(adminToken).post(`/api/admin/users/${c.user._id}/suspension`).send({ suspended: true });
    expect(susp.body.data.user.isSuspended).toBe(true);
    const blocked = await authed(c.token).get('/api/auth/me');
    expect(blocked.status).toBe(403);
  });
});
