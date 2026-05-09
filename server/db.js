/**
 * server/db.js — MongoDB connection via Mongoose (Vercel-compatible)
 */
const mongoose = require('mongoose');

const URI = process.env.MONGODB_URI;

// Cache connection across serverless invocations
let cached = global._mongoConn || (global._mongoConn = { conn: null, promise: null, lastError: null });

async function connect() {
  if (!URI) {
    cached.lastError = 'MONGODB_URI environment variable is not set';
    console.error('❌', cached.lastError);
    return null;
  }

  if (cached.conn && mongoose.connection.readyState === 1) return cached.conn;

  // Reset stale promise
  if (mongoose.connection.readyState === 0) cached.promise = null;

  if (!cached.promise) {
    console.log('🔌 Connecting to MongoDB...');
    cached.promise = mongoose.connect(URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS:          45000,
      connectTimeoutMS:         10000,
    }).then(m => m.connection)
      .catch(err => {
        cached.promise  = null;
        cached.lastError = err.message;
        console.error('❌ MongoDB connect error:', err.message);
        throw err;
      });
  }

  try {
    cached.conn      = await cached.promise;
    cached.lastError = null;
    console.log('✅ MongoDB connected:', cached.conn.host);
  } catch (err) {
    cached.conn    = null;
    cached.promise = null;
    return null;
  }
  return cached.conn;
}

function isConnected() {
  return mongoose.connection.readyState === 1;
}

function lastError() {
  return cached.lastError;
}

module.exports = { connect, isConnected, lastError };
