import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { CatalogRepository, NewSongInput } from '../../src/db/repositories/catalogRepository.js';
import { initSchema } from '../../src/db/sqlite.js';

describe('Catálogo e Importação em Lote (TI-04)', () => {
  let db: Database.Database;
  let repo: CatalogRepository;

  before(() => {
    // Usamos banco SQLite in-memory isolado para os testes
    db = new Database(':memory:');
    initSchema(db);
    repo = new CatalogRepository(db);
  });

  after(() => {
    db.close();
  });

  it('TI-04: Deve importar lote de músicas válidas com tags e aliases', () => {
    const batch: NewSongInput[] = [
      {
        gameTitle: 'Chrono Trigger',
        releaseYear: 1995,
        songTitle: 'Wind Scene',
        youtubeUrl: 'https://www.youtube.com/watch?v=5ejTEpMhp_8',
        startTime: 12,
        platform: 'Super Nintendo',
        category: 'Retro',
        tags: ['rpg', 'snes', 'classic'],
        aliases: ['CT', 'Chrono']
      },
      {
        gameTitle: 'Hollow Knight',
        releaseYear: 2017,
        songTitle: 'City of Tears',
        youtubeUrl: 'https://www.youtube.com/watch?v=1unmFCyiVM8',
        startTime: 45,
        tags: ['indie', 'metroidvania'],
        aliases: ['HK']
      }
    ];

    const result = repo.importBatch(batch);
    assert.equal(result.inserted, 2);
    assert.equal(result.errors.length, 0);

    const listed = repo.listSongs({ limit: 10 });
    assert.equal(listed.total, 2);

    // Valida extração automática do YouTube ID e preservação das tags
    const chrono = listed.songs.find(s => s.gameTitle === 'Chrono Trigger');
    assert.ok(chrono);
    assert.equal(chrono.youtubeId, '5ejTEpMhp_8');
    assert.deepEqual(chrono.tags, ['rpg', 'snes', 'classic']);
    assert.deepEqual(chrono.aliases, ['CT', 'Chrono']);
  });

  it('TI-04: Deve rejeitar lote com itens malformados e não inserir nenhum registro parcial', () => {
    const initialCount = repo.count();

    const invalidBatch: NewSongInput[] = [
      {
        gameTitle: 'Doom',
        releaseYear: 2016,
        songTitle: 'BFG Division',
        youtubeUrl: 'https://www.youtube.com/watch?v=QHRuTYtSbJQ',
        startTime: 65
      },
      {
        // Falta gameTitle e youtubeUrl
        gameTitle: '',
        releaseYear: 2020,
        songTitle: 'Invalid Song',
        youtubeUrl: '',
        startTime: 0
      }
    ];

    const result = repo.importBatch(invalidBatch);
    assert.equal(result.inserted, 0);
    assert.ok(result.errors.length > 0);

    // O total no banco deve continuar inalterado (Rollback / rejeição atômica)
    const afterCount = repo.count();
    assert.equal(afterCount, initialCount);
  });

  it('Deve selecionar música aleatória respeitando exclusões de rodadas anteriores', () => {
    const song1 = repo.getRandomSong();
    assert.ok(song1);

    // Se excluirmos o id da primeira, deve vir a outra
    const song2 = repo.getRandomSong([song1.id]);
    assert.ok(song2);
    assert.notEqual(song1.id, song2.id);
  });
});
