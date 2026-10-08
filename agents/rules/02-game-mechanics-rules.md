# Regra 02: Mecânicas de Jogo e Integridade de Partida

Esta regra estabelece as leis de negócio e integridade da partida para o desenvolvimento do **Gamester**.

## 1. Autoridade Única do Servidor
- **Nenhum cliente determina tempo ou validação:** O relógio da rodada, a validação de respostas, a dedução de recursos e a atribuição de pontos são de competência exclusiva do servidor.
- Os clientes recebem apenas os timestamps absolutos do servidor (`roundStartedAt`, `interventionEndsAt`, `roundEndsAt`) e calculam a barra de progresso visual localmente.
- O payload de início de rodada enviado aos jogadores normais **nunca** deve conter a resposta correta da música ou do jogo.

## 2. Janela de Intervenção e Temporização
- O tempo padrão da rodada de adivinhação é de **30 segundos**.
- Os primeiros **15 segundos** da reprodução constituem a **Janela de Intervenção**:
  - Somente dentro dessa janela os poderes de **Trocar Música (1 recurso)** e **Roubar Música (2 recursos)** são aceitos.
  - Solicitações de intervenção recebidas com timestamp do servidor superior a 15.0s do início da rodada devem ser sumariamente rejeitadas com erro sem dedução de saldo.
  - Em caso de concorrência simultânea entre dois jogadores, o servidor atende a primeira mensagem processada (*first-come, first-served*) e rejeita a subsequente caso a condição de roubo já tenha sido consumada.

## 3. Tabela de Custos e Regras de Recursos
- **+1 Recurso:** Concedido unicamente ao jogador que acertar o Nome da Música bônus.
- **Teto Máximo:** 5 recursos acumulados por jogador. Recursos adicionais são descartados.
- **Poder 1 (Trocar Música - Custo 1):** Pode ser usado pelo Jogador da Vez ou qualquer rival nos primeiros 15s. Sorteia nova música imediatamente e reseta o cronômetro para 0s.
- **Poder 2 (Roubar Música - Custo 2):** Pode ser usado por qualquer rival nos primeiros 15s. Transfere a titularidade da adivinhação e da linha do tempo para o ladrão.
- **Poder 3 (Acerto Automático - Custo 3):** Exclusivo do Jogador que detém o direito da música. Pode ser acionado até os 25s da rodada. Concede acerto imediato do jogo e posição na linha do tempo.

## 4. Algoritmo de Validação de Respostas
- Todas as comparações de texto devem passar por normalização obrigatória no palpite e no gabarito:
  1. Caixa baixa (`toLowerCase()`);
  2. Remoção de diacríticos e acentos (normalização Unicode `NFD` + remoção de marks);
  3. Remoção total de pontuações e símbolos (`:`, `-`, `'`, `.`, `!`, `?`, `_`);
  4. **Remoção total de espaços em branco (Whitespace Stripping):** strings colapsadas sem nenhum espaço (ex: `"Mega Man"` $\rightarrow$ `"megaman"`, `"grand theft auto"` $\rightarrow$ `"grandtheftauto"`);
  5. Remoção opcional de artigos iniciais configurados (`the`, `a`, `o`, `a`).
- **Algoritmo de Similaridade:** Utilizar **Damerau-Levenshtein** (que penaliza transposição de caracteres adjacentes como apenas 1 operação):
  - Comprimento $\le 4$ caracteres: tolerância 0 (exatidão estrita).
  - Comprimento 5 a 8 caracteres: tolerância de 1 erro.
  - Comprimento 9 a 14 caracteres: tolerância de até 2 erros.
  - Comprimento $\ge 15$ caracteres: tolerância de até 3 erros (ou similaridade $\ge 85\%$).
  - Consultar lista de `aliases` cadastrados no banco antes de rejeitar.
- **Feedback "Por Pouco":** Se a distância for o limite + 1, emitir evento/notificação privada ao jogador informando que o palpite está muito próximo.
