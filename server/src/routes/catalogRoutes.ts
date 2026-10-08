import { FastifyInstance } from 'fastify';
import { CatalogController } from '../controllers/catalogController.js';
import { CatalogRepository } from '../db/repositories/catalogRepository.js';
import { getDatabase } from '../db/sqlite.js';

export async function catalogRoutes(fastify: FastifyInstance): Promise<void> {
  const db = getDatabase();
  const repo = new CatalogRepository(db);
  const controller = new CatalogController(repo);

  fastify.get('/api/catalog/songs', controller.listSongs.bind(controller));
  fastify.post('/api/catalog/songs', controller.createSong.bind(controller));
  fastify.put('/api/catalog/songs/:id', controller.updateSong.bind(controller));
  fastify.delete('/api/catalog/songs/:id', controller.deleteSong.bind(controller));
  fastify.patch('/api/catalog/songs/:id/toggle-active', controller.toggleActive.bind(controller));
  fastify.post('/api/catalog/import', controller.importBatch.bind(controller));
  fastify.post('/api/catalog/verify', controller.verifyAdmin.bind(controller));
}
