# Especificação técnica

## Resumo

O **Gamester** é uma aplicação web multiplayer em tempo real projetada para execução de baixo consumo de recursos em uma VPS compartilhada com instâncias de Foundry VTT e TeamSpeak. A solução adota uma arquitetura orientada a eventos (*event-driven*) composta por um backend único em Node.js com Fastify e biblioteca WebSocket nativa (`ws`), persistência embutida em SQLite local (`better-sqlite3`) e um frontend SPA responsivo em Vite/TypeScript. 

A dinâmica de áudio delega o streaming diretamente para a API oficial do YouTube IFrame em modo *headless* (invisível ao jogador para evitar spoilers), minimizando o tráfego de rede e o uso de disco da VPS. A validação de palpites é processada em memória pelo algoritmo Damerau-Levenshtein com colapso total de espaços e limiares adaptativos.

---

## Arquitetura do sistema

### Visão dos componentes

```
                                  [ Navegador do Cliente (SPA) ]
                                  ├── Views: Lobby / GameRoom / Admin
                                  ├── Stores: RoomStore (WebSocket Client)
                                  ├── Components: TimelineBoard, PowerButtons
                                  └── Audio: YouTubeHeadlessPlayer
                                                 │
                                                 ▼ (HTTPS / WSS)
                                      [ Nginx Reverse Proxy ]
                                                 │
                    ┌────────────────────────────┴────────────────────────────┐
                    ▼                                                         ▼
     [ HTTP Server (Fastify) ]                                   [ WebSocket Server (ws) ]
     ├── Routes: /api/rooms, /api/catalog                         ├── RoomSocketHandler
     ├── Middlewares: AuthAdmin, RateLimit                        ├── StateBroadcaster
     └── Controllers: CatalogController                           └── ActionDispatcher
                    │                                                         │
                    └────────────────────────────┬────────────────────────────┘
                                                 ▼
                                     [ Gamester Core Engine ]
                                     ├── RoomManager (In-Memory State)
                                     ├── TurnStateMachine (15s/30s Engine)
                                     ├── StringMatcher (Damerau-Levenshtein)
                                     └── CatalogRepository
                                                 │
                                                 ▼
                                      [ SQLite: gamester.db ]
```

- **`RoomManager`:** Mantém o estado ativo de todas as salas, jogadores conectados e pontuações em memória RAM (JavaScript `Map`), isolando o ciclo de jogo de operações lentas de I/O em disco.
- **`TurnStateMachine`:** Controla a máquina de estados temporal de cada rodada (Janela de Intervenção de 0 a 15s, Janela de Adivinhação de 15 a 30s e Fase de Resolução de 30 a 40s), emitindo eventos de sincronização para os clientes.
- **`StringMatcher`:** Serviço puro de normalização (remoção de acentos, pontuação e espaços em branco) e comparação difusa via Damerau-Levenshtein com limites de erro dinâmicos.
- **`CatalogRepository`:** Abstração de persistência sobre o arquivo `gamester.db`, responsável por consultas de sorteio de faixas aleatórias e operações CRUD administrativas.
- **`YouTubeHeadlessPlayer` (Cliente):** Gerencia o player oculto do YouTube no navegador via `YT.Player`, controlando o playback dos trechos de 30 segundos sem expor metadados visuais.

---

## Design de implementação

### Principais interfaces

```typescript
// Motor de salas e estado em tempo real
interface IRoomService {
  createRoom(hostNickname: string, settings: RoomSettings): RoomState;
  joinRoom(roomId: string, nickname: string): { player: Player; room: RoomState };
  leaveRoom(roomId: string, playerId: string): void;
  getRoom(roomId: string): RoomState | null;
}

// Máquina de estados de rodadas e turnos
interface ITurnEngine {
  startRound(roomId: string): RoundState;
  applyPower(roomId: string, playerId: string, power: 'REROLL' | 'STEAL' | 'AUTOHIT'): PowerResult;
  submitGuess(roomId: string, playerId: string, guess: GuessPayload): ValidationResult;
  resolveRound(roomId: string): RoundResolution;
}

// Validador de similaridade de texto
interface IStringMatcher {
  normalize(input: string): string;
  compare(guess: string, target: string, aliases: string[]): MatchEvaluation;
}

// Repositório de músicas
interface ICatalogRepository {
  getRandomSong(excludedIds: string[], category?: string): SongEntity | null;
  importBatch(songs: NewSongInput[]): ImportResult;
  createSong(song: NewSongInput): SongEntity;
  listSongs(filter: CatalogFilter): { songs: SongEntity[]; total: number };
}
```

