# Tarefa 1.0: Fundação, SQLite e Módulo StringMatcher

## Visão geral

Estruturar a fundação do projeto em TypeScript, configurar o banco de dados embutido SQLite (`gamester.db`) com o schema de dados e implementar o utilitário puro `StringMatcher` com algoritmo Damerau-Levenshtein, colapso de espaços em branco e tolerâncias adaptativas.

<skills>
### Conformidade com skills

- `executar-task`: Para implementar o código e schemas desta tarefa.
- `executar-qa`: Para rodar e atestar os testes unitários do `StringMatcher`.
- `executar-review`: Para revisar a estrutura de arquivos e qualidade do código.
</skills>

<rules>
### Conformidade com o AGENTS.md e as rules

- `agents/rules/01-vps-and-architecture-rules.md`: Uso exclusivo de SQLite (`better-sqlite3`) sem daemons externos para garantir pegada leve de memória na VPS.
- `agents/rules/02-game-mechanics-rules.md`: Implementação estrita do pipeline de normalização com remoção de espaços em branco, Damerau-Levenshtein e thresholds dinâmicos.
- `agents/rules/03-code-standards.md`: TypeScript estrito (`strict: true`) e organização modular em `server/`.
</rules>

<requirements>
- RF9: Validação de respostas ignorando espaços em branco, acentuação e pontuação no palpite e no gabarito/aliases.
- RF10: Adoção do algoritmo Damerau-Levenshtein com tolerância adaptativa de acordo com o comprimento da resposta.
- RF11: Emissão de notificação privada "Por Pouco!" quando o palpite estiver a 1 caractere de distância do limite de aceitação.
</requirements>

## Subtarefas

- [x] 1.1 Configurar workspace monorepo simples em TypeScript estrito com pastas `server/` e `client/`.
- [x] 1.2 Implementar conexão SQLite com `better-sqlite3`, ativando WAL mode e criando migrations para as tabelas `songs` e `aliases`.
- [x] 1.3 Implementar algoritmo de normalização de texto (caixa baixa, remoção de acentos via NFD, pontuações e colapso total de espaços).
- [x] 1.4 Implementar cálculo de Damerau-Levenshtein com limiares adaptativos por comprimento e detecção de status `CLOSE` ("Por Pouco").
- [x] 1.5 Criar suite de testes unitários cobrindo todos os cenários do `StringMatcher`.

## Detalhes de implementação

Referência à seção 7 (*Módulo de Comparação de Strings*) e seção 3.2 (*Modelos de dados - SongEntity*) do `techspec.md`.

## Critérios de aceitação relacionados

- CA-06
- CA-07

## Testes da tarefa

### Testes de unidade (se aplicável)

- [x] TU-01 — Normalização de espaços e pontuações
- [x] TU-02 — Comparação tolerante com Damerau-Levenshtein
- [x] TU-03 — Rejeição por tamanho curto (<= 4 letras)
- [x] TU-04 — Detecção de feedback "Por Pouco!"

### Testes de integração (se aplicável)

*Não aplicável para esta tarefa de fundação.*

### Testes E2E (se aplicável)

*Não aplicável para esta tarefa de fundação.*

## Arquivos relevantes

- `server/package.json`
- `server/tsconfig.json`
- `server/src/db/sqlite.ts`
- `server/src/db/migrations/001_initial_schema.sql`
- `server/src/utils/stringMatcher.ts`
- `server/tests/unit/stringMatcher.test.ts`
