# Documento de Requisitos do Produto (PRD)

## Visão geral

O **Gamester** é uma plataforma web multiplayer de entretenimento em tempo real projetada para partidas casuais entre amigos, inspirada na mecânica de linha do tempo do jogo de tabuleiro *Hitster* e na dinâmica ágil de adivinhação de jogos online como o *Gartic*. No Gamester, os jogadores ouvem trechos curtos de 30 segundos de trilhas sonoras (OSTs) de videogames para adivinhar o jogo de origem, ordenar seu lançamento em uma linha do tempo cronológica e conquistar recursos para sabotar adversários ou facilitar seus próprios palpites.

O produto resolve o problema de falta de jogos temáticos modernos de videogame com suporte a salas privadas, sem atrito de cadastro e otimizado para rodar em infraestrutura enxuta. Oferece uma experiência lúdica, competitiva e nostálgica diretamente pelo navegador em computadores e dispositivos móveis, operando sob uma VPS compartilhada protegida por Cloudflare.

## Objetivos

### Critérios de sucesso
- Grupos de amigos conseguem criar uma sala, compartilhar o link e iniciar uma partida em menos de 1 minuto, sem necessidade de download ou cadastro de contas.
- As rodadas oferecem dinâmica competitiva equilibrada através do uso tático de recursos e dos modos de jogo (Linha do Tempo e Arcade).
- A validação de respostas não gera falsos-negativos para palpites conceitualmente corretos que possuam pequenas variações de espaçamento ou digitação.

### Principais métricas
- **Tempo para Primeiro Palpite (Time-to-Play):** Inferior a 60 segundos desde o acesso à página inicial.
- **Sincronia de Reprodução e Eventos:** Diferença máxima de reprodução de áudio e timers entre clientes inferior a 500 ms.
- **Pegada de Recursos na VPS:** Consumo contínuo de memória do processo backend inferior a 150 MB de RAM.
- **Taxa de Conexões Concorrentes:** Suporte simultâneo a salas com 2 a 12 participantes ativos por sala com latência de resposta a eventos de poder abaixo de 100 ms.

### Metas de negócio e projeto
- Viabilizar um ambiente privado, seguro e auto-hospedável de diversão entre amigos sem custos de licenciamento de infraestrutura adicional.
- Estabelecer um catálogo expansível de trilhas sonoras que possa ser alimentado tanto por lotes gerados via inteligência artificial quanto por inserção manual assistida.

## Histórias de usuário

### Perfis de usuários
- **Jogador da Vez (Ativo):** Participante que tem a responsabilidade de ouvir a música, tentar adivinhar o jogo, encaixar na linha do tempo e colher pontos ou recursos.
- **Jogador Desafiante (Adversário):** Participante que escuta a música simultaneamente e pode decidir intervir na rodada gastando recursos táticos.
- **Anfitrião da Sala (Host):** Jogador que cria a sala, seleciona as configurações da partida (modo, tempos, pacotes) e tem poder para iniciar o jogo.
- **Curador / Administrador:** Usuário responsável por gerenciar e alimentar o catálogo de faixas através de importação ou formulário.

### Histórias de uso
- **US1 (Entrada sem Atrito):** Como jogador, quero entrar em uma sala informando apenas meu nickname e o código de convite para poder começar a jogar imediatamente sem preencher formulários de cadastro.
- **US2 (Adivinhação e Linha do Tempo):** Como jogador da vez, quero escutar o trecho musical e submeter o título do jogo e a posição no meu histórico cronológico para conquistar a carta e avançar rumo à vitória.
- **US3 (Conquista de Recursos):** Como jogador da vez, quero ter a oportunidade de palpitar o nome exato da música para receber fichas de recursos extras.
- **US4 (Intervenção Tática):** Como jogador adversário, quero ter uma janela de tempo nos primeiros 15 segundos da música para gastar recursos (trocar ou roubar a música) para impedir a liderança de um oponente.
- **US5 (Defesa de Rodada):** Como jogador da vez, quero poder usar 1 recurso nos primeiros 15 segundos para trocar uma música desconhecida por uma nova faixa, ou gastar 3 recursos para garantir acerto automático.
- **US6 (Modo Arcade Alternativo):** Como anfitrião, quero selecionar o modo Arcade por pontos corridos para que o grupo possa disputar partidas mais curtas e dinâmicas.
- **US7 (Caso de Borda - Reconexão de Partida):** Como jogador cuja conexão com a internet oscilou brevemente, quero poder recarregar a página e retornar à mesma sala sem perder minhas cartas conquistadas e saldo de recursos.
- **US8 (Alimentação do Catálogo):** Como administrador, quero importar listas de músicas via arquivo estruturado e cadastrar músicas individualmente com pré-escuta para manter o jogo sempre com novidades.

