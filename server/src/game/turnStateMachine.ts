import { Room, PlayerSession } from './roomManager.js';
import { SongEntity } from '../db/repositories/catalogRepository.js';
import { StringMatcher, MatchEvaluation } from '../utils/stringMatcher.js';

export type RoundPhase = 'INTERVENTION' | 'GUESSING' | 'RESOLUTION';
export type PowerType = 'REROLL' | 'STEAL' | 'AUTOHIT';

export interface GuessPayload {
  gameGuess: string;
  songGuess?: string;
  targetYear?: number;
  timelineIndex?: number;
}

export interface RoundResolution {
  gameCorrect: boolean;
  timelineCorrect: boolean;
  songTitleCorrect: boolean;
  tokensEarned: number;
  tokensSpent: number;
  awardedPlayerId: string;
  song: SongEntity;
  explanation?: string;
}

export interface RoundState {
  roundNumber: number;
  activePlayerId: string;
  originalPlayerId: string;
  song: SongEntity;
  phase: RoundPhase;
  startedAt: number;
  interventionEndsAt: number;
  roundEndsAt: number;
  isStolen: boolean;
  stolenByPlayerId: string | null;
  autoHitUsed: boolean;
  guessPayload?: GuessPayload;
  resolution?: RoundResolution;
}

export interface PowerResult {
  success: boolean;
  power: PowerType;
  playerId: string;
  tokensRemaining: number;
  newSong?: SongEntity;
  error?: string;
}

export class TurnStateMachine {
  public static readonly MAX_TOKENS = 5;

  /**
   * Inicia uma nova rodada na sala
   */
  public static startRound(
    room: Room,
    activePlayerId: string,
    song: SongEntity,
    roundNumber = 1
  ): RoundState {
    const startedAt = Date.now();
    const interventionSeconds = room.settings.interventionSeconds || 15;
    const listenSeconds = room.settings.listenSeconds || 30;

    const round: RoundState = {
      roundNumber,
      activePlayerId,
      originalPlayerId: activePlayerId,
      song,
      phase: 'INTERVENTION',
      startedAt,
      interventionEndsAt: startedAt + interventionSeconds * 1000,
      roundEndsAt: startedAt + listenSeconds * 1000,
      isStolen: false,
      stolenByPlayerId: null,
      autoHitUsed: false
    };

    room.currentRound = round;
    room.status = 'PLAYING';

    return round;
  }

  /**
   * Executa a ativação de um poder (Trocar, Roubar, Acerto Automático)
   */
  public static applyPower(
    room: Room,
    playerId: string,
    power: PowerType,
    newSongProvider?: () => SongEntity | null,
    now = Date.now()
  ): PowerResult {
    const round = room.currentRound as RoundState | undefined;
    if (!round) {
      return { success: false, power, playerId, tokensRemaining: 0, error: 'NO_ACTIVE_ROUND' };
    }

    const player = room.players.get(playerId);
    if (!player) {
      return { success: false, power, playerId, tokensRemaining: 0, error: 'PLAYER_NOT_FOUND' };
    }

    switch (power) {
      case 'REROLL': {
        // Custo: 1 recurso
        if (player.tokens < 1) {
          return { success: false, power, playerId, tokensRemaining: player.tokens, error: 'INSUFFICIENT_TOKENS' };
        }

        // Janela de Intervenção: até 15s
        if (now > round.interventionEndsAt) {
          return { success: false, power, playerId, tokensRemaining: player.tokens, error: 'POWER_TIMEOUT' };
        }

        // Não pode trocar se a música já foi roubada
        if (round.isStolen) {
          return { success: false, power, playerId, tokensRemaining: player.tokens, error: 'ALREADY_STOLEN' };
        }

        const newSong = newSongProvider ? newSongProvider() : null;
        if (!newSong) {
          return { success: false, power, playerId, tokensRemaining: player.tokens, error: 'NO_SONGS_AVAILABLE' };
        }

        player.tokens -= 1;
        round.song = newSong;
        // Reinicia o relógio da rodada com a nova música
        round.startedAt = now;
        round.interventionEndsAt = now + (room.settings.interventionSeconds || 15) * 1000;
        round.roundEndsAt = now + (room.settings.listenSeconds || 30) * 1000;

        return {
          success: true,
          power,
          playerId,
          tokensRemaining: player.tokens,
          newSong
        };
      }

      case 'STEAL': {
        // Custo: 2 recursos
        if (player.tokens < 2) {
          return { success: false, power, playerId, tokensRemaining: player.tokens, error: 'INSUFFICIENT_TOKENS' };
        }

        // Janela de Intervenção: até 15s
        if (now > round.interventionEndsAt) {
          return { success: false, power, playerId, tokensRemaining: player.tokens, error: 'POWER_TIMEOUT' };
        }

        // Não pode roubar se já for o titular ativo
        if (round.activePlayerId === playerId) {
          return { success: false, power, playerId, tokensRemaining: player.tokens, error: 'ALREADY_ACTIVE_PLAYER' };
        }

        // Trava de concorrência: apenas um roubo por rodada
        if (round.isStolen) {
          return { success: false, power, playerId, tokensRemaining: player.tokens, error: 'ALREADY_STOLEN' };
        }

        player.tokens -= 2;
        round.isStolen = true;
        round.stolenByPlayerId = playerId;
        round.activePlayerId = playerId;

        return {
          success: true,
          power,
          playerId,
          tokensRemaining: player.tokens
        };
      }

      case 'AUTOHIT': {
        // Custo: 3 recursos
        if (player.tokens < 3) {
          return { success: false, power, playerId, tokensRemaining: player.tokens, error: 'INSUFFICIENT_TOKENS' };
        }

        // Exclusivo do jogador titular da rodada
        if (round.activePlayerId !== playerId) {
          return { success: false, power, playerId, tokensRemaining: player.tokens, error: 'NOT_ACTIVE_PLAYER' };
        }

        // Acerto automático permitido até 25s da rodada
        const maxTime = round.roundEndsAt - 5000;
        if (now > maxTime) {
          return { success: false, power, playerId, tokensRemaining: player.tokens, error: 'POWER_TIMEOUT' };
        }

        player.tokens -= 3;
        round.autoHitUsed = true;

        return {
          success: true,
          power,
          playerId,
          tokensRemaining: player.tokens
        };
      }

      default:
        return { success: false, power, playerId, tokensRemaining: player.tokens, error: 'UNKNOWN_POWER' };
    }
  }

