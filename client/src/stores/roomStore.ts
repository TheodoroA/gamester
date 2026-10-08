export interface TimelineCard {
  id: string;
  gameTitle: string;
  releaseYear: number;
  songTitle?: string;
}

export interface Player {
  id: string;
  nickname: string;
  isHost: boolean;
  isReady: boolean;
  tokens: number;
  score: number;
  timeline: TimelineCard[];
  isConnected: boolean;
}

export interface RoomSettings {
  mode: 'TIMELINE' | 'ARCADE';
  listenSeconds: number;
  interventionSeconds: number;
  maxCardsToWin: number;
  category?: string;
  tag?: string;
}

export interface RoomState {
  id: string;
  hostId: string;
  status: 'LOBBY' | 'PLAYING' | 'GAME_OVER';
  settings: RoomSettings;
  players: Player[];
  currentRound?: any;
}

export type Listener = () => void;

class RoomStore {
  public ws: WebSocket | null = null;
  public room: RoomState | null = null;
  public player: Player | null = null;
  public closeNotice: string | null = null;
  public error: string | null = null;
  public isConnected = false;
  public hasAudioUnlocked = false;
  public resolution: any | null = null;
  public gameOver: any | null = null;

  private listeners = new Set<Listener>();

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  public initAudioContext(): void {
    this.hasAudioUnlocked = true;
    this.notify();
  }

  public connect(roomId: string, nickname: string, sessionToken?: string): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.isConnected = true;
      this.error = null;
      this.notify();

      // Envia join
      this.send('room:join', {
        roomId,
        nickname,
        sessionToken: sessionToken || localStorage.getItem(`gamester_token_${roomId}`) || undefined
      });
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.handleMessage(msg);
      } catch (err) {
        console.error('Mensagem WS inválida:', err);
      }
    };

    this.ws.onclose = () => {
      this.isConnected = false;
      this.notify();
    };

    this.ws.onerror = () => {
      this.error = 'Erro na conexão WebSocket.';
      this.notify();
    };
  }

  public send(type: string, payload?: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }

  private handleMessage(msg: { type: string; payload?: any }): void {
    switch (msg.type) {
      case 'room:joined':
      case 'room:syncState': {
        this.room = msg.payload.room;
        this.player = msg.payload.player;
        if (this.room && this.player) {
          localStorage.setItem(`gamester_token_${this.room.id}`, this.player.id);
        }
        this.error = null;
        this.notify();
        break;
      }

      case 'room:update': {
        this.room = msg.payload;
        if (this.room && this.player) {
          const updatedPlayer = this.room.players.find(p => p.id === this.player!.id);
          if (updatedPlayer) {
            this.player = updatedPlayer;
          }
        }
        this.notify();
        break;
      }

      case 'round:start': {
        if (this.room) {
          this.room.status = 'PLAYING';
          this.room.currentRound = msg.payload;
        }
        this.resolution = null;
        this.closeNotice = null;
        this.notify();
        break;
      }

      case 'round:end': {
        this.resolution = msg.payload.resolution;
        if (msg.payload.room) {
          this.room = msg.payload.room;
        }
        this.notify();
        break;
      }

      case 'game:over': {
        this.gameOver = msg.payload;
        if (msg.payload.resolution) {
          this.resolution = msg.payload.resolution;
        }
        if (this.room) {
          this.room.status = 'GAME_OVER';
        }
        this.notify();
        break;
      }

      case 'power:applied': {
        if (this.room) {
          this.room = msg.payload.room;
          if (msg.payload.round && this.room) {
            this.room.currentRound = { ...(this.room.currentRound || {}), ...msg.payload.round };
          }
        }
        this.notify();
        break;
      }

      case 'guess:close': {
        this.closeNotice = msg.payload.message || 'Por pouco! Você está muito perto!';
        this.notify();
        setTimeout(() => {
          this.closeNotice = null;
          this.notify();
        }, 4000);
        break;
      }

      case 'room:error':
      case 'power:error': {
        this.error = msg.payload.message;
        this.notify();
        setTimeout(() => {
          this.error = null;
          this.notify();
        }, 4000);
        break;
      }

      default:
        break;
    }
  }

  public toggleReady(): void {
    this.send('room:ready');
  }

  public startGame(): void {
    this.send('game:start');
  }

  public resolveRound(): void {
    this.send('round:resolve');
  }

  public nextRound(): void {
    this.send('round:next');
  }

  public resetGameOver(): void {
    this.gameOver = null;
    this.resolution = null;
    if (this.room) {
      this.room.status = 'LOBBY';
    }
    this.notify();
  }

  public usePower(power: 'REROLL' | 'STEAL' | 'AUTOHIT'): void {
    this.send('power:use', { power });
  }

  public submitGuess(gameGuess: string, songGuess?: string, timelineIndex?: number): void {
    this.send('guess:submit', { gameGuess, songGuess, timelineIndex });
  }

  public updateSettings(settings: Partial<RoomSettings>): void {
    this.send('room:settings', { settings });
  }
}

export const roomStore = new RoomStore();
