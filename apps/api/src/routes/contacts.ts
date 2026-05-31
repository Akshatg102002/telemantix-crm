import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { requireAuth } from '../middleware/auth';

export async function contactRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth);

  fastify.get('/contacts', async (req) => {
    const q = req.query as Record<string, string>;
    const page = Math.max(1, Number(q.page || 1));
    const limit = Number(q.limit || 20);
    const search = q.search || '';
    const tenantId = req.user.tenantId;

    const where: Record<string, unknown> = { tenantId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, contacts] = await Promise.all([
      fastify.prisma.contact.count({ where }),
      fastify.prisma.contact.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { success: true, data: contacts, meta: { page, limit, total } };
  });

  fastify.get('/contacts/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const contact = await fastify.prisma.contact.findFirst({ where: { id, tenantId: req.user.tenantId } });
    if (!contact) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Contact not found' } });
    return { success: true, data: contact };
  });

  fastify.post('/contacts', async (req, reply) => {
    const body = req.body as { name: string; phone?: string; email?: string; company?: string; tags?: string[] };
    const contact = await fastify.prisma.contact.create({
      data: {
        id: randomUUID(), tenantId: req.user.tenantId,
        name: body.name, phone: body.phone, email: body.email,
        company: body.company, tags: body.tags || [],
      },
    });
    reply.code(201);
    return { success: true, data: contact };
  });

  fastify.patch('/contacts/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as Record<string, unknown>;
    const contact = await fastify.prisma.contact.findFirst({ where: { id, tenantId: req.user.tenantId } });
    if (!contact) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Contact not found' } });
    const updated = await fastify.prisma.contact.update({ where: { id }, data: body });
    return { success: true, data: updated };
  });

  fastify.delete('/contacts/:id', async (req) => {
    const { id } = req.params as { id: string };
    await fastify.prisma.contact.deleteMany({ where: { id, tenantId: req.user.tenantId } });
    return { success: true, data: null };
  });
}
