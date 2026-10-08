# Regra 01: Arquitetura e Restrições de VPS Compartilhada

Esta regra é mandatória para qualquer código, dependência ou decisão de infraestrutura no projeto **Gamester**.

## 1. Convivência na VPS
- O servidor de produção é uma VPS compartilhada que já executa instâncias ativas de **Foundry VTT** e **TeamSpeak**.
- **Teto de Memória:** O processo do Gamester não deve ultrapassar **150 MB de memória RAM** em execução contínua.
- **Teto de CPU:** Manter uso de CPU em repouso abaixo de 2%, sem loops de polling desnecessários no servidor.

## 2. Banco de Dados e Persistência
- **Uso estrito de SQLite:** É expressamente proibido sugerir ou adicionar dependências de bancos de dados clientes/servidor (como PostgreSQL, MySQL, Redis, MongoDB).
- Toda a persistência de catálogo de músicas, salas ativas ou estatísticas deve residir em um arquivo local SQLite (`gamester.db`) gerenciado via drivers C/nativos leves (ex: `better-sqlite3`).
- As salas ativas e o estado em tempo real das partidas devem ser mantidos prioritariamente em memória (JavaScript Map/Set) durante a sessão e descartados ou salvos em lote ao fim do jogo.

## 3. Rede e Proxy Reverso
- O Gamester escutará localmente na porta configurada (padrão `127.0.0.1:3030`).
- O tráfego externo passa obrigatoriamente pela Cloudflare e é entregue ao **Nginx** local.
- Todas as conexões WebSocket devem ser tratadas de forma resiliente contra quedas e reconexões momentâneas, suportando os cabeçalhos de proxy do Nginx (`X-Forwarded-For`, `Upgrade`, `Connection`).

## 4. Áudio e Dependências
- Priorizar a reprodução de áudio no cliente via YouTube IFrame API de forma oculta (headless) para não consumir largura de banda e armazenamento da VPS.
- Não subir ferramentas pesadas de transcodificação em tempo real (como ffmpeg executando a cada request) dentro da VPS sem cache prévio estático.
