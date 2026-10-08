import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { buildServer, ServerInstance } from '../../src/index.js';
import { SongEntity } from '../../src/db/repositories/catalogRepository.js';

describe('E2E-01: Simulação Completa de Partida até a Vitória (CA-08)', () => {
  let serverInstance: ServerInstance;
  const port = 3056;
  const wsUrl = `ws://127.0.0.1:${port}/ws`;

  // Catálogo com 12 músicas em ordem cronológica para teste
  const sampleSongs: Omit<SongEntity, 'id' | 'createdAt'>[] = [
    { gameTitle: 'Super Mario Bros', releaseYear: 1985, songTitle: 'Overworld', youtubeUrl: 'https://youtube.com/watch?v=1', youtubeId: 'yt1', startTime: 0, tags: ['retro'] },
    { gameTitle: 'The Legend of Zelda', releaseYear: 1986, songTitle: 'Main Theme', youtubeUrl: 'https://youtube.com/watch?v=2', youtubeId: 'yt2', startTime: 0, tags: ['retro'] },
    { gameTitle: 'Mega Man 2', releaseYear: 1988, songTitle: 'Dr Wily Stage 1', youtubeUrl: 'https://youtube.com/watch?v=3', youtubeId: 'yt3', startTime: 0, tags: ['retro'] },
    { gameTitle: 'Sonic the Hedgehog', releaseYear: 1991, songTitle: 'Green Hill Zone', youtubeUrl: 'https://youtube.com/watch?v=4', youtubeId: 'yt4', startTime: 0, tags: ['retro'] },
    { gameTitle: 'Street Fighter II', releaseYear: 1992, songTitle: 'Guile Theme', youtubeUrl: 'https://youtube.com/watch?v=5', youtubeId: 'yt5', startTime: 0, tags: ['arcade'] },
    { gameTitle: 'Doom', releaseYear: 1993, songTitle: 'E1M1', youtubeUrl: 'https://youtube.com/watch?v=6', youtubeId: 'yt6', startTime: 0, tags: ['fps'] },
    { gameTitle: 'Donkey Kong Country', releaseYear: 1994, songTitle: 'Aquatic Ambiance', youtubeUrl: 'https://youtube.com/watch?v=7', youtubeId: 'yt7', startTime: 0, tags: ['retro'] },
    { gameTitle: 'Chrono Trigger', releaseYear: 1995, songTitle: 'Wind Scene', youtubeUrl: 'https://youtube.com/watch?v=8', youtubeId: 'yt8', startTime: 0, tags: ['rpg'] },
    { gameTitle: 'Super Mario 64', releaseYear: 1996, songTitle: 'Bob-omb Battlefield', youtubeUrl: 'https://youtube.com/watch?v=9', youtubeId: 'yt9', startTime: 0, tags: ['retro'] },
    { gameTitle: 'Final Fantasy VII', releaseYear: 1997, songTitle: 'One-Winged Angel', youtubeUrl: 'https://youtube.com/watch?v=10', youtubeId: 'yt10', startTime: 0, tags: ['rpg'] },
    { gameTitle: 'Zelda Ocarina of Time', releaseYear: 1998, songTitle: 'Gerudo Valley', youtubeUrl: 'https://youtube.com/watch?v=11', youtubeId: 'yt11', startTime: 0, tags: ['retro'] },
    { gameTitle: 'Castlevania Symphony', releaseYear: 1999, songTitle: 'Lost Painting', youtubeUrl: 'https://youtube.com/watch?v=12', youtubeId: 'yt12', startTime: 0, tags: ['retro'] }
  ];

  before(async () => {
    serverInstance = await buildServer({ dbPath: ':memory:' });
    await serverInstance.fastify.listen({ port, host: '127.0.0.1' });

    // Insere músicas no catálogo
    serverInstance.catalogRepo.importBatch(sampleSongs);
  });

  after(async () => {
    await serverInstance.fastify.close();
  });

  function connectClient(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      ws.on('open', () => resolve(ws));
      ws.on('error', reject);
    });
  }

  function waitForMessageType(ws: WebSocket, type: string, timeoutMs = 4000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        ws.off('message', onMsg);
        reject(new Error(`Timeout aguardando mensagem tipo: ${type}`));
      }, timeoutMs);

      const onMsg = (data: any) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.type === type) {
            clearTimeout(timer);
            ws.off('message', onMsg);
            resolve(parsed);
          }
        } catch (e) {}
      };

      ws.on('message', onMsg);
    });
  }

  it('E2E-01: Partida de 2 jogadores até vitória de 10 cartas no Modo Linha do Tempo (CA-08)', async () => {
    // 1. Host cria sala configurada para 10 cartas
    const res = await serverInstance.fastify.inject({
      method: 'POST',
      url: '/api/rooms',
      payload: {
        nickname: 'Alice',
        settings: { mode: 'TIMELINE', maxCardsToWin: 10 }
      }
    });

    assert.equal(res.statusCode, 201);
    const { roomId, playerId: hostId } = JSON.parse(res.body);

    // 2. Conecta Host (Alice) e Guest (Bob)
    const wsAlice = await connectClient();
    const wsBob = await connectClient();

    const aliceJoinedPromise = waitForMessageType(wsAlice, 'room:joined');
    wsAlice.send(JSON.stringify({
      type: 'room:join',
      payload: { roomId, nickname: 'Alice', sessionToken: hostId }
    }));
    await aliceJoinedPromise;

    const bobJoinedPromise = waitForMessageType(wsBob, 'room:joined');
    wsBob.send(JSON.stringify({
      type: 'room:join',
      payload: { roomId, nickname: 'Bob' }
    }));
    const bobJoined = await bobJoinedPromise;
    const bobId = bobJoined.payload.player.id;

    // 3. Inicia o jogo
    const roundStartPromise = waitForMessageType(wsAlice, 'round:start');
    wsAlice.send(JSON.stringify({ type: 'game:start' }));
    await roundStartPromise;

    const room = serverInstance.roomManager.getRoom(roomId)!;
    assert.equal(room.status, 'PLAYING');

    // 4. Simula rodadas consecutivas onde Alice acerta sucessivamente até 10 cartas
    let isGameOver = false;
    let finalGameOverPayload: any = null;

    for (let roundNum = 1; roundNum <= 15 && !isGameOver; roundNum++) {
      const currentRound = room.currentRound;
      assert.ok(currentRound);

      // Sempre garante que Alice é a jogadora ativa para acelerar vitória em 10 acertos
      currentRound.activePlayerId = hostId;

      // Alice envia palpite correto do jogo e da música
      const targetSong = currentRound.song;
      const aliceSocket = wsAlice;

      // Calcula o slot correto na timeline existente de Alice
      const alicePlayer = room.players.get(hostId)!;
      let correctSlot = 0;
      if (alicePlayer.timeline.length > 0) {
        const sorted = [...alicePlayer.timeline].sort((a, b) => a.releaseYear - b.releaseYear);
        if (targetSong.releaseYear <= sorted[0].releaseYear) {
          correctSlot = 0;
        } else if (targetSong.releaseYear >= sorted[sorted.length - 1].releaseYear) {
          correctSlot = sorted.length;
        } else {
          for (let i = 1; i < sorted.length; i++) {
            if (targetSong.releaseYear >= sorted[i - 1].releaseYear && targetSong.releaseYear <= sorted[i].releaseYear) {
              correctSlot = i;
              break;
            }
          }
        }
      }

      aliceSocket.send(JSON.stringify({
        type: 'guess:submit',
        payload: {
          gameGuess: targetSong.gameTitle,
          songGuess: targetSong.songTitle,
          timelineIndex: correctSlot
        }
      }));

      // Aguarda 20ms para processamento do palpite
      await new Promise(r => setTimeout(r, 20));

      // Dispara resolução da rodada
      const roundEndPromise = new Promise<any>((resolve) => {
        const handler = (data: any) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'round:end' || msg.type === 'game:over') {
            wsAlice.off('message', handler);
            resolve(msg);
          }
        };
        wsAlice.on('message', handler);
      });

      wsAlice.send(JSON.stringify({ type: 'round:resolve' }));
      const resultMsg = await roundEndPromise;

      if (resultMsg.type === 'game:over') {
        isGameOver = true;
        finalGameOverPayload = resultMsg.payload;
        break;
      }

      assert.equal(resultMsg.type, 'round:end');
      assert.equal(resultMsg.payload.resolution.gameCorrect, true);

      // Avança para próxima rodada
      const nextRoundPromise = waitForMessageType(wsAlice, 'round:start');
      wsAlice.send(JSON.stringify({ type: 'round:next' }));
      await nextRoundPromise;
    }

    // 5. Validação da condição de vitória (CA-08)
    assert.ok(isGameOver, 'A partida deveria terminar com GAME_OVER após 10 acertos');
    assert.equal(finalGameOverPayload.winner.playerId, hostId);
    assert.equal(finalGameOverPayload.winner.nickname, 'Alice');
    assert.equal(finalGameOverPayload.winner.cardsCount, 10);
    assert.equal(finalGameOverPayload.podium.length, 2);
    assert.equal(finalGameOverPayload.mode, 'TIMELINE');
    assert.equal(room.status, 'GAME_OVER');

    wsAlice.close();
    wsBob.close();
  });

  it('E2E-03: Roubo de música (STEAL) não queima o turno do jogador roubado, retornando a vez para ele na rodada seguinte', async () => {
    // 1. Host cria sala
    const res = await serverInstance.fastify.inject({
      method: 'POST',
      url: '/api/rooms',
      payload: {
        nickname: 'Alice',
        settings: { mode: 'TIMELINE', maxCardsToWin: 10 }
      }
    });

    const { roomId, playerId: hostId } = JSON.parse(res.body);

    const wsAlice = await connectClient();
    const wsBob = await connectClient();

    const aliceJoinedPromise = waitForMessageType(wsAlice, 'room:joined');
    wsAlice.send(JSON.stringify({
      type: 'room:join',
      payload: { roomId, nickname: 'Alice', sessionToken: hostId }
    }));
    await aliceJoinedPromise;

    const bobJoinedPromise = waitForMessageType(wsBob, 'room:joined');
    wsBob.send(JSON.stringify({
      type: 'room:join',
      payload: { roomId, nickname: 'Bob' }
    }));
    const bobJoined = await bobJoinedPromise;
    const bobId = bobJoined.payload.player.id;

    // 2. Inicia o jogo -> Round 1: Vez da Alice
    const round1Promise = waitForMessageType(wsAlice, 'round:start');
    wsAlice.send(JSON.stringify({ type: 'game:start' }));
    const round1 = await round1Promise;

    assert.equal(round1.payload.activePlayerId, hostId);
    assert.equal(round1.payload.roundNumber, 1);

    const room = serverInstance.roomManager.getRoom(roomId)!;
    const bobPlayer = room.players.get(bobId)!;
    bobPlayer.tokens = 2; // Fornece 2 tokens para Bob poder roubar

    // 3. Bob rouba a rodada da Alice
    const powerAppliedPromise = waitForMessageType(wsBob, 'power:applied');
    wsBob.send(JSON.stringify({
      type: 'power:use',
      payload: { power: 'STEAL' }
    }));
    const powerMsg = await powerAppliedPromise;
    assert.equal(powerMsg.payload.power, 'STEAL');
    assert.equal(room.currentRound?.activePlayerId, bobId);
    assert.equal(room.currentRound?.originalPlayerId, hostId);
    assert.equal(room.currentRound?.isStolen, true);

    // 4. Resolve o turno roubado de Bob
    const roundEndPromise = waitForMessageType(wsAlice, 'round:end');
    wsAlice.send(JSON.stringify({ type: 'round:resolve' }));
    await roundEndPromise;

    // 5. Avança para a próxima rodada
    const round2Promise = waitForMessageType(wsAlice, 'round:start');
    wsAlice.send(JSON.stringify({ type: 'round:next' }));
    const round2 = await round2Promise;

    // O turno deve voltar para Alice (a vítima do roubo), que agora tem sua rodada normal!
    assert.equal(round2.payload.activePlayerId, hostId, 'A vez deveria retornar para Alice (vítima do roubo)');
    assert.equal(round2.payload.roundNumber, 2);

    // 6. Resolve a rodada de Alice
    const round2EndPromise = waitForMessageType(wsAlice, 'round:end');
    wsAlice.send(JSON.stringify({ type: 'round:resolve' }));
    await round2EndPromise;

    // 7. Avança para a terceira rodada -> deve ser a vez de Bob na rotação natural
    const round3Promise = waitForMessageType(wsAlice, 'round:start');
    wsAlice.send(JSON.stringify({ type: 'round:next' }));
    const round3 = await round3Promise;

    assert.equal(round3.payload.activePlayerId, bobId, 'A vez deveria avançar naturalmente para Bob');
    assert.equal(round3.payload.roundNumber, 3);

    wsAlice.close();
    wsBob.close();
  });
});
