import { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/auth';

export async function notificationRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth);

  fastify.get('/notifications', async (req) => {
    const user = req.user as { sub: string; tenantId: string; role: string; email?: string };
    const q = req.query as Record<string, string>;
    const notifications = await fastify.prisma.notification.findMany({
      where: { userId: user.sub, tenantId: user.tenantId, ...(q.unread === 'true' ? { isRead: false } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const unreadCount = await fastify.prisma.notification.count({ where: { userId: user.sub, tenantId: user.tenantId, isRead: false } });
    return { success: true, data: notifications, meta: { unreadCount } };
  });

  fastify.patch('/notifications/:id/read', async (req) => {
    const { id } = req.params as { id: string };
    await fastify.prisma.notification.update({ where: { id }, data: { isRead: true, readAt: new Date() } });
    return { success: true, data: null };
  });

  fastify.post('/notifications/read-all', async (req) => {
    const user = req.user as { sub: string; tenantId: string; role: string; email?: string };
    await fastify.prisma.notification.updateMany({
      where: { userId: user.sub, tenantId: user.tenantId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { success: true, data: null };
  });
}
