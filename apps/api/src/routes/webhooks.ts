import { FastifyInstance } from 'fastify';
import { IntegrationService } from '../services/integration.service';
import { EmailService } from '../services/email.service';

const PORTAL_TYPES = ['whatsapp', 'exotel', 'indiamart', 'justdial', '99acres', 'housing'] as const;

export async function webhookRoutes(fastify: FastifyInstance) {
  const service = new IntegrationService(fastify.prisma);
  const emailService = new EmailService(fastify.prisma);

  async function handle(type: string, req: any, reply: any) {
    const query = req.query as Record<string, string>;
    const body = req.body as Record<string, unknown>;
    const tenantId = query.tenantId || String(body.tenantId || '');
    const token = query.token || String(body.token || req.headers['x-webhook-token'] || '');
    if (!tenantId || !token) return reply.code(400).send({ success: false, error: { code: 'MISSING_AUTH', message: 'tenantId and token are required' } });
    try {
      return { success: true, data: await service.ingestWebhook(type, tenantId, token, body) };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.code(message === 'INVALID_WEBHOOK_TOKEN' ? 401 : 400).send({ success: false, error: { code: message, message } });
    }
  }

  for (const type of PORTAL_TYPES) {
    fastify.post(`/webhooks/${type}`, (req, reply) => handle(type, req, reply));
  }

  fastify.get('/webhooks/meta', async (req, reply) => {
    const q = req.query as Record<string, string>;
    if (q['hub.verify_token'] === process.env.META_VERIFY_TOKEN) return reply.send(q['hub.challenge']);
    return reply.code(403).send('Forbidden');
  });

  fastify.post('/webhooks/meta', async (req, reply) => {
    const q = req.query as Record<string, string>;
    const tenantId = q.tenantId;
    const token = q.token;
    const body = req.body as Record<string, unknown>;
    if (!tenantId || !token) return reply.code(400).send({ success: false, error: { code: 'MISSING_AUTH', message: 'tenantId and token are required' } });
    const entries = (body.entry as Array<Record<string, unknown>>) || [body];
    const results = [];
    for (const entry of entries) {
      for (const change of (entry.changes as Array<Record<string, unknown>>) || [entry]) {
        const payload = (change.value as Record<string, unknown>) || change;
        results.push(await service.ingestWebhook('meta', tenantId, token, payload));
      }
    }
    return { success: true, data: results };
  });
  fastify.post('/webhooks/resend', async (req) => ({ success: true, data: await emailService.handleResendWebhook(req.body as Record<string, unknown>) }));
}
