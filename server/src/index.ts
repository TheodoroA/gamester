import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { getDatabase } from './db/sqlite.js';
import { CatalogRepository } from './db/repositories/catalogRepository.js';
import { catalogRoutes } from './routes/catalogRoutes.js';
import { RoomManager } from './game/roomManager.js';
import { roomRoutes } from './routes/roomRoutes.js';
import { setupWebSocketServer } from './ws/socketServer.js';
import { seedCatalog } from './scripts/seedCatalog.js';

import fastifyStatic from '@fastify/static';
import path from 'node:path';
import fs from 'node:fs';

export interface ServerInstance {
  fastify: FastifyInstance;
  roomManager: RoomManager;
  catalogRepo: CatalogRepository;
}

export async function buildServer(options?: { dbPath?: string }): Promise<ServerInstance> {
  const fastify = Fastify({
    logger: process.env.NODE_ENV !== 'test'
  });

  await fastify.register(cors, {
    origin: true
  });

  const db = getDatabase(options);
  const catalogRepo = new CatalogRepository(db);
  const roomManager = new RoomManager();

  if (process.env.NODE_ENV !== 'test' && catalogRepo.count() === 0) {
    try {
      seedCatalog();
    } catch {
      // Ignora falha de seed inicial se arquivo não estiver presente
    }
  }

  // Endpoint de saúde / health check
  fastify.get('/health', async () => {
    const memory = process.memoryUsage();
    return {
      status: 'healthy',
      uptime: process.uptime(),
      memory: {
        rssMb: Math.round((memory.rss / (1024 * 1024)) * 100) / 100,
        heapUsedMb: Math.round((memory.heapUsed / (1024 * 1024)) * 100) / 100
      },
      activeRooms: roomManager.countActiveRooms()
    };
  });

  // Registra rotas da API
  await catalogRoutes(fastify);
  roomRoutes(fastify, roomManager);

  // Serve arquivos estáticos da SPA compilada se a pasta public existir
  const publicPath = path.resolve(process.cwd(), 'dist', 'public');
  const localPublicPath = path.resolve(process.cwd(), 'public');
  const targetPublic = fs.existsSync(publicPath) ? publicPath : fs.existsSync(localPublicPath) ? localPublicPath : null;

  if (targetPublic) {
    await fastify.register(fastifyStatic, {
      root: targetPublic,
      prefix: '/'
    });
    fastify.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api') || request.url.startsWith('/ws')) {
        reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Rota não encontrada' } });
      } else {
        reply.sendFile('index.html');
      }
    });
  }

  // Configura WebSocket nativo usando o servidor HTTP subjacente do Fastify
  await fastify.ready();
  const wss = setupWebSocketServer(fastify.server, roomManager, catalogRepo);

  fastify.addHook('onClose', (_instance, done) => {
    for (const client of wss.clients) {
      try {
        client.terminate();
      } catch (e) {
        // ignore
      }
    }
    wss.close(() => done());
  });

  return { fastify, roomManager, catalogRepo };
}

// Inicialização direta do servidor
if (process.argv[1]?.endsWith('index.ts') || process.argv[1]?.endsWith('index.js')) {
  const PORT = Number(process.env.PORT) || 3030;
  const HOST = process.env.HOST || '0.0.0.0';

  buildServer()
    .then(({ fastify }) => {
      fastify.listen({ port: PORT, host: HOST }, (err, address) => {
        if (err) {
          fastify.log.error(err);
          process.exit(1);
        }
        fastify.log.info(`Gamester Server rodando em ${address}`);
      });
    })
    .catch((err) => {
      console.error('Falha ao iniciar servidor:', err);
      process.exit(1);
    });
}
