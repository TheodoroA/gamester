# Gamester — Regras Oficiais e Game Design

O **Gamester** é um jogo multiplayer online de adivinhação de trilhas sonoras de videogames (OSTs), combinando a mecânica de construção de linha do tempo do *Hitster* com a dinâmica ágil de salas virtuais e adivinhação em tempo real no estilo *Gartic*.

---

## 1. Visão Geral e Objetivo

- **Tema:** Músicas e trilhas sonoras de jogos clássicos, modernos e indies.
- **Formato:** Salas multiplayer com link/código de acesso, jogado diretamente no navegador (desktop ou mobile), sem necessidade de instalação.
- **Objetivo Geral:** Escutar trechos de 30 segundos de músicas de jogos, identificar o **Jogo de Origem**, posicionar no **Ano de Lançamento** (na linha do tempo) e, como bônus, acertar o **Nome da Música** para conquistar **Recursos (Fichas)**.

---

## 2. Modos de Jogo

O anfitrião da sala (*Host*) pode escolher o modo de jogo antes de iniciar a partida:

### Modo 1: Linha do Tempo (Inspirado no Hitster — Modo Principal)
- **Mecânica:** Cada jogador constrói sua própria **Linha do Tempo** cronológica no tabuleiro virtual.
- **Condição de Vitória:** O primeiro jogador a posicionar corretamente **10 cartas de jogos** em sua linha do tempo vence a partida.
- **Como funciona um acerto:**
  1. O jogador deve adivinhar o **Jogo de Origem**.
  2. O jogador deve indicar onde esse jogo se encaixa cronologicamente entre os jogos que ele já possui na sua linha do tempo (ex: *entre 1998 e 2004* ou *antes de 1995*).
  3. Se acertar o jogo e a posição cronológica, a carta é fixada na sua linha do tempo.

### Modo 2: Arcade / Party (Inspirado no Gartic)
- **Mecânica:** Partida disputada por pontuação ao longo de um número fixo de rodadas (ex: 10 a 20 rodadas) ou até alguém atingir uma pontuação limite (ex: 50 pontos).
- **Pontuação:**
  - Acerto do Jogo: +2 pontos.
  - Acerto do Ano de Lançamento (exato ou margem de ±1 ano): +1 ponto.
  - Acerto do Nome da Faixa: +1 ponto e +1 Recurso.

---

## 3. Dinâmica da Rodada (Turn-Based com Intervenção)

As partidas são **baseadas em turnos** (*turn-based*), onde a cada rodada existe um **Jogador Ativo (Jogador da Vez)**, enquanto os demais jogadores atuam como desafiantes e podem usar poderes para intervir.

### Estrutura de Tempo da Rodada (Total: ~45 a 60 segundos)

```
0s ------------------- 15s ------------------- 30s ------------------- 60s
|  Janela de          |  Foco na               |  Revelação e          |
|  Intervenção        |  Adivinhação           |  Resolução            |
|  (Uso de Recursos)  |  (Áudio continua)      |  (Validação e Placar) |
```

#### Fase 1: Início e Janela de Intervenção (0s a 15s)
- A música começa a tocar para **todos na sala** sincronizadamente.
- A tela destaca quem é o **Jogador da Vez**.
- Durante os primeiros **15 segundos**, a **Janela de Intervenção** fica aberta:
  - O Jogador da Vez ou qualquer adversário com recursos suficientes pode acionar poderes (Trocar Música ou Roubar Música).
  - Se ninguém usar poder até os 15s, a música atual é confirmada para o Jogador da Vez.

#### Fase 2: Adivinhação e Linha do Tempo (15s a 30s)
- O áudio continua tocando até completar os **30 segundos**.
- Quem estiver com o direito da música (o Jogador da Vez ou quem roubou a música):
  1. Digita o **Nome do Jogo**.
  2. Escolhe a posição na sua **Linha do Tempo** (arrastando a carta ou clicando entre as cartas existentes).
  3. *(Opcional)* Digita o **Nome da Música** no campo de bônus.

