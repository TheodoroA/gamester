# ==========================================
# Estágio 1: Build do Frontend (SPA)
# ==========================================
FROM node:22-alpine AS client-builder

WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

# ==========================================
# Estágio 2: Build do Backend (Fastify + TS)
# ==========================================
FROM node:22-alpine AS server-builder

RUN apk add --no-cache python3 make g++

WORKDIR /app/server

COPY server/package*.json ./
RUN npm ci

COPY server/ ./
RUN npm run build

# ==========================================
# Estágio 3: Runtime de Produção Otimizado
# ==========================================
FROM node:22-alpine AS runner

RUN apk add --no-cache dumb-init

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3030 \
    HOST=0.0.0.0 \
    NODE_OPTIONS="--max-old-space-size=128" \
    DATABASE_PATH="/app/data/gamester.db"

# Instala dependências de produção do servidor
COPY server/package*.json ./
RUN apk add --no-cache python3 make g++ && \
    npm ci --omit=dev && \
    apk del python3 make g++

# Copia build compilado do backend
COPY --from=server-builder /app/server/dist ./dist
COPY --from=server-builder /app/server/src/db/migrations ./dist/db/migrations

# Copia SPA compilada do frontend para o diretório servido pelo Fastify
COPY --from=client-builder /app/server/dist/public ./dist/public

# Copia catálogo inicial de músicas para seed automático
COPY docs/songs-seed-template.json ./songs-seed-template.json

# Cria diretório persistente do SQLite com permissões corretas
RUN mkdir -p /app/data && chown -R node:node /app

USER node

EXPOSE 3030

VOLUME ["/app/data"]

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "--max-old-space-size=128", "dist/index.js"]