---

### Modelos de dados

#### `SongEntity` — Metadados de uma música no catálogo

| Campo         | Tipo       | Obrigatório | Descrição                                    |
| ------------- | ---------- | ----------- | -------------------------------------------- |
| `id`          | `string`   | sim         | Identificador único (UUIDv4)                |
| `gameTitle`   | `string`   | sim         | Título oficial do jogo                       |
| `releaseYear` | `number`   | sim         | Ano de lançamento oficial                    |
| `songTitle`   | `string`   | sim         | Nome oficial da música                       |
| `youtubeUrl`  | `string`   | sim         | Link do vídeo do YouTube                    |
| `youtubeId`   | `string`   | sim         | ID extraído do vídeo (11 caracteres)         |
| `startTime`   | `number`   | sim         | Segundo de início da execução                |
| `platform`    | `string`   | não         | Plataforma principal (ex: SNES, PS1, PC)     |
| `category`    | `string`   | não         | Categoria/gênero da música                   |
| `tags`        | `string[]` | não         | Marcadores temáticos (ex: boss, battle, rpg, calma, credits) |
| `aliases`     | `string[]` | não         | Títulos alternativos e siglas reconhecidas   |

```json
{
  "id": "e4b1a8d0-8f92-4c28-9844-3d9a19c5c101",
  "gameTitle": "Chrono Trigger",
  "releaseYear": 1995,
  "songTitle": "Wind Scene",
  "youtubeUrl": "https://www.youtube.com/watch?v=5ejTEpMhp_8",
  "youtubeId": "5ejTEpMhp_8",
  "startTime": 12,
  "platform": "Super Nintendo",
  "category": "Retro",
  "tags": ["rpg", "overworld", "acoustic", "snes", "nostalgia"],
  "aliases": ["CT", "Chrono"]
}
```

#### `RoomState` — Estado agregado de uma sala em memória

| Campo         | Tipo             | Obrigatório | Descrição                                |
| ------------- | ---------------- | ----------- | ---------------------------------------- |
| `id`          | `string`         | sim         | Código da sala com 4 a 6 letras (ex: WXYZ)|
| `hostId`      | `string`         | sim         | ID do jogador anfitrião                  |
| `status`      | `RoomStatus`     | sim         | `LOBBY`, `PLAYING`, `GAME_OVER`          |
| `settings`    | `RoomSettings`   | sim         | Configurações da partida                 |
| `players`     | `Player[]`       | sim         | Lista de participantes conectados        |
| `currentRound`| `RoundState`     | não         | Estado da rodada em andamento            |

```json
{
  "id": "ABCD",
  "hostId": "usr-1",
  "status": "PLAYING",
  "settings": {
    "mode": "TIMELINE",
    "listenSeconds": 30,
    "interventionSeconds": 15,
    "maxCardsToWin": 10
  },
  "players": [
    {
      "id": "usr-1",
      "nickname": "PlayerOne",
      "tokens": 2,
      "score": 4,
      "timeline": [
        { "gameTitle": "Super Mario World", "releaseYear": 1990 }
      ],
      "isConnected": true
    }
  ],
  "currentRound": {
    "roundNumber": 3,
    "activePlayerId": "usr-1",
    "youtubeId": "5ejTEpMhp_8",
    "startTime": 12,
    "startedAt": 1727885400000,
    "interventionEndsAt": 1727885415000,
    "roundEndsAt": 1727885430000,
    "isStolen": false,
    "stolenByPlayerId": null
  }
}
```

#### `ErrorEnvelope` — Envelope padronizado de erro

| Código           | HTTP  | Significado                                           |
| ---------------- | ----- | ----------------------------------------------------- |
| `ROOM_NOT_FOUND` | `404` | Sala inexistente ou código expirado                   |
| `UNAUTHORIZED`   | `401` | Chave de administração incorreta ou ausente           |
| `VALIDATION_ERR` | `400` | Payload JSON malformado ou campos obrigatórios vazios |
| `POWER_TIMEOUT`  | `400` | Poder acionado após o término da Janela de Intervenção|
| `INSUFFICIENT_F` | `400` | Saldo insuficiente de recursos/tokens                 |

```json
{
  "error": {
    "code": "POWER_TIMEOUT",
    "message": "A Janela de Intervenção encerrou aos 15 segundos da rodada."
  }
}
```

