/**
 * server/models/Playlist.js
 */
const { Schema, model, Types } = require('mongoose');

const SongEmbedSchema = new Schema({
  id:     { type: String, required: true },
  title:  String,
  artist: String,
  image:  String,
  streamUrl: String,
  duration:  Number,
  source:    String,
}, { _id: false });

const PlaylistSchema = new Schema({
  userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
  name:   { type: String, required: true, trim: true },
  songs:  { type: [SongEmbedSchema], default: [] },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = model('Playlist', PlaylistSchema);
