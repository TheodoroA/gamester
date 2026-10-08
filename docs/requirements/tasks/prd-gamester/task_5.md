# Tarefa 5.0: Motor de Linha do Tempo e Regras de Vitória

## Visão geral

Implementar o validador de posicionamento cronológico na linha do tempo individual do jogador, as regras de pontuação dos dois modos de jogo (Modo Linha do Tempo e Modo Arcade) e a verificação da condição de vitória da partida.

<skills>
### Conformidade com skills

- `executar-task`: Para implementar o validador de linha do tempo e os modos de jogo.
- `executar-qa`: Para atestar as regras de ordenação cronológica e cálculo de placar.
- `executar-review`: Para revisar a integridade das condições de término de partida.
</skills>

<rules>
### Conformidade com o AGENTS.md e as rules

- `agents/rules/02-game-mechanics-rules.md`: O servidor é a autoridade única sobre a validação de linha do tempo e declaração de vitória.
- `agents/rules/03-code-standards.md`: Modularidade clara e separação de regras de modos de jogo.
</rules>

<requirements>
- RF3: Suporte ao Modo Linha do Tempo e Modo Arcade.
- RF12: Validação do posicionamento cronológico da carta na linha do tempo pessoal do jogador, fixando-a em caso de acerto conjunto do jogo e do período.
</requirements>

## Subtarefas

- [x] 5.1 Implementar `TimelineValidator` para checar se o ano do jogo palpiteiro é válido no intervalo selecionado entre as cartas já conquistadas pelo jogador.
- [x] 5.2 Implementar motor de regras do Modo Linha do Tempo (declaração de vitória imediata ao atingir 10 cartas cronológicas válidas).
- [x] 5.3 Implementar motor de regras do Modo Arcade (cálculo de pontuação por rodada: +2 jogo, +1 ano exato ou ±1 ano, +1 nome da faixa).
- [x] 5.4 Implementar evento WebSocket de encerramento da partida (`game:over`) com o payload do pódio e histórico de cartas.
- [x] 5.5 Criar suite de testes unitários para a validação de intervalos cronológicos.

## Detalhes de implementação

Referência à seção 2 (*Modos de Jogo*) do `game-rules.md` e seção 3.2 (*Modelos de dados - RoomState*) do `techspec.md`.

## Critérios de aceitação relacionados

- CA-08

## Testes da tarefa

### Testes de unidade (se aplicável)

- [x] TU-05 — Validação de Linha do Tempo (verificação de encaixe entre anos já existentes com aprovação de ordem válida e rejeição de anacronismos)

### Testes de integração (se aplicável)

*Não aplicável diretamente nesta camada lógica.*

### Testes E2E (se aplicável)

*A validação integrada de vitória será executada na Tarefa 8.0.*

## Arquivos relevantes

- `server/src/game/timelineValidator.ts`
- `server/src/game/gameModes.ts`
- `server/src/ws/handlers/gameHandler.ts`
- `server/tests/unit/timelineValidator.test.ts`
