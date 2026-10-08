import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

let dbInstance: Database.Database | null = null;

export interface DatabaseOptions {
  dbPath?: string;
}

export function getDatabase(options?: DatabaseOptions): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  const defaultDbPath = process.env.NODE_ENV === 'test' ? ':memory:' : path.resolve(process.cwd(), 'gamester.db');
  const resolvedPath = options?.dbPath || process.env.DATABASE_PATH || defaultDbPath;
  
  // Assegura diretório se necessário
  if (resolvedPath !== ':memory:') {
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  dbInstance = new Database(resolvedPath);

  // Regras de performance e integridade para VPS
  if (resolvedPath !== ':memory:') {
    dbInstance.pragma('journal_mode = WAL');
    dbInstance.pragma('synchronous = NORMAL');
  }
  dbInstance.pragma('foreign_keys = ON');

  // Inicializa schema
  initSchema(dbInstance);

  return dbInstance;
}

export function initSchema(db: Database.Database): void {
  const migrationPath = path.resolve(__dirname, 'migrations', '001_initial_schema.sql');
  if (fs.existsSync(migrationPath)) {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    db.exec(sql);
  } else {
    // Fallback inline caso migrationPath não seja encontrado em dist
    db.exec(`
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
        is_active INTEGER NOT NULL DEFAULT 1,
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
    `);
  }

  // Garante adição de is_active caso o banco já existisse
  try {
    db.exec(`ALTER TABLE songs ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;`);
  } catch (e) {
    // Coluna já existe
  }
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
