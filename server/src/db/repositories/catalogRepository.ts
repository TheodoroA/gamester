import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';

export interface SongEntity {
  id: string;
  gameTitle: string;
  releaseYear: number;
  songTitle: string;
  youtubeUrl: string;
  youtubeId: string;
  startTime: number;
  platform?: string;
  category?: string;
  tags: string[];
  aliases: string[];
  createdAt: number;
}

export interface NewSongInput {
  gameTitle: string;
  releaseYear: number;
  songTitle: string;
  youtubeUrl: string;
  startTime: number;
  platform?: string;
  category?: string;
  tags?: string[];
  aliases?: string[];
}

export interface CatalogFilter {
  page?: number;
  limit?: number;
  category?: string;
  tag?: string;
  query?: string;
}

export function extractYouTubeId(url: string): string {
  if (!url) return '';
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/i);
  if (match && match[1]) {
    return match[1];
  }
  // Se for passado diretamente o id de 11 caracteres
  if (url.length === 11 && /^[\w-]{11}$/.test(url)) {
    return url;
  }
  return '';
}

export class CatalogRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  public createSong(input: NewSongInput): SongEntity {
    const id = randomUUID();
    const youtubeId = (input as any).youtubeId || extractYouTubeId(input.youtubeUrl) || input.youtubeUrl;
    const createdAt = Date.now();
    const tagsJson = JSON.stringify(input.tags || []);

