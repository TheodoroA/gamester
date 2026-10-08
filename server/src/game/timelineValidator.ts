import { TimelineCard } from './roomManager.js';

export interface TimelineSlotValidation {
  isValid: boolean;
  targetYear: number;
  chosenSlot: number;
  expectedMinYear?: number;
  expectedMaxYear?: number;
  message: string;
}

export class TimelineValidator {
  /**
   * Ordena as cartas existentes de forma cronológica ascendente
   */
  public static sortTimeline(cards: TimelineCard[]): TimelineCard[] {
    return [...cards].sort((a, b) => a.releaseYear - b.releaseYear);
  }

  /**
   * Valida se o targetYear se encaixa no slot (índice de inserção) escolhido pelo jogador.
   * Se o jogador tem N cartas, existem N + 1 slots possíveis:
   * Slot 0: antes da primeira carta (ano <= cartas[0].ano)
   * Slot i: entre cartas[i-1] e cartas[i] (cartas[i-1].ano <= ano <= cartas[i].ano)
   * Slot N: após a última carta (ano >= cartas[N-1].ano)
   */
  public static validateSlot(
    currentTimeline: TimelineCard[],
    chosenSlot: number,
    targetYear: number
  ): TimelineSlotValidation {
    const sorted = this.sortTimeline(currentTimeline);
    const n = sorted.length;

    // Se o jogador não tem nenhuma carta ainda, qualquer posição é válida (primeira carta)
    if (n === 0) {
      return {
        isValid: true,
        targetYear,
        chosenSlot,
        message: 'Primeira carta da linha do tempo.'
      };
    }

    if (chosenSlot < 0 || chosenSlot > n) {
      return {
        isValid: false,
        targetYear,
        chosenSlot,
        message: `Slot inválido: ${chosenSlot}. Deve estar entre 0 e ${n}.`
      };
    }

    // Slot 0: antes de todas as cartas
    if (chosenSlot === 0) {
      const nextCard = sorted[0];
      const isValid = targetYear <= nextCard.releaseYear;
      return {
        isValid,
        targetYear,
        chosenSlot,
        expectedMaxYear: nextCard.releaseYear,
        message: isValid
          ? `Correto: ${targetYear} é anterior ou igual a ${nextCard.releaseYear}.`
          : `Incorreto: ${targetYear} não é anterior a ${nextCard.releaseYear}.`
      };
    }

    // Slot N: após todas as cartas
    if (chosenSlot === n) {
      const prevCard = sorted[n - 1];
      const isValid = targetYear >= prevCard.releaseYear;
      return {
        isValid,
        targetYear,
        chosenSlot,
        expectedMinYear: prevCard.releaseYear,
        message: isValid
          ? `Correto: ${targetYear} é posterior ou igual a ${prevCard.releaseYear}.`
          : `Incorreto: ${targetYear} não é posterior a ${prevCard.releaseYear}.`
      };
    }

    // Slot intermediário: entre sorted[chosenSlot - 1] e sorted[chosenSlot]
    const prevCard = sorted[chosenSlot - 1];
    const nextCard = sorted[chosenSlot];
    const isValid = targetYear >= prevCard.releaseYear && targetYear <= nextCard.releaseYear;

    return {
      isValid,
      targetYear,
      chosenSlot,
      expectedMinYear: prevCard.releaseYear,
      expectedMaxYear: nextCard.releaseYear,
      message: isValid
        ? `Correto: ${targetYear} está entre ${prevCard.releaseYear} e ${nextCard.releaseYear}.`
        : `Incorreto: ${targetYear} não está entre ${prevCard.releaseYear} e ${nextCard.releaseYear}.`
    };
  }

  /**
   * Insere a carta na posição cronológica correta da lista
   */
  public static insertCard(timeline: TimelineCard[], newCard: TimelineCard): TimelineCard[] {
    const updated = [...timeline, newCard];
    return this.sortTimeline(updated);
  }
}
