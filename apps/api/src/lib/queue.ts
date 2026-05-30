import { Queue, Worker, QueueOptions } from 'bullmq';
import { redis } from './redis';

const connection = { host: redis.options.host || 'localhost', port: redis.options.port || 6379 };

export const queues = {
  followUpReminder: new Queue('follow-up-reminder', { connection }),
  leadRevive: new Queue('lead-revive', { connection }),
  automation: new Queue('automation', { connection }),
  notification: new Queue('notification', { connection }),
  integration: new Queue('integration', { connection }),
};

export { Worker, connection as queueConnection };
