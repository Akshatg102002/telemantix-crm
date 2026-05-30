import 'dotenv/config';
import { createServer } from 'http';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import fp from 'fastify-plugin';

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
import { initSocket } from './lib/socket';

// Start BullMQ workers
import './jobs/workers';

const fastify = Fastify({ logger: { level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' } });

async function bootstrap() {
  await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  });

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

  // Register all route groups under /api prefix
  await fastify.register(fp(authRoutes), { prefix: '/api' });
  await fastify.register(fp(userRoutes), { prefix: '/api' });
  await fastify.register(fp(leadRoutes), { prefix: '/api' });
  await fastify.register(fp(followUpRoutes), { prefix: '/api' });
  await fastify.register(fp(automationRoutes), { prefix: '/api' });
  await fastify.register(fp(integrationRoutes), { prefix: '/api' });
  await fastify.register(fp(webhookRoutes), { prefix: '/api' });
  await fastify.register(fp(analyticsRoutes), { prefix: '/api' });
  await fastify.register(fp(notificationRoutes), { prefix: '/api' });
  await fastify.register(fp(settingsRoutes), { prefix: '/api' });
  await fastify.register(fp(serviceBoardRoutes), { prefix: '/api' });
  await fastify.register(fp(publisherRoutes), { prefix: '/api' });
  await fastify.register(fp(taskRoutes), { prefix: '/api' });
  await fastify.register(fp(customFieldRoutes), { prefix: '/api' });

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