#### Fase 3: Revelação e Resolução (30s a 60s)
- O áudio é pausado ou finalizado.
- O sistema revela a resposta correta:
  - Título do Jogo.
  - Ano de Lançamento e Desenvolvedora/Plataforma.
  - Nome da Música.
  - Arte da capa do jogo.
- O sistema valida as respostas submetidas:
  - Se acertou o jogo e a linha do tempo: carta entra na linha do tempo.
  - Se acertou o nome da música: ganha **+1 Recurso**.
- O turno passa para o próximo jogador da sala.

---

## 4. Economia de Recursos (Fichas / Tokens)

Os recursos representam a vantagem tática dos jogadores, permitindo reviravoltas na partida.

### Como Ganhar Recursos
- **Acertar o Nome da Música:** Ao acertar o nome exato (ou variante reconhecida) da faixa musical durante a rodada, o jogador recebe **1 Recurso**.
- **Limite:** Cada jogador pode acumular no máximo **5 recursos** simultaneamente (para evitar acúmulo desproporcional).

### Tabela de Poderes e Gastos

| Custo | Poder | Quem pode usar | Quando usar | Efeito |
| :--- | :--- | :--- | :--- | :--- |
| **1 Recurso** | **Trocar Música** (*Reroll*) | Jogador da Vez OU Qualquer Adversário | Primeiros 15 segundos da rodada | Descarta a música atual e sorteia imediatamente uma nova faixa. Pode ser usado defensivamente (se a sua música for impossível) ou ofensivamente (se a música do rival for muito fácil). |
| **2 Recursos** | **Roubar Música** (*Steal*) | Qualquer Adversário | Primeiros 15 segundos da rodada | O adversário rouba a vez daquela música. O jogador da vez perde o direito de adivinhar naquela rodada, e o ladrão assume a tentativa de pontuar e colocar na sua própria linha do tempo. |
| **3 Recursos** | **Acerto Automático** (*Auto-Hit*) | Apenas o Jogador da Vez | Até os 25 segundos da rodada | O sistema concede automaticamente o acerto do jogo e o encaixe perfeito na linha do tempo, garantindo a carta/ponto sem risco de erro. *(Não concede o recurso do nome da música).* |

> [!NOTE]
> **Prioridade de Poderes:** Se múltiplos adversários tentarem gastar recursos ao mesmo tempo durante os primeiros 15 segundos, o servidor processa por ordem de chegada no WebSocket (*First-Come, First-Served*). Se alguém roubar a música, ela não pode mais ser trocada.

---

## 5. Sistema de Validação de Respostas e Algoritmo de Similaridade

Para evitar a frustração de digitar uma resposta certa com uma pequena falha de digitação ou diferença de espaçamento, o Gamester utiliza uma esteira (*pipeline*) de normalização e comparação baseada no algoritmo **Damerau-Levenshtein**.

### 5.1. Pipeline de Normalização (Pré-Processamento)
Antes da comparação, tanto o palpite do jogador quanto o gabarito (título oficial e aliases) passam pelo mesmo processo:
1. **Caixa Baixa e Acentos:** Conversão para minúsculas e remoção de acentos/diacríticos (`Pokémon` $\rightarrow$ `pokemon`).
2. **Remoção de Pontuação e Símbolos:** Eliminação de `:` `-` `'` `!` `?` `.` `_` etc.
3. **Colapso de Espaços em Branco (Ignorar Espaços):** 
   - Todos os espaços entre as palavras são **completamente removidos** na chave de comparação (`"Mega Man"` $\rightarrow$ `"megaman"`, `"Pac-Man"` $\rightarrow$ `"pacman"`).
   - Isso elimina imediatamente o erro clássico de quem digita tudo junto ou com espaços a mais/menos (ex: `"Grand Theft Auto"` e `"grandtheftauto"` tornam-se idênticos).
