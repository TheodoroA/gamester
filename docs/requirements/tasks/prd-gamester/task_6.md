# Tarefa 6.0: Frontend SPA: Lobby, Player Headless e Ciclo da Rodada

## Visão geral

Desenvolver o cliente web responsivo em Vite/TypeScript com Tailwind CSS, integrando o cliente WebSocket reativo, a tela de lobby com entrada rápida e botão para desbloqueio de áudio no navegador, o componente de áudio invisível do YouTube (`YouTubeHeadlessPlayer`) sem vazamento de spoilers visuais, botões de poderes sincronizados e interface de palpites.

<skills>
### Conformidade com skills

- `executar-task`: Para construir a interface de usuário e componentes reativos.
- `executar-qa`: Para atestar a compatibilidade visual, responsividade mobile e ausência de spoilers no player.
- `executar-review`: Para revisar a organização dos componentes e gerenciamento de estado.
</skills>

<rules>
### Conformidade com o AGENTS.md e as rules

- `agents/rules/01-vps-and-architecture-rules.md`: Frontend como SPA estática compilada para consumo nulo de RAM no host.
- `agents/rules/02-game-mechanics-rules.md`: Clientes não calculam tempo autoritativo; utilizam timestamps do servidor para guiar a barra de progresso.
</rules>

<requirements>
- RF1: Entrada via código de sala e nickname sem necessidade de cadastro.
- RF2: Sincronização em tempo real de membros do lobby.
- RF4: Execução simultânea de áudio via streaming.
- RF5: Janela de Intervenção visual com temporizador regressivo de 15s.
- RF6/RF7/RF8: Botões de ação para Trocar Música, Roubar Música e Acerto Automático habilitados de acordo com o saldo e fase da rodada.
- RF9/RF11: Campo de submissão de respostas e exibição do aviso privado "Por Pouco!".
</requirements>

## Subtarefas

- [x] 6.1 Inicializar a SPA em `client/` com Vite, TypeScript, Tailwind CSS e camada reativa de WebSocket (`roomStore`).
- [x] 6.2 Criar telas de Home (Criar/Entrar em Sala) e Lobby com lista de avatares conectados e botão "Pronto para Jogar" (que inicializa o contexto Web Audio do navegador para mitigar bloqueio de autoplay).
- [x] 6.3 Implementar o componente `YouTubeHeadlessPlayer` oculto via CSS, gerenciando carregamento assíncrono da API do YouTube, controle de `startSeconds` e captura de evento `onError` para fallback.
- [x] 6.4 Implementar a interface de rodada: cabeçalho com identificação do Jogador da Vez, cronômetro circular/barra sincronizada e botões de poderes (Trocar Música 1, Roubar Música 2, Acerto Automático 3).
- [x] 6.5 Implementar campo de digitação de palpites de jogo e nome de música com renderização de alerta privado "Por Pouco!".

## Detalhes de implementação

Referência à seção 4 (*Pontos de integração - YouTube IFrame Player API*) e seção 5 (*Protocolo de Comunicação e Eventos WebSocket*) do `techspec.md`.

## Critérios de aceitação relacionados

- CA-01
- CA-02
- CA-03
- CA-04
- CA-05
- CA-06
- CA-07

## Testes da tarefa

### Testes de unidade (se aplicável)

- [ ] Testes de renderização de componentes de botões de poder e cálculos de estado da store WebSocket.

### Testes de integração (se aplicável)

- [ ] Validação da sincronia entre evento WebSocket de início de rodada e acionamento do player de áudio.

### Testes E2E (se aplicável)

*A validação E2E completa com múltiplos navegadores será executada na Tarefa 8.0.*

## Arquivos relevantes

- `client/package.json`
- `client/src/App.tsx` (ou `.svelte`)
- `client/src/stores/roomStore.ts`
- `client/src/components/YouTubeHeadlessPlayer.tsx`
- `client/src/components/PowerButtons.tsx`
- `client/src/components/RoundTimer.tsx`
- `client/src/views/LobbyView.tsx`
- `client/src/views/GameView.tsx`
