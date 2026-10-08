import { Room, PlayerSession } from './roomManager.js';
import { TimelineValidator } from './timelineValidator.js';
import { RoundResolution } from './turnStateMachine.js';

export interface GameOverPodiumEntry {
  rank: number;
  playerId: string;
  nickname: string;
  score: number;
  cardsCount: number;
  timeline: { id: string; gameTitle: string; releaseYear: number }[];
}

export interface GameOverPayload {
  roomId: string;
  winner: GameOverPodiumEntry;
  podium: GameOverPodiumEntry[];
  mode: string;
}

export class GameModes {
  /**
   * Avalia a vitória da partida após a resolução de uma rodada
   */
  public static checkVictory(room: Room): GameOverPayload | null {
    if (room.settings.mode === 'TIMELINE') {
      const maxCards = room.settings.maxCardsToWin || 10;

      for (const player of room.players.values()) {
        if (player.timeline.length >= maxCards) {
          room.status = 'GAME_OVER';
          return this.buildPodium(room, 'TIMELINE');
        }
      }
    } else {
      // Modo Arcade: avalia se atingiu pontuação máxima configurada (ex: 50 pontos)
      const targetScore = 50;
      for (const player of room.players.values()) {
        if (player.score >= targetScore) {
          room.status = 'GAME_OVER';
          return this.buildPodium(room, 'ARCADE');
        }
      }
    }

    return null;
  }

  /**
   * Monta o pódio ordenado por cartas ou pontos
   */
  public static buildPodium(room: Room, mode: 'TIMELINE' | 'ARCADE'): GameOverPayload {
    const list = Array.from(room.players.values());

    if (mode === 'TIMELINE') {
      list.sort((a, b) => b.timeline.length - a.timeline.length || b.score - a.score);
    } else {
      list.sort((a, b) => b.score - a.score || b.timeline.length - a.timeline.length);
    }

    const podium: GameOverPodiumEntry[] = list.map((p, index) => ({
      rank: index + 1,
      playerId: p.id,
      nickname: p.nickname,
      score: p.score,
      cardsCount: p.timeline.length,
      timeline: TimelineValidator.sortTimeline(p.timeline).map(c => ({
        id: c.id,
        gameTitle: c.gameTitle,
        releaseYear: c.releaseYear
      }))
    }));

    return {
      roomId: room.id,
      winner: podium[0],
      podium,
      mode
    };
  }

  /**
   * Calcula pontos no modo Arcade
   */
  public static calculateArcadePoints(
    gameCorrect: boolean,
    targetYear: number,
    guessedYear?: number,
    songTitleCorrect = false
  ): number {
    let points = 0;
    if (gameCorrect) points += 2;
    if (guessedYear && Math.abs(guessedYear - targetYear) <= 1) points += 1;
    if (songTitleCorrect) points += 1;
    return points;
  }
}
