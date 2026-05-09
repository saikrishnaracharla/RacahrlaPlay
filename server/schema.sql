-- ====================================================
--  Racharlaplay Database Schema
--  Run: mysql -u root -p < schema.sql
-- ====================================================

CREATE DATABASE IF NOT EXISTS racharlaplay CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE racharlaplay;

-- ── Users ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            INT           PRIMARY KEY AUTO_INCREMENT,
  username      VARCHAR(50)   UNIQUE NOT NULL,
  email         VARCHAR(100)  UNIQUE NOT NULL,
  password_hash VARCHAR(255)  NOT NULL,
  avatar_color  VARCHAR(7)    NOT NULL DEFAULT '#1DB954',
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── Playlists ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS playlists (
  id          VARCHAR(36)   PRIMARY KEY,          -- UUID v4
  user_id     INT           NOT NULL,
  name        VARCHAR(100)  NOT NULL,
  description TEXT,
  is_public   BOOLEAN       DEFAULT FALSE,
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id)
);

-- ── Playlist Songs ────────────────────────────────────
CREATE TABLE IF NOT EXISTS playlist_songs (
  id           INT          PRIMARY KEY AUTO_INCREMENT,
  playlist_id  VARCHAR(36)  NOT NULL,
  song_id      VARCHAR(100) NOT NULL,
  song_title   VARCHAR(200),
  song_artist  VARCHAR(200),
  song_image   VARCHAR(500),
  song_duration INT         DEFAULT 0,
  position     INT          DEFAULT 0,
  added_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
  UNIQUE KEY uq_playlist_song (playlist_id, song_id),
  INDEX idx_playlist_id (playlist_id)
);

-- ── Liked Songs ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS liked_songs (
  id           INT          PRIMARY KEY AUTO_INCREMENT,
  user_id      INT          NOT NULL,
  song_id      VARCHAR(100) NOT NULL,
  song_title   VARCHAR(200),
  song_artist  VARCHAR(200),
  song_image   VARCHAR(500),
  liked_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_song (user_id, song_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id)
);

-- ── Listening History ─────────────────────────────────
CREATE TABLE IF NOT EXISTS listening_history (
  id           INT          PRIMARY KEY AUTO_INCREMENT,
  user_id      INT          NOT NULL,
  song_id      VARCHAR(100) NOT NULL,
  song_title   VARCHAR(200),
  song_artist  VARCHAR(200),
  song_image   VARCHAR(500),
  played_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_played (user_id, played_at)
);
