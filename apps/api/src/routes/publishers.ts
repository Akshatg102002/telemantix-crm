import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { requireAuth, requireRole } from '../middleware/auth';

export async function publisherRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth);

  fastify.get('/publishers', async (req) => {
    const publishers = await fastify.prisma.publisher.findMany({
      where: { tenantId: req.user.tenantId },
      include: { _count: { select: { leads: true } } },
    });
    return { success: true, data: publishers };
  });

  fastify.post('/publishers', { preHandler: [requireRole('admin', 'superadmin')] }, async (req, reply) => {
    const body = req.body as Record<string, unknown>;
    const publisher = await fastify.prisma.publisher.create({
      data: {
        id: randomUUID(),
        tenantId: req.user.tenantId,
        name: body.name as string,
        company: body.company as string,
        email: body.email as string,
        phone: body.phone as string,
        commissionPlan: (body.commissionPlan as object) || {},
      },
    });
    reply.code(201);
    return { success: true, data: publisher };
  });

  fastify.get('/publishers/:id/leads', async (req) => {
    const { id } = req.params as { id: string };
    const leads = await fastify.prisma.lead.findMany({
      where: { publisherId: id, tenantId: req.user.tenantId },
      include: { status: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return { success: true, data: leads };
  });
}
