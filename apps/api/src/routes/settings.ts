import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { requireAuth, requireRole } from '../middleware/auth';

export async function settingsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth);

  fastify.get('/settings/tenant', async (req) => {
    const user = req.user as { sub: string; tenantId: string; role: string; email?: string };
    const tenant = await fastify.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { id: true, name: true, slug: true, logoUrl: true, timezone: true, currency: true, settings: true },
    });
    return { success: true, data: tenant };
  });

  fastify.patch('/settings/tenant', { preHandler: [requireRole('admin', 'superadmin')] }, async (req) => {
    const user = req.user as { sub: string; tenantId: string; role: string; email?: string };
    const body = req.body as Record<string, unknown>;
    const tenant = await fastify.prisma.tenant.update({
      where: { id: user.tenantId },
      data: { name: body.name as string, timezone: body.timezone as string, currency: body.currency as string, settings: body.settings as any },
    });
    return { success: true, data: tenant };
  });

  fastify.get('/settings/api-keys', { preHandler: [requireRole('admin', 'superadmin')] }, async (req) => {
    const user = req.user as { sub: string; tenantId: string; role: string; email?: string };
    const keys = await fastify.prisma.apiKey.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      select: { id: true, name: true, lastUsed: true, expiresAt: true, createdAt: true },
    });
    return { success: true, data: keys };
  });

  fastify.post('/settings/api-keys', { preHandler: [requireRole('admin', 'superadmin')] }, async (req, reply) => {
    const user = req.user as { sub: string; tenantId: string; role: string; email?: string };
    const { name } = req.body as { name: string };
    const rawKey = `tmx_${randomUUID().replace(/-/g, '')}`;
    const keyHash = await bcrypt.hash(rawKey, 10);
    const key = await fastify.prisma.apiKey.create({
      data: { id: randomUUID(), tenantId: user.tenantId, name, keyHash },
    });
    reply.code(201);
    return { success: true, data: { id: key.id, name: key.name, key: rawKey } };
  });

  fastify.delete('/settings/api-keys/:id', { preHandler: [requireRole('admin', 'superadmin')] }, async (req) => {
    const { id } = req.params as { id: string };
    await fastify.prisma.apiKey.update({ where: { id }, data: { isActive: false } });
    return { success: true, data: null };
  });

  fastify.get('/settings/webhook-logs', { preHandler: [requireRole('admin', 'superadmin')] }, async (req) => {
    const user = req.user as { sub: string; tenantId: string; role: string; email?: string };
    const logs = await fastify.prisma.webhookLog.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return { success: true, data: logs };
  });

  // Lead sources management
  fastify.get('/settings/lead-sources', async (req) => {
    const user = req.user as { sub: string; tenantId: string; role: string; email?: string };
    const sources = await fastify.prisma.leadSource.findMany({ where: { tenantId: user.tenantId } });
    return { success: true, data: sources };
  });

  fastify.post('/settings/lead-sources', { preHandler: [requireRole('admin', 'superadmin', 'manager')] }, async (req, reply) => {
    const user = req.user as { sub: string; tenantId: string; role: string; email?: string };
    const body = req.body as Record<string, unknown>;
    const source = await fastify.prisma.leadSource.create({
      data: { id: randomUUID(), tenantId: user.tenantId, name: body.name as string, color: (body.color as string) || '#7B2FBE' },
    });
    reply.code(201);
    return { success: true, data: source };
  });

  fastify.patch('/settings/lead-sources/:id', { preHandler: [requireRole('admin', 'superadmin', 'manager')] }, async (req) => {
    const { id } = req.params as { id: string };
    const body = req.body as Record<string, unknown>;
    const source = await fastify.prisma.leadSource.update({ where: { id }, data: body });
    return { success: true, data: source };
  });

  fastify.delete('/settings/lead-sources/:id', { preHandler: [requireRole('admin', 'superadmin')] }, async (req) => {
    const { id } = req.params as { id: string };
    await fastify.prisma.leadSource.update({ where: { id }, data: { isActive: false } });
    return { success: true, data: null };
  });

  // Billing — subscription + usage + available plans
  fastify.get('/settings/billing', async (req) => {
    const user = req.user as { sub: string; tenantId: string; role: string; email?: string };
    const tenantId = user.tenantId;
    const [subscription, userCount, leadCount, plans] = await Promise.all([
      fastify.prisma.subscription.findUnique({
        where: { tenantId },
        include: { plan: true },
      }),
      fastify.prisma.user.count({ where: { tenantId, isActive: true } }),
      fastify.prisma.lead.count({ where: { tenantId } }),
      fastify.prisma.plan.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
    ]);
    return {
      success: true,
      data: {
        subscription,
        usage: { users: userCount, leads: leadCount },
        plans,
      },
    };
  });

  fastify.put('/settings/subscription', { preHandler: [requireRole('admin', 'superadmin')] }, async (req) => {
    const user = req.user as { sub: string; tenantId: string; role: string; email?: string };
    const { planId, billingCycle } = req.body as { planId: string; billingCycle: string };
    const now = new Date();
    const periodEnd = billingCycle === 'yearly'
      ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const sub = await fastify.prisma.subscription.update({
      where: { tenantId: user.tenantId },
      data: { planId, billingCycle, status: 'active', currentPeriodStart: now, currentPeriodEnd: periodEnd },
    });
    return { success: true, data: sub };
  });

  // Tenant service status
  fastify.get('/settings/my-services', async (req) => {
    const user = req.user as any;
    const tenantServices = await fastify.prisma.tenantService.findMany({
      where: { tenantId: user.tenantId },
      include: { service: true },
    });
    return {
      success: true,
      data: tenantServices.map((ts: any) => ({
        key: ts.serviceKey,
        name: ts.service.name,
        category: ts.service.category,
        isCore: ts.service.isCore,
        globalEnabled: ts.service.isEnabled,
        tenantEnabled: ts.isEnabled,
        isMaintenance: ts.service.isMaintenance,
        maintenanceMsg: ts.service.maintenanceMsg,
        overridden: ts.overriddenBySuperAdmin,
        disabledReason: ts.disabledReason,
        effectiveEnabled: ts.service.isEnabled && ts.isEnabled,
      })),
    };
  });
}
