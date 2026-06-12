import { FastifyInstance } from 'fastify';
import { requireAuth, requireRole } from '../middleware/auth';
import { IntegrationService } from '../services/integration.service';
import { INTEGRATION_DEFINITIONS } from '../services/integrations/types';

export async function integrationRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth);
  const service = new IntegrationService(fastify.prisma);

  fastify.get('/integrations', async (req) => {
    const user = req.user as { sub: string; tenantId: string; role: string; email?: string };
    return { success: true, data: await service.list(user.tenantId), definitions: Object.values(INTEGRATION_DEFINITIONS) };
  });

  fastify.post('/integrations/:type/connect', { preHandler: [requireRole('admin', 'superadmin')] }, async (req, reply) => {
    const user = req.user as { sub: string; tenantId: string; role: string; email?: string };
    const { type } = req.params as { type: string };
    try {
      const integration = await service.connect(user.tenantId, type, req.body as Record<string, unknown>, user, { ipAddress: req.ip, userAgent: req.headers['user-agent'] });
      reply.code(201);
      return { success: true, data: integration };
    } catch (err) {
      return reply.code(400).send({ success: false, error: { code: 'CONNECT_FAILED', message: err instanceof Error ? err.message : String(err) } });
    }
  });

  fastify.post('/integrations/:type/test', { preHandler: [requireRole('admin', 'superadmin')] }, async (req, reply) => {
    const user = req.user as { sub: string; tenantId: string; role: string; email?: string };
    const { type } = req.params as { type: string };
    try {
      return { success: true, data: await service.test(user.tenantId, type, req.body as Record<string, unknown>, user, { ipAddress: req.ip, userAgent: req.headers['user-agent'] }) };
    } catch (err) {
      return reply.code(400).send({ success: false, error: { code: 'TEST_FAILED', message: err instanceof Error ? err.message : String(err) } });
    }
  });

  fastify.post('/integrations/:type/disconnect', { preHandler: [requireRole('admin', 'superadmin')] }, async (req, reply) => {
    const user = req.user as { sub: string; tenantId: string; role: string; email?: string };
    const { type } = req.params as { type: string };
    try {
      return { success: true, data: await service.disconnect(user.tenantId, type, user, { ipAddress: req.ip, userAgent: req.headers['user-agent'] }) };
    } catch (err) {
      return reply.code(404).send({ success: false, error: { code: 'DISCONNECT_FAILED', message: err instanceof Error ? err.message : String(err) } });
    }
  });

  fastify.post('/integrations/:type/sync', { preHandler: [requireRole('admin', 'superadmin')] }, async (req, reply) => {
    const user = req.user as { sub: string; tenantId: string; role: string; email?: string };
    const { type } = req.params as { type: string };
    try {
      const job = await service.enqueueSync(type, user.tenantId);
      return { success: true, data: { jobId: job?.id || null } };
    } catch (err) {
      return reply.code(400).send({ success: false, error: { code: 'SYNC_FAILED', message: err instanceof Error ? err.message : String(err) } });
    }
  });

  fastify.post('/integrations', { preHandler: [requireRole('admin', 'superadmin')] }, async (req, reply) => {
    const user = req.user as { sub: string; tenantId: string; role: string; email?: string };
    const body = req.body as Record<string, unknown>;
    return reply.code(201).send({ success: true, data: await service.connect(user.tenantId, String(body.type), body, user, { ipAddress: req.ip, userAgent: req.headers['user-agent'] }) });
  });

  fastify.delete('/integrations/:type', { preHandler: [requireRole('admin', 'superadmin')] }, async (req) => {
    const user = req.user as { sub: string; tenantId: string; role: string; email?: string };
    const { type } = req.params as { type: string };
    return { success: true, data: await service.disconnect(user.tenantId, type, user) };
  });
}
