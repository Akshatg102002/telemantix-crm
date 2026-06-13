import 'dotenv/config';
import { createServer } from 'http';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';

import prismaPlugin from './plugins/prisma';
import { authRoutes } from './routes/auth';
import { leadRoutes } from './routes/leads';
import { followUpRoutes } from './routes/followups';
import { automationRoutes } from './routes/automations';
import { integrationRoutes } from './routes/integrations';
import { webhookRoutes } from './routes/webhooks';
import { analyticsRoutes } from './routes/analytics';
import { notificationRoutes } from './routes/notifications';
import { settingsRoutes } from './routes/settings';
import { serviceBoardRoutes } from './routes/service-boards';
import { userRoutes } from './routes/users';
import { publisherRoutes } from './routes/publishers';
import { taskRoutes } from './routes/tasks';
import { customFieldRoutes } from './routes/custom-fields';
import { publicRoutes } from './routes/public';
import { superAdminRoutes } from './routes/super-admin';
import { contactRoutes } from './routes/contacts';
import { whatsappRoutes } from './routes/whatsapp';
import { securityRoutes } from './routes/security';
import { toolsRoutes } from './routes/tools';
import { aiRoutes } from './routes/ai';
import { emailRoutes } from './routes/email';
import { initSocket } from './lib/socket';

// Start BullMQ workers
import './jobs/workers';

const fastify = Fastify({ logger: { level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' } });

async function bootstrap() {
  await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })

  await fastify.register(helmet, { contentSecurityPolicy: false });

  await fastify.register(rateLimit, {
    max: 200,
    timeWindow: '1 minute',
    skipOnError: true,
  });

  await fastify.register(jwt, {
    secret: process.env.JWT_ACCESS_SECRET || 'dev_access_secret_change_in_production',
  });

  await fastify.register(prismaPlugin);

  // Register all route groups under /api prefix (no fp() wrapper — keeps scopes isolated)
  await fastify.register(authRoutes, { prefix: '/api' });
  await fastify.register(userRoutes, { prefix: '/api' });
  await fastify.register(leadRoutes, { prefix: '/api' });
  await fastify.register(followUpRoutes, { prefix: '/api' });
  await fastify.register(automationRoutes, { prefix: '/api' });
  await fastify.register(integrationRoutes, { prefix: '/api' });
  await fastify.register(webhookRoutes, { prefix: '/api' });
  await fastify.register(analyticsRoutes, { prefix: '/api' });
  await fastify.register(notificationRoutes, { prefix: '/api' });
  await fastify.register(settingsRoutes, { prefix: '/api' });
  await fastify.register(serviceBoardRoutes, { prefix: '/api' });
  await fastify.register(publisherRoutes, { prefix: '/api' });
  await fastify.register(taskRoutes, { prefix: '/api' });
  await fastify.register(customFieldRoutes, { prefix: '/api' });
  await fastify.register(publicRoutes, { prefix: '/api' });
  await fastify.register(superAdminRoutes, { prefix: '/api' });
  await fastify.register(contactRoutes, { prefix: '/api' });
  await fastify.register(whatsappRoutes, { prefix: '/api' });
  await fastify.register(securityRoutes, { prefix: '/api' });
  await fastify.register(toolsRoutes, { prefix: '/api' });
  await fastify.register(aiRoutes, { prefix: '/api' });
  await fastify.register(emailRoutes, { prefix: '/api' });

  fastify.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }));

  const httpServer = createServer(fastify.server);
  initSocket(httpServer);

  const port = Number(process.env.PORT) || 4000;
  await fastify.listen({ port, host: '0.0.0.0' });
  console.log(`[API] Telemantix API running on http://localhost:${port}`);
}

bootstrap().catch(err => {
  console.error('[API] Fatal error:', err);
  process.exit(1);
});