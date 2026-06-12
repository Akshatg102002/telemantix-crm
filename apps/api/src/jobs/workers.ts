import { Worker } from 'bullmq';
import { queueConnection } from '../lib/queue';
import { prisma } from '../lib/prisma';
import { emitToTenant } from '../lib/socket';
import { executeAutomationAction } from '../services/automation.service';
import { IntegrationService } from '../services/integration.service';


const integrationService = new IntegrationService(prisma);

function integrationWorker(queueName: 'indiamart-sync' | 'meta-sync' | 'googleads-sync' | 'exotel-sync', type: string) {
  return new Worker(
    queueName,
    async job => {
      const tenantId = String(job.data.tenantId);
      await integrationService.sync(type, tenantId);
    },
    { connection: queueConnection, concurrency: 3 }
  );
}

export const indiaMartSyncWorker = integrationWorker('indiamart-sync', 'indiamart');
export const metaSyncWorker = integrationWorker('meta-sync', 'meta');
export const googleAdsSyncWorker = integrationWorker('googleads-sync', 'google_ads');
export const exotelSyncWorker = integrationWorker('exotel-sync', 'exotel');

// Follow-up reminder worker — fires 15min before scheduled follow-up
export const followUpReminderWorker = new Worker(
  'follow-up-reminder',
  async job => {
    const { followUpId, tenantId, userId } = job.data;
    const followUp = await prisma.followUp.findUnique({ where: { id: followUpId } });
    if (!followUp || followUp.status !== 'pending') return;

    await prisma.notification.create({
      data: {
        id: crypto.randomUUID(),
        tenantId,
        userId,
        title: 'Follow-up Reminder',
        body: `Your ${followUp.type} follow-up is due in 15 minutes`,
        type: 'follow_up_reminder',
        data: { followUpId },
      },
    });
    emitToTenant(tenantId, 'follow_up:reminder', { followUpId, leadId: followUp.leadId, scheduledAt: followUp.scheduledAt });
  },
  { connection: queueConnection }
);

// Automation worker — executes automation actions
export const automationWorker = new Worker(
  'automation',
  async job => {
    const { tenantId, automationId, leadId, actions } = job.data;
    const actionList = actions as Array<Record<string, unknown>>;
    for (const action of actionList) {
      await executeAutomationAction(tenantId, automationId, leadId, action);
    }
  },
  { connection: queueConnection, concurrency: 10 }
);

// Notification worker
export const notificationWorker = new Worker(
  'notification',
  async job => {
    const { tenantId, userId, title, body, type, data } = job.data;
    await prisma.notification.create({
      data: { id: crypto.randomUUID(), tenantId, userId, title, body, type, data },
    });
    emitToTenant(tenantId, 'notification:new', { title, body, type });
  },
  { connection: queueConnection }
);

// Missed follow-up checker cron — mark overdue follow-ups and trigger automations
export const missedFollowUpWorker = new Worker(
  'integration',
  async job => {
    if (job.name === 'check_missed_followups') {
      const overdue = await prisma.followUp.findMany({
        where: { status: 'pending', scheduledAt: { lt: new Date() } },
        take: 500,
      });
      for (const f of overdue) {
        await prisma.followUp.update({ where: { id: f.id }, data: { status: 'missed' } });
      }
    }
  },
  { connection: queueConnection }
);

console.log('[Workers] All BullMQ workers started');
