# Tarefa 3.0: Gerenciador de Salas e WebSockets (RoomManager)

## Visão geral

Configurar o servidor Fastify e o WebSocket Server (`ws`), implementando o `RoomManager` para controle do ciclo de vida das salas, sessões de jogadores, lobby em tempo real e resiliência a desconexões momentâneas de até 60 segundos.

<skills>
### Conformidade com skills

- `executar-task`: Para implementar o gerenciamento de salas e os handlers de WebSocket.
- `executar-qa`: Para atestar a sincronização em tempo real e os cenários de reconexão.
- `executar-review`: Para revisar a integridade dos eventos e concorrência no WebSocket.
</skills>

<rules>
### Conformidade com o AGENTS.md e as rules

- `agents/rules/01-vps-and-architecture-rules.md`: Armazenamento em memória (JavaScript Map) para salas ativas com baixo consumo de RAM, compatível com o proxy reverso Nginx.
- `agents/rules/03-code-standards.md`: Tolerância a desconexões de até 60s por jogador com restauração de estado via `syncState`.
</rules>

<requirements>
- RF1: Geração de códigos de sala alfanuméricos exclusivos e suporte à entrada por nickname.
- RF2: Sincronização em tempo real da lista de participantes no lobby via WebSockets.
- RF3: Configurações de sala pelo anfitrião (modo, tempos e pacotes de músicas/tags).
</requirements>

## Subtarefas

- [x] 3.1 Implementar `RoomManager` para orquestração em memória de salas, participantes e conexões ativas.
- [x] 3.2 Implementar gerador de códigos de sala exclusivos de 4 a 6 caracteres e endpoint `POST /api/rooms`.
- [x] 3.3 Configurar servidor WebSocket com suporte aos eventos de lobby: `room:join`, `room:leave` e `room:update`.
- [x] 3.4 Implementar sistema de reconexão transparente que preserva o `playerId` por até 60 segundos com envio de `syncState`.
- [x] 3.5 Criar testes de integração simulando múltiplos clientes conectando, desconectando e reconectando em uma sala.

## Detalhes de implementação

Referência à seção 3.1 (*Principais interfaces - IRoomService*), seção 3.2 (*Modelos de dados - RoomState*) e seção 3.3 (*Endpoints da API - POST /api/rooms*) do `techspec.md`.

## Critérios de aceitação relacionados

- CA-01
- CA-10

## Testes da tarefa

### Testes de unidade (se aplicável)

*Não aplicável para a camada de sockets.*

### Testes de integração (se aplicável)

- [x] TI-01 — Ciclo completo de criação de sala, entrada de múltiplos participantes e broadcast de estado no lobby

### Testes E2E (se aplicável)

*Não aplicável para esta tarefa de backend.*

## Arquivos relevantes

- `server/src/game/roomManager.ts`
- `server/src/ws/socketServer.ts`
- `server/src/ws/handlers/roomHandler.ts`
- `server/src/routes/roomRoutes.ts`
- `server/tests/integration/roomWebSocket.test.ts`
