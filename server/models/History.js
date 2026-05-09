/**
 * server/models/History.js
 */
const { Schema, model, Types } = require('mongoose');

const HistorySchema = new Schema({
  userId:  { type: Types.ObjectId, ref: 'User', required: true, index: true },
  songId:  { type: String, required: true },
  title:   String,
  artist:  String,
  image:   String,
  streamUrl: String,
  source:  String,
  playedAt:{ type: Date, default: Date.now },
});

module.exports = model('History', HistorySchema);
