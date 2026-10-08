import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { RoomManager, RoomSettings } from '../game/roomManager.js';

export function roomRoutes(fastify: FastifyInstance, roomManager: RoomManager) {
  fastify.post('/api/rooms', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as { nickname?: string; settings?: Partial<RoomSettings> };

    if (!body?.nickname || typeof body.nickname !== 'string' || body.nickname.trim().length === 0) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERR',
          message: 'Nickname é obrigatório.'
        }
      });
    }

    const { room, host } = roomManager.createRoom(body.nickname, body.settings);

    return reply.status(201).send({
      roomId: room.id,
      playerId: host.id,
      token: host.id, // O token de sessão no MVP é o ID exclusivo do jogador
      room: room.toDTO()
    });
  });

  fastify.get('/api/rooms/:roomId', async (request: FastifyRequest<{ Params: { roomId: string } }>, reply: FastifyReply) => {
    const room = roomManager.getRoom(request.params.roomId);
    if (!room) {
      return reply.status(404).send({
        error: {
          code: 'ROOM_NOT_FOUND',
          message: 'Sala não encontrada.'
        }
      });
    }

    return reply.send(room.toDTO());
  });
}
