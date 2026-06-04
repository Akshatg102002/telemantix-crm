import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { CreateFollowUpSchema, UpdateFollowUpSchema } from '@telemantix/shared';
import { requireAuth } from '../middleware/auth';
import { queues } from '../lib/queue';
import { FOLLOW_UP_REMINDER_MINUTES } from '@telemantix/shared';

export async function followUpRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth);

  fastify.get('/follow-ups', async (req) => {
    const user = req.user as { sub: string; tenantId: string; role: string; email?: string };
    const q = req.query as Record<string, string>;
    const where: Record<string, unknown> = { tenantId: user.tenantId };
    if (q.leadId) where.leadId = q.leadId;
    if (q.status) where.status = q.status;
    if (q.assignedUserId) where.assignedUserId = q.assignedUserId;

    const followUps = await fastify.prisma.followUp.findMany({
      where,
      include: { lead: { select: { id: true, name: true, phone: true } } },
      orderBy: { scheduledAt: 'asc' },
      take: 100,
    });
    return { success: true, data: followUps };
  });

  fastify.post('/follow-ups', async (req, reply) => {
    const user = req.user as { sub: string; tenantId: string; role: string; email?: string };
    const body = CreateFollowUpSchema.parse(req.body);
    const followUp = await fastify.prisma.followUp.create({
      data: { id: randomUUID(), tenantId: user.tenantId, ...body },
    });

    // Schedule reminder job 15min before
    const delay = new Date(body.scheduledAt).getTime() - Date.now() - FOLLOW_UP_REMINDER_MINUTES * 60 * 1000;
    if (delay > 0) {
      await queues.followUpReminder.add(
        'remind',
        { followUpId: followUp.id, tenantId: user.tenantId, userId: body.assignedUserId || user.sub },
        { delay }
      );
    }

    reply.code(201);
    return { success: true, data: followUp };
  });

  fastify.patch('/follow-ups/:id', async (req, reply) => {
    const user = req.user as { sub: string; tenantId: string; role: string; email?: string };
    const { id } = req.params as { id: string };
    const body = UpdateFollowUpSchema.parse(req.body);
    const followUp = await fastify.prisma.followUp.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!followUp) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Follow-up not found' } });

    const updated = await fastify.prisma.followUp.update({ where: { id }, data: body });
    return { success: true, data: updated };
  });

  fastify.delete('/follow-ups/:id', async (req, reply) => {
    const user = req.user as { sub: string; tenantId: string; role: string; email?: string };
    const { id } = req.params as { id: string };
    const followUp = await fastify.prisma.followUp.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!followUp) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } });
    await fastify.prisma.followUp.update({ where: { id }, data: { status: 'cancelled' } });
    return { success: true, data: null };
  });
}