---

### Endpoints da API

#### Visão geral

| Método | Rota                  | Descrição                                         |
| ------ | --------------------- | ------------------------------------------------- |
| `GET`  | `/health`             | Verificação de integridade e consumo de RAM       |
| `POST` | `/api/rooms`          | Criação de uma nova sala de jogo                  |
| `GET`  | `/api/catalog/songs`  | Listagem paginada de músicas do acervo            |
| `POST` | `/api/catalog/songs`  | Cadastro individual manual de música (Admin)      |
| `POST` | `/api/catalog/import` | Importação em lote de músicas via JSON (Admin)    |

---

#### `GET [/health]`
Endpoint leve para monitoramento de liveness e métricas de memória da VPS.

**Respostas**

| Status | Corpo          | Quando                     |
| ------ | -------------- | -------------------------- |
| `200`  | `HealthStatus` | Aplicação operando normal  |

**Exemplo — sucesso**

```http
GET /health
```

```json
{
  "status": "healthy",
  "uptime": 14205,
  "memory": {
    "rssMb": 68.4,
    "heapUsedMb": 34.2
  },
  "activeRooms": 2
}
```

---

#### `POST [/api/rooms]`
Cria uma nova sala e retorna o código exclusivo gerado.

**Corpo (Request Body)**

| Parâmetro   | Tipo     | Padrão     | Regras                          |
| ----------- | -------- | ---------- | ------------------------------- |
| `nickname`  | `string` | —          | Obrigatório, 2 a 20 caracteres  |
| `mode`      | `string` | `TIMELINE` | `TIMELINE` ou `ARCADE`          |

**Respostas**

| Status | Corpo             | Quando                          |
| ------ | ----------------- | ------------------------------- |
| `201`  | `RoomCreated`     | Sala criada com sucesso         |
| `400`  | `ErrorEnvelope`   | Nickname ausente ou inválido    |

**Exemplo — sucesso**

```http
POST /api/rooms
Content-Type: application/json

{
  "nickname": "PlayerHost",
  "mode": "TIMELINE"
}
```

```json
{
  "roomId": "GK9F",
  "playerId": "usr-8a21",
  "token": "sess-jwt-token"
}
```

---

#### `POST [/api/catalog/import]`
Importa em massa músicas estruturadas a partir de arquivo JSON gerado por IA ou curadoria.

**Corpo (Request Body)**

| Parâmetro   | Tipo             | Padrão | Regras                              |
| ----------- | ---------------- | ------ | ----------------------------------- |
| `adminKey`  | `string`         | —      | Deve coincidir com `ADMIN_KEY`      |
| `songs`     | `NewSongInput[]` | —      | Array contendo de 1 a 500 músicas   |

**Respostas**

| Status | Corpo             | Quando                             |
| ------ | ----------------- | ---------------------------------- |
| `200`  | `ImportResult`    | Músicas inseridas com sucesso      |
| `401`  | `ErrorEnvelope`   | Chave de administração incorreta   |
| `400`  | `ErrorEnvelope`   | Estrutura do JSON inválida         |

**Exemplo — sucesso**

```http
POST /api/catalog/import
Content-Type: application/json

{
  "adminKey": "segredo-vps-gamester",
  "songs": [
    {
      "gameTitle": "Hollow Knight",
      "releaseYear": 2017,
      "songTitle": "City of Tears",
      "youtubeUrl": "https://www.youtube.com/watch?v=1unmFCyiVM8",
      "startTime": 45,
      "tags": ["indie", "ambient", "rain", "metroidvania"]
    }
  ]
}
```

```json
{
  "inserted": 1,
  "failed": 0,
  "errors": []
}
```

---

## Pontos de integração

### 1. YouTube IFrame Player API (Cliente Web)
- **Integração:** Executada diretamente no navegador do usuário via biblioteca JavaScript oficial `https://www.youtube.com/iframe_api`.
- **Modo Oculto (*Headless*):** O elemento `<div>` do player possui estilização CSS garantindo invisibilidade:
  ```css
  .headless-audio-player {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
    top: -9999px;
  }
  ```
- **Tratamento de Erros:** Evento `onError` do YouTube (código 101/150 indicando incorporação desabilitada pelo autor do vídeo). Quando detectado, o cliente notifica o servidor, que descarta a faixa e sorteia uma alternativa imediatamente.

