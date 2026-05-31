/**
 * Security routes: login history, session management, 2FA, audit log, permissions.
 */
import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { requireAuth } from '../middleware/auth';

export async function securityRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth);

  // ── Login History ─────────────────────────────────────────────────────────
  fastify.get('/settings/login-history', async (req) => {
    const history = await fastify.prisma.loginHistory.findMany({
      where: { userId: req.user.sub },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { success: true, data: history };
  });

  // ── Sessions ──────────────────────────────────────────────────────────────
  fastify.get('/settings/sessions', async (req) => {
    const sessions = await fastify.prisma.userSession.findMany({
      where: { userId: req.user.sub },
      orderBy: { lastActiveAt: 'desc' },
    });
    return { success: true, data: sessions };
  });

  fastify.delete('/settings/sessions/:id', async (req) => {
    const { id } = req.params as { id: string };
    await fastify.prisma.userSession.deleteMany({ where: { id, userId: req.user.sub } });
    return { success: true, data: null };
  });

  fastify.delete('/settings/sessions', async (req) => {
    // Delete all sessions except the current one
    const authHeader = req.headers.authorization || '';
    const currentToken = authHeader.replace('Bearer ', '');
    await fastify.prisma.userSession.deleteMany({
      where: { userId: req.user.sub, refreshToken: { not: currentToken } },
    });
    return { success: true, data: null };
  });

  // ── 2FA ───────────────────────────────────────────────────────────────────
  fastify.post('/auth/2fa/setup', async (req) => {
    // Mock 2FA setup — in production use 'speakeasy' package
    const secret = randomUUID().replace(/-/g, '').slice(0, 32).toUpperCase();
    const qrDataUrl = `otpauth://totp/Telemantix:${req.user.email}?secret=${secret}&issuer=Telemantix`;
    await fastify.prisma.user.update({
      where: { id: req.user.sub },
      data: { twoFactorSecret: secret },
    });
    return { success: true, data: { secret, qrDataUrl, backupCodes: Array.from({ length: 8 }, () => randomUUID().slice(0, 8).toUpperCase()) } };
  });

  fastify.post('/auth/2fa/verify', async (req, reply) => {
    const { code } = req.body as { code: string };
    // Mock verification — in production validate TOTP code
    if (code?.length !== 6) {
      return reply.code(400).send({ success: false, error: { code: 'INVALID_CODE', message: 'Invalid 2FA code' } });
    }
    await fastify.prisma.user.update({
      where: { id: req.user.sub },
      data: { twoFactorEnabled: true },
    });
    return { success: true, data: { enabled: true } };
  });

  fastify.post('/auth/2fa/disable', async (req, reply) => {
    const { password } = req.body as { password: string };
    const user = await fastify.prisma.user.findUnique({ where: { id: req.user.sub } });
    if (!user) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return reply.code(401).send({ success: false, error: { code: 'INVALID_PASSWORD', message: 'Password incorrect' } });
    await fastify.prisma.user.update({
      where: { id: req.user.sub },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });
    return { success: true, data: { disabled: true } };
  });

  // ── Audit Log (tenant level) ──────────────────────────────────────────────
  fastify.get('/settings/audit-log', async (req) => {
    const q = req.query as Record<string, string>;
    const page = Math.max(1, Number(q.page || 1));
    const limit = Number(q.limit || 20);
    const where: Record<string, unknown> = { tenantId: req.user.tenantId };
    if (q.userId) where.userId = q.userId;
    if (q.action) where.action = { contains: q.action, mode: 'insensitive' };
    if (q.from) where.createdAt = { ...(where.createdAt as object || {}), gte: new Date(q.from) };
    if (q.to) where.createdAt = { ...(where.createdAt as object || {}), lte: new Date(q.to) };

    const [total, logs] = await Promise.all([
      fastify.prisma.auditLog.count({ where }),
      fastify.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return { success: true, data: logs, meta: { page, limit, total } };
  });

  // ── Permissions Matrix ────────────────────────────────────────────────────
  fastify.get('/settings/permissions', async (req) => {
    const tenant = await fastify.prisma.tenant.findUnique({
      where: { id: req.user.tenantId },
      select: { settings: true },
    });
    const settings = (tenant?.settings as Record<string, unknown>) || {};
    const permissions = (settings.permissions as Record<string, unknown>) || {};
    return { success: true, data: permissions };
  });

  fastify.put('/settings/permissions', async (req) => {
    const body = req.body as Record<string, unknown>;
    const tenant = await fastify.prisma.tenant.findUnique({ where: { id: req.user.tenantId } });
    const existingSettings = (tenant?.settings as Record<string, unknown>) || {};
    await fastify.prisma.tenant.update({
      where: { id: req.user.tenantId },
      data: { settings: { ...existingSettings, permissions: body } },
    });
    return { success: true, data: body };
  });

  // ── Integration Secrets ───────────────────────────────────────────────────
  fastify.get('/settings/integration-secrets', async (req) => {
    const secrets = await fastify.prisma.integrationSecret.findMany({
      where: { tenantId: req.user.tenantId },
      select: { id: true, provider: true, keyName: true, isActive: true, lastTestedAt: true, testStatus: true, createdAt: true },
    });
    return { success: true, data: secrets };
  });

  fastify.post('/settings/integration-secrets', async (req, reply) => {
    const { provider, keyName, value } = req.body as { provider: string; keyName: string; value: string };
    const { encrypt } = await import('../lib/crypto');
    const encryptedValue = encrypt(value);

    const secret = await fastify.prisma.integrationSecret.upsert({
      where: { tenantId_provider_keyName: { tenantId: req.user.tenantId, provider, keyName } },
      update: { encryptedValue, isActive: true, testStatus: null },
      create: {
        id: randomUUID(), tenantId: req.user.tenantId,
        provider, keyName, encryptedValue,
      },
    });
    reply.code(201);
    return { success: true, data: { id: secret.id, provider, keyName, isActive: true } };
  });

  fastify.post('/settings/integration-secrets/:id/test', async (req, reply) => {
    const { id } = req.params as { id: string };
    // Mock test — in production call the actual API to verify credentials
    await fastify.prisma.integrationSecret.update({
      where: { id },
      data: { lastTestedAt: new Date(), testStatus: 'ok' },
    });
    return { success: true, data: { status: 'ok', message: 'Connection test successful' } };
  });

  fastify.delete('/settings/integration-secrets/:id', async (req) => {
    const { id } = req.params as { id: string };
    await fastify.prisma.integrationSecret.deleteMany({ where: { id, tenantId: req.user.tenantId } });
    return { success: true, data: null };
  });

  // ── User Preferences ──────────────────────────────────────────────────────
  fastify.patch('/users/me/preferences', async (req) => {
    const body = req.body as Record<string, unknown>;
    const user = await fastify.prisma.user.update({
      where: { id: req.user.sub },
      data: { preferences: body },
      select: { id: true, preferences: true },
    });
    return { success: true, data: user };
  });
}
