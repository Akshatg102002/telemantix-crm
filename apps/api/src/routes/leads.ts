import { FastifyInstance } from 'fastify';
import { CreateLeadSchema, UpdateLeadSchema, LeadFilterSchema, BulkLeadActionSchema } from '@telemantix/shared';
import { LeadService } from '../services/lead.service';
import { requireAuth } from '../middleware/auth';
import { runAutomations } from '../services/automation.service';

export async function leadRoutes(fastify: FastifyInstance) {
  const leadService = new LeadService();

  fastify.addHook('preHandler', requireAuth);

  fastify.get('/leads', async (req) => {
    const user = req.user as { sub: string; tenantId: string; role: string; email?: string };
    const filters = LeadFilterSchema.parse(req.query);
    const result = await leadService.list(user.tenantId, filters);
    return { success: true, data: result.leads, meta: result.meta };
  });

  fastify.get('/leads/:id', async (req, reply) => {
    const user = req.user as { sub: string; tenantId: string; role: string; email?: string };
    const { id } = req.params as { id: string };
    try {
      const lead = await leadService.findById(user.tenantId, id);
      return { success: true, data: lead };
    } catch {
      return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Lead not found' } });
    }
  });

  fastify.post('/leads', async (req, reply) => {
    const user = req.user as { sub: string; tenantId: string; role: string; email?: string };
    const body = CreateLeadSchema.parse(req.body);
    const lead = await leadService.create(user.tenantId, user.sub, body);
    await runAutomations(user.tenantId, 'lead_created', lead.id);
    reply.code(201);
    return { success: true, data: lead };
  });

  fastify.patch('/leads/:id', async (req, reply) => {
    const user = req.user as { sub: string; tenantId: string; role: string; email?: string };
    const { id } = req.params as { id: string };
    const body = UpdateLeadSchema.parse(req.body);
    try {
      const lead = await leadService.update(user.tenantId, id, user.sub, body);
      if (body.statusId) await runAutomations(user.tenantId, 'status_changed', id, { newStatusId: body.statusId });
      return { success: true, data: lead };
    } catch {
      return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Lead not found' } });
    }
  });

  fastify.post('/leads/bulk', async (req) => {
    const user = req.user as { sub: string; tenantId: string; role: string; email?: string };
    const body = BulkLeadActionSchema.parse(req.body);
    const result = await leadService.bulkAction(user.tenantId, user.sub, body);
    return { success: true, data: result };
  });

  fastify.get('/leads/:id/history', async (req) => {
    const user = req.user as { sub: string; tenantId: string; role: string; email?: string };
    const { id } = req.params as { id: string };
    const history = await fastify.prisma.leadHistory.findMany({
      where: { leadId: id, tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return { success: true, data: history };
  });

  fastify.post('/leads/:id/score', async (req) => {
    const user = req.user as { sub: string; tenantId: string; role: string; email?: string };
    const { id } = req.params as { id: string };
    const score = await leadService.computeScore(user.tenantId, id);
    return { success: true, data: { score } };
  });

  // Pipeline view: leads grouped by status
  fastify.get('/leads/pipeline', async (req) => {
    const user = req.user as { sub: string; tenantId: string; role: string; email?: string };
    const { serviceBoardId } = req.query as { serviceBoardId?: string };
    const tenantId = user.tenantId;

    const statuses = await fastify.prisma.status.findMany({
      where: { serviceBoard: { tenantId, ...(serviceBoardId ? { id: serviceBoardId } : {}) } },
      orderBy: { sortOrder: 'asc' },
      include: {
        leads: {
          where: { tenantId },
          select: { id: true, name: true, phone: true, dealValue: true, score: true, assignedUser: { select: { name: true } }, source: { select: { name: true } } },
          take: 50,
        },
      },
    });
    return { success: true, data: statuses };
  });

  fastify.delete('/leads/:id', async (req, reply) => {
    const user = req.user as { sub: string; tenantId: string; role: string; email?: string };
    const { id } = req.params as { id: string };
    try {
      await fastify.prisma.lead.delete({ where: { id, tenantId: user.tenantId } });
      return { success: true, data: null };
    } catch {
      return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Lead not found' } });
    }
  });
}