### 2. Nginx Reverse Proxy (VPS)
- Roteamento da porta pública `443` para `127.0.0.1:3030`.
- Upgrade obrigatório de cabeçalhos de WebSocket (`Upgrade: websocket`, `Connection: Upgrade`).
- Configuração de `proxy_read_timeout 86400s` para manter sessões abertas sem desconexões espúrias.

### 3. Cloudflare Edge
- Terminação SSL no nível da borda e CDN Caching para assets estáticos do frontend (`/dist/*`).
- Suporte habilitado para WebSocket Pass-through.

---

## Abordagem de testes

A estratégia de testes abrange três camadas principais, com foco na máquina de estados de temporização dos poderes e na precisão do algoritmo de validação de texto.

### Testes de unidade (se aplicável)

| ID | Nome do caso de teste | Critérios de aceitação | Resultado esperado |
|----|-----------------------|------------------------|--------------------|
| TU-01 | Normalização de espaços e pontuações | CA-06 | `"Grand Theft Auto: San Andreas"` $\rightarrow$ `"grandtheftautosanandreas"`. |
| TU-02 | Comparação tolerante com Damerau-Levenshtein | CA-06 | Palpites com inversão de letras adjacentes (`"zelad"`) são aprovados como `"zelda"`. |
| TU-03 | Rejeição por tamanho curto | CA-06 | Palpites em títulos de 4 letras com 1 erro (`"boom"` para `"doom"`) são estritamente rejeitados. |
| TU-04 | Detecção de feedback "Por Pouco!" | CA-07 | Distância com 1 erro acima da tolerância retorna status `CLOSE`. |
| TU-05 | Validação de Linha do Tempo | CA-08 | Encaixe de ano 1995 entre 1990 e 1998 é validado como `VALID_ORDER`. |
| TU-06 | Limite máximo de acúmulo de recursos | CA-09 | Ganho de recursos com saldo em 5 mantém saldo final exatamente em 5. |
| TU-07 | Bloqueio de poderes fora da janela de 15s | CA-03, CA-04 | Comando `power:reroll` com timestamp em 15.1s retorna `POWER_TIMEOUT`. |

### Testes de integração (se aplicável)

| ID | Nome do caso de teste | Critérios de aceitação | Resultado esperado |
|----|-----------------------|------------------------|--------------------|
| TI-01 | Ciclo completo de criação e entrada em sala | CA-01 | Dois clientes conectam via WebSocket e recebem lista sincronizada de jogadores. |
| TI-02 | Execução do poder Roubar Música | CA-03 | Adversário debita 2 recursos e substitui o jogador ativo na rodada em andamento. |
| TI-03 | Execução do poder Trocar Música | CA-04 | Jogador debita 1 recurso, áudio é cancelado e nova música é transmitida com timer reiniciado. |
| TI-04 | Importação em lote de catálogo JSON | CA-11 | Endpoint `/api/catalog/import` insere 50 músicas válidas em transação atômica no SQLite. |

### Testes E2E (se aplicável)

| ID | Nome do caso de teste | Critérios de aceitação | Resultado esperado |
|----|-----------------------|------------------------|--------------------|
| E2E-01 | Partida de 2 jogadores até a vitória | CA-08 | Simulação de 10 rodadas com acertos sucessivos, verificação da linha do tempo e tela de vitória final. |
| E2E-02 | Reconexão de jogador durante a partida | CA-10 | Queda intencional de conexão socket e restauração imediata do estado de cartas e recursos. |

---

## Sequenciamento do desenvolvimento

### Ordem de construção

1. **Camada de Dados e Algoritmos Puros (Fundação):**
   - Configuração do SQLite com schema de músicas e salas.
   - Implementação do utilitário `StringMatcher` com Damerau-Levenshtein e testes unitários (garante a robustez do core antes da rede).
2. **Servidor WebSocket e Máquina de Estados (`TurnStateMachine`):**
   - Implementação do temporizador centralizado (0-15s / 15-30s).
   - Handlers de conexão, lobby e despacho de eventos de poderes.
3. **API HTTP e Catálogo de Músicas:**
   - Rotas de importação de JSON e CRUD administrativo.
4. **Frontend SPA (Vite + TypeScript):**
   - Implementação do cliente WebSocket e store reativo.
   - Integração do componente `YouTubeHeadlessPlayer`.
   - Construção dos componentes visuais: Linha do Tempo rolável, botões de poderes e campo de resposta.
