import '@fastify/jwt'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; tenantId: string; role: string; email?: string }
    user: { sub: string; tenantId: string; role: string; email?: string }
  }
}
