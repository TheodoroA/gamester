import { FastifyRequest, FastifyReply } from 'fastify';
import { CatalogRepository, NewSongInput } from '../db/repositories/catalogRepository.js';

export class CatalogController {
  private repo: CatalogRepository;
  private adminKey: string;

  constructor(repo: CatalogRepository, adminKey = process.env.ADMIN_KEY || 'gamester-vps-secret') {
    this.repo = repo;
    this.adminKey = adminKey;
  }

  private checkAdmin(request: FastifyRequest, reply: FastifyReply): boolean {
    const key = (request.headers['x-admin-key'] as string) || (request.body as any)?.adminKey;
    if (!key || key !== this.adminKey) {
      reply.status(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Chave de administração incorreta ou ausente.'
        }
      });
      return false;
    }
    return true;
  }

  public async verifyAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!this.checkAdmin(request, reply)) return;
    reply.send({ success: true, message: 'Autenticado com sucesso.' });
  }

  public async listSongs(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!this.checkAdmin(request, reply)) return;

    const query = request.query as any;
    const filter = {
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 20,
      category: query.category,
      tag: query.tag,
      query: query.q
    };

    const result = this.repo.listSongs(filter);
    reply.send(result);
  }

  public async createSong(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!this.checkAdmin(request, reply)) return;

    const body = request.body as NewSongInput;
    if (!body.gameTitle || !body.songTitle || !body.releaseYear || !body.youtubeUrl) {
      reply.status(400).send({
        error: {
          code: 'VALIDATION_ERR',
          message: 'gameTitle, songTitle, releaseYear e youtubeUrl são obrigatórios.'
        }
      });
      return;
    }

    const song = this.repo.createSong(body);
    reply.status(201).send(song);
  }

  public async importBatch(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!this.checkAdmin(request, reply)) return;

    const body = request.body as { adminKey?: string; songs: NewSongInput[] };
    if (!body || !Array.isArray(body.songs)) {
      reply.status(400).send({
        error: {
          code: 'VALIDATION_ERR',
          message: 'Payload inválido. Esperado array "songs".'
        }
      });
      return;
    }

    const result = this.repo.importBatch(body.songs);
    if (result.errors.length > 0) {
      reply.status(400).send({
        error: {
          code: 'IMPORT_ERR',
          message: 'Falha na validação do lote de músicas.',
          details: result.errors
        }
      });
      return;
    }

    reply.send({
      inserted: result.inserted,
      failed: 0,
      errors: []
    });
  }
}
