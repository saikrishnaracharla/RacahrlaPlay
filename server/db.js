/**
 * server/db.js — MongoDB connection via Mongoose
 */
const mongoose = require('mongoose');

const URI = process.env.MONGODB_URI;

async function connect() {
  if (!URI) {
    console.warn('⚠️  MONGODB_URI not set — running without database');
    return false;
  }
  try {
    await mongoose.connect(URI);
    console.log('✅ MongoDB Atlas connected:', mongoose.connection.host);
    return true;
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    return false;
  }
}

function isConnected() {
  return mongoose.connection.readyState === 1;
}

module.exports = { connect, isConnected };
