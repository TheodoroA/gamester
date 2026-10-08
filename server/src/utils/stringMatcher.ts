export type MatchStatus = 'CORRECT' | 'CLOSE' | 'WRONG';

export interface MatchEvaluation {
  status: MatchStatus;
  distance: number;
  matchedTarget?: string;
  isExact: boolean;
}

export class StringMatcher {
  /**
   * Normaliza uma string para comparação:
   * 1. Caixa baixa
   * 2. Remoção de acentos e diacríticos (Unicode NFD)
   * 3. Remoção de pontuações e símbolos
   * 4. Colapso TOTAL de espaços em branco (stripping)
   * 5. Remoção de artigos iniciais opcionais (the, o, a, os, as)
   */
  public static normalize(input: string, stripArticles = true): string {
    if (!input) return '';

    let text = input.trim().toLowerCase();

    // Normalização Unicode (decomposição de acentos)
    text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Remoção de artigos iniciais antes de colapsar espaços
    if (stripArticles) {
      text = text.replace(/^(the|a|an|o|a|os|as)\s+/i, '');
    }

    // Remoção de qualquer caractere não alfanumérico (inclusive pontuações e espaços)
    text = text.replace(/[^a-z0-9]/g, '');

    return text;
  }

  /**
   * Calcula a distância de Damerau-Levenshtein entre duas strings.
   * Suporta: inserção, deleção, substituição e transposição de caracteres adjacentes.
   */
  public static damerauLevenshtein(a: string, b: string): number {
    const lenA = a.length;
    const lenB = b.length;

    if (lenA === 0) return lenB;
    if (lenB === 0) return lenA;
    if (a === b) return 0;

    // Matriz de distâncias
    const d: number[][] = Array.from({ length: lenA + 1 }, () => new Array(lenB + 1).fill(0));

    for (let i = 0; i <= lenA; i++) d[i][0] = i;
    for (let j = 0; j <= lenB; j++) d[0][j] = j;

    for (let i = 1; i <= lenA; i++) {
      for (let j = 1; j <= lenB; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;

        d[i][j] = Math.min(
          d[i - 1][j] + 1,      // Deleção
          d[i][j - 1] + 1,      // Inserção
          d[i - 1][j - 1] + cost // Substituição
        );

        // Transposição de caracteres vizinhos (Regra de Damerau)
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
          d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
        }
      }
    }

    return d[lenA][lenB];
  }

  /**
   * Retorna a tolerância máxima permitida com base no comprimento da string colapsada.
   */
  public static getTolerance(length: number): number {
    if (length <= 4) return 0;       // Exige exatidão estrita (Doom, Halo, Nier)
    if (length <= 8) return 1;       // 1 erro/transposição (Zelda, Skyrim)
    if (length <= 14) return 2;      // Até 2 erros (Minecraft, Dark Souls)
    return 3;                        // Até 3 erros para títulos longos (The Witcher 3)
  }

  /**
   * Compara o palpite do jogador com o alvo e seus aliases cadastrados.
   */
  public static compare(guess: string, target: string, aliases: string[] = []): MatchEvaluation {
    const normGuess = this.normalize(guess);
    if (!normGuess) {
      return { status: 'WRONG', distance: Infinity, isExact: false };
    }

    // Lista de alvos: alvo principal + aliases
    const targets = [target, ...aliases];
    let bestDistance = Infinity;
    let bestMatchedTarget: string | undefined;

    for (const t of targets) {
      const normTarget = this.normalize(t);
      if (!normTarget) continue;

      // Correspondência exata imediata
      if (normGuess === normTarget) {
        return {
          status: 'CORRECT',
          distance: 0,
          matchedTarget: t,
          isExact: true
        };
      }

      const dist = this.damerauLevenshtein(normGuess, normTarget);
      if (dist < bestDistance) {
        bestDistance = dist;
        bestMatchedTarget = t;
      }
    }

    const matchedNormTarget = bestMatchedTarget ? this.normalize(bestMatchedTarget) : '';
    const tolerance = this.getTolerance(matchedNormTarget.length);

    if (bestDistance <= tolerance) {
      return {
        status: 'CORRECT',
        distance: bestDistance,
        matchedTarget: bestMatchedTarget,
        isExact: bestDistance === 0
      };
    }

    // Feedback "Por Pouco!" quando a distância for tolerance + 1
    if (bestDistance === tolerance + 1) {
      return {
        status: 'CLOSE',
        distance: bestDistance,
        matchedTarget: bestMatchedTarget,
        isExact: false
      };
    }

    return {
      status: 'WRONG',
      distance: bestDistance,
      matchedTarget: bestMatchedTarget,
      isExact: false
    };
  }
}
