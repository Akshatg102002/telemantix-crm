import { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/auth';
import { EmailService } from '../services/email.service';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function emailRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth);
  const service = new EmailService(fastify.prisma);

  fastify.post('/email/send', async (req, reply) => {
    const user = req.user as { tenantId: string };
    const body = req.body as { to?: string; subject?: string; html?: string };
    if (!body.to || !emailRegex.test(body.to)) return reply.code(400).send({ success: false, error: { code: 'INVALID_EMAIL', message: 'A valid recipient email is required.' } });
    if (!body.subject) return reply.code(400).send({ success: false, error: { code: 'MISSING_SUBJECT', message: 'Subject is required.' } });
    if (!body.html) return reply.code(400).send({ success: false, error: { code: 'MISSING_HTML', message: 'HTML body is required.' } });
    try {
      return { success: true, data: await service.sendEmail({ tenantId: user.tenantId, to: body.to, subject: body.subject, html: body.html }) };
    } catch (err) {
      return reply.code(400).send({ success: false, error: { code: 'EMAIL_SEND_FAILED', message: err instanceof Error ? err.message : String(err) } });
    }
  });

  fastify.get('/email/settings', async (req) => {
    const user = req.user as { tenantId: string };
    return { success: true, data: await service.listSettings(user.tenantId) };
  });
}
