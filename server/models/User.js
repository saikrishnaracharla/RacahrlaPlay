/**
 * server/models/User.js
 */
const { Schema, model } = require('mongoose');

const UserSchema = new Schema({
  username:     { type: String, required: true, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  password_hash:{ type: String, required: true },
  avatar_color: { type: String, default: '#1DB954' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = model('User', UserSchema);
