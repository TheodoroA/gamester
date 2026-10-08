# 🎮 Gamester

O **Gamester** é um jogo party multiplayer online de adivinhação de trilhas sonoras de videogames (OSTs), combinando a mecânica de construção de linha do tempo cronológica do *Hitster* com a agilidade de salas virtuais em tempo real no estilo *Gartic*.

---

## ✨ Funcionalidades Principais

- ⏱️ **Rodadas de 30s:** Áudio sincronizado via YouTube IFrame API em modo Headless (sem spoilers de capa, título ou canal).
- 📅 **Modo Linha do Tempo (Hitster):** Posicione o jogo de origem cronologicamente na sua linha do tempo. O primeiro a acertar 10 cartas vence!
- 🕹️ **Modo Arcade (Gartic):** Pontuação por acertos do jogo (+2 pts), ano aproximado (+1 pt) e nome da música (+1 pt).
- 🪙 **Economia de Recursos (Fichas):**
  - Acertar o nome da faixa concede **1 Recurso** (máx. 5).
  - Gaste recursos na **Janela de Intervenção (0–15s)**:
    - **1 Recurso:** *Trocar Música (Reroll)*
    - **2 Recursos:** *Roubar Música (Steal)*
    - **3 Recursos:** *Acerto Automático (Auto-Hit)*
- 🔤 **Tolerância a Erros:** Algoritmo **Damerau-Levenshtein** com colapso de espaços em branco, tratamento de acentuação, aliases oficiais e notificação privada *"Por Pouco!"*.
- 🛡️ **Tolerância a Oscilação de Rede:** Reconexão automática em até 60s sem perda de fichas, cartas ou estado da sala.
- 🛠️ **Painel Administrativo (`/admin`):** Mini-player de 30s para pré-escuta, cadastro de faixas com tags e importação em lote via JSON.
- 🚀 **Otimizado para VPS Compartilhada:** RAM $< 150\text{MB}$, processo único (Fastify + Vite SPA) e SQLite em modo WAL (zero daemons externos de banco).

---

## 🚀 Como Rodar Localmente

### Opção 1: Via Docker Compose (Recomendado)

```bash
docker compose up --build
```
Acesse [http://localhost:3030](http://localhost:3030) no seu navegador. O catálogo inicial já é populado automaticamente com faixas de teste.

### Opção 2: Via Node.js (Modo Desenvolvimento com Hot-Reload)

1. **Backend:**
   ```bash
   cd server
   npm install
   npm run dev
   ```
   *(Roda a API REST e WebSockets em `http://localhost:3030`)*

2. **Frontend:**
   ```bash
   cd client
   npm install
   npm run dev
   ```
   *(Roda o Vite com proxy configurado em `http://localhost:5173`)*

---

## 🧪 Testes Automatizados

O projeto conta com suíte completa de 24 testes automatizados cobrindo testes unitários, testes de integração e testes ponta a ponta (E2E):

```bash
cd server
npm test
```

---

## 📚 Documentação

- [Regras Oficiais e Game Design](docs/game-rules.md)
- [Guia de Deploy e Nginx na VPS](docs/deploy-vps.md)
- [Template de Importação JSON](docs/songs-seed-template.json)
- [Especificação Técnica (TechSpec)](docs/requirements/tasks/prd-gamester/techspec.md)
