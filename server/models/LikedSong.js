/**
 * server/models/LikedSong.js
 */
const { Schema, model, Types } = require('mongoose');

const LikedSongSchema = new Schema({
  userId:  { type: Types.ObjectId, ref: 'User', required: true, index: true },
  songId:  { type: String, required: true },
  title:   String,
  artist:  String,
  image:   String,
  streamUrl: String,
  source:  String,
  likedAt: { type: Date, default: Date.now },
});

// One like per user per song
LikedSongSchema.index({ userId: 1, songId: 1 }, { unique: true });

module.exports = model('LikedSong', LikedSongSchema);
