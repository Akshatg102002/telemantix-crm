import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { CreateTaskSchema, UpdateTaskSchema } from '@telemantix/shared';
import { requireAuth } from '../middleware/auth';

export async function taskRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth);

  fastify.get('/tasks', async (req) => {
    const q = req.query as Record<string, string>;
    const where: Record<string, unknown> = { tenantId: req.user.tenantId };
    if (q.assignedUserId) where.assignedUserId = q.assignedUserId;
    if (q.status) where.status = q.status;
    if (q.priority) where.priority = q.priority;
    if (q.leadId) where.leadId = q.leadId;
    if (q.mine === 'true') where.assignedUserId = req.user.sub;
    if (q.overdue === 'true') where.dueDate = { lt: new Date() };

    const tasks = await fastify.prisma.task.findMany({
      where,
      include: {
        lead: { select: { id: true, name: true } },
        assignedUser: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 100,
    });
    return { success: true, data: tasks };
  });

  fastify.post('/tasks', async (req, reply) => {
    const body = CreateTaskSchema.parse(req.body);
    const task = await fastify.prisma.task.create({
      data: { id: randomUUID(), tenantId: req.user.tenantId, ...body },
    });
    reply.code(201);
    return { success: true, data: task };
  });

  fastify.patch('/tasks/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = UpdateTaskSchema.parse(req.body);
    const task = await fastify.prisma.task.findFirst({ where: { id, tenantId: req.user.tenantId } });
    if (!task) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } });

    const updateData: Record<string, unknown> = { ...body };
    if (body.status === 'done') updateData.completedAt = new Date();

    const updated = await fastify.prisma.task.update({ where: { id }, data: updateData });
    return { success: true, data: updated };
  });

  fastify.delete('/tasks/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const task = await fastify.prisma.task.findFirst({ where: { id, tenantId: req.user.tenantId } });
    if (!task) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } });
    await fastify.prisma.task.update({ where: { id }, data: { status: 'cancelled' } });
    return { success: true, data: null };
  });
}
