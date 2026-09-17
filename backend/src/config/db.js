const mongoose = require('mongoose');
const config = require('./index');

let memoryServer = null;
let usingMemoryDb = false;

async function connectDB() {
  let uri = config.mongoUri;
  if (!uri) {
    // Local development fallback: spin up an in-memory MongoDB so the app
    // runs without a MongoDB install. Data is not persisted between restarts.
    // ReplSet (not standalone) so multi-document transactions work in dev/tests.
    let MongoMemoryReplSet;
    try {
      ({ MongoMemoryReplSet } = require('mongodb-memory-server'));
    } catch {
      throw new Error('MONGO_URI is not set and mongodb-memory-server is not installed. Set MONGO_URI or run `npm install` including devDependencies.');
    }
    memoryServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    uri = memoryServer.getUri('workwave');
    usingMemoryDb = true;
    console.log('[db] MONGO_URI not set - using in-memory MongoDB (data is ephemeral)');
  }
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  console.log(`[db] connected to ${uri.includes('localhost') || uri.includes('127.0.0.1') ? 'local MongoDB' : 'MongoDB'}`);
  return mongoose.connection;
}

async function disconnectDB() {
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop();
}

const isMemoryDb = () => usingMemoryDb;

module.exports = { connectDB, disconnectDB, isMemoryDb };