## Principais funcionalidades

### F1: Criação de Salas e Lobby em Tempo Real
- **O que faz e por que é importante:** Permite a criação de salas privadas protegidas por código e senha opcional, centralizando os participantes em uma sala de espera visual antes da partida. É o ponto de encontro essencial para party games.
- **Como funciona em alto nível:** O anfitrião clica em "Criar Sala", define apelido e configurações; o sistema gera um código de sala compartilhável e estabelece conexão WebSocket contínua. Outros jogadores ingressam via link ou código.
- **Requisitos funcionais:**
  - **RF1:** O sistema deve gerar códigos de sala alfanuméricos exclusivos e permitir entrada mediante digitação de nickname.
  - **RF2:** O sistema deve sincronizar a lista de membros conectados em tempo real no lobby.
  - **RF3:** O sistema deve permitir ao anfitrião configurar o modo de jogo (Linha do Tempo ou Arcade), tempo total de escuta (padrão 30s) e janela de intervenção (padrão 15s).

### F2: Motor de Turnos e Janela de Intervenção
- **O que faz e por que é importante:** Coordena o ciclo de vida das rodadas, garantindo que a música toque sincronizadamente e que os poderes de sabotagem ocorram dentro de uma janela estrita de tempo.
- **Como funciona em alto nível:** O servidor seleciona uma música do catálogo e notifica os clientes com o identificador de áudio e os timestamps de início e fim. Durante os primeiros 15 segundos, o servidor aceita comandos de poderes; após esse prazo, bloqueia interferências e aguarda os palpites.
- **Requisitos funcionais:**
  - **RF4:** O sistema deve acionar a reprodução de áudio simultânea de 30 segundos em todos os clientes conectados na sala.
  - **RF5:** O sistema deve habilitar a Janela de Intervenção exclusivamente durante os primeiros 15 segundos da rodada.
  - **RF6:** O sistema deve processar o poder de "Trocar Música" (custo de 1 recurso) mediante solicitação do jogador ativo ou adversário durante a janela de intervenção, sorteando nova faixa e reiniciando o timer.
  - **RF7:** O sistema deve processar o poder de "Roubar Música" (custo de 2 recursos) acionado por um adversário durante a janela de intervenção, transferindo o direito do palpite para o desafiante.
  - **RF8:** O sistema deve processar o poder de "Acerto Automático" (custo de 3 recursos) acionado pelo jogador titular antes do encerramento do tempo, garantindo o acerto sem risco de erro.

### F3: Validação Inteligente e Construção de Linha do Tempo
- **O que faz e por que é importante:** Avalia os palpites dos jogadores de forma tolerante a erros de digitação e gerencia o tabuleiro de cartas cronológicas do jogador.
- **Como funciona em alto nível:** O servidor normaliza o texto (caixa baixa, remoção de diacríticos, símbolos e todos os espaços em branco) e compara via algoritmo Damerau-Levenshtein com limiares adaptativos. Verifica também se a posição selecionada na linha do tempo obedece à ordem cronológica dos anos.
- **Requisitos funcionais:**
  - **RF9:** O sistema deve validar respostas ignorando espaços em branco, acentuação e pontuação no palpite e no gabarito/aliases.
  - **RF10:** O sistema deve adotar o algoritmo Damerau-Levenshtein com tolerância adaptativa de acordo com o comprimento da resposta (0 erros para $\le 4$ letras; 1 erro para 5 a 8 letras; 2 erros para 9 a 14 letras; 3 erros para $\ge 15$ letras).
  - **RF11:** O sistema deve emitir notificação privada de "Por Pouco!" quando o palpite estiver a 1 caractere de distância do limite de aceitação.
  - **RF12:** O sistema deve validar o posicionamento cronológico da carta na linha do tempo pessoal do jogador, fixando-a em caso de acerto conjunto do jogo e do período.
  - **RF13:** O sistema deve conceder 1 recurso caso o jogador acerte o nome da música (limitado ao saldo máximo de 5 recursos).