4. **Tratamento de Artigos Opcionais:** Artigos iniciais (`the`, `a`, `o`, `a`, `os`, `as`) podem ser ignorados tanto no palpite quanto no gabarito.

### 5.2. O Algoritmo Escolhido: Damerau-Levenshtein
Avaliamos os algoritmos clássicos para o cenário de adivinhação rápida:
- **Levenshtein Tradicional:** Mede inserções, deleções e substituições. Ponto fraco: trocar duas letras adjacentes (ex: `zelad` em vez de `zelda`) conta como 2 erros (duas substituições).
- **Damerau-Levenshtein (Vencedor):** Acrescenta a operação de **transposição de caracteres vizinhos** custando apenas 1 operação. É o melhor algoritmo para jogos estilo Gartic/quiz, pois o erro mais frequente sob pressão de tempo é a inversão acidental de teclas adjacentes.
- **Jaro-Winkler:** Excelente para cálculo de prefixo, mas menos previsível para títulos compostos com números.

### 5.3. Limiares Adaptativos de Tolerância (Threshold)
Para não validar respostas incorretas em títulos curtos (ex: transformar `Doom` em `Boom` ou `Moon`), a tolerância é dinâmica com base no comprimento da string colapsada:

| Comprimento da String (sem espaços) | Tolerância Máxima (Damerau-Levenshtein) | Exemplos de Aceitação |
| :--- | :--- | :--- |
| **Até 4 caracteres** (ex: `doom`, `halo`, `nier`) | **0 erros** (Correspondência exata) | `halo` $\rightarrow$ aceita; `halo2` $\rightarrow$ rejeita. |
| **5 a 8 caracteres** (ex: `zelda`, `skyrim`, `portal`) | **1 erro** (1 letra errada, faltante ou invertida) | `zelad` $\rightarrow$ `zelda` (OK); `skirim` $\rightarrow$ `skyrim` (OK). |
| **9 a 14 caracteres** (ex: `minecraft`, `dark souls`, `bloodborne`) | **Até 2 erros** | `darksouls` $\rightarrow$ aceita `darksolus` ou `darksouls2` (se configurado alias). |
| **15 ou mais caracteres** (ex: `the legend of zelda`, `super smash bros`) | **Até 3 erros** (ou similaridade $\ge 85\%$) | Alta tolerância para digitações longas. |

### 5.4. Notificação Privada "Por Pouco!"
Se a distância do palpite for de apenas 1 ponto acima do limite de tolerância (ex: 2 erros em uma palavra de 6 letras), o sistema emite um aviso no chat apenas para o jogador:
> 🟡 **"Por pouco! Você está muito perto da resposta!"**
Isso estimula o jogador a corrigir rapidamente os caracteres antes do encerramento da rodada.

### 5.5. Dicionário de Aliases e Sinônimos
Mesmo com o algoritmo, alguns jogos possuem abreviações universais ou traduções que a distância de edição não resolve sozinha. O catálogo suporta uma lista de `aliases` cadastrados:
- `GTA San Andreas` $\rightarrow$ `GTA SA`, `San Andreas`
- `Chrono Trigger` $\rightarrow$ `CT`
- `Resident Evil` $\rightarrow$ `Biohazard`
- `Super Smash Bros. Melee` $\rightarrow$ `Smash Melee`, `SSBM`

---

## 6. Criação de Salas e Personalização

Ao criar uma sala (*Lobby*), o Host pode configurar:
- **Modo:** Linha do Tempo (10 cartas) ou Arcade (pontos).
- **Tempo de Escuta:** Padrão 30s (ajustável para 20s, 30s ou 45s).
- **Janela de Intervenção:** Padrão 15s.
- **Categorias, Tags e Pacotes de Músicas:** Selecionar pacotes fechados ou filtrar por tags específicas (ex: *boss-battle*, *rpg*, *retro*, *indie*, *nintendo*, ou *Todas as Músicas*).
- **Privacidade da Sala:** Senha de acesso opcional para salas privadas entre amigos.
