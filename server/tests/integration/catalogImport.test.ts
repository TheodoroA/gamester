import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { CatalogRepository, NewSongInput } from '../../src/db/repositories/catalogRepository.js';
import { CatalogController } from '../../src/controllers/catalogController.js';
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

  it('Deve barrar requisições em listSongs sem chave de administração válida (401)', async () => {
    const controller = new CatalogController(repo, 'chave-secreta-teste');
    let statusCode = 200;
    let payload: any = null;

    const mockReply: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      send(data: any) {
        payload = data;
        return this;
      }
    };

    // Sem chave
    await controller.listSongs({ headers: {}, query: {} } as any, mockReply);
    assert.equal(statusCode, 401);
    assert.equal(payload?.error?.code, 'UNAUTHORIZED');

    // Com chave incorreta
    statusCode = 200;
    await controller.listSongs({ headers: { 'x-admin-key': 'chave-errada' }, query: {} } as any, mockReply);
    assert.equal(statusCode, 401);
    assert.equal(payload?.error?.code, 'UNAUTHORIZED');

    // Com chave correta
    statusCode = 200;
    await controller.listSongs({ headers: { 'x-admin-key': 'chave-secreta-teste' }, query: {} } as any, mockReply);
    assert.equal(statusCode, 200);
    assert.ok(Array.isArray(payload.songs));
  });

  it('Deve verificar chave de administração via verifyAdmin com sucesso ou rejeição', async () => {
    const controller = new CatalogController(repo, 'chave-secreta-teste');
    let statusCode = 200;
    let payload: any = null;

    const mockReply: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      send(data: any) {
        payload = data;
        return this;
      }
    };

    // Chave incorreta
    await controller.verifyAdmin({ headers: { 'x-admin-key': 'errada' } } as any, mockReply);
    assert.equal(statusCode, 401);

    // Chave correta
    statusCode = 200;
    await controller.verifyAdmin({ headers: { 'x-admin-key': 'chave-secreta-teste' } } as any, mockReply);
    assert.equal(statusCode, 200);
    assert.equal(payload?.success, true);
  });

  it('Deve atualizar os dados de uma música existente (updateSong) com proteção de admin', async () => {
    const song = repo.getRandomSong()!;
    assert.ok(song);

    // 1. Atualiza no repositório diretamente
    const updatedRepo = repo.updateSong(song.id, {
      songTitle: 'Title Edited',
      releaseYear: 1999,
      tags: ['edited-tag'],
      aliases: ['NewAlias']
    });

    assert.ok(updatedRepo);
    assert.equal(updatedRepo.songTitle, 'Title Edited');
    assert.equal(updatedRepo.releaseYear, 1999);
    assert.deepEqual(updatedRepo.tags, ['edited-tag']);
    assert.deepEqual(updatedRepo.aliases, ['NewAlias']);

    // 2. Testa controller sem admin key -> 401
    const controller = new CatalogController(repo, 'chave-secreta-teste');
    let statusCode = 200;
    let payload: any = null;
    const mockReply: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      send(data: any) {
        payload = data;
        return this;
      }
    };

    await controller.updateSong(
      { headers: {}, params: { id: song.id }, body: { gameTitle: 'Novo Jogo' } } as any,
      mockReply
    );
    assert.equal(statusCode, 401);

    // 3. Testa controller com chave correta -> 200
    statusCode = 200;
    await controller.updateSong(
      { headers: { 'x-admin-key': 'chave-secreta-teste' }, params: { id: song.id }, body: { gameTitle: 'Chrono Trigger Remaster' } } as any,
      mockReply
    );
    assert.equal(statusCode, 200);
    assert.equal(payload.gameTitle, 'Chrono Trigger Remaster');

    // Confirma persistência
    const fetched = repo.getSongById(song.id);
    assert.equal(fetched?.gameTitle, 'Chrono Trigger Remaster');
  });

  it('Deve desativar e ativar música (toggleSongActive) e ignorar inativas no sorteio', async () => {
    const song = repo.createSong({
      gameTitle: 'Song to Deactivate',
      releaseYear: 2000,
      songTitle: 'Track 1',
      youtubeUrl: 'https://youtube.com/watch?v=11111111111',
      startTime: 0,
      isActive: true
    });

    assert.equal(song.isActive, true);

    // Desativa a música
    const deactivated = repo.toggleSongActive(song.id, false);
    assert.ok(deactivated);
    assert.equal(deactivated?.isActive, false);

    // Confirma que getRandomSong nunca sorteia música inativa
    const fetched = repo.getSongById(song.id);
    assert.equal(fetched?.isActive, false);

    // Cria outra música ativa para sorteio exclusivo
    const activeSong = repo.createSong({
      gameTitle: 'Active Unique Game',
      releaseYear: 2010,
      songTitle: 'Active Song',
      youtubeUrl: 'https://youtube.com/watch?v=22222222222',
      startTime: 0,
      isActive: true
    });

    // Pega música excluindo as demais, garantindo que a inativa não seja retornada
    const random = repo.getRandomSong();
    assert.ok(random);
    assert.notEqual(random.id, song.id);

    // Reativa a música
    const reactivated = repo.toggleSongActive(song.id, true);
    assert.equal(reactivated?.isActive, true);
  });

  it('Deve excluir permanentemente uma música (deleteSong) com proteção de admin', async () => {
    const song = repo.createSong({
      gameTitle: 'Song to Delete',
      releaseYear: 1999,
      songTitle: 'Delete Me',
      youtubeUrl: 'https://youtube.com/watch?v=33333333333',
      startTime: 0,
      aliases: ['Del1', 'Del2']
    });

    const controller = new CatalogController(repo, 'chave-secreta-teste');
    let statusCode = 200;
    let payload: any = null;
    const mockReply: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      send(data: any) {
        payload = data;
        return this;
      }
    };

    // 1. Sem admin key -> 401
    await controller.deleteSong({ headers: {}, params: { id: song.id } } as any, mockReply);
    assert.equal(statusCode, 401);

    // 2. Com admin key -> 200
    statusCode = 200;
    await controller.deleteSong(
      { headers: { 'x-admin-key': 'chave-secreta-teste' }, params: { id: song.id } } as any,
      mockReply
    );
    assert.equal(statusCode, 200);
    assert.equal(payload.success, true);

    // 3. Verifica que foi removida do banco
    const deleted = repo.getSongById(song.id);
    assert.equal(deleted, null);
  });
});

