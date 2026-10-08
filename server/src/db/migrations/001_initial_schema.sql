CREATE TABLE IF NOT EXISTS songs (
  id TEXT PRIMARY KEY,
  game_title TEXT NOT NULL,
  release_year INTEGER NOT NULL,
  song_title TEXT NOT NULL,
  youtube_url TEXT NOT NULL,
  youtube_id TEXT NOT NULL,
  start_time INTEGER NOT NULL,
  platform TEXT,
  category TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS song_aliases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  song_id TEXT NOT NULL,
  alias TEXT NOT NULL,
  FOREIGN KEY (song_id) REFERENCES songs (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_songs_release_year ON songs(release_year);
CREATE INDEX IF NOT EXISTS idx_songs_category ON songs(category);
CREATE INDEX IF NOT EXISTS idx_song_aliases_song_id ON song_aliases(song_id);
