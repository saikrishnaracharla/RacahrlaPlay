/**
 * In-memory auth store — used when MySQL is not configured.
 * Data is lost on server restart. For development/demo only.
 */
const crypto = require('crypto');

const users    = new Map(); // email → user object
const usersById = new Map(); // id → user object

let nextId = 1;

module.exports = {
  async findByEmail(email) {
    return users.get(email.toLowerCase()) || null;
  },
  async findById(id) {
    return usersById.get(id) || null;
  },
  async createUser(username, email, passwordHash, avatarColor) {
    const id = nextId++;
    const user = { id, username, email: email.toLowerCase(), password_hash: passwordHash, avatar_color: avatarColor, created_at: new Date() };
    users.set(email.toLowerCase(), user);
    usersById.set(id, user);
    return user;
  },
  // Simple in-memory playlists (keyed by userId)
  playlists: new Map(),
  getPlaylists(userId) {
    return this.playlists.get(userId) || [];
  },
  addPlaylist(userId, playlist) {
    const list = this.getPlaylists(userId);
    list.push(playlist);
    this.playlists.set(userId, list);
  },
  deletePlaylist(userId, playlistId) {
    const list = this.getPlaylists(userId).filter(p => p.id !== playlistId);
    this.playlists.set(userId, list);
  },
};
