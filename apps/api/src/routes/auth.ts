import { FastifyInstance } from 'fastify';
import { LoginSchema, RefreshTokenSchema, ChangePasswordSchema } from '@telemantix/shared';
import { AuthService } from '../services/auth.service';
import { requireAuth } from '../middleware/auth';

export async function authRoutes(fastify: FastifyInstance) {
  const authService = new AuthService(fastify);

  fastify.post('/auth/login', async (req, reply) => {
    const body = LoginSchema.parse(req.body);
    const tenantSlug = (req.headers['x-tenant'] as string) || 'demo';
    const tenant = await fastify.prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) return reply.code(404).send({ success: false, error: { code: 'TENANT_NOT_FOUND', message: 'Tenant not found' } });

    try {
      const tokens = await authService.login(body, tenant.id);
      return { success: true, data: tokens };
    } catch {
      return reply.code(401).send({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
    }
  });

  fastify.post('/auth/refresh', async (req, reply) => {
    const { refreshToken } = RefreshTokenSchema.parse(req.body);
    try {
      const tokens = await authService.refresh(refreshToken);
      return { success: true, data: tokens };
    } catch {
      return reply.code(401).send({ success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid refresh token' } });
    }
  });

  fastify.post('/auth/logout', { preHandler: [requireAuth] }, async (req, reply) => {
    const { refreshToken } = RefreshTokenSchema.parse(req.body);
    await authService.logout(refreshToken);
    return { success: true, data: null };
  });

  fastify.get('/auth/me', { preHandler: [requireAuth] }, async (req) => {
    const user = await fastify.prisma.user.findUnique({
      where: { id: req.user.sub },
      select: { id: true, name: true, email: true, role: true, avatarUrl: true, tenantId: true, lastLoginAt: true },
    });
    return { success: true, data: user };
  });
}
