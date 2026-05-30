/**
 * Super admin JWT middleware.
 * Uses a separate JWT secret (SUPER_ADMIN_JWT_SECRET) from regular user auth.
 */
import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';

const SUPER_ADMIN_SECRET = process.env.SUPER_ADMIN_JWT_SECRET || 'super_admin_dev_secret_change_in_production_min_32';

export interface SuperAdminPayload {
  sub: string;
  email: string;
  type: 'super_admin';
}

export function signSuperAdminToken(payload: Omit<SuperAdminPayload, 'type'>): string {
  return jwt.sign({ ...payload, type: 'super_admin' }, SUPER_ADMIN_SECRET, { expiresIn: '8h' });
}

export async function requireSuperAdmin(req: FastifyRequest, reply: FastifyReply) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.code(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing super admin token' } });
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, SUPER_ADMIN_SECRET) as SuperAdminPayload;
    if (payload.type !== 'super_admin') throw new Error('invalid type');
    (req as FastifyRequest & { superAdmin: SuperAdminPayload }).superAdmin = payload;
  } catch {
    return reply.code(401).send({ success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid or expired super admin token' } });
  }
}
