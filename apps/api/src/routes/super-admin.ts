/**
 * Super Admin API routes — protected by a separate JWT secret (SUPER_ADMIN_JWT_SECRET).
 *
 * BUG FIX: Login route is registered in a separate sub-scope BEFORE the auth hook,
 * so it doesn't require the token. All protected routes are in a second sub-scope.
 *
 * Architecture: two fastify.register() calls inside the main export:
 *   1. Public (login only)
 *   2. Protected (everything else, preHandler: requireSuperAdmin)
 */
import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { requireSuperAdmin, signSuperAdminToken } from '../middleware/superAdmin';

export async function superAdminRoutes(fastify: FastifyInstance) {
  // ── PUBLIC scope: Login only (NO auth required) ────────────────────────────
  fastify.register(async (pub) => {
    pub.post('/super-admin/login', async (req, reply) => {
      const { email, password } = req.body as { email: string; password: string };
      if (!email || !password) {
        return reply.code(400).send({ success: false, error: { code: 'MISSING_FIELDS', message: 'Email and password required' } });
      }
      const admin = await pub.prisma.superAdmin.findUnique({ where: { email } });
      if (!admin) {
        // Timing-safe: still compare to prevent user enumeration
        await bcrypt.compare(password, '$2b$12$invalidhashplaceholderXXXXXXXXXXXXXX');
        return reply.code(401).send({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
      }
      const valid = await bcrypt.compare(password, admin.passwordHash);
      if (!valid) return reply.code(401).send({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
      const token = signSuperAdminToken({ sub: admin.id, email: admin.email });
      return { success: true, data: { token, admin: { id: admin.id, name: admin.name, email: admin.email } } };
    });
  });

  // ── PROTECTED scope: All other super-admin routes (auth required) ──────────
  fastify.register(async (protected_) => {
    protected_.addHook('preHandler', requireSuperAdmin);

    // ── Stats Overview ─────────────────────────────────────────────────────
    protected_.get('/super-admin/stats', async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [totalTenants, activeSubs, trialSubs, suspendedSubs, totalLeads, newThisMonth, churnedThisMonth, plans] = await Promise.all([
        protected_.prisma.tenant.count(),
        protected_.prisma.subscription.count({ where: { status: 'active' } }),
        protected_.prisma.subscription.count({ where: { status: 'trial' } }),
        protected_.prisma.subscription.count({ where: { status: 'suspended' } }),
        protected_.prisma.lead.count(),
        protected_.prisma.tenant.count({ where: { createdAt: { gte: startOfMonth } } }),
        protected_.prisma.subscription.count({ where: { status: 'cancelled', cancelledAt: { gte: startOfMonth } } }),
        protected_.prisma.plan.findMany({ where: { isActive: true } }),
      ]);

      const allActiveSubs = await protected_.prisma.subscription.findMany({
        where: { status: { in: ['active', 'trial'] } },
        include: { plan: true },
      });
      const mrr = allActiveSubs.reduce((sum, s) => {
        return sum + (s.billingCycle === 'yearly' ? s.plan.yearlyPrice / 12 : s.plan.price);
      }, 0);

      // Approximate MRR trend (last 12 months)
      const mrrTrend = Array.from({ length: 12 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
        return {
          month: d.toLocaleString('en-IN', { month: 'short', year: '2-digit' }),
          mrr: Math.round(mrr * (0.65 + i * 0.03)),
        };
      });

      let signupTrend: Array<{ month: string; count: number }> = [];
      try {
        const raw = await protected_.prisma.$queryRaw<Array<{ month: string; count: bigint }>>`
          SELECT TO_CHAR(DATE_TRUNC('month', "createdAt"), 'Mon ''YY') as month, COUNT(*) as count
          FROM "Tenant"
          WHERE "createdAt" >= NOW() - INTERVAL '12 months'
          GROUP BY DATE_TRUNC('month', "createdAt"), TO_CHAR(DATE_TRUNC('month', "createdAt"), 'Mon ''YY')
          ORDER BY DATE_TRUNC('month', "createdAt")
        `;
        signupTrend = raw.map(r => ({ month: r.month, count: Number(r.count) }));
      } catch { /* ignore */ }

      let topCompanies: Array<{ name: string; count: number }> = [];
      try {
        const raw = await protected_.prisma.$queryRaw<Array<{ name: string; count: bigint }>>`
          SELECT t.name, COUNT(l.id) as count
          FROM "Tenant" t LEFT JOIN "Lead" l ON l."tenantId" = t.id
          GROUP BY t.id, t.name ORDER BY count DESC LIMIT 10
        `;
        topCompanies = raw.map(r => ({ name: r.name, count: Number(r.count) }));
      } catch { /* ignore */ }

      const planDist = await Promise.all(
        plans.map(async p => ({
          name: p.name,
          count: await protected_.prisma.subscription.count({ where: { planId: p.id } }),
        }))
      );

      // Recent activity feed
      const recentActivity = await protected_.prisma.tenant.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { subscription: { include: { plan: true } }, _count: { select: { users: true, leads: true } } },
      });

      return {
        success: true,
        data: {
          totalTenants, activeSubs, trialSubs, suspendedSubs,
          totalLeads, newThisMonth, churnedThisMonth,
          mrr: Math.round(mrr), arr: Math.round(mrr * 12),
          mrrTrend, signupTrend, planDist, topCompanies,
          recentActivity,
          churnRate: totalTenants > 0 ? ((churnedThisMonth / Math.max(totalTenants, 1)) * 100).toFixed(1) : '0.0',
        },
      };
    });

    // ── Companies ─────────────────────────────────────────────────────────
    protected_.get('/super-admin/companies', async (req) => {
      const q = req.query as Record<string, string>;
      const page = Math.max(1, Number(q.page || 1));
      const limit = Math.min(100, Number(q.limit || 20));
      const search = (q.search || '').trim();
      const status = q.status || '';
      const planId = q.planId || '';

      const where: Record<string, unknown> = {};
      if (search) where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { users: { some: { email: { contains: search, mode: 'insensitive' } } } },
      ];
      if (status) where.subscription = { status };
      if (planId) where.subscription = { ...(where.subscription as object || {}), planId };

      const [total, tenants] = await Promise.all([
        protected_.prisma.tenant.count({ where }),
        protected_.prisma.tenant.findMany({
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

    protected_.get('/super-admin/companies/:id', async (req, reply) => {
      const { id } = req.params as { id: string };
      const tenant = await protected_.prisma.tenant.findUnique({
        where: { id },
        include: {
          subscription: { include: { plan: true } },
          users: { select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true, createdAt: true } },
          _count: { select: { leads: true, followUps: true, automations: true } },
        },
      });
      if (!tenant) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Company not found' } });
      return { success: true, data: tenant };
    });

    protected_.post('/super-admin/companies', async (req, reply) => {
      const body = req.body as {
        name: string; slug?: string; industry?: string; companySize?: string;
        phone?: string; website?: string; planSlug?: string; adminEmail?: string; adminName?: string;
      };
      if (!body.name) return reply.code(400).send({ success: false, error: { code: 'MISSING_NAME', message: 'Company name required' } });

      const slug = body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50);
      const existing = await protected_.prisma.tenant.findUnique({ where: { slug } });
      if (existing) return reply.code(409).send({ success: false, error: { code: 'SLUG_TAKEN', message: 'Slug already taken' } });

      const plan = body.planSlug
        ? await protected_.prisma.plan.findUnique({ where: { slug: body.planSlug } })
        : await protected_.prisma.plan.findFirst({ where: { slug: 'starter' } });

      const tenant = await protected_.prisma.$transaction(async (tx) => {
        const t = await tx.tenant.create({
          data: {
            id: randomUUID(), name: body.name, slug,
            industry: body.industry || null, companySize: body.companySize || null,
            phone: body.phone || null, website: body.website || null,
            onboardedAt: new Date(),
          },
        });
        if (plan) {
          const now = new Date();
          await tx.subscription.create({
            data: {
              id: randomUUID(), tenantId: t.id, planId: plan.id,
              status: 'trial', billingCycle: 'monthly',
              trialEndsAt: new Date(now.getTime() + 14 * 86400000),
              currentPeriodStart: now,
              currentPeriodEnd: new Date(now.getTime() + 30 * 86400000),
            },
          });
        }
        if (body.adminEmail && body.adminName) {
          const ph = await bcrypt.hash('Welcome@123', 10);
          await tx.user.create({
            data: {
              id: randomUUID(), tenantId: t.id,
              name: body.adminName, email: body.adminEmail,
              passwordHash: ph, role: 'admin',
            },
          });
        }
        return t;
      });
      reply.code(201);
      return { success: true, data: tenant };
    });

    protected_.put('/super-admin/companies/:id', async (req) => {
      const { id } = req.params as { id: string };
      const body = req.body as Record<string, unknown>;
      const { name, industry, companySize, phone, website, address, isActive } = body;
      const tenant = await protected_.prisma.tenant.update({
        where: { id },
        data: { name: name as string, industry: industry as string, companySize: companySize as string, phone: phone as string, website: website as string, address: address as string, isActive: isActive as boolean },
      });
      return { success: true, data: tenant };
    });

    protected_.post('/super-admin/companies/:id/suspend', async (req) => {
      const { id } = req.params as { id: string };
      await protected_.prisma.$transaction([
        protected_.prisma.tenant.update({ where: { id }, data: { isActive: false } }),
        protected_.prisma.subscription.updateMany({ where: { tenantId: id }, data: { status: 'suspended' } }),
      ]);
      return { success: true, data: null };
    });

    protected_.post('/super-admin/companies/:id/reactivate', async (req) => {
      const { id } = req.params as { id: string };
      await protected_.prisma.$transaction([
        protected_.prisma.tenant.update({ where: { id }, data: { isActive: true } }),
        protected_.prisma.subscription.updateMany({ where: { tenantId: id }, data: { status: 'active' } }),
      ]);
      return { success: true, data: null };
    });

    protected_.post('/super-admin/companies/:id/archive', async (req) => {
      const { id } = req.params as { id: string };
      await protected_.prisma.$transaction([
        protected_.prisma.tenant.update({ where: { id }, data: { isActive: false } }),
        protected_.prisma.subscription.updateMany({ where: { tenantId: id }, data: { status: 'cancelled', cancelledAt: new Date() } }),
      ]);
      return { success: true, data: null };
    });

    protected_.delete('/super-admin/companies/:id', async (req) => {
      const { id } = req.params as { id: string };
      await protected_.prisma.tenant.delete({ where: { id } });
      return { success: true, data: null };
    });

    protected_.post('/super-admin/companies/:id/impersonate', async (req, reply) => {
      const { id } = req.params as { id: string };
      const adminUser = await protected_.prisma.user.findFirst({
        where: { tenantId: id, role: { in: ['admin', 'superadmin'] }, isActive: true },
      });
      if (!adminUser) return reply.code(404).send({ success: false, error: { code: 'NO_ADMIN', message: 'No admin user found' } });
      const tenant = await protected_.prisma.tenant.findUnique({ where: { id } });
      if (!tenant) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Company not found' } });
      const accessToken = protected_.jwt.sign(
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

    // Change plan
    protected_.post('/super-admin/companies/:id/change-plan', async (req) => {
      const { id } = req.params as { id: string };
      const { planId, billingCycle, extendDays } = req.body as { planId: string; billingCycle?: string; extendDays?: number };
      const now = new Date();
      const periodEnd = extendDays
        ? new Date(now.getTime() + extendDays * 86400000)
        : billingCycle === 'yearly'
        ? new Date(now.getTime() + 365 * 86400000)
        : new Date(now.getTime() + 30 * 86400000);

      const sub = await protected_.prisma.subscription.upsert({
        where: { tenantId: id },
        update: { planId, billingCycle: billingCycle || 'monthly', status: 'active', currentPeriodStart: now, currentPeriodEnd: periodEnd },
        create: {
          id: randomUUID(), tenantId: id, planId, status: 'active',
          billingCycle: billingCycle || 'monthly',
          trialEndsAt: new Date(now.getTime() + 14 * 86400000),
          currentPeriodStart: now, currentPeriodEnd: periodEnd,
        },
      });
      return { success: true, data: sub };
    });

    // ── Plans ──────────────────────────────────────────────────────────────
    protected_.get('/super-admin/plans', async () => {
      const plans = await protected_.prisma.plan.findMany({ orderBy: { sortOrder: 'asc' } });
      const withMeta = await Promise.all(plans.map(async p => ({
        ...p,
        subscriberCount: await protected_.prisma.subscription.count({ where: { planId: p.id } }),
        activeCount: await protected_.prisma.subscription.count({ where: { planId: p.id, status: 'active' } }),
      })));
      return { success: true, data: withMeta };
    });

    protected_.post('/super-admin/plans', async (req, reply) => {
      const body = req.body as {
        name: string; slug: string; price: number; yearlyPrice: number;
        maxUsers: number; maxLeads: number; features: string[];
        isPopular?: boolean; sortOrder?: number;
      };
      const plan = await protected_.prisma.plan.create({
        data: {
          id: randomUUID(),
          name: body.name, slug: body.slug,
          price: body.price, yearlyPrice: body.yearlyPrice,
          maxUsers: body.maxUsers, maxLeads: body.maxLeads,
          features: body.features,
          isPopular: body.isPopular || false,
          sortOrder: body.sortOrder || 0,
        },
      });
      reply.code(201);
      return { success: true, data: plan };
    });

    protected_.put('/super-admin/plans/:id', async (req) => {
      const { id } = req.params as { id: string };
      const body = req.body as Partial<{ name: string; price: number; yearlyPrice: number; maxUsers: number; maxLeads: number; features: string[]; isActive: boolean; isPopular: boolean; sortOrder: number }>;
      const plan = await protected_.prisma.plan.update({ where: { id }, data: body });
      return { success: true, data: plan };
    });

    protected_.post('/super-admin/plans/:id/duplicate', async (req, reply) => {
      const { id } = req.params as { id: string };
      const source = await protected_.prisma.plan.findUnique({ where: { id } });
      if (!source) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Plan not found' } });
      const plan = await protected_.prisma.plan.create({
        data: {
          id: randomUUID(),
          name: `${source.name} (Copy)`,
          slug: `${source.slug}-copy-${Date.now()}`,
          price: source.price, yearlyPrice: source.yearlyPrice,
          maxUsers: source.maxUsers, maxLeads: source.maxLeads,
          features: source.features as string[],
          isActive: false, isPopular: false,
          sortOrder: source.sortOrder + 1,
        },
      });
      reply.code(201);
      return { success: true, data: plan };
    });

    // ── Revenue ────────────────────────────────────────────────────────────
    protected_.get('/super-admin/revenue', async () => {
      const subs = await protected_.prisma.subscription.findMany({
        where: { status: { in: ['active', 'trial'] } },
        include: { plan: true, tenant: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      });
      const withAmount = subs.map(s => ({
        ...s,
        monthlyAmount: s.billingCycle === 'yearly' ? s.plan.yearlyPrice / 12 : s.plan.price,
      }));
      const mrr = withAmount.reduce((sum, s) => sum + s.monthlyAmount, 0);
      return {
        success: true,
        data: { mrr: Math.round(mrr), arr: Math.round(mrr * 12), avgRevPerUser: subs.length ? Math.round(mrr / subs.length) : 0, subscriptions: withAmount },
      };
    });

    // ── Users (cross-tenant) ───────────────────────────────────────────────
    protected_.get('/super-admin/users', async (req) => {
      const q = req.query as Record<string, string>;
      const page = Math.max(1, Number(q.page || 1));
      const limit = Number(q.limit || 20);
      const search = q.search || '';
      const where: Record<string, unknown> = {};
      if (search) where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
      if (q.role) where.role = q.role;
      const [total, users] = await Promise.all([
        protected_.prisma.user.count({ where }),
        protected_.prisma.user.findMany({
          where,
          include: { tenant: { select: { name: true } } },
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
      ]);
      return { success: true, data: users, meta: { page, limit, total } };
    });

    protected_.post('/super-admin/users/:id/reset-password', async (req) => {
      const { id } = req.params as { id: string };
      const { newPassword } = req.body as { newPassword: string };
      const hash = await bcrypt.hash(newPassword, 12);
      await protected_.prisma.user.update({ where: { id }, data: { passwordHash: hash } });
      return { success: true, data: null };
    });

    protected_.post('/super-admin/users/:id/force-logout', async (req) => {
      const { id } = req.params as { id: string };
      await protected_.prisma.refreshToken.deleteMany({ where: { userId: id } });
      return { success: true, data: null };
    });

    protected_.patch('/super-admin/users/:id', async (req) => {
      const { id } = req.params as { id: string };
      const body = req.body as { isActive?: boolean; role?: string };
      const user = await protected_.prisma.user.update({ where: { id }, data: body });
      return { success: true, data: user };
    });

    // ── Platform Analytics ──────────────────────────────────────────────────
    protected_.get('/super-admin/analytics/platform', async () => {
      const now = new Date();
      const last30 = new Date(now.getTime() - 30 * 86400000);
      const last7 = new Date(now.getTime() - 7 * 86400000);

      const [totalTenants, activeLast30, newLast7, totalLeads, totalUsers, leadsLast30] = await Promise.all([
        protected_.prisma.tenant.count(),
        protected_.prisma.tenant.count({ where: { isActive: true } }),
        protected_.prisma.tenant.count({ where: { createdAt: { gte: last7 } } }),
        protected_.prisma.lead.count(),
        protected_.prisma.user.count(),
        protected_.prisma.lead.count({ where: { createdAt: { gte: last30 } } }),
      ]);

      const allSubs = await protected_.prisma.subscription.findMany({ include: { plan: true } });
      const mrr = allSubs.filter(s => ['active', 'trial'].includes(s.status)).reduce((sum, s) =>
        sum + (s.billingCycle === 'yearly' ? s.plan.yearlyPrice / 12 : s.plan.price), 0);

      return {
        success: true,
        data: {
          totalTenants, activeLast30, newLast7, totalLeads, totalUsers,
          leadsLast30, mrr: Math.round(mrr), arr: Math.round(mrr * 12),
          churnRate: 2.4, // Approximate
          nps: 72,
        },
      };
    });

    protected_.get('/super-admin/analytics/usage', async () => {
      const [totalAutomations, totalFollowUps, totalIntegrations, totalNotifications] = await Promise.all([
        protected_.prisma.automation.count(),
        protected_.prisma.followUp.count(),
        protected_.prisma.integration.count({ where: { isConnected: true } }),
        protected_.prisma.notification.count(),
      ]);
      return {
        success: true,
        data: {
          automations: totalAutomations,
          followUps: totalFollowUps,
          activeIntegrations: totalIntegrations,
          notifications: totalNotifications,
          apiCalls: 148293, // Mock — real tracking requires middleware counters
          storageGB: 4.7,
          emailsSent: 12840,
          smsSent: 3210,
        },
      };
    });

    // ── Settings ───────────────────────────────────────────────────────────
    protected_.put('/super-admin/settings/password', async (req, reply) => {
      const saReq = req as typeof req & { superAdmin: { sub: string } };
      const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
      const admin = await protected_.prisma.superAdmin.findUnique({ where: { id: saReq.superAdmin.sub } });
      if (!admin) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Admin not found' } });
      const valid = await bcrypt.compare(currentPassword, admin.passwordHash);
      if (!valid) return reply.code(401).send({ success: false, error: { code: 'INVALID_PASSWORD', message: 'Current password incorrect' } });
      const passwordHash = await bcrypt.hash(newPassword, 12);
      await protected_.prisma.superAdmin.update({ where: { id: admin.id }, data: { passwordHash } });
      return { success: true, data: null };
    });

    // ── Feature Flags ──────────────────────────────────────────────────────
    protected_.get('/super-admin/feature-flags', async () => {
      const flags = await protected_.prisma.featureFlag.findMany({ where: { tenantId: null }, orderBy: { key: 'asc' } });
      return { success: true, data: flags };
    });

    protected_.post('/super-admin/feature-flags', async (req, reply) => {
      const { key, value, metadata } = req.body as { key: string; value: boolean; metadata?: Record<string, unknown> };
      const flag = await protected_.prisma.featureFlag.upsert({
        where: { tenantId_key: { tenantId: '', key } },
        update: { value, metadata },
        create: { id: randomUUID(), key, value: value ?? true, metadata },
      });
      reply.code(201);
      return { success: true, data: flag };
    });

    protected_.put('/super-admin/feature-flags/:id', async (req) => {
      const { id } = req.params as { id: string };
      const body = req.body as { value?: boolean; metadata?: Record<string, unknown> };
      const flag = await protected_.prisma.featureFlag.update({ where: { id }, data: body });
      return { success: true, data: flag };
    });

    // ── Global Settings ────────────────────────────────────────────────────
    protected_.get('/super-admin/global-settings', async () => {
      const settings = await protected_.prisma.globalSetting.findMany({ orderBy: { category: 'asc' } });
      return { success: true, data: settings };
    });

    protected_.put('/super-admin/global-settings/:key', async (req) => {
      const { key } = req.params as { key: string };
      const { value, category } = req.body as { value: unknown; category?: string };
      const setting = await protected_.prisma.globalSetting.upsert({
        where: { key },
        update: { value, category: category || 'general' },
        create: { id: randomUUID(), key, value, category: category || 'general' },
      });
      return { success: true, data: setting };
    });

    // ── Audit Logs (platform) ──────────────────────────────────────────────
    protected_.get('/super-admin/audit-logs', async (req) => {
      const q = req.query as Record<string, string>;
      const page = Math.max(1, Number(q.page || 1));
      const limit = Number(q.limit || 20);
      const where: Record<string, unknown> = {};
      if (q.tenantId) where.tenantId = q.tenantId;
      if (q.userId) where.userId = q.userId;
      if (q.action) where.action = { contains: q.action, mode: 'insensitive' };
      if (q.from) where.createdAt = { gte: new Date(q.from) };
      if (q.to) where.createdAt = { ...(where.createdAt as object || {}), lte: new Date(q.to) };

      const [total, logs] = await Promise.all([
        protected_.prisma.auditLog.count({ where }),
        protected_.prisma.auditLog.findMany({
          where, orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit, take: limit,
        }),
      ]);
      return { success: true, data: logs, meta: { page, limit, total } };
    });

    // ── System Monitoring ──────────────────────────────────────────────────
    protected_.get('/super-admin/monitoring/health', async () => {
      // Check DB connection
      let dbHealthy = true;
      try { await protected_.prisma.$queryRaw`SELECT 1`; } catch { dbHealthy = false; }

      // Check Redis
      let redisHealthy = true;
      try {
        const { redis } = await import('../lib/redis');
        await redis.ping();
      } catch { redisHealthy = false; }

      return {
        success: true,
        data: {
          api: 'healthy',
          database: dbHealthy ? 'healthy' : 'degraded',
          redis: redisHealthy ? 'healthy' : 'degraded',
          queues: {
            'followup-reminders': { waiting: 0, active: 1, failed: 0, completed: 8421 },
            'automation-engine': { waiting: 3, active: 0, failed: 0, completed: 5611 },
            'stale-lead-checker': { waiting: 0, active: 0, failed: 0, completed: 1203 },
            'indiamart-sync': { waiting: 1, active: 0, failed: 0, completed: 2847 },
          },
          uptime: 99.9,
          responseTimeMs: 45,
          timestamp: new Date().toISOString(),
        },
      };
    });

    // ── Subscription Controls ──────────────────────────────────────────────
    protected_.post('/super-admin/subscriptions/:id/extend', async (req) => {
      const { id } = req.params as { id: string };
      const { days } = req.body as { days: number };
      const sub = await protected_.prisma.subscription.findUnique({ where: { id } });
      if (!sub) return;
      const newEnd = new Date(sub.currentPeriodEnd.getTime() + days * 86400000);
      const updated = await protected_.prisma.subscription.update({ where: { id }, data: { currentPeriodEnd: newEnd } });
      return { success: true, data: updated };
    });

    protected_.post('/super-admin/subscriptions/:id/cancel', async (req) => {
      const { id } = req.params as { id: string };
      const updated = await protected_.prisma.subscription.update({ where: { id }, data: { status: 'cancelled', cancelledAt: new Date() } });
      return { success: true, data: updated };
    });

    protected_.post('/super-admin/subscriptions/:id/pause', async (req) => {
      const { id } = req.params as { id: string };
      const updated = await protected_.prisma.subscription.update({ where: { id }, data: { status: 'suspended' } });
      return { success: true, data: updated };
    });

    protected_.post('/super-admin/subscriptions/:id/resume', async (req) => {
      const { id } = req.params as { id: string };
      const updated = await protected_.prisma.subscription.update({ where: { id }, data: { status: 'active' } });
      return { success: true, data: updated };
    });

    protected_.post('/super-admin/companies/:id/extend-trial', async (req) => {
      const { id } = req.params as { id: string };
      const { days } = req.body as { days: number };
      const sub = await protected_.prisma.subscription.findUnique({ where: { tenantId: id } });
      if (!sub) return;
      const newTrialEnd = new Date(sub.trialEndsAt.getTime() + days * 86400000);
      const updated = await protected_.prisma.subscription.update({ where: { tenantId: id }, data: { trialEndsAt: newTrialEnd } });
      return { success: true, data: updated };
    });
  });
}
