# Tarefa 2.0: Catálogo de Músicas e Importação em Lote

## Visão geral

Implementar o repositório de persistência do catálogo de músicas no SQLite, os endpoints da API REST para consulta e cadastro individual, e o mecanismo de importação em lote para arquivos JSON gerados por IA com suporte a tags e aliases.

<skills>
### Conformidade com skills

- `executar-task`: Para implementar o repositório, controllers e rotas da API.
- `executar-qa`: Para validar a importação transacional e os testes de integração.
- `executar-review`: Para revisar a integridade dos dados e tratamento de erros.
</skills>

<rules>
### Conformidade com o AGENTS.md e as rules

- `agents/rules/01-vps-and-architecture-rules.md`: Consultas atômicas e eficientes no SQLite sem travar o event loop da aplicação.
- `agents/rules/03-code-standards.md`: TypeScript estrito, separação em controllers e repositórios e tratamento de envelopes de erro padronizados.
</rules>

<requirements>
- RF14: Endpoint/função de importação em lote para arquivos JSON contendo metadados das faixas (`gameTitle`, `releaseYear`, `songTitle`, `youtubeUrl`, `startTime`, `platform`, `tags`, `aliases`).
- RF15: Interface de backend administrativa com autenticação simplificada (`ADMIN_KEY`) para inserção, edição e exclusão de faixas.
- RF16: Pré-requisitos para suporte à pré-escuta de 30 segundos no cliente.
</requirements>

## Subtarefas

- [x] 2.1 Implementar `CatalogRepository` com operações de sorteio aleatório (`getRandomSong`), inserção transacional em lote e listagem paginada.
- [x] 2.2 Implementar endpoint `POST /api/catalog/import` com validação de formato JSON e autenticação via `adminKey`.
- [x] 2.3 Implementar endpoints administrativos `GET /api/catalog/songs` (com filtros por categoria/tags) e `POST /api/catalog/songs`.
- [x] 2.4 Criar script de seed para carregar automaticamente o arquivo `docs/songs-seed-template.json` em ambiente de desenvolvimento.
- [x] 2.5 Criar testes de integração verificando importação em lote e atomicidade em caso de erro.

## Detalhes de implementação

Referência à seção 3.3 (*Endpoints da API - POST /api/catalog/import*) e seção 3.2 (*Modelos de dados - SongEntity*) do `techspec.md`.

## Critérios de aceitação relacionados

- CA-11

## Testes da tarefa

### Testes de unidade (se aplicável)

*Não aplicável diretamente nesta camada de integração de banco de dados.*

### Testes de integração (se aplicável)

- [x] TI-04 — Importação em lote de catálogo JSON no SQLite com rollback automático em caso de payload inválido

### Testes E2E (se aplicável)

*Não aplicável para esta tarefa de backend.*

## Arquivos relevantes

- `server/src/db/repositories/catalogRepository.ts`
- `server/src/controllers/catalogController.ts`
- `server/src/routes/catalogRoutes.ts`
- `server/src/scripts/seedCatalog.ts`
- `server/tests/integration/catalogImport.test.ts`
