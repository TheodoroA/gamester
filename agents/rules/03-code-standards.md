# Regra 03: Padrões de Código e Estrutura de Projeto

Esta regra define os padrões de desenvolvimento, organização de pastas e qualidade de código para o **Gamester**.

## 1. Stack e Ferramentas
- **Linguagem:** TypeScript estrito (`strict: true` no `tsconfig.json`) em todo o projeto.
- **Backend:** Node.js com Fastify ou Express minimalista + biblioteca WebSocket nativa (`ws`).
- **Persistência:** SQLite usando `better-sqlite3` ou ORM ultra-leve (Kysely ou Drizzle ORM sem dependências pesadas).
- **Frontend:** SPA leve (SvelteKit ou React/Vite com Tailwind CSS).

## 2. Estrutura de Diretórios Recomendada
```
gamester/
├── server/                 # Backend Node.js / Fastify
│   ├── src/
│   │   ├── controllers/    # Rotas HTTP e APIs (admin, catálogo)
│   │   ├── game/           # Máquina de estados da sala, turnos e regras
│   │   ├── db/             # Conexão SQLite e repositórios
│   │   ├── utils/          # Normalizador de texto, Levenshtein
│   │   └── ws/             # Handlers e emissores de WebSocket
│   └── tests/
├── client/                 # Frontend SPA
│   ├── src/
│   │   ├── components/     # Linha do tempo, player oculto, placar, botões de poderes
│   │   ├── stores/         # Gerenciamento de estado (WebSocket sync)
│   │   └── views/          # Lobby, Sala de Jogo, Painel Admin
├── docs/                   # Documentação do projeto e PRDs
└── agents/                 # Regras e skills dos agentes de IA
```

## 3. Resiliência de Conexão e Desconexões
- O sistema deve tolerar desconexões temporárias de até 60 segundos por jogador sem expulsá-lo ou reiniciar o estado da partida.
- Ao reconectar com o mesmo `sessionToken` ou `playerId`, o cliente deve receber um snapshot completo do estado atual da rodada (`syncState`).
- Se o Jogador da Vez desconectar durante a sua rodada, o temporizador avança e a rodada é finalizada normalmente ao término dos 30s para não travar a sala.

## 4. Testes e Validação
- Testes unitários obrigatórios para o algoritmo de validação de respostas e cálculo de Levenshtein.
- Testes unitários para a máquina de estados de poderes (garantindo que tokens não sejam gastos indevidamente após os 15 segundos).
