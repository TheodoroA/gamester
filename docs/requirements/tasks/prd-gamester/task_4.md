# Tarefa 4.0: Máquina de Estados de Turnos e Poderes (TurnStateMachine)

## Visão geral

Implementar o motor de turnos e temporização centralizada no servidor: Janela de Intervenção (0–15s), fase de palpites (15–30s) e fase de resolução (30–45s). Implementar a dedução e gasto de recursos para os poderes Trocar Música, Roubar Música e Acerto Automático, além da concessão de recursos para o acerto do nome da música.

<skills>
### Conformidade com skills

- `executar-task`: Para implementar a máquina de estados e o gerenciador de poderes.
- `executar-qa`: Para atestar as travas temporais dos 15s e a dedução atômica de recursos.
- `executar-review`: Para revisar condições de concorrência e autoridade do servidor.
</skills>

<rules>
### Conformidade com o AGENTS.md e as rules

- `agents/rules/02-game-mechanics-rules.md`: Autoridade absoluta do servidor sobre relógios e respostas; bloqueio sumário de intervenções após 15.0 segundos; resolução por ordem de chegada (*first-come, first-served*); teto de 5 recursos acumulados.
</rules>

<requirements>
- RF4: Disparo simultâneo de áudio de 30 segundos sincronizado com timestamps do servidor.
- RF5: Janela de Intervenção habilitada exclusivamente durante os primeiros 15 segundos da rodada.
- RF6: Poder "Trocar Música" (custo de 1 recurso) utilizável pelo jogador ativo ou adversário, sorteando nova música e reiniciando o timer.
- RF7: Poder "Roubar Música" (custo de 2 recursos) utilizável por adversário, transferindo o direito da rodada para o ladrão.
- RF8: Poder "Acerto Automático" (custo de 3 recursos) utilizável pelo titular da rodada antes dos 25 segundos.
- RF13: Concessão de 1 recurso pelo acerto do nome da música (limitado ao teto de 5 recursos).
</requirements>

## Subtarefas

- [x] 4.1 Implementar `TurnStateMachine` com timers e transições de estado (`INTERVENTION`, `GUESSING`, `RESOLUTION`).
- [x] 4.2 Implementar lógica de processamento e dedução de recursos para "Trocar Música" (1 recurso) com validação de tempo $\le 15.0s$ e reinício de rodada.
- [x] 4.3 Implementar lógica de processamento para "Roubar Música" (2 recursos) com trava de concorrência (*first-come, first-served*) e troca de titularidade.
- [x] 4.4 Implementar lógica para "Acerto Automático" (3 recursos) e validação de bônus de nome de música (+1 recurso com teto de 5).
- [x] 4.5 Criar suite de testes unitários para a máquina de turnos e testes de integração com múltiplos clientes acionando poderes via WebSocket.

## Detalhes de implementação

Referência à seção 3.1 (*Principais interfaces - ITurnEngine*), seção 5 (*Protocolo de Comunicação e Diagrama de Estados*) e seção 3.2 (*Modelos de dados - RoundState*) do `techspec.md`.

## Critérios de aceitação relacionados

- CA-02
- CA-03
- CA-04
- CA-05
- CA-09

## Testes da tarefa

### Testes de unidade (se aplicável)

- [x] TU-06 — Limite máximo de acúmulo de recursos em 5
- [x] TU-07 — Bloqueio de poderes fora da janela de 15 segundos (retorno de `POWER_TIMEOUT`)

### Testes de integração (se aplicável)

- [x] TI-02 — Execução do poder Roubar Música com transferência de titularidade e dedução de 2 recursos
- [x] TI-03 — Execução do poder Trocar Música com reset de temporizador e dedução de 1 recurso

### Testes E2E (se aplicável)

*Não aplicável para esta tarefa de backend.*

## Arquivos relevantes

- `server/src/game/turnStateMachine.ts`
- `server/src/game/powerManager.ts`
- `server/src/ws/handlers/gameHandler.ts`
- `server/tests/unit/turnStateMachine.test.ts`
- `server/tests/integration/powers.test.ts`
