import { randomUUID } from 'node:crypto';
import type { WebSocket } from 'ws';

export type GameMode = 'TIMELINE' | 'ARCADE';
export type RoomStatus = 'LOBBY' | 'PLAYING' | 'GAME_OVER';

export interface RoomSettings {
  mode: GameMode;
  listenSeconds: number;
  interventionSeconds: number;
  maxCardsToWin: number;
  category?: string;
  tag?: string;
  password?: string;
}

export interface TimelineCard {
  id: string;
  gameTitle: string;
  releaseYear: number;
  songTitle?: string;
}

export interface PlayerSession {
  id: string;
  nickname: string;
  isHost: boolean;
  isReady: boolean;
  tokens: number;
  score: number;
  timeline: TimelineCard[];
  isConnected: boolean;
  disconnectedAt?: number;
  ws?: WebSocket;
}

export interface RoomStateDTO {
  id: string;
  hostId: string;
  status: RoomStatus;
  settings: RoomSettings;
  players: Omit<PlayerSession, 'ws'>[];
  currentRound?: any;
}

export class Room {
  public id: string;
  public hostId: string;
  public status: RoomStatus = 'LOBBY';
  public settings: RoomSettings;
  public players = new Map<string, PlayerSession>();
  public currentRound?: any;
  public playedSongIds: string[] = [];
  public roundTimer?: NodeJS.Timeout;
  public revealTimer?: NodeJS.Timeout;
  public lastActivity = Date.now();

  public clearTimers(): void {
    if (this.roundTimer) {
      clearTimeout(this.roundTimer);
      this.roundTimer = undefined;
    }
    if (this.revealTimer) {
      clearTimeout(this.revealTimer);
      this.revealTimer = undefined;
    }
  }

  constructor(id: string, hostId: string, settings?: Partial<RoomSettings>) {
    this.id = id;
    this.hostId = hostId;
    this.settings = {
      mode: settings?.mode || 'TIMELINE',
      listenSeconds: settings?.listenSeconds || 30,
      interventionSeconds: settings?.interventionSeconds || 15,
      maxCardsToWin: settings?.maxCardsToWin || 10,
      category: settings?.category,
      tag: settings?.tag,
      password: settings?.password
    };
  }

  public toDTO(): RoomStateDTO {
    const playersList: Omit<PlayerSession, 'ws'>[] = [];
    for (const player of this.players.values()) {
      const { ws, ...rest } = player;
      playersList.push(rest);
    }

    let safeRound = this.currentRound;
    if (this.currentRound && this.currentRound.phase !== 'RESOLUTION') {
      const { song, guessPayload, ...safe } = this.currentRound;
      safeRound = {
        ...safe,
        youtubeId: song?.youtubeId,
        startTime: song?.startTime
      };
    }

    return {
      id: this.id,
      hostId: this.hostId,
      status: this.status,
      settings: this.settings,
      players: playersList,
      currentRound: safeRound
    };
  }

  public broadcast(message: object, excludePlayerId?: string): void {
    const data = JSON.stringify(message);
    for (const player of this.players.values()) {
      if (excludePlayerId && player.id === excludePlayerId) continue;
      if (player.isConnected && player.ws && player.ws.readyState === 1 /* OPEN */) {
        try {
          player.ws.send(data);
        } catch (err) {
          // Ignora falha individual de socket
        }
      }
    }
  }
}

export class RoomManager {
  private rooms = new Map<string, Room>();
  private readonly RECONNECT_GRACE_PERIOD_MS = 60 * 1000; // 60 segundos