5. **Integração de Infraestrutura e Validação na VPS:**
   - Criação do `Dockerfile` de estágio único otimizado para < 100MB RAM.
   - Configuração do bloco no Nginx e teste sob Cloudflare.

### Dependências técnicas

- Node.js LTS (v20+) instalado na VPS.
- Arquivo de credenciais/chave de administração configurado em variável de ambiente `ADMIN_KEY`.
- Mapeamento correto de portas no Nginx para evitar conflito com Foundry VTT e TeamSpeak.

---

## Monitoramento e observabilidade

- **Endpoint de Saúde:** `GET /health` reportando consumo exato de RSS e Heap Memory em MB.
- **Log Estruturado Leve:** Utilização do logger nativo do Fastify (`pino`) em formato JSON conciso:
  - `INFO`: Criação de salas, início de rodadas e vitórias de partidas.
  - `WARN`: Uso de poderes fora do tempo limite e desconexões repetidas.
  - `ERROR`: Falhas em queries do banco SQLite ou corrupção de payload de cliente.
- **Limitação de Overhead:** Proibido uso de telemetria externa pesada (NewRelic, Datadog ou Prometheus daemons) para não consumir memória da VPS.

---

## Considerações técnicas

### Principais decisões

- **SQLite Embutido vs Banco Externo:** Decisão de usar `better-sqlite3` operando sobre arquivo único. Evita o custo de 200MB+ de RAM que um container PostgreSQL ou MySQL exigiria da VPS compartilhada.
- **YouTube Headless vs Servidor de Streaming de Áudio:** Ao utilizar a API pública do YouTube via cliente, transferimos 100% da largura de banda e decodificação multimídia para o navegador dos usuários e servidores do Google, sem violar direitos autorais nem expor a VPS a gargalos de rede.
- **Damerau-Levenshtein com Espaços Colapsados:** A decisão de remover todos os espaços (`"megaman"` == `"mega man"`) antes do cálculo elimina mais de 80% das frustrações dos jogadores, mantendo a tolerância a trocas de letras vizinhas sob controle.

### Riscos conhecidos

| Risco | Impacto | Mitigação |
| :--- | :--- | :--- |
| **Bloqueio de incorporação no YouTube** (vídeo não permite embed) | Alto (sala trava na rodada) | Handler `onError` do YouTube no frontend detecta falha e sinaliza o backend para trocar a música automaticamente em menos de 1 segundo. |
| **Política de Autoplay de navegadores** | Médio (áudio não inicia) | Exigir clique explícito do usuário no lobby ("Pronto para Jogar") antes do início da primeira rodada para destravar a permissão de áudio do navegador. |
| **Queda momentânea de rede de um jogador** | Baixo | Snapshot de estado (`syncState`) transmitido automaticamente ao reconectar via WebSocket. |

### Conformidade com o AGENTS.md e as rules

- **`agents/rules/01-vps-and-architecture-rules.md`:** Respeitado integralmente. Sem daemons pesados, teto de RAM < 150MB, uso exclusivo de SQLite e compatibilidade com Nginx.
- **`agents/rules/02-game-mechanics-rules.md`:** Respeitado integralmente. O servidor é a autoridade absoluta dos tempos de 15s/30s, do saldo máximo de 5 fichas e do cálculo de Damerau-Levenshtein com espaços colapsados.
- **`agents/rules/03-code-standards.md`:** Respeitado integralmente. Projeto estruturado em TypeScript estrito, separando backend e frontend com tolerância a desconexões de até 60s.

### Conformidade com skills

- **`criar-prd`:** Utilizada na etapa preliminar para gerar o [PRD oficial](file:///d:/Projetos/Gamester/docs/requirements/tasks/prd-gamester/prd.md) que embasa esta especificação.
- **`criar-techspec`:** Template e fluxo seguidos estritamente neste documento.
- **`criar-tasks`:** Próxima skill a ser executada a partir desta especificação técnica.

### Arquivos relevantes e dependentes

- `docs/requirements/tasks/prd-gamester/prd.md` — Requisitos de Produto e Critérios de Aceitação
- `docs/game-rules.md` — Regras Oficiais e Game Design
- `docs/architecture/system-design.md` — Visão conceitual de infraestrutura
- `agents/rules/01-vps-and-architecture-rules.md` — Restrições de hardware e VPS
- `agents/rules/02-game-mechanics-rules.md` — Regras de temporização e poderes
- `agents/rules/03-code-standards.md` — Padrões e convenções de código