### F4: Gestão e Alimentação do Catálogo
- **O que faz e por que é importante:** Permite manter um acervo rico e variado de trilhas sonoras sem exigir armazenamento massivo na infraestrutura da VPS.
- **Como funciona em alto nível:** Suporta importação em massa via arquivos JSON (preparados via IA ou curadoria) e uma interface administrativa web protegida por chave de acesso com player de teste de 30 segundos.
- **Requisitos funcionais:**
  - **RF14:** O sistema deve fornecer endpoint/função de importação em lote para arquivos JSON contendo metadados das faixas (`gameTitle`, `releaseYear`, `songTitle`, `youtubeUrl`, `startTime`, `platform`, `tags`, `aliases`).
  - **RF15:** O sistema deve disponibilizar interface administrativa com autenticação simplificada para inserção, edição e exclusão manual de músicas.
  - **RF16:** O painel administrativo deve incluir recurso de pré-escuta para validar o início e a qualidade do trecho de áudio antes de salvar.

---

## Critérios de aceitação

- **CA-01 (US1 / RF1, RF2):** Dado que um usuário acessa a aplicação, quando informa um apelido e o código de uma sala aberta, então seu avatar aparece na lista de membros do lobby para todos os participantes em tempo real.
- **CA-02 (US2 / RF4):** Dado que a rodada inicia, quando o temporizador do servidor é disparado, então todos os clientes reproduzem o áudio sincronizadamente e exibem a contagem regressiva de 30 segundos.
- **CA-03 (US4 / RF7):** Dado que a rodada está com tempo inferior a 15 segundos e um adversário tem pelo menos 2 recursos, quando o adversário aciona "Roubar Música", então 2 recursos são debitados de seu saldo, um aviso é emitido para a sala e ele se torna o único apto a responder na rodada.
- **US-04 (US4, US5 / RF6):** Dado que a rodada está dentro dos primeiros 15 segundos e um jogador com saldo $\ge 1$ clica em "Trocar Música", então 1 recurso é debitado, o áudio atual é interrompido imediatamente e uma nova faixa começa a tocar para toda a sala com timer zerado.
- **CA-05 (US5 / RF8):** Dado que o jogador titular da música possui 3 recursos, quando aciona "Acerto Automático", então 3 recursos são debitados e a carta é posicionada automaticamente com sucesso na linha do tempo.
- **CA-06 (US2 / RF9, RF10):** Dado que a resposta oficial é `"Grand Theft Auto"`, quando o jogador digita `"grandtheftauto"` ou `"Grand Thef Auto"`, então o sistema valida o palpite como correto.
- **CA-07 (US2 / RF11):** Dado que a resposta oficial é `"Chrono Trigger"` e o palpite difere por 3 caracteres (além do threshold de 2), quando submetido, então o sistema rejeita a resposta e exibe exclusivamente para o autor o aviso "Por pouco! Você está muito perto!".
- **CA-08 (US2 / RF12):** Dado que o jogador está no Modo Linha do Tempo e acerta sua 10ª carta em ordem cronológica válida, então a partida é finalizada e a tela de vitória é exibida com o pódio da sala.
- **CA-09 (US3 / RF13):** Dado que o jogador titular acerta o nome da música bônus e possui 4 recursos, quando a rodada é resolvida, então seu saldo é atualizado para 5 recursos; caso já possua 5, o saldo se mantém estável sem ultrapassar o teto.
- **CA-10 (US7 / RF1, RF2):** Dado que um jogador perde conexão por até 60 segundos, quando recarrega a página da sala, então seu estado de cartas, recursos e pontuação é restaurado sem reiniciar a rodada da sala.
- **CA-11 (US8 / RF14, RF16):** Dado um arquivo JSON estruturado com novas faixas, quando o administrador executa a importação no painel administrativo, então as faixas são adicionadas ao catálogo ativo e tornam-se disponíveis para sorteio imediato nas salas.

---

## Experiência do usuário

