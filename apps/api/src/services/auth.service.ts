import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma';
import { LoginInput, RegisterInput } from '@telemantix/shared';
import { FastifyInstance } from 'fastify';

export class AuthService {
  constructor(private readonly fastify: FastifyInstance) {}

  async login(input: LoginInput, tenantId: string) {
    const user = await prisma.user.findFirst({
      where: { email: input.email, tenantId, isActive: true },
    });
    if (!user) throw new Error('INVALID_CREDENTIALS');

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) throw new Error('INVALID_CREDENTIALS');

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    return this.generateTokens(user.id, user.tenantId, user.role);
  }

  async register(input: RegisterInput, tenantId: string) {
    const existing = await prisma.user.findFirst({ where: { email: input.email, tenantId } });
    if (existing) throw new Error('EMAIL_IN_USE');

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await prisma.user.create({
      data: { id: randomUUID(), tenantId, name: input.name, email: input.email, passwordHash },
    });
    return this.generateTokens(user.id, user.tenantId, user.role);
  }

  async refresh(token: string) {
    const stored = await prisma.refreshToken.findUnique({ where: { token }, include: { user: true } });
    if (!stored || stored.expiresAt < new Date()) throw new Error('INVALID_REFRESH_TOKEN');

    await prisma.refreshToken.delete({ where: { id: stored.id } });
    return this.generateTokens(stored.user.id, stored.user.tenantId, stored.user.role);
  }

  async logout(token: string) {
    await prisma.refreshToken.deleteMany({ where: { token } });
  }

  private async generateTokens(userId: string, tenantId: string, role: string) {
    const accessToken = this.fastify.jwt.sign(
      { sub: userId, tenantId, role },
      { expiresIn: '15m' }
    );
    const refreshToken = randomUUID();
    await prisma.refreshToken.create({
      data: {
        id: randomUUID(),
        userId,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    return { accessToken, refreshToken, expiresIn: 900 };
  }
}