    const insertSong = this.db.prepare(`
      INSERT INTO songs (
        id, game_title, release_year, song_title, youtube_url, youtube_id,
        start_time, platform, category, tags, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertAlias = this.db.prepare(`
      INSERT INTO song_aliases (song_id, alias) VALUES (?, ?)
    `);

    const transaction = this.db.transaction(() => {
      insertSong.run(
        id,
        input.gameTitle,
        input.releaseYear,
        input.songTitle,
        input.youtubeUrl,
        youtubeId,
        input.startTime,
        input.platform || null,
        input.category || null,
        tagsJson,
        createdAt
      );

      if (input.aliases && input.aliases.length > 0) {
        for (const alias of input.aliases) {
          const cleanAlias = alias.trim();
          if (cleanAlias) {
            insertAlias.run(id, cleanAlias);
          }
        }
      }
    });

    transaction();

    return {
      id,
      gameTitle: input.gameTitle,
      releaseYear: input.releaseYear,
      songTitle: input.songTitle,
      youtubeUrl: input.youtubeUrl,
      youtubeId,
      startTime: input.startTime,
      platform: input.platform,
      category: input.category,
      tags: input.tags || [],
      aliases: input.aliases || [],
      createdAt
    };
  }

  public importBatch(songs: NewSongInput[]): { inserted: number; errors: string[] } {
    if (!songs || songs.length === 0) {
      return { inserted: 0, errors: ['Nenhuma música fornecida para importação.'] };
    }

    const errors: string[] = [];
    const validSongs: NewSongInput[] = [];

    songs.forEach((s, idx) => {
      if (!s.gameTitle || !s.songTitle || !s.releaseYear || !s.youtubeUrl) {
        errors.push(`Linha #${idx + 1}: Campos obrigatórios ausentes.`);
        return;
      }
      validSongs.push(s);
    });

    if (errors.length > 0) {
      return { inserted: 0, errors };
    }

    const insertSong = this.db.prepare(`
      INSERT INTO songs (
        id, game_title, release_year, song_title, youtube_url, youtube_id,
        start_time, platform, category, tags, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertAlias = this.db.prepare(`
      INSERT INTO song_aliases (song_id, alias) VALUES (?, ?)
    `);

    const transaction = this.db.transaction(() => {
      for (const input of validSongs) {
        const id = randomUUID();
        const youtubeId = (input as any).youtubeId || extractYouTubeId(input.youtubeUrl) || input.youtubeUrl;
        const createdAt = Date.now();
        const tagsJson = JSON.stringify(input.tags || []);

        insertSong.run(
          id,
          input.gameTitle,
          input.releaseYear,
          input.songTitle,
          input.youtubeUrl,
          youtubeId,
          input.startTime || 0,
          input.platform || null,
          input.category || null,
          tagsJson,
          createdAt
        );

        if (input.aliases && input.aliases.length > 0) {
          for (const alias of input.aliases) {
            const cleanAlias = alias.trim();
            if (cleanAlias) {
              insertAlias.run(id, cleanAlias);
            }
          }
        }
      }
    });

    transaction();

    return { inserted: validSongs.length, errors: [] };
  }

  public getRandomSong(excludedIds: string[] = [], category?: string, tag?: string): SongEntity | null {
    let query = `SELECT * FROM songs WHERE length(youtube_id) > 0`;
    const params: (string | number)[] = [];

    if (excludedIds.length > 0) {
      const placeholders = excludedIds.map(() => '?').join(',');
      query += ` AND id NOT IN (${placeholders})`;
      params.push(...excludedIds);
    }

    if (category) {
      query += ` AND category = ?`;
      params.push(category);
    }

    if (tag) {
      query += ` AND tags LIKE ?`;
      params.push(`%"${tag}"%`);
    }

    query += ` ORDER BY RANDOM() LIMIT 1`;

    const row = this.db.prepare(query).get(...params) as any;
    if (!row) {
      // Se não achou com filtro de exclusão, busca aleatória sem restrição de excluídos para não travar o jogo
      if (excludedIds.length > 0) {
        return this.getRandomSong([], category, tag);
      }
      return null;
    }

    const aliases = this.getAliases(row.id);

    return {
      id: row.id,
      gameTitle: row.game_title,
      releaseYear: row.release_year,
      songTitle: row.song_title,
      youtubeUrl: row.youtube_url,
      youtubeId: row.youtube_id,
      startTime: row.start_time,
      platform: row.platform || undefined,
      category: row.category || undefined,
      tags: JSON.parse(row.tags || '[]'),
      aliases,
      createdAt: row.created_at
    };
  }

  public getAliases(songId: string): string[] {
    const rows = this.db.prepare(`SELECT alias FROM song_aliases WHERE song_id = ?`).all(songId) as { alias: string }[];
    return rows.map(r => r.alias);
  }

  public listSongs(filter: CatalogFilter = {}): { songs: SongEntity[]; total: number } {
    const page = Math.max(1, filter.page || 1);
    const limit = Math.min(100, Math.max(1, filter.limit || 20));
    const offset = (page - 1) * limit;

    let whereClause = ' WHERE 1=1';
    const params: (string | number)[] = [];

    if (filter.category) {
      whereClause += ' AND category = ?';
      params.push(filter.category);
    }

    if (filter.tag) {
      whereClause += ' AND tags LIKE ?';
      params.push(`%"${filter.tag}"%`);
    }

    if (filter.query) {
      whereClause += ' AND (game_title LIKE ? OR song_title LIKE ?)';
      params.push(`%${filter.query}%`, `%${filter.query}%`);
    }

    const totalRow = this.db.prepare(`SELECT COUNT(*) as count FROM songs ${whereClause}`).get(...params) as { count: number };
    const total = totalRow.count;

    const rows = this.db.prepare(`
      SELECT * FROM songs ${whereClause}
      ORDER BY game_title ASC, song_title ASC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset) as any[];

    const songs: SongEntity[] = rows.map(row => ({
      id: row.id,
      gameTitle: row.game_title,
      releaseYear: row.release_year,
      songTitle: row.song_title,
      youtubeUrl: row.youtube_url,
      youtubeId: row.youtube_id,
      startTime: row.start_time,
      platform: row.platform || undefined,
      category: row.category || undefined,
      tags: JSON.parse(row.tags || '[]'),
      aliases: this.getAliases(row.id),
      createdAt: row.created_at
    }));

    return { songs, total };
  }

  public count(): number {
    const row = this.db.prepare(`SELECT COUNT(*) as count FROM songs`).get() as { count: number };
    return row.count;
  }
}
