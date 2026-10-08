# Guia de Implantação e Otimização para VPS — Gamester

Este documento detalha o procedimento completo de implantação do **Gamester** em um servidor virtual privado (VPS) compartilhado com outros serviços críticos (**TeamSpeak** e **Foundry VTT**).

---

## 1. Arquitetura e Filosofia de Recursos

Para garantir que o Gamester funcione sem impactar ou sofrer concorrência predatória por recursos da máquina, a solução foi desenhada com as seguintes diretrizes:

- **Processo Único em Node.js:** O backend Fastify serve a API REST, o servidor nativo de WebSockets (`ws`) e os assets estáticos compilados da SPA React/Vite.
- **Banco de Dados Embutido (SQLite em Modo WAL):** Zero daemons externos de banco de dados (sem PostgreSQL, MySQL ou Redis). Todos os dados residem em arquivo único `/app/data/gamester.db` com `journal_mode = WAL` e `synchronous = NORMAL`.
- **Teto Estrito de Memória RAM:**
  - Runtime V8 configurado com `--max-old-space-size=128`.
  - Container Docker limitado a `150m` (`mem_limit: 150m`).
  - Consumo em repouso: $\sim 60\text{MB}$ a $85\text{MB}$ de RSS.
- **Porta em Loopback Local:** O container escuta apenas em `127.0.0.1:3030`, sendo exposto publicamente exclusivamente pelo Nginx da VPS.

---

## 2. Pré-requisitos na VPS

1. **Docker e Docker Compose** instalados (`docker compose version >= 2.20`).
2. **Nginx** instalado no host da VPS gerenciando as portas `80` e `443`.
3. **Domínio ou Subdomínio configurado no Cloudflare** (ex: `gamester.seudominio.com`).

---

## 3. Passo a Passo de Instalação

### Passo 3.1: Clonar o Repositório

```bash
cd /opt
sudo git clone https://github.com/seu-usuario/gamester.git
cd /opt/gamester
```

### Passo 3.2: Configurar Variáveis de Ambiente

Crie o arquivo `.env` na raiz do projeto:

```bash
cat << 'EOF' > .env
NODE_ENV=production
PORT=3030
HOST=0.0.0.0
ADMIN_KEY=defina_uma_senha_forte_para_o_admin_aqui
DATABASE_PATH=/app/data/gamester.db
NODE_OPTIONS=--max-old-space-size=128
EOF
```

### Passo 3.3: Construir e Iniciar os Containers

```bash
docker compose up -d --build
```

Verifique o status do container:

```bash
docker compose ps
docker compose logs -f --tail=50 gamester
```

Teste o endpoint de integridade localmente:

```bash
curl http://127.0.0.1:3030/health
```

Resposta esperada:
```json
{
  "status": "healthy",
  "uptime": 12.5,
  "memory": {
    "rssMb": 68.3,
    "heapUsedMb": 32.1
  },
  "activeRooms": 0
}
```

---

## 4. Configuração do Proxy Reverso Nginx

Crie a configuração do virtual host no Nginx (ex: `/etc/nginx/sites-available/gamester.conf`):

