import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { requireAuth, requireRole } from '../middleware/auth';

export async function serviceBoardRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth);

  fastify.get('/service-boards', async (req) => {
    const boards = await fastify.prisma.serviceBoard.findMany({
      where: { tenantId: req.user.tenantId, isActive: true },
      include: {
        statuses: { include: { subStatuses: true }, orderBy: { sortOrder: 'asc' } },
        _count: { select: { leads: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });
    return { success: true, data: boards };
  });

  fastify.post('/service-boards', { preHandler: [requireRole('admin', 'superadmin')] }, async (req, reply) => {
    const body = req.body as Record<string, unknown>;
    const board = await fastify.prisma.serviceBoard.create({
      data: { id: randomUUID(), tenantId: req.user.tenantId, name: body.name as string, description: body.description as string, color: (body.color as string) || '#7B2FBE' },
    });
    reply.code(201);
    return { success: true, data: board };
  });

  fastify.patch('/service-boards/:id', { preHandler: [requireRole('admin', 'superadmin')] }, async (req) => {
    const { id } = req.params as { id: string };
    const body = req.body as Record<string, unknown>;
    const board = await fastify.prisma.serviceBoard.update({ where: { id }, data: body });
    return { success: true, data: board };
  });

  // Status CRUD
  fastify.post('/service-boards/:boardId/statuses', { preHandler: [requireRole('admin', 'superadmin', 'manager')] }, async (req, reply) => {
    const { boardId } = req.params as { boardId: string };
    const body = req.body as Record<string, unknown>;
    const status = await fastify.prisma.status.create({
      data: { id: randomUUID(), tenantId: req.user.tenantId, serviceBoardId: boardId, name: body.name as string, color: (body.color as string) || '#8A8A99', sortOrder: (body.sortOrder as number) || 0 },
    });
    reply.code(201);
    return { success: true, data: status };
  });

  fastify.patch('/service-boards/:boardId/statuses/:statusId', { preHandler: [requireRole('admin', 'superadmin', 'manager')] }, async (req) => {
    const { statusId } = req.params as { boardId: string; statusId: string };
    const body = req.body as Record<string, unknown>;
    const status = await fastify.prisma.status.update({ where: { id: statusId }, data: body });
    return { success: true, data: status };
  });

  fastify.post('/service-boards/:boardId/statuses/:statusId/sub-statuses', { preHandler: [requireRole('admin', 'superadmin', 'manager')] }, async (req, reply) => {
    const { statusId } = req.params as { boardId: string; statusId: string };
    const body = req.body as Record<string, unknown>;
    const sub = await fastify.prisma.subStatus.create({
      data: { id: randomUUID(), statusId, name: body.name as string, color: (body.color as string) || '#8A8A99' },
    });
    reply.code(201);
    return { success: true, data: sub };
  });
}
