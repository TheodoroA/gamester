import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { buildServer, ServerInstance } from '../../src/index.js';

describe('Gerenciador de Salas e WebSockets (TI-01, CA-01, CA-10)', () => {
  let serverInstance: ServerInstance;
  let serverUrl: string;
  let wsUrl: string;
  const port = 3055; // Porta isolada para testes

  before(async () => {
    serverInstance = await buildServer({ dbPath: ':memory:' });
    await serverInstance.fastify.listen({ port, host: '127.0.0.1' });
    serverUrl = `http://127.0.0.1:${port}`;
    wsUrl = `ws://127.0.0.1:${port}/ws`;
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

  function waitForMessage(ws: WebSocket): Promise<any> {
    return new Promise((resolve) => {
      ws.once('message', (data) => {
        resolve(JSON.parse(data.toString()));
      });
    });
  }

  it('TI-01: Deve permitir criação de sala via REST e entrada sincronizada via WebSocket', async () => {
    // 1. Cria a sala via REST
    const res = await serverInstance.fastify.inject({
      method: 'POST',
      url: '/api/rooms',
      payload: { nickname: 'HostPlayer' }
    });

    assert.equal(res.statusCode, 201);
    const roomData = JSON.parse(res.body);
    const roomId = roomData.roomId;
    assert.ok(roomId);

    // 2. Conecta Host via WebSocket
    const ws1 = await connectClient();
    ws1.send(JSON.stringify({
      type: 'room:join',
      payload: { roomId, nickname: 'HostPlayer', sessionToken: roomData.playerId }
    }));

    const hostJoined = await waitForMessage(ws1);
    assert.equal(hostJoined.type, 'room:joined');
    assert.equal(hostJoined.payload.room.id, roomId);
    assert.equal(hostJoined.payload.room.players.length, 1);

    // 3. Conecta segundo jogador (Guest)
    const ws2 = await connectClient();
    ws2.send(JSON.stringify({
      type: 'room:join',
      payload: { roomId, nickname: 'GuestPlayer' }
    }));

    // Guest deve receber confirmação de entrada
    const guestJoined = await waitForMessage(ws2);
    assert.equal(guestJoined.type, 'room:joined');
    assert.equal(guestJoined.payload.player.nickname, 'GuestPlayer');
    assert.equal(guestJoined.payload.room.players.length, 2);

    ws1.close();
    ws2.close();
  });

  it('CA-10: Deve permitir reconexão transparente sem perda de estado do jogador', async () => {
    // 1. Cria sala
    const { room, host } = serverInstance.roomManager.createRoom('ReconHost');
    const roomId = room.id;
    const sessionToken = host.id;

    // 2. Conecta
    const ws1 = await connectClient();
    ws1.send(JSON.stringify({
      type: 'room:join',
      payload: { roomId, nickname: 'ReconHost', sessionToken }
    }));

    const joinedMsg = await waitForMessage(ws1);
    assert.equal(joinedMsg.type, 'room:joined');

    // 3. Simula desconexão abrupta
    ws1.close();
    await new Promise((r) => setTimeout(r, 50));

    const roomAfterDisconnect = serverInstance.roomManager.getRoom(roomId);
    assert.ok(roomAfterDisconnect);
    const disconnectedPlayer = roomAfterDisconnect.players.get(sessionToken);
    assert.equal(disconnectedPlayer?.isConnected, false);

    // 4. Reconecta com o mesmo sessionToken
    const ws2 = await connectClient();
    ws2.send(JSON.stringify({
      type: 'room:join',
      payload: { roomId, nickname: 'ReconHost', sessionToken }
    }));

    const syncMsg = await waitForMessage(ws2);
    assert.equal(syncMsg.type, 'room:syncState');
    assert.equal(syncMsg.payload.player.id, sessionToken);
    assert.equal(syncMsg.payload.player.isConnected, true);

    ws2.close();
  });

  it('Deve responder com status saudável e métricas de memória no /health', async () => {
    const res = await serverInstance.fastify.inject({
      method: 'GET',
      url: '/health'
    });

    assert.equal(res.statusCode, 200);
    const health = JSON.parse(res.body);
    assert.equal(health.status, 'healthy');
    assert.ok(typeof health.memory.rssMb === 'number');
    assert.ok(health.memory.rssMb < 150); // Garantia de teto de memória da VPS
  });
});
