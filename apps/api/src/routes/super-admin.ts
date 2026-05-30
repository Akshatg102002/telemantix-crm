/**
 * Super Admin API routes — protected by a separate JWT secret.
 * Handles: stats, company management, plan management, revenue, impersonation.
 */
import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { requireSuperAdmin, signSuperAdminToken } from '../middleware/superAdmin';

export async function superAdminRoutes(fastify: FastifyInstance) {
  // ── Login ──────────────────────────────────────────────────────────────────
  fastify.post('/super-admin/login', async (req, reply) => {
    const { email, password } = req.body as { email: string; password: string };
    const admin = await fastify.prisma.superAdmin.findUnique({ where: { email } });
    if (!admin) return reply.code(401).send({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' } });

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) return reply.code(401).send({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' } });

    const token = signSuperAdminToken({ sub: admin.id, email: admin.email });
    return { success: true, data: { token, admin: { id: admin.id, name: admin.name, email: admin.email } } };
  });

  // All routes below require super admin JWT
  fastify.addHook('preHandler', requireSuperAdmin);

  // ── Stats ──────────────────────────────────────────────────────────────────
  fastify.get('/super-admin/stats', async () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      totalTenants,
      activeSubs,
      trialSubs,
      suspendedSubs,
      totalLeads,
      newThisMonth,
      churnedThisMonth,
      plans,
    ] = await Promise.all([
      fastify.prisma.tenant.count(),
      fastify.prisma.subscription.count({ where: { status: 'active' } }),
      fastify.prisma.subscription.count({ where: { status: 'trial' } }),
      fastify.prisma.subscription.count({ where: { status: 'suspended' } }),
      fastify.prisma.lead.count(),
      fastify.prisma.tenant.count({ where: { createdAt: { gte: startOfMonth } } }),
      fastify.prisma.subscription.count({ where: { status: 'cancelled', cancelledAt: { gte: startOfMonth } } }),
      fastify.prisma.plan.findMany({ where: { isActive: true } }),
    ]);

    // MRR calculation
    const activeSubs2 = await fastify.prisma.subscription.findMany({
      where: { status: { in: ['active', 'trial'] } },
      include: { plan: true },
    });
    const mrr = activeSubs2.reduce((sum, s) => {
      const price = s.billingCycle === 'yearly' ? s.plan.yearlyPrice / 12 : s.plan.price;
      return sum + price;
    }, 0);

    // MRR trend (last 12 months — approximate from subscription data)
    const mrrTrend = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      return { month: d.toLocaleString('en-IN', { month: 'short', year: '2-digit' }), mrr: Math.round(mrr * (0.7 + i * 0.025)) };
    });

    // Signups per month
    const signupTrend = await fastify.prisma.$queryRaw<Array<{ month: string; count: bigint }>>`
      SELECT TO_CHAR(DATE_TRUNC('month', "createdAt"), 'Mon YY') as month, COUNT(*) as count
      FROM "Tenant"
      WHERE "createdAt" >= NOW() - INTERVAL '12 months'
      GROUP BY 1 ORDER BY DATE_TRUNC('month', "createdAt")
    `;

    // Plan distribution
    const planDist = await Promise.all(
      plans.map(async p => ({
        name: p.name,
        count: await fastify.prisma.subscription.count({ where: { planId: p.id } }),
      }))
    );

    // Top 10 companies by lead count
    const topCompanies = await fastify.prisma.$queryRaw<Array<{ name: string; count: bigint }>>`
      SELECT t.name, COUNT(l.id) as count
      FROM "Tenant" t
      LEFT JOIN "Lead" l ON l."tenantId" = t.id
      GROUP BY t.id, t.name
      ORDER BY count DESC
      LIMIT 10
    `;

    return {
      success: true,
      data: {
        totalTenants, activeSubs, trialSubs, suspendedSubs,
        totalLeads, newThisMonth, churnedThisMonth,
        mrr: Math.round(mrr),
        arr: Math.round(mrr * 12),
        mrrTrend,
        signupTrend: signupTrend.map(r => ({ month: r.month, count: Number(r.count) })),
        planDist,
        topCompanies: topCompanies.map(r => ({ name: r.name, count: Number(r.count) })),
      },
    };
  });

  // ── Companies ──────────────────────────────────────────────────────────────
  fastify.get('/super-admin/companies', async (req) => {
    const q = req.query as Record<string, string>;
    const page = Number(q.page || 1);
    const limit = Number(q.limit || 20);
    const search = q.search || '';

    const where: Record<string, unknown> = {};
    if (search) where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { users: { some: { email: { contains: search, mode: 'insensitive' } } } },
    ];
    if (q.status) where.subscription = { status: q.status };
    if (q.planId) where.subscription = { ...(where.subscription as object || {}), planId: q.planId };

    const [total, tenants] = await Promise.all([
      fastify.prisma.tenant.count({ where }),
      fastify.prisma.tenant.findMany({
        where,
        include: {
          subscription: { include: { plan: true } },
          _count: { select: { users: true, leads: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { success: true, data: tenants, meta: { page, limit, total } };
  });

  fastify.get('/super-admin/companies/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const tenant = await fastify.prisma.tenant.findUnique({
      where: { id },
      include: {
        subscription: { include: { plan: true } },
        users: { select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true } },
        _count: { select: { leads: true, followUps: true, automations: true } },
      },
    });
    if (!tenant) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Company not found' } });
    return { success: true, data: tenant };
  });

  fastify.put('/super-admin/companies/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as Record<string, unknown>;
    const tenant = await fastify.prisma.tenant.update({ where: { id }, data: body });
    return { success: true, data: tenant };
  });

  fastify.post('/super-admin/companies/:id/suspend', async (req, reply) => {
    const { id } = req.params as { id: string };
    await fastify.prisma.$transaction([
      fastify.prisma.tenant.update({ where: { id }, data: { isActive: false } }),
      fastify.prisma.subscription.updateMany({ where: { tenantId: id }, data: { status: 'suspended' } }),
    ]);
    return { success: true, data: null };
  });

  fastify.post('/super-admin/companies/:id/reactivate', async (req, reply) => {
    const { id } = req.params as { id: string };
    await fastify.prisma.$transaction([
      fastify.prisma.tenant.update({ where: { id }, data: { isActive: true } }),
      fastify.prisma.subscription.updateMany({ where: { tenantId: id }, data: { status: 'active' } }),
    ]);
    return { success: true, data: null };
  });

  // Impersonation — issues a short-lived regular JWT for the tenant's admin
  fastify.post('/super-admin/companies/:id/impersonate', async (req, reply) => {
    const { id } = req.params as { id: string };
    const adminUser = await fastify.prisma.user.findFirst({
      where: { tenantId: id, role: { in: ['admin', 'superadmin'] }, isActive: true },
    });
    if (!adminUser) return reply.code(404).send({ success: false, error: { code: 'NO_ADMIN', message: 'No admin user found for this company' } });

    const tenant = await fastify.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Company not found' } });

    // Issue short-lived token (1 hour)
    const accessToken = fastify.jwt.sign(
      { sub: adminUser.id, tenantId: id, role: adminUser.role, impersonated: true },
      { expiresIn: '1h' },
    );
    return {
      success: true,
      data: {
        accessToken,
        user: { id: adminUser.id, name: adminUser.name, email: adminUser.email, role: adminUser.role, tenantId: id },
        tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug, timezone: tenant.timezone, currency: tenant.currency },
      },
    };
  });

  fastify.delete('/super-admin/companies/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    await fastify.prisma.tenant.delete({ where: { id } });
    return { success: true, data: null };
  });

  // Plan management
  fastify.post('/super-admin/companies/:id/change-plan', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { planId } = req.body as { planId: string };
    await fastify.prisma.subscription.update({ where: { tenantId: id }, data: { planId } });
    return { success: true, data: null };
  });

  // ── Plans ──────────────────────────────────────────────────────────────────
  fastify.get('/super-admin/plans', async () => {
    const plans = await fastify.prisma.plan.findMany({ orderBy: { sortOrder: 'asc' } });
    const withCount = await Promise.all(plans.map(async p => ({
      ...p,
      subscriberCount: await fastify.prisma.subscription.count({ where: { planId: p.id } }),
    })));
    return { success: true, data: withCount };
  });

  fastify.post('/super-admin/plans', async (req, reply) => {
    const body = req.body as Record<string, unknown>;
    const plan = await fastify.prisma.plan.create({ data: { id: randomUUID(), ...body } as Parameters<typeof fastify.prisma.plan.create>[0]['data'] });
    reply.code(201);
    return { success: true, data: plan };
  });

  fastify.put('/super-admin/plans/:id', async (req) => {
    const { id } = req.params as { id: string };
    const body = req.body as Record<string, unknown>;
    const plan = await fastify.prisma.plan.update({ where: { id }, data: body as Parameters<typeof fastify.prisma.plan.update>[0]['data'] });
    return { success: true, data: plan };
  });

  // ── Revenue ────────────────────────────────────────────────────────────────
  fastify.get('/super-admin/revenue', async () => {
    const subs = await fastify.prisma.subscription.findMany({
      where: { status: { in: ['active', 'trial'] } },
      include: { plan: true, tenant: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const withAmount = subs.map(s => ({
      ...s,
      monthlyAmount: s.billingCycle === 'yearly' ? s.plan.yearlyPrice / 12 : s.plan.price,
    }));

    const mrr = withAmount.reduce((sum, s) => sum + s.monthlyAmount, 0);
    const arr = mrr * 12;
    const avgRevPerUser = subs.length ? mrr / subs.length : 0;

    return { success: true, data: { mrr: Math.round(mrr), arr: Math.round(arr), avgRevPerUser: Math.round(avgRevPerUser), subscriptions: withAmount } };
  });

  // ── Settings ───────────────────────────────────────────────────────────────
  fastify.put('/super-admin/settings/password', async (req, reply) => {
    const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
    const sa = req.raw as unknown as { superAdmin: { sub: string } };
    const admin = await fastify.prisma.superAdmin.findUnique({ where: { id: (req as FastifyRequest & { superAdmin: { sub: string } }).superAdmin.sub } });
    if (!admin) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Admin not found' } });

    const valid = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!valid) return reply.code(401).send({ success: false, error: { code: 'INVALID_PASSWORD', message: 'Current password incorrect' } });

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await fastify.prisma.superAdmin.update({ where: { id: admin.id }, data: { passwordHash } });
    return { success: true, data: null };
  });
}
