# Tarefa 7.0: Frontend SPA: Tabuleiro da Linha do Tempo e Painel Admin

## Visão geral

Construir o componente interativo horizontal de Linha do Tempo com cartas históricas roláveis e suporte a arrastar/clicar nos intervalos cronológicos, a tela de revelação da rodada com dados do jogo e capa, e o painel administrativo `/admin` para gestão, filtragem por tags e importação em lote do catálogo com pré-escuta de 30 segundos.

<skills>
### Conformidade com skills

- `executar-task`: Para construir os componentes de visualização da linha do tempo e painel admin.
- `executar-qa`: Para atestar a usabilidade no desktop/mobile e validação de importação no admin.
- `executar-review`: Para revisar a estilização e padrões de acessibilidade.
</skills>

<rules>
### Conformidade com o AGENTS.md e as rules

- `agents/rules/01-vps-and-architecture-rules.md`: Não expor operações pesadas no frontend; consumo eficiente de dados paginados.
- `agents/rules/03-code-standards.md`: TypeScript estrito e componentes reutilizáveis.
</rules>

<requirements>
- RF12: Interação de posicionamento de cartas na linha do tempo horizontal.
- RF14: Importação em lote de arquivos JSON de músicas na interface administrativa.
- RF15: Formulário administrativo de cadastro, edição e exclusão de faixas com tags.
- RF16: Botão de teste com pré-escuta de 30 segundos no painel administrativo.
</requirements>

## Subtarefas

- [x] 7.1 Construir o componente `TimelineBoard` horizontal e rolável, permitindo ao jogador selecionar visualmente o intervalo entre anos onde acredita que o jogo se encaixa.
- [x] 7.2 Implementar modal/tela de revelação (`RevealModal`) exibindo capa, nome oficial do jogo, desenvolvedora, ano de lançamento, nome da música e atualização dos saldos de fichas.
- [x] 7.3 Implementar tela de vitória final (`GameOverModal`) exibindo o pódio com avatares, pontuações e a linha do tempo completa de todos os participantes.
- [x] 7.4 Desenvolver a visualização `/admin` com autenticação simplificada por chave secreta, tabela paginada com busca por tags/título e botão de exclusão.
- [x] 7.5 Integrar mini-player de pré-escuta no formulário administrativo para teste dos 30 segundos a partir do `startTime` antes de submeter a música.
- [x] 7.6 Implementar campo de upload/colagem de arquivo JSON na tela de admin para importação em lote de novos lotes de músicas com feedback de sucesso/erros.

## Detalhes de implementação

Referência à seção 6 (*Experiência do usuário - Visualização de Linha do Tempo*) do `prd.md` e seção 3.3 (*POST /api/catalog/import*) do `techspec.md`.

## Critérios de aceitação relacionados

- CA-08
- CA-11

## Testes da tarefa

### Testes de unidade (se aplicável)

- [ ] Testes de renderização da linha do tempo com ordenação cronológica e slots vazios para palpites.

### Testes de integração (se aplicável)

- [ ] Validação do fluxo de upload de JSON no painel de administração e atualização em tempo real da tabela de catálogo.

### Testes E2E (se aplicável)

*A validação E2E completa será executada na Tarefa 8.0.*

## Arquivos relevantes

- `client/src/components/TimelineBoard.tsx`
- `client/src/components/TimelineCard.tsx`
- `client/src/components/RevealModal.tsx`
- `client/src/components/GameOverModal.tsx`
- `client/src/views/AdminView.tsx`
- `client/src/components/AdminSongForm.tsx`
