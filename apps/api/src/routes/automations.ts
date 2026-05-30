import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { CreateAutomationSchema, UpdateAutomationSchema } from '@telemantix/shared';
import { requireAuth, requireRole } from '../middleware/auth';

export async function automationRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth);

  fastify.get('/automations', async (req) => {
    const automations = await fastify.prisma.automation.findMany({
      where: { tenantId: req.user.tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: automations };
  });

  fastify.get('/automations/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const automation = await fastify.prisma.automation.findFirst({
      where: { id, tenantId: req.user.tenantId },
      include: { logs: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });
    if (!automation) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } });
    return { success: true, data: automation };
  });

  fastify.post('/automations', { preHandler: [requireRole('admin', 'superadmin', 'manager')] }, async (req, reply) => {
    const body = CreateAutomationSchema.parse(req.body);
    const automation = await fastify.prisma.automation.create({
      data: { id: randomUUID(), tenantId: req.user.tenantId, ...body, conditions: body.conditions ?? [], actions: body.actions },
    });
    reply.code(201);
    return { success: true, data: automation };
  });

  fastify.patch('/automations/:id', { preHandler: [requireRole('admin', 'superadmin', 'manager')] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = UpdateAutomationSchema.parse(req.body);
    const automation = await fastify.prisma.automation.findFirst({ where: { id, tenantId: req.user.tenantId, isSystem: false } });
    if (!automation) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Not found or system rule' } });
    const updated = await fastify.prisma.automation.update({ where: { id }, data: body });
    return { success: true, data: updated };
  });

  fastify.delete('/automations/:id', { preHandler: [requireRole('admin', 'superadmin')] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const automation = await fastify.prisma.automation.findFirst({ where: { id, tenantId: req.user.tenantId, isSystem: false } });
    if (!automation) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Not found or system rule' } });
    await fastify.prisma.automation.delete({ where: { id } });
    return { success: true, data: null };
  });

  fastify.get('/automations/:id/logs', async (req) => {
    const { id } = req.params as { id: string };
    const logs = await fastify.prisma.automationLog.findMany({
      where: { automationId: id, tenantId: req.user.tenantId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return { success: true, data: logs };
  });
}