  /**
   * Avalia a submissão de palpites da rodada
   */
  public static submitGuess(
    room: Room,
    playerId: string,
    guess: GuessPayload
  ): { status: 'ACCEPTED' | 'REJECTED'; gameMatch: MatchEvaluation; songMatch?: MatchEvaluation } {
    const round = room.currentRound as RoundState | undefined;
    if (!round) {
      throw new Error('NO_ACTIVE_ROUND');
    }

    if (round.activePlayerId !== playerId) {
      throw new Error('NOT_ACTIVE_PLAYER');
    }

    round.guessPayload = guess;

    // Avalia título do jogo
    const gameMatch = StringMatcher.compare(guess.gameGuess, round.song.gameTitle, round.song.aliases);

    // Avalia nome da música se fornecido
    let songMatch: MatchEvaluation | undefined;
    if (guess.songGuess) {
      songMatch = StringMatcher.compare(guess.songGuess, round.song.songTitle);
    }

    return {
      status: gameMatch.status === 'CORRECT' ? 'ACCEPTED' : 'REJECTED',
      gameMatch,
      songMatch
    };
  }

  /**
   * Resolve a rodada calculando acertos, bônus e atualizando o estado do jogador
   */
  public static resolveRound(
    room: Room,
    timelineValid = true
  ): RoundResolution {
    const round = room.currentRound as RoundState | undefined;
    if (!round) {
      throw new Error('NO_ACTIVE_ROUND');
    }

    round.phase = 'RESOLUTION';
    const targetPlayer = room.players.get(round.activePlayerId);

    // Se usou auto-hit, o jogo e a linha do tempo são automaticamente corretos
    let gameCorrect = round.autoHitUsed;
    let songTitleCorrect = false;

    if (!round.autoHitUsed && round.guessPayload) {
      const match = StringMatcher.compare(
        round.guessPayload.gameGuess,
        round.song.gameTitle,
        round.song.aliases
      );
      gameCorrect = match.status === 'CORRECT';

      if (round.guessPayload.songGuess) {
        const sMatch = StringMatcher.compare(
          round.guessPayload.songGuess,
          round.song.songTitle
        );
        songTitleCorrect = sMatch.status === 'CORRECT';
      }
    }

    let tokensEarned = 0;
    if (songTitleCorrect && targetPlayer) {
      // Concede 1 token até o teto máximo de 5
      if (targetPlayer.tokens < this.MAX_TOKENS) {
        targetPlayer.tokens += 1;
        tokensEarned = 1;
      }
    }

    // Se acertou o jogo e a linha do tempo, adiciona carta à timeline
    if (gameCorrect && timelineValid && targetPlayer) {
      targetPlayer.timeline.push({
        id: round.song.id,
        gameTitle: round.song.gameTitle,
        releaseYear: round.song.releaseYear,
        songTitle: round.song.songTitle
      });
      targetPlayer.score += 2;
    }

    const resolution: RoundResolution = {
      gameCorrect,
      timelineCorrect: timelineValid,
      songTitleCorrect,
      tokensEarned,
      tokensSpent: 0,
      awardedPlayerId: round.activePlayerId,
      song: round.song
    };

    round.resolution = resolution;
    return resolution;
  }
}
