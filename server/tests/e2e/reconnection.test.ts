import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { buildServer, ServerInstance } from '../../src/index.js';

describe('E2E-02: Queda de Conexão e Restauração de Estado em até 60s (CA-10)', () => {
  let serverInstance: ServerInstance;
  const port = 3057;
  const wsUrl = `ws://127.0.0.1:${port}/ws`;

  before(async () => {
    serverInstance = await buildServer();
    await serverInstance.fastify.listen({ port, host: '127.0.0.1' });
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

  it('E2E-02: Queda forçada de socket e restauração de fichas, linha do tempo e rodada ativa', async () => {
    // 1. Criação de sala
    const res = await serverInstance.fastify.inject({
      method: 'POST',
      url: '/api/rooms',
      payload: { nickname: 'HostPlayer' }
    });
    const { roomId, playerId: hostId } = JSON.parse(res.body);

    // 2. Conexão dos dois jogadores
    const wsHost = await connectClient();
    const wsGuest = await connectClient();

    const hostJoinPromise = waitForMessageType(wsHost, 'room:joined');
    wsHost.send(JSON.stringify({
      type: 'room:join',
      payload: { roomId, nickname: 'HostPlayer', sessionToken: hostId }
    }));
    await hostJoinPromise;

    const guestJoinPromise = waitForMessageType(wsGuest, 'room:joined');
    wsGuest.send(JSON.stringify({
      type: 'room:join',
      payload: { roomId, nickname: 'GuestPlayer' }
    }));
    const guestJoinMsg = await guestJoinPromise;
    const guestId = guestJoinMsg.payload.player.id;

    // 3. Inicia o jogo
    const roundStartPromise = waitForMessageType(wsHost, 'round:start');
    wsHost.send(JSON.stringify({ type: 'game:start' }));
    await roundStartPromise;

    const room = serverInstance.roomManager.getRoom(roomId)!;
    const guestPlayer = room.players.get(guestId)!;

    // Concede 3 tokens e 2 cartas prévias para o GuestPlayer
    guestPlayer.tokens = 3;
    guestPlayer.score = 6;
    guestPlayer.timeline = [
      { id: 'c1', gameTitle: 'Sonic', releaseYear: 1991 },
      { id: 'c2', gameTitle: 'Doom', releaseYear: 1993 }
    ];

    // 4. Queda forçada do socket do GuestPlayer
    wsGuest.terminate();
    await new Promise((r) => setTimeout(r, 60));

    // Valida que o servidor marcou o jogador como desconectado sem deletá-lo
    assert.equal(guestPlayer.isConnected, false);
    assert.ok(guestPlayer.disconnectedAt);
    assert.ok(room.players.has(guestId));

    // 5. Reconexão do GuestPlayer dentro da janela de 60s
    const wsGuestReconnected = await connectClient();
    const syncStatePromise = waitForMessageType(wsGuestReconnected, 'room:syncState');

    wsGuestReconnected.send(JSON.stringify({
      type: 'room:join',
      payload: {
        roomId,
        nickname: 'GuestPlayer',
        sessionToken: guestId
      }
    }));

    const syncMsg = await syncStatePromise;

    // 6. Verificação de integridade do estado restaurado
    assert.equal(syncMsg.type, 'room:syncState');
    assert.equal(syncMsg.payload.player.id, guestId);
    assert.equal(syncMsg.payload.player.nickname, 'GuestPlayer');
    assert.equal(syncMsg.payload.player.tokens, 3, 'Saldo de recursos deve permanecer inalterado');
    assert.equal(syncMsg.payload.player.score, 6, 'Pontuação deve permanecer inalterada');
    assert.equal(syncMsg.payload.player.timeline.length, 2, 'Linha do tempo deve conter as 2 cartas');
    assert.equal(syncMsg.payload.player.isConnected, true);
    assert.equal(syncMsg.payload.room.status, 'PLAYING');
    assert.ok(syncMsg.payload.room.currentRound, 'A rodada ativa deve continuar acessível');

    wsHost.close();
    wsGuestReconnected.close();
  });
});
