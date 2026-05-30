import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { RegisterSchema } from '@telemantix/shared';
import { requireAuth, requireRole } from '../middleware/auth';

export async function userRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth);

  fastify.get('/users', async (req) => {
    const users = await fastify.prisma.user.findMany({
      where: { tenantId: req.user.tenantId },
      select: { id: true, name: true, email: true, role: true, avatarUrl: true, isActive: true, lastLoginAt: true, createdAt: true },
      orderBy: { name: 'asc' },
    });
    return { success: true, data: users };
  });

  fastify.post('/users', { preHandler: [requireRole('admin', 'superadmin')] }, async (req, reply) => {
    const body = RegisterSchema.parse(req.body);
    const existing = await fastify.prisma.user.findFirst({ where: { email: body.email, tenantId: req.user.tenantId } });
    if (existing) return reply.code(409).send({ success: false, error: { code: 'EMAIL_IN_USE', message: 'Email already in use' } });

    const passwordHash = await bcrypt.hash(body.password, 12);
    const role = (req.body as Record<string, unknown>).role as string || 'agent';
    const user = await fastify.prisma.user.create({
      data: { id: randomUUID(), tenantId: req.user.tenantId, name: body.name, email: body.email, passwordHash, role },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });
    reply.code(201);
    return { success: true, data: user };
  });

  fastify.patch('/users/:id', { preHandler: [requireRole('admin', 'superadmin')] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as Record<string, unknown>;
    const user = await fastify.prisma.user.findFirst({ where: { id, tenantId: req.user.tenantId } });
    if (!user) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });

    const updateData: Record<string, unknown> = {};
    if (body.name) updateData.name = body.name;
    if (body.role) updateData.role = body.role;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.avatarUrl) updateData.avatarUrl = body.avatarUrl;

    const updated = await fastify.prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, isActive: true, avatarUrl: true },
    });
    return { success: true, data: updated };
  });
}
