import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TimelineValidator } from '../../src/game/timelineValidator.js';
import { Room, TimelineCard } from '../../src/game/roomManager.js';
import { GameModes } from '../../src/game/gameModes.js';

describe('TimelineValidator e Regras de Vitória (TU-05, CA-08)', () => {
  const existingTimeline: TimelineCard[] = [
    { id: '1', gameTitle: 'Super Mario World', releaseYear: 1990 },
    { id: '2', gameTitle: 'Chrono Trigger', releaseYear: 1995 },
    { id: '3', gameTitle: 'Half-Life 2', releaseYear: 2004 },
    { id: '4', gameTitle: 'Hollow Knight', releaseYear: 2017 }
  ];

  it('TU-05: Deve validar corretamente encaixe antes da primeira carta (Slot 0)', () => {
    // Pac-Man (1980) colocado no slot 0 (antes de 1990) -> Válido
    const resValid = TimelineValidator.validateSlot(existingTimeline, 0, 1980);
    assert.equal(resValid.isValid, true);

    // Doom (1993) colocado no slot 0 (antes de 1990) -> Inválido (anacronismo)
    const resInvalid = TimelineValidator.validateSlot(existingTimeline, 0, 1993);
    assert.equal(resInvalid.isValid, false);
  });

  it('TU-05: Deve validar corretamente encaixe intermediário entre cartas', () => {
    // Sonic 2 (1992) colocado no slot 1 (entre 1990 e 1995) -> Válido
    const resValid = TimelineValidator.validateSlot(existingTimeline, 1, 1992);
    assert.equal(resValid.isValid, true);

    // Minecraft (2011) colocado no slot 1 (entre 1990 e 1995) -> Inválido
    const resInvalid = TimelineValidator.validateSlot(existingTimeline, 1, 2011);
    assert.equal(resInvalid.isValid, false);
  });

  it('TU-05: Deve validar corretamente encaixe após a última carta (Slot N)', () => {
    // Elden Ring (2022) colocado no slot 4 (após 2017) -> Válido
    const resValid = TimelineValidator.validateSlot(existingTimeline, 4, 2022);
    assert.equal(resValid.isValid, true);

    // GTA Vice City (2002) colocado no slot 4 (após 2017) -> Inválido
    const resInvalid = TimelineValidator.validateSlot(existingTimeline, 4, 2002);
    assert.equal(resInvalid.isValid, false);
  });

  it('Deve ordenar a linha do tempo cronologicamente ao inserir nova carta', () => {
    const newCard: TimelineCard = { id: '5', gameTitle: 'Zelda OoT', releaseYear: 1998 };
    const updated = TimelineValidator.insertCard(existingTimeline, newCard);

    assert.equal(updated.length, 5);
    assert.equal(updated[0].releaseYear, 1990);
    assert.equal(updated[1].releaseYear, 1995);
    assert.equal(updated[2].releaseYear, 1998); // Inserido na posição correta
    assert.equal(updated[3].releaseYear, 2004);
    assert.equal(updated[4].releaseYear, 2017);
  });

  it('CA-08: Deve declarar vitória no Modo Linha do Tempo ao atingir o limite de cartas', () => {
    const room = new Room('WIN1', 'player-1', { mode: 'TIMELINE', maxCardsToWin: 3 });
    const player = {
      id: 'player-1',
      nickname: 'Winner',
      isHost: true,
      isReady: true,
      tokens: 0,
      score: 6,
      timeline: [
        { id: '1', gameTitle: 'A', releaseYear: 1990 },
        { id: '2', gameTitle: 'B', releaseYear: 1995 },
        { id: '3', gameTitle: 'C', releaseYear: 2000 } // 3 cartas atingidas
      ],
      isConnected: true
    };
    room.players.set('player-1', player);

    const victory = GameModes.checkVictory(room);
    assert.ok(victory);
    assert.equal(victory.winner.nickname, 'Winner');
    assert.equal(victory.winner.cardsCount, 3);
    assert.equal(room.status, 'GAME_OVER');
  });

  it('Deve calcular pontuação do Modo Arcade corretamente (+2 jogo, +1 ano +-1, +1 faixa)', () => {
    // Acerto completo: jogo certo (+2), ano exato (+1), faixa certa (+1) = 4 pts
    const p1 = GameModes.calculateArcadePoints(true, 1995, 1995, true);
    assert.equal(p1, 4);

    // Ano com margem de 1 ano de diferença (ex: chutou 1994 em jogo de 1995)
    const p2 = GameModes.calculateArcadePoints(true, 1995, 1994, false);
    assert.equal(p2, 3);

    // Ano errado (chutou 2000 em jogo de 1995)
    const p3 = GameModes.calculateArcadePoints(true, 1995, 2000, false);
    assert.equal(p3, 2);
  });
});
