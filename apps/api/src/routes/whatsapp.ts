import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { requireAuth } from '../middleware/auth';

export async function whatsappRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth);

  // ── Campaigns ──────────────────────────────────────────────────────────────
  fastify.get('/whatsapp/campaigns', async (req) => {
    const campaigns = await fastify.prisma.whatsAppCampaign.findMany({
      where: { tenantId: (req.user as any).tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: campaigns };
  });

  fastify.post('/whatsapp/campaigns', async (req, reply) => {
    const body = req.body as { name: string; template?: string; message: string; scheduledAt?: string };
    const campaign = await fastify.prisma.whatsAppCampaign.create({
      data: {
        id: randomUUID(),
        tenantId: (req.user as any).tenantId,
        name: body.name,
        template: body.template || '',
        message: body.message,
        status: body.scheduledAt ? 'scheduled' : 'draft',
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
      },
    });
    reply.code(201);
    return { success: true, data: campaign };
  });

  fastify.patch('/whatsapp/campaigns/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as Record<string, unknown>;
    const existing = await fastify.prisma.whatsAppCampaign.findFirst({ where: { id, tenantId: (req.user as any).tenantId } });
    if (!existing) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Campaign not found' } });
    const updated = await fastify.prisma.whatsAppCampaign.update({ where: { id }, data: body });
    return { success: true, data: updated };
  });

  fastify.delete('/whatsapp/campaigns/:id', async (req) => {
    const { id } = req.params as { id: string };
    await fastify.prisma.whatsAppCampaign.deleteMany({ where: { id, tenantId: (req.user as any).tenantId } });
    return { success: true, data: null };
  });

  // ── Broadcast (single bulk message) ───────────────────────────────────────
  fastify.post('/whatsapp/broadcast', async (req, reply) => {
    // In production: queue a BullMQ job to send messages
    const body = req.body as { message: string; recipients: string[]; template?: string };
    fastify.log.info({ broadcast: body }, 'WhatsApp broadcast queued');
    return { success: true, data: { queued: body.recipients?.length || 0, message: 'Broadcast queued for sending' } };
  });
}