  /**
   * Gera código único de sala (4 letras maiúsculas sem caracteres ambíguos)
   */
  public generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let attempts = 0; attempts < 100; attempts++) {
      code = '';
      for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      if (!this.rooms.has(code)) {
        return code;
      }
    }
    return randomUUID().substring(0, 6).toUpperCase();
  }

  public createRoom(hostNickname: string, settings?: Partial<RoomSettings>): { room: Room; host: PlayerSession } {
    const roomId = this.generateRoomCode();
    const hostId = randomUUID();

    const host: PlayerSession = {
      id: hostId,
      nickname: hostNickname.trim(),
      isHost: true,
      isReady: true,
      tokens: 0,
      score: 0,
      timeline: [],
      isConnected: false
    };

    const room = new Room(roomId, hostId, settings);
    room.players.set(hostId, host);
    this.rooms.set(roomId, room);

    return { room, host };
  }

  public getRoom(roomId: string): Room | null {
    const normalized = roomId?.trim().toUpperCase();
    return this.rooms.get(normalized) || null;
  }

  public joinRoom(
    roomId: string,
    nickname: string,
    sessionToken?: string,
    password?: string,
    ws?: WebSocket
  ): { player: PlayerSession; room: Room; isReconnection: boolean } {
    const room = this.getRoom(roomId);
    if (!room) {
      throw new Error('ROOM_NOT_FOUND');
    }

    if (room.settings.password && room.settings.password !== password) {
      throw new Error('INVALID_PASSWORD');
    }

    // 1. Tenta reconexão por sessionToken
    if (sessionToken && room.players.has(sessionToken)) {
      const existing = room.players.get(sessionToken)!;
      const isReconnection = existing.disconnectedAt !== undefined;
      existing.isConnected = true;
      existing.disconnectedAt = undefined;
      existing.ws = ws;
      room.lastActivity = Date.now();

      return { player: existing, room, isReconnection };
    }

    // 2. Novo jogador
    const playerId = randomUUID();
    const cleanNick = nickname.trim();
    if (!cleanNick) {
      throw new Error('INVALID_NICKNAME');
    }

    const newPlayer: PlayerSession = {
      id: playerId,
      nickname: cleanNick,
      isHost: room.players.size === 0,
      isReady: false,
      tokens: 0,
      score: 0,
      timeline: [],
      isConnected: true,
      ws
    };

    if (newPlayer.isHost) {
      room.hostId = playerId;
    }

    room.players.set(playerId, newPlayer);
    room.lastActivity = Date.now();

    return { player: newPlayer, room, isReconnection: false };
  }

  public handleDisconnect(roomId: string, playerId: string): void {
    const room = this.getRoom(roomId);
    if (!room) return;

    const player = room.players.get(playerId);
    if (!player) return;

    player.isConnected = false;
    player.disconnectedAt = Date.now();
    player.ws = undefined;

    // Notifica outros participantes
    room.broadcast({
      type: 'room:update',
      payload: room.toDTO()
    });

    // Agenda checagem de expiração após 60 segundos (com unref para não segurar o processo)
    const timer = setTimeout(() => {
      this.cleanupDisconnectedPlayer(room.id, playerId);
    }, this.RECONNECT_GRACE_PERIOD_MS);
    if (timer.unref) {
      timer.unref();
    }
  }

  private cleanupDisconnectedPlayer(roomId: string, playerId: string): void {
    const room = this.getRoom(roomId);
    if (!room) return;

    const player = room.players.get(playerId);
    if (player && !player.isConnected) {
      const elapsed = Date.now() - (player.disconnectedAt || 0);
      if (elapsed >= this.RECONNECT_GRACE_PERIOD_MS - 500) {
        room.players.delete(playerId);

        // Se era host, passa para outro
        if (room.hostId === playerId && room.players.size > 0) {
          const nextHost = room.players.values().next().value;
          if (nextHost) {
            nextHost.isHost = true;
            room.hostId = nextHost.id;
          }
        }

        // Se a sala ficou vazia, remove
        if (room.players.size === 0) {
          room.clearTimers();
          this.rooms.delete(roomId);
        } else {
          room.broadcast({
            type: 'room:update',
            payload: room.toDTO()
          });
        }
      }
    }
  }

  public removeRoom(roomId: string): void {
    const room = this.getRoom(roomId);
    if (room) {
      room.clearTimers();
      this.rooms.delete(room.id);
    }
  }

  public countActiveRooms(): number {
    return this.rooms.size;
  }
}
