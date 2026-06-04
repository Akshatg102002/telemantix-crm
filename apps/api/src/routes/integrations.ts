import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { requireAuth, requireRole } from '../middleware/auth';

export async function integrationRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth);

  fastify.get('/integrations', async (req) => {
    const user = req.user as { sub: string; tenantId: string; role: string; email?: string };
    const integrations = await fastify.prisma.integration.findMany({
      where: { tenantId: user.tenantId },
      select: { id: true, type: true, name: true, isConnected: true, lastSyncAt: true, webhookToken: true, createdAt: true },
    });
    return { success: true, data: integrations };
  });

  fastify.get('/integrations/:id', async (req, reply) => {
    const user = req.user as { sub: string; tenantId: string; role: string; email?: string };
    const { id } = req.params as { id: string };
    const integration = await fastify.prisma.integration.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!integration) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } });
    return { success: true, data: integration };
  });

  fastify.post('/integrations', { preHandler: [requireRole('admin', 'superadmin')] }, async (req, reply) => {
    const user = req.user as { sub: string; tenantId: string; role: string; email?: string };
    const body = req.body as Record<string, unknown>;
    const existing = await fastify.prisma.integration.findFirst({
      where: { tenantId: user.tenantId, type: body.type as string },
    });
    if (existing) {
      const updated = await fastify.prisma.integration.update({ where: { id: existing.id }, data: { config: body.config as object, isConnected: true } });
      return { success: true, data: updated };
    }

    const integration = await fastify.prisma.integration.create({
      data: {
        id: randomUUID(),
        tenantId: user.tenantId,
        type: body.type as string,
        name: body.name as string,
        config: (body.config as object) || {},
        webhookToken: randomUUID(),
        isConnected: true,
      },
    });
    reply.code(201);
    return { success: true, data: integration };
  });

  fastify.patch('/integrations/:id', { preHandler: [requireRole('admin', 'superadmin')] }, async (req, reply) => {
    const user = req.user as { sub: string; tenantId: string; role: string; email?: string };
    const { id } = req.params as { id: string };
    const body = req.body as Record<string, unknown>;
    const integration = await fastify.prisma.integration.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!integration) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } });
    const updated = await fastify.prisma.integration.update({ where: { id }, data: body });
    return { success: true, data: updated };
  });

  fastify.delete('/integrations/:id', { preHandler: [requireRole('admin', 'superadmin')] }, async (req, reply) => {
    const user = req.user as { sub: string; tenantId: string; role: string; email?: string };
    const { id } = req.params as { id: string };
    const integration = await fastify.prisma.integration.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!integration) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } });
    await fastify.prisma.integration.update({ where: { id }, data: { isConnected: false } });
    return { success: true, data: null };
  });

  // Regenerate webhook token
  fastify.post('/integrations/:id/regenerate-token', { preHandler: [requireRole('admin', 'superadmin')] }, async (req, reply) => {
    const user = req.user as { sub: string; tenantId: string; role: string; email?: string };
    const { id } = req.params as { id: string };
    const integration = await fastify.prisma.integration.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!integration) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } });
    const updated = await fastify.prisma.integration.update({ where: { id }, data: { webhookToken: randomUUID() } });
    return { success: true, data: { webhookToken: updated.webhookToken } };
  });

  fastify.get('/integrations/:id/webhook-logs', async (req) => {
    const user = req.user as { sub: string; tenantId: string; role: string; email?: string };
    const { id } = req.params as { id: string };
    const logs = await fastify.prisma.webhookLog.findMany({
      where: { integrationId: id, tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return { success: true, data: logs };
  });
}
