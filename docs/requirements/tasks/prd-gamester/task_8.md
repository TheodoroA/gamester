# Tarefa 8.0: Testes E2E, Dockerização e Otimização para VPS

## Visão geral

Implementar e executar a suite de testes ponta a ponta (E2E) simulando partidas multiplayer completas e cenários de oscilação de rede, construir o `Dockerfile` otimizado para produção com consumo inferior a 100MB de RAM na VPS compartilhada e documentar o roteiro de configuração com Nginx e Cloudflare.

<skills>
### Conformidade com skills

- `executar-task`: Para configurar containers, scripts de deploy e testes E2E.
- `executar-qa`: Para atestar a execução dos casos `E2E-01` e `E2E-02` e o teto de memória da VPS.
- `executar-review`: Para validar a segurança dos containers e boas práticas de produção.
</skills>

<rules>
### Conformidade com o AGENTS.md e as rules

- `agents/rules/01-vps-and-architecture-rules.md`: Teto estrito de 150MB de memória RAM contínua no processo Node.js e ausência de daemons externos para convivência pacífica com TeamSpeak e Foundry VTT.
- `agents/rules/03-code-standards.md`: Suporte a cabeçalhos de proxy do Nginx (`X-Forwarded-For`, `Upgrade`, `Connection`).
</rules>

<requirements>
- Metas de Desempenho e Escala: Consumo contínuo de RAM < 150MB e latência de eventos < 100ms.
- CA-08: Ciclo completo de partida até a tela de vitória no Modo Linha do Tempo.
- CA-10: Reconexão de jogador sem perda de estado em até 60 segundos.
</requirements>

## Subtarefas

- [x] 8.1 Implementar teste E2E automatizado simulando 2 jogadores competindo ao longo de 10 rodadas até a condição de vitória e exibição do pódio (`E2E-01`).
- [x] 8.2 Implementar teste E2E automatizado simulando queda forçada de socket de um participante e restauração íntegra de seu estado em até 60 segundos (`E2E-02`).
- [x] 8.3 Criar `Dockerfile` multi-stage (Node.js Alpine) que compila a SPA e a empacota no backend Fastify como processo único de produção.
- [x] 8.4 Configurar flags de otimização de runtime do Node.js (`--max-old-space-size=128`, modo WAL no SQLite) para garantir consumo $< 100$ MB de RAM em repouso.
- [x] 8.5 Criar arquivo `docker-compose.yml` e documentação de integração com o Nginx da VPS (`docs/deploy-vps.md`).

## Detalhes de implementação

Referência à seção 6 (*Configuração do Proxy Reverso Nginx*) e seção 2 (*Dimensionamento e Restrições da VPS*) do `system-design.md`.

## Critérios de aceitação relacionados

- CA-08
- CA-10

## Testes da tarefa

### Testes de unidade (se aplicável)

*Não aplicável diretamente nesta camada de infraestrutura e E2E.*

### Testes de integração (se aplicável)

*Não aplicável diretamente nesta camada.*

### Testes E2E (se aplicável)

- [x] E2E-01 — Partida de 2 jogadores até a vitória (simulação de 10 rodadas com acertos sucessivos e verificação da tela de vitória)
- [x] E2E-02 — Reconexão de jogador durante a partida (queda intencional de conexão socket e restauração imediata do estado)

## Arquivos relevantes

- `tests/e2e/gameplay.test.ts`
- `tests/e2e/reconnection.test.ts`
- `Dockerfile`
- `docker-compose.yml`
- `docs/deploy-vps.md`