```nginx
# Upstream local apontando para o container Gamester
upstream gamester_backend {
    server 127.0.0.1:3030;
    keepalive 32;
}

# Redirecionamento HTTP -> HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name gamester.seudominio.com;

    return 301 https://$host$request_uri;
}

# Servidor HTTPS com Terminação SSL e Suporte a WebSockets
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name gamester.seudominio.com;

    # Certificados SSL (Certbot Let's Encrypt ou Cloudflare Origin Certificate)
    ssl_certificate /etc/letsencrypt/live/gamester.seudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gamester.seudominio.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Configuração de Logs
    access_log /var/log/nginx/gamester_access.log;
    error_log /var/log/nginx/gamester_error.log warn;

    # Limite de tamanho de upload para importação de JSON no Admin (máx 10MB)
    client_max_body_size 10M;

    # 1. Roteamento de WebSockets (/ws)
    location /ws {
        proxy_pass http://gamester_backend;
        proxy_http_version 1.1;

        # Cabeçalhos essenciais para upgrade de conexão WebSocket
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Repasse de IP e protocolo original do cliente
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts longos para evitar desconexões espúrias de jogadores ociosos
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
        proxy_connect_timeout 60s;
    }

    # 2. Roteamento da API REST (/api/) e Health Check (/health)
    location ~ ^/(api|health) {
        proxy_pass http://gamester_backend;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_read_timeout 30s;
        proxy_connect_timeout 10s;
    }

    # 3. Cache e Otimização para Assets Estáticos da SPA (/assets/)
    location /assets/ {
        proxy_pass http://gamester_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;

        # Cache prolongado para arquivos com hash no nome (Vite)
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
    }

    # 4. Roteamento Principal (SPA HTML Fallback)
    location / {
        proxy_pass http://gamester_backend;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Não fazer cache do HTML de entrada para garantir atualizações imediatas
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }
}
```

Ative o site e reinicie o Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/gamester.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 5. Configuração no Painel Cloudflare

Caso utilize o Cloudflare como CDN e proteção DDoS:

1. **DNS:**
   - Adicione um registro `A` ou `CNAME` para `gamester` apontando para o IP público da VPS.
   - Mantenha o status do proxy ativado (Ícone da **Nuvem Laranja**).
2. **WebSockets:**
   - Acesse **Network (Rede)** no painel do domínio no Cloudflare.
   - Certifique-se de que a opção **WebSockets** está habilitada (**ON**).
3. **SSL/TLS:**
   - No menu **SSL/TLS**, defina o modo de encriptação como **Full** ou **Full (strict)**.
4. **Regras de Cache (Opcional):**
   - Habilite cache para a rota `/assets/*` se desejar economia adicional de banda na VPS.

---

## 6. Monitoramento e Manutenção

### 6.1. Monitorar Consumo de RAM e CPU em Tempo Real

Execute o comando para inspecionar o container ao vivo:

```bash
docker stats gamester-app --no-stream
```

Exemplo de saída esperada sob carga:
```
CONTAINER ID   NAME           CPU %     MEM USAGE / LIMIT   MEM %     NET I/O          BLOCK I/O
a1b2c3d4e5f6   gamester-app   1.2%      74.5MiB / 150MiB    49.67%    12.4MB / 18.2MB   1.2MB / 4.8MB
```

### 6.2. Backup Atômico do Banco de Dados SQLite

O SQLite permite backups atômicos a quente sem interrupção do jogo através da ferramenta `sqlite3`:

```bash
# Executa o backup online do banco WAL para arquivo de segurança
docker exec gamester-app sqlite3 /app/data/gamester.db ".backup '/app/data/backup-$(date +%Y%m%d%H%M%S).db'"
```

### 6.3. Atualização de Nova Versão

Para atualizar o Gamester quando houver novo código:

```bash
cd /opt/gamester
git pull origin main
docker compose build --no-cache
docker compose up -d
```

---

## 7. Verificação de Convivência Pacífica

| Serviço | Porta Típica | Consumo Típico de RAM | Impacto com Gamester |
| :--- | :--- | :--- | :--- |
| **TeamSpeak 3 Server** | `9987/udp`, `10011/tcp`, `30033/tcp` | $\sim 30\text{MB}$ a $50\text{MB}$ | **Zero conflito.** O Gamester roda em porta isolada `3030` em TCP e não consome portas de voz UDP. |
| **Foundry VTT** | `30000/tcp` | $\sim 300\text{MB}$ a $600\text{MB}$ | **Zero conflito.** O Gamester respeita o teto de 150MB de memória e usa proxy Nginx dedicado via hostname. |
| **Gamester** | `3030/tcp` (Loopback) | $\sim 65\text{MB}$ a $85\text{MB}$ (Máx 150MB) | Isolado no Docker com prioridade de recursos ajustada. |
