/**
 * Public API routes — no authentication required.
 * Handles: plan listing, company self-signup, contact form.
 */
import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { syncTenantServices } from '../lib/syncTenantServices';

const RegisterSchema = z.object({
  // Step 1 — Company
  companyName: z.string().min(2).max(100),
  industry: z.string().min(1),
  companySize: z.string().min(1),
  website: z.string().url().optional().or(z.literal('')),
  phone: z.string().min(7).max(20),
  // Step 2 — Plan
  planSlug: z.string().default('growth'),
  billingCycle: z.enum(['monthly', 'yearly']).default('monthly'),
  // Step 3 — Admin account
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
});

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

export async function publicRoutes(fastify: FastifyInstance) {
  // GET /api/public/plans
  fastify.get('/public/plans', async () => {
    const plans = await fastify.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    return { success: true, data: plans };
  });

  // POST /api/public/register — company self-signup
  fastify.post('/public/register', async (req, reply) => {
    const body = RegisterSchema.parse(req.body);

    // Find selected plan
    const plan = await fastify.prisma.plan.findUnique({ where: { slug: body.planSlug } });
    if (!plan) {
      return reply.code(400).send({ success: false, error: { code: 'INVALID_PLAN', message: 'Selected plan not found' } });
    }

    // Ensure email not already used
    const existingUser = await fastify.prisma.user.findFirst({ where: { email: body.email } });
    if (existingUser) {
      return reply.code(409).send({ success: false, error: { code: 'EMAIL_IN_USE', message: 'Email already in use' } });
    }

    // Generate unique slug
    let slug = slugify(body.companyName);
    let attempt = 0;
    while (await fastify.prisma.tenant.findUnique({ where: { slug } })) {
      attempt++;
      slug = `${slugify(body.companyName)}-${attempt}`;
    }

    const tenantId = randomUUID();
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const periodEnd = body.billingCycle === 'yearly'
      ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const passwordHash = await bcrypt.hash(body.password, 12);

    // Create tenant + subscription + admin user in a transaction
    const [tenant, user] = await fastify.prisma.$transaction(async (tx: any) => {
      const tenant = await tx.tenant.create({
        data: {
          id: tenantId,
          name: body.companyName,
          slug,
          industry: body.industry,
          companySize: body.companySize,
          website: body.website || null,
          phone: body.phone,
          onboardedAt: now,
        },
      });

      await tx.subscription.create({
        data: {
          id: randomUUID(),
          tenantId: tenant.id,
          planId: plan.id,
          status: 'trial',
          billingCycle: body.billingCycle,
          trialEndsAt: trialEnd,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
      });

      const user = await tx.user.create({
        data: {
          id: randomUUID(),
          tenantId: tenant.id,
          name: body.name,
          email: body.email,
          passwordHash,
          role: 'admin',
        },
        select: { id: true, name: true, email: true, role: true, tenantId: true },
      });

      // Seed default lead sources
      const sources = ['Meta Ads', 'Google Ads', 'Manual Entry', 'WhatsApp', 'Website'];
      const colors = ['#1877F2', '#4285F4', '#8A8A99', '#25D366', '#7B2FBE'];
      for (let i = 0; i < sources.length; i++) {
        await tx.leadSource.create({
          data: { id: randomUUID(), tenantId: tenant.id, name: sources[i], color: colors[i] },
        });
      }

      // Seed default service board
      const board = await tx.serviceBoard.create({
        data: { id: randomUUID(), tenantId: tenant.id, name: 'General Sales', color: '#7B2FBE' },
      });

      const statuses = [
        { name: 'New', color: '#8A8A99', sortOrder: 0, isDefault: true },
        { name: 'Contacted', color: '#3B82F6', sortOrder: 1 },
        { name: 'Interested', color: '#F59E0B', sortOrder: 2 },
        { name: 'Negotiation', color: '#E8622A', sortOrder: 3 },
        { name: 'Won', color: '#22C55E', sortOrder: 4, isTerminal: true },
        { name: 'Lost', color: '#EF4444', sortOrder: 5, isTerminal: true },
      ];
      for (const s of statuses) {
        await tx.status.create({
          data: { id: randomUUID(), tenantId: tenant.id, serviceBoardId: board.id, ...s },
        });
      }

      return [tenant, user];
    });

    // Sync tenant services based on plan
    try {
      await fastify.prisma.$transaction(async (tx: any) => {
        await syncTenantServices(tx, tenant.id, plan.id);
      });
    } catch { /* non-fatal */ }

    // Issue JWT tokens
    const accessToken = fastify.jwt.sign(
      { sub: user.id, tenantId: tenant.id, role: user.role },
      { expiresIn: '15m' },
    );

    const rawRefresh = randomUUID();
    await fastify.prisma.refreshToken.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        token: rawRefresh,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    reply.code(201);
    return {
      success: true,
      data: {
        user,
        tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug, timezone: 'Asia/Kolkata', currency: 'INR' },
        accessToken,
        refreshToken: rawRefresh,
        plan: { name: plan.name, trialEndsAt: trialEnd },
      },
    };
  });

  // POST /api/public/contact
  fastify.post('/public/contact', async (req, reply) => {
    // Just acknowledge — store in a generic log or send email in production
    const body = req.body as Record<string, string>;
    fastify.log.info({ contact: body }, 'Contact form submission');
    reply.code(200);
    return { success: true, data: { message: 'Thank you! We will be in touch shortly.' } };
  });
}