import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { StringMatcher } from '../../src/utils/stringMatcher.js';

describe('StringMatcher (TU-01 a TU-04)', () => {
  it('TU-01: Deve normalizar pontuações, acentos e colapsar espaços em branco', () => {
    const raw = 'The Legend of Zelda: Ocarina of Time!';
    const normalized = StringMatcher.normalize(raw);
    assert.equal(normalized, 'legendofzeldaocarinaoftime');

    // Teste de espaços colapsados: "Grand Theft Auto" -> "grandtheftauto"
    assert.equal(StringMatcher.normalize('Grand Theft Auto'), 'grandtheftauto');
    assert.equal(StringMatcher.normalize('grandtheftauto'), 'grandtheftauto');
    assert.equal(StringMatcher.normalize('  Mega   Man  '), 'megaman');
    assert.equal(StringMatcher.normalize('Pokémon'), 'pokemon');
  });

  it('TU-02: Deve aprovar palpites com transposição de letras adjacentes (Damerau-Levenshtein)', () => {
    // "zelad" tem transposição de 'a' e 'd' em relação a "zelda" (distância 1)
    const result = StringMatcher.compare('zelad', 'The Legend of Zelda');
    // Para 'zelda' (comprimento 5), tolerância é 1
    const directResult = StringMatcher.compare('zelad', 'Zelda');
    assert.equal(directResult.status, 'CORRECT');
    assert.equal(directResult.distance, 1);

    // "skirim" para "Skyrim" (substituição simples de 'y' por 'i')
    const skyrimResult = StringMatcher.compare('skirim', 'Skyrim');
    assert.equal(skyrimResult.status, 'CORRECT');
  });

  it('TU-03: Deve rejeitar estritamente palpites com 1 erro em palavras curtas (<= 4 letras)', () => {
    // "Doom" tem 4 letras. Tolerância deve ser 0.
    const boomResult = StringMatcher.compare('boom', 'Doom');
    assert.notEqual(boomResult.status, 'CORRECT');

    // "Halo" tem 4 letras. "Holo" deve ser rejeitado
    const haloResult = StringMatcher.compare('holo', 'Halo');
    assert.notEqual(haloResult.status, 'CORRECT');

    // Palpite exato deve ser aprovado
    const exactDoom = StringMatcher.compare('doom', 'Doom');
    assert.equal(exactDoom.status, 'CORRECT');
    assert.equal(exactDoom.isExact, true);
  });

  it('TU-04: Deve retornar status CLOSE ("Por Pouco!") quando estiver a 1 erro do limite', () => {
    // "Zelda" tem 5 letras (tolerância 1). Uma distância de 2 erros deve ser 'CLOSE'.
    // Ex: "zeloo" para "zelda" (troca 'd'->'o', 'a'->'o' => 2 erros)
    const closeResult = StringMatcher.compare('zeloo', 'Zelda');
    assert.equal(closeResult.status, 'CLOSE');
    assert.equal(closeResult.distance, 2);
  });

  it('Deve reconhecer aliases cadastrados com correspondência exata ou difusa', () => {
    const result = StringMatcher.compare('CT', 'Chrono Trigger', ['CT', 'Chrono']);
    assert.equal(result.status, 'CORRECT');
    assert.equal(result.isExact, true);

    const gtaResult = StringMatcher.compare('gta sa', 'Grand Theft Auto: San Andreas', ['GTA SA', 'San Andreas']);
    assert.equal(gtaResult.status, 'CORRECT');
  });

  it('Deve ignorar diferenças de espaçamento entre gabarito e resposta', () => {
    const res1 = StringMatcher.compare('grand theft auto', 'Grand Theft Auto');
    const res2 = StringMatcher.compare('grandtheftauto', 'Grand Theft Auto');
    const res3 = StringMatcher.compare('grand theftauto', 'Grand Theft Auto');

    assert.equal(res1.status, 'CORRECT');
    assert.equal(res2.status, 'CORRECT');
    assert.equal(res3.status, 'CORRECT');
  });
});
