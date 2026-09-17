const { MongoMemoryReplSet } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../src/app');

let replSet;

async function start() {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replSet.getUri('workwave-test'));
}

async function stop() {
  await mongoose.disconnect();
  await replSet.stop();
}

async function clear() {
  const collections = await mongoose.connection.db.collections();
  for (const c of collections) await c.deleteMany({});
}

async function registerUser(role, overrides = {}) {
  const email = overrides.email || `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}@test.dev`;
  const res = await request(app).post('/api/auth/register').send({
    name: overrides.name || `Test ${role}`,
    email,
    password: overrides.password || 'Password@123',
    role,
    ...overrides,
  });
  if (res.status !== 201) throw new Error(`register failed: ${JSON.stringify(res.body)}`);
  return { token: res.body.data.token, user: res.body.data.user };
}

const authed = (token) => ({
  get: (url) => request(app).get(url).set('Authorization', `Bearer ${token}`),
  post: (url) => request(app).post(url).set('Authorization', `Bearer ${token}`),
  put: (url) => request(app).put(url).set('Authorization', `Bearer ${token}`),
  delete: (url) => request(app).delete(url).set('Authorization', `Bearer ${token}`),
});

module.exports = { start, stop, clear, registerUser, authed, app, request };
