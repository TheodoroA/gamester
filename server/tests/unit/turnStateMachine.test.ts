import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Room } from '../../src/game/roomManager.js';
import { TurnStateMachine } from '../../src/game/turnStateMachine.js';
import { SongEntity } from '../../src/db/repositories/catalogRepository.js';

describe('TurnStateMachine e Poderes (TU-06, TU-07)', () => {
  const dummySong1: SongEntity = {
    id: 'song-1',
    gameTitle: 'Chrono Trigger',
    releaseYear: 1995,
    songTitle: 'Wind Scene',
    youtubeUrl: 'https://youtube.com/watch?v=11111111111',
    youtubeId: '11111111111',
    startTime: 10,
    tags: ['rpg', 'snes'],
    aliases: ['CT'],
    createdAt: Date.now()
  };

  const dummySong2: SongEntity = {
    id: 'song-2',
    gameTitle: 'Hollow Knight',
    releaseYear: 2017,
    songTitle: 'City of Tears',
    youtubeUrl: 'https://youtube.com/watch?v=22222222222',
    youtubeId: '22222222222',
    startTime: 30,
    tags: ['indie'],
    aliases: ['HK'],
    createdAt: Date.now()
  };

  function createTestRoom() {
    const room = new Room('TEST', 'player-1');
    room.players.set('player-1', {
      id: 'player-1',
      nickname: 'Alice',
      isHost: true,
      isReady: true,
      tokens: 3,
      score: 0,
      timeline: [],
      isConnected: true
    });
    room.players.set('player-2', {
      id: 'player-2',
      nickname: 'Bob',
      isHost: false,
      isReady: true,
      tokens: 2,
      score: 0,
      timeline: [],
      isConnected: true
    });
    return room;
  }

  it('TU-06: Deve respeitar o teto máximo de acúmulo de 5 recursos', () => {
    const room = createTestRoom();
    const player1 = room.players.get('player-1')!;
    player1.tokens = 5; // Já no teto

    TurnStateMachine.startRound(room, 'player-1', dummySong1);

    // Submete palpite acertando o nome da música bônus
    TurnStateMachine.submitGuess(room, 'player-1', {
      gameGuess: 'Chrono Trigger',
      songGuess: 'Wind Scene'
    });

    const resolution = TurnStateMachine.resolveRound(room, true);
    assert.equal(resolution.songTitleCorrect, true);
    assert.equal(resolution.tokensEarned, 0); // Não ganha pois já está em 5
    assert.equal(player1.tokens, 5); // Teto preservado
  });

  it('TU-07: Deve rejeitar acionamento de poderes fora da janela de 15 segundos (POWER_TIMEOUT)', () => {
    const room = createTestRoom();
    const round = TurnStateMachine.startRound(room, 'player-1', dummySong1);

    // Simula momento aos 16 segundos da rodada
    const timeAt16s = round.startedAt + 16000;

    const result = TurnStateMachine.applyPower(
      room,
      'player-1',
      'REROLL',
      () => dummySong2,
      timeAt16s
    );

    assert.equal(result.success, false);
    assert.equal(result.error, 'POWER_TIMEOUT');
    // Saldo não deve ser deduzido
    assert.equal(room.players.get('player-1')!.tokens, 3);
  });

  it('TI-02 / TI-03: Deve processar poderes Trocar Música e Roubar Música corretamente dentro dos 15s', () => {
    const room = createTestRoom();
    const round = TurnStateMachine.startRound(room, 'player-1', dummySong1);
    const timeAt5s = round.startedAt + 5000;

    // 1. Jogador 1 gasta 1 token para trocar de música (REROLL)
    const rerollResult = TurnStateMachine.applyPower(
      room,
      'player-1',
      'REROLL',
      () => dummySong2,
      timeAt5s
    );

    assert.equal(rerollResult.success, true);
    assert.equal(room.players.get('player-1')!.tokens, 2); // 3 - 1 = 2
    assert.equal(room.currentRound.song.gameTitle, 'Hollow Knight');

    // 2. Jogador 2 gasta 2 tokens para roubar a música (STEAL)
    const stealResult = TurnStateMachine.applyPower(
      room,
      'player-2',
      'STEAL',
      undefined,
      timeAt5s + 1000
    );

    assert.equal(stealResult.success, true);
    assert.equal(room.players.get('player-2')!.tokens, 0); // 2 - 2 = 0
    assert.equal(room.currentRound.isStolen, true);
    assert.equal(room.currentRound.activePlayerId, 'player-2');

    // 3. Tentativa de roubo duplo deve falhar
    const stealAgainResult = TurnStateMachine.applyPower(
      room,
      'player-1',
      'STEAL',
      undefined,
      timeAt5s + 2000
    );
    assert.equal(stealAgainResult.success, false);
    assert.equal(stealAgainResult.error, 'ALREADY_STOLEN');
  });

  it('Deve processar Acerto Automático (AUTOHIT) deduzindo 3 recursos', () => {
    const room = createTestRoom();
    const player1 = room.players.get('player-1')!;
    player1.tokens = 3;

    const round = TurnStateMachine.startRound(room, 'player-1', dummySong1);
    const timeAt10s = round.startedAt + 10000;

    const autoHitResult = TurnStateMachine.applyPower(
      room,
      'player-1',
      'AUTOHIT',
      undefined,
      timeAt10s
    );

    assert.equal(autoHitResult.success, true);
    assert.equal(player1.tokens, 0); // 3 - 3 = 0
    assert.equal(round.autoHitUsed, true);

    const resolution = TurnStateMachine.resolveRound(room, true);
    assert.equal(resolution.gameCorrect, true);
    assert.equal(resolution.timelineCorrect, true);
  });

  it('Deve resolver rodada no modo ARCADE pontuando sem adicionar cartas na timeline', () => {
    const room = new Room('ARCADE_TEST', 'player-1', { mode: 'ARCADE' });
    room.players.set('player-1', {
      id: 'player-1',
      nickname: 'Alice',
      isHost: true,
      isReady: true,
      tokens: 0,
      score: 0,
      timeline: [],
      isConnected: true
    });

    TurnStateMachine.startRound(room, 'player-1', dummySong1);
    TurnStateMachine.submitGuess(room, 'player-1', {
      gameGuess: 'Chrono Trigger'
    });

    const resolution = TurnStateMachine.resolveRound(room, false);
    assert.equal(resolution.gameCorrect, true);
    assert.equal(resolution.timelineCorrect, true);

    const player1 = room.players.get('player-1')!;
    assert.equal(player1.score, 2);
    assert.equal(player1.timeline.length, 0); // Nenhuma carta na timeline no modo Arcade!
  });
});
