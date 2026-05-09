/**
 * server/db.js — MongoDB connection via Mongoose (Vercel-compatible)
 *
 * Uses connection caching so serverless cold starts reuse existing connections
 * instead of creating a new one per request (critical for Vercel).
 */
const mongoose = require('mongoose');

const URI = process.env.MONGODB_URI;

// Cache connection across hot reloads & serverless invocations
let cached = global._mongoConn || (global._mongoConn = { conn: null, promise: null });

async function connect() {
  if (!URI) {
    console.warn('⚠️  MONGODB_URI not set');
    return null;
  }
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    }).then(m => m.connection);
  }

  try {
    cached.conn = await cached.promise;
    console.log('✅ MongoDB Atlas connected:', cached.conn.host);
  } catch (err) {
    cached.promise = null; // reset so next call retries
    console.error('❌ MongoDB connection failed:', err.message);
    return null;
  }
  return cached.conn;
}

function isConnected() {
  return mongoose.connection.readyState === 1;
}

module.exports = { connect, isConnected };
