import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'node:http';
import { RoomManager, Room } from '../game/roomManager.js';
import { TurnStateMachine, PowerType, GuessPayload } from '../game/turnStateMachine.js';
import { TimelineValidator } from '../game/timelineValidator.js';
import { GameModes } from '../game/gameModes.js';
import { CatalogRepository, SongEntity } from '../db/repositories/catalogRepository.js';

export interface WSMessage {
  type: string;
  roomId?: string;
  playerId?: string;
  sessionToken?: string;
  payload?: any;
}

export function setupWebSocketServer(
  httpServer: Server,
  roomManager: RoomManager,
  catalogRepo?: CatalogRepository
): WebSocketServer {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  const executeResolveRound = (room: Room) => {
    room.clearTimers();
    if (!room.currentRound || room.status !== 'PLAYING') return;

    const round = room.currentRound;
    const activePlayer = room.players.get(round.activePlayerId);

    // Se a timeline do jogador estiver vazia, qualquer posição é válida
    let timelineValid = true;
    if (room.settings.mode === 'TIMELINE' && activePlayer) {
      if (round.autoHitUsed || activePlayer.timeline.length === 0) {
        timelineValid = true;
      } else if (round.guessPayload?.timelineIndex !== undefined) {
        const validation = TimelineValidator.validateSlot(
          activePlayer.timeline,
          round.guessPayload.timelineIndex,
          round.song.releaseYear
        );
        timelineValid = validation.isValid;
      } else {
        timelineValid = false;
      }
    }

    const resolution = TurnStateMachine.resolveRound(room, timelineValid);

    // Se for modo ARCADE, calcular pontos adicionais
    if (room.settings.mode === 'ARCADE' && activePlayer) {
      const arcadePts = GameModes.calculateArcadePoints(
        resolution.gameCorrect,
        round.song.releaseYear,
        round.guessPayload?.targetYear,
        resolution.songTitleCorrect
      );
      activePlayer.score += arcadePts;
    }

    // Checar condição de vitória
    const gameOver = GameModes.checkVictory(room);
    if (gameOver) {
      room.status = 'GAME_OVER';
      room.clearTimers();
      room.broadcast({
        type: 'game:over',
        payload: {
          ...gameOver,
          resolution
        }
      });
    } else {
      room.broadcast({
        type: 'round:end',
        payload: {
          resolution,
          room: room.toDTO()
        }
      });

      // Transição automática para a próxima rodada após 10 segundos de revelação
      room.revealTimer = setTimeout(() => {
        executeNextRound(room);
      }, 10000);
      room.revealTimer.unref?.();
    }
  };

  const executeNextRound = (room: Room) => {
    room.clearTimers();
    if (room.status !== 'PLAYING') return;

    const playerIds = Array.from(room.players.keys());
    if (playerIds.length === 0) return;

    const currentIdx = room.currentRound ? playerIds.indexOf(room.currentRound.originalPlayerId || room.currentRound.activePlayerId) : -1;
    const nextIdx = (currentIdx + 1) % playerIds.length;
    const nextPlayerId = playerIds[nextIdx];

    const song = catalogRepo?.getRandomSong(room.playedSongIds, room.settings.category, room.settings.tag) || {
      id: 'fallback-' + (room.currentRound ? room.currentRound.roundNumber + 1 : 1),
      gameTitle: 'Chrono Trigger',
      releaseYear: 1995,
      songTitle: 'Wind Scene',
      youtubeUrl: 'https://youtube.com/watch?v=5ejTEpMhp_8',
      youtubeId: '5ejTEpMhp_8',
      startTime: 12,
      tags: ['rpg'],
      aliases: ['CT'],
      createdAt: Date.now()
    };

    room.playedSongIds.push(song.id);
    const nextRoundNumber = (room.currentRound?.roundNumber || 0) + 1;
    const round = TurnStateMachine.startRound(room, nextPlayerId, song, nextRoundNumber);

    room.broadcast({
      type: 'round:start',
      payload: {
        roundNumber: round.roundNumber,
        activePlayerId: round.activePlayerId,
        youtubeId: song.youtubeId,
        startTime: song.startTime,
        startedAt: round.startedAt,
        interventionEndsAt: round.interventionEndsAt,
        roundEndsAt: round.roundEndsAt
      }
    });

    const listenDurationMs = (room.settings.listenSeconds || 30) * 1000;
    room.roundTimer = setTimeout(() => {
      executeResolveRound(room);
    }, listenDurationMs);
    room.roundTimer.unref?.();
  };

  wss.on('connection', (ws: WebSocket) => {
    let currentRoomId: string | null = null;
    let currentPlayerId: string | null = null;

    ws.on('message', (data: Buffer | string) => {
      try {
        const msg: WSMessage = JSON.parse(data.toString());

        switch (msg.type) {
          case 'room:join': {
            const { roomId, nickname, sessionToken, password } = msg.payload || {};
            if (!roomId || !nickname) {
              ws.send(JSON.stringify({ type: 'room:error', payload: { code: 'INVALID_INPUT', message: 'roomId e nickname são obrigatórios.' } }));
              return;
            }

            try {
              const { player, room, isReconnection } = roomManager.joinRoom(roomId, nickname, sessionToken, password, ws);
              currentRoomId = room.id;
              currentPlayerId = player.id;

              ws.send(JSON.stringify({
                type: isReconnection ? 'room:syncState' : 'room:joined',
                payload: {
                  player,
                  room: room.toDTO()
                }
              }));

              room.broadcast({
                type: 'room:update',
                payload: room.toDTO()
              }, player.id);
            } catch (err: any) {
              ws.send(JSON.stringify({
                type: 'room:error',
                payload: { code: err.message, message: err.message }
              }));
            }
            break;
          }

          case 'room:ready': {
            if (!currentRoomId || !currentPlayerId) return;
            const room = roomManager.getRoom(currentRoomId);
            if (!room) return;

            const player = room.players.get(currentPlayerId);
            if (player) {
              player.isReady = msg.payload?.isReady !== undefined ? !!msg.payload.isReady : !player.isReady;
              room.broadcast({
                type: 'room:update',
                payload: room.toDTO()
              });
            }
            break;
          }

          case 'room:settings': {
            if (!currentRoomId || !currentPlayerId) return;
            const room = roomManager.getRoom(currentRoomId);
            if (!room || room.hostId !== currentPlayerId) return;

            const newSettings = msg.payload?.settings;
            if (newSettings) {
              room.settings = { ...room.settings, ...newSettings };
              room.broadcast({
                type: 'room:update',
                payload: room.toDTO()
              });
            }
            break;
          }

          case 'game:start': {
            if (!currentRoomId || !currentPlayerId) return;
            const room = roomManager.getRoom(currentRoomId);
            if (!room || room.hostId !== currentPlayerId) return;

            if (room.players.size === 0) return;

            // Sorteia a primeira música
            const song = catalogRepo?.getRandomSong([], room.settings.category, room.settings.tag) || {
              id: 'fallback-1',
              gameTitle: 'Chrono Trigger',
              releaseYear: 1995,
              songTitle: 'Wind Scene',
              youtubeUrl: 'https://youtube.com/watch?v=5ejTEpMhp_8',
              youtubeId: '5ejTEpMhp_8',
              startTime: 12,
              tags: ['rpg'],
              aliases: ['CT'],
              createdAt: Date.now()
            };

            const firstPlayer = Array.from(room.players.values())[0].id;
            room.playedSongIds.push(song.id);
            const round = TurnStateMachine.startRound(room, firstPlayer, song, 1);

            // Atualiza status da sala para PLAYING para todos os clientes
            room.broadcast({
              type: 'room:update',
              payload: room.toDTO()
            });

            // Transmite início da rodada SEM as respostas
            room.broadcast({
              type: 'round:start',
              payload: {
                roundNumber: round.roundNumber,
                activePlayerId: round.activePlayerId,
                youtubeId: song.youtubeId,
                startTime: song.startTime,
                startedAt: round.startedAt,
                interventionEndsAt: round.interventionEndsAt,
                roundEndsAt: round.roundEndsAt
              }
            });

            // Inicia temporizador para resolver a rodada automaticamente após listenSeconds
            const listenDurationMs = (room.settings.listenSeconds || 30) * 1000;
            room.clearTimers();
            room.roundTimer = setTimeout(() => {
              executeResolveRound(room);
            }, listenDurationMs);
            room.roundTimer.unref?.();
            break;
          }

          case 'power:use': {
            if (!currentRoomId || !currentPlayerId) return;
            const room = roomManager.getRoom(currentRoomId);
            if (!room) return;

            const powerType = msg.payload?.power as PowerType;
            const songProvider = () => catalogRepo?.getRandomSong() || null;

            const result = TurnStateMachine.applyPower(room, currentPlayerId, powerType, songProvider);

            if (!result.success) {
              ws.send(JSON.stringify({
                type: 'power:error',
                payload: { code: result.error, message: `Falha ao acionar poder: ${result.error}` }
              }));
              return;
            }

            // Se for REROLL, reinicia o temporizador da rodada com a nova música
            if (powerType === 'REROLL' && result.newSong) {
              const listenDurationMs = (room.settings.listenSeconds || 30) * 1000;
              room.clearTimers();
              room.roundTimer = setTimeout(() => {
                executeResolveRound(room);
              }, listenDurationMs);
              room.roundTimer.unref?.();
            }

            // Notifica todos da sala sobre a ativação do poder
            room.broadcast({
              type: 'power:applied',
              payload: {
                power: powerType,
                playerId: currentPlayerId,
                newSong: result.newSong ? {
                  youtubeId: result.newSong.youtubeId,
                  startTime: result.newSong.startTime
                } : undefined,
                round: room.currentRound ? {
                  activePlayerId: room.currentRound.activePlayerId,
                  isStolen: room.currentRound.isStolen,
                  stolenByPlayerId: room.currentRound.stolenByPlayerId,
                  startedAt: room.currentRound.startedAt,
                  interventionEndsAt: room.currentRound.interventionEndsAt,
                  roundEndsAt: room.currentRound.roundEndsAt
                } : undefined,
                room: room.toDTO()
              }
            });
            break;
          }

          case 'guess:submit': {
            if (!currentRoomId || !currentPlayerId) return;
            const room = roomManager.getRoom(currentRoomId);
            if (!room) return;

            const guess = msg.payload as GuessPayload;
            try {
              const evalResult = TurnStateMachine.submitGuess(room, currentPlayerId, guess);

              // Se o palpite estiver "Por Pouco!", envia aviso privado somente para quem enviou
              if (evalResult.gameMatch.status === 'CLOSE') {
                ws.send(JSON.stringify({
                  type: 'guess:close',
                  payload: { message: 'Por pouco! Você está muito perto da resposta!' }
                }));
              }
            } catch (err: any) {
              ws.send(JSON.stringify({ type: 'guess:error', payload: { message: err.message } }));
            }
            break;
          }

          case 'round:resolve': {
            if (!currentRoomId || !currentPlayerId) return;
            const room = roomManager.getRoom(currentRoomId);
            if (!room || !room.currentRound) return;
            executeResolveRound(room);
            break;
          }

          case 'round:next': {
            if (!currentRoomId || !currentPlayerId) return;
            const room = roomManager.getRoom(currentRoomId);
            if (!room || room.status !== 'PLAYING') return;
            executeNextRound(room);
            break;
          }

          case 'room:leave': {
            if (currentRoomId && currentPlayerId) {
              roomManager.handleDisconnect(currentRoomId, currentPlayerId);
              currentRoomId = null;
              currentPlayerId = null;
            }
            break;
          }

          default:
            break;
        }
      } catch (err) {
        ws.send(JSON.stringify({ type: 'room:error', payload: { code: 'BAD_REQUEST', message: 'Mensagem JSON malformada.' } }));
      }
    });

    ws.on('close', () => {
      if (currentRoomId && currentPlayerId) {
        roomManager.handleDisconnect(currentRoomId, currentPlayerId);
      }
    });
  });

  return wss;
}