### Perfis de usuários e necessidades
- **Jogadores Casuais:** Precisam de interfaces diretas, sem formulários longos, com feedback sonoro/visual evidente e regras autoexplicativas durante o turno.
- **Jogadores Competitivos:** Exigem precisão e clareza no tempo restante, avisos nítidos de quando um recurso é gasto e segurança de que seus palpites não foram prejudicados por bugs de sincronização.
- **Usuários Mobile:** Precisam de áreas de toque generosas para os botões de poderes e facilidade para rolar e soltar cartas na linha do tempo horizontal.

### Fluxos principais e interações
1. **Fluxo de Acesso:** Home $\rightarrow$ Digitar Nickname $\rightarrow$ Criar Sala ou Digitar Código $\rightarrow$ Lobby.
2. **Fluxo da Rodada:** Anúncio do Jogador da Vez $\rightarrow$ Janela de Intervenção (0–15s com botões de poder brilhando) $\rightarrow$ Janela de Resposta (15–30s com campo de busca de jogo e encaixe na linha do tempo) $\rightarrow$ Tela de Revelação (30–40s mostrando capa, nome, ano e atualizações de recursos/placar).
3. **Fluxo de Vitória:** Exibição do pódio final $\rightarrow$ Galeria das linhas do tempo completas de todos os jogadores $\rightarrow$ Botão de "Jogar Novamente".

### Requisitos de UI/UX e acessibilidade
- **Ocultação de Spoilers:** O player de streaming deve operar sem renderização visual visível para os jogadores durante a adivinhação, prevenindo leitura de títulos, canais ou capas antes da fase de revelação.
- **Feedback Visual de Proximidade:** Destaque em cores para avisos de "Por Pouco!" e transições suaves nos cronômetros.
- **Acessibilidade e Usabilidade:** Alto contraste nos elementos de texto, feedback sonoro opcional para início e fim de timers e compatibilidade completa com telas de smartphones e tablets.

---

## Restrições técnicas de alto nível

- **Integrações Externas Obrigatórias:**
  - Compatibilidade com o proxy reverso corporativo **Nginx** existente no host.
  - Tráfego intermediado pela rede de borda da **Cloudflare** (suporte integral a WebSockets e terminação SSL).
  - Execução de áudio via API pública incorporada de streaming (YouTube IFrame API) e suporte a arquivos locais de áudio estático.
- **Conformidade, Segurança e Uso Justo:**
  - Acesso restrito a salas privadas entre amigos mediante código/senha temporária, sem indexação pública ou distribuição direta de arquivos de mídia protegidos por direitos autorais.
  - Proteção do painel administrativo por token/segredo de ambiente.
- **Metas de Desempenho e Escala:**
  - Consumo de memória RAM do backend contido abaixo de **150 MB** em carga normal.
  - Uso de CPU em repouso inferior a **2%** para não interferir nas instâncias vizinhas de TeamSpeak e Foundry VTT.
  - Latência de despacho de mensagens WebSocket inferior a **100 ms**.
- **Privacidade e Dados:**
  - Sessões efêmeras sem armazenamento de dados pessoais identificáveis (PII) ou e-mails de jogadores.
- **Protocolos e Tecnologias Não Negociáveis:**
  - Persistência embutida em arquivo único local (sem dependência de daemons externos de banco de dados cliente/servidor).
  - Comunicação bidirecional orientada a eventos em tempo real via WebSockets.

---

## Fora do escopo

### Funcionalidades explicitamente excluídas
- Sistema de autenticação de jogadores com login por e-mail, senha ou redes sociais.
- Processamento de pagamentos, assinaturas, moedas pagas ou qualquer forma de monetização.
- Comunicação por voz/áudio integrada (os usuários utilizam TeamSpeak ou Discord em paralelo).
- Armazenamento ou transcodificação de vídeos completos em alta resolução na VPS.

### Melhorias futuras fora do escopo inicial
- Sistema de matchmaking público automatizado com fila ranqueada global.
- Sistema de conquistas persistentes e perfis históricos de jogadores.
- Modo cooperativo de times (ex: duplas contra duplas).

### Limites e restrições
- Capacidade dimensionada para salas privadas com até 12 participantes simultâneos por sala.
- Dependência de conexão estável de internet dos participantes para reprodução síncrona do streaming de áudio.
