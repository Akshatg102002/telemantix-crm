import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma';
import { queues } from '../lib/queue';
import { AutomationTrigger } from '@telemantix/shared';

/**
 * Runs matching automations for a given trigger event on a lead.
 * Enqueues each action as a BullMQ job for async execution.
 */
export async function runAutomations(tenantId: string, trigger: AutomationTrigger, leadId: string, context: Record<string, unknown> = {}) {
  const automations = await prisma.automation.findMany({
    where: { tenantId, trigger, isActive: true },
  });

  for (const automation of automations) {
    const conditions = automation.conditions as Array<{ field: string; operator: string; value: unknown }>;

    // Evaluate conditions
    if (conditions.length > 0) {
      const lead = await prisma.lead.findFirst({ where: { id: leadId, tenantId } });
      if (!lead) continue;

      const allMatch = conditions.every(cond => {
        const val = (lead as Record<string, unknown>)[cond.field] ?? (context[cond.field]);
        if (cond.operator === 'equals') return val === cond.value;
        if (cond.operator === 'not_equals') return val !== cond.value;
        if (cond.operator === 'greater_than') return Number(val) > Number(cond.value);
        if (cond.operator === 'less_than') return Number(val) < Number(cond.value);
        if (cond.operator === 'in') return Array.isArray(cond.value) && (cond.value as unknown[]).includes(val);
        return true;
      });
      if (!allMatch) continue;
    }

    await queues.automation.add('run', {
      tenantId,
      automationId: automation.id,
      leadId,
      actions: automation.actions,
      context,
    });
  }
}

export async function executeAutomationAction(
  tenantId: string,
  automationId: string,
  leadId: string,
  action: Record<string, unknown>
) {
  const logId = randomUUID();
  try {
    switch (action.type) {
      case 'change_status':
        await prisma.lead.update({
          where: { id: leadId },
          data: { statusId: action.statusId as string, subStatusId: (action.subStatusId as string | null) ?? null },
        });
        break;

      case 'assign_agent':
        if (action.mode === 'specific' && action.userId) {
          await prisma.lead.update({ where: { id: leadId }, data: { assignedUserId: action.userId as string } });
        }
        // round_robin / load_balanced handled by assignment engine
        break;

      case 'create_follow_up': {
        const delayMs = Number(action.delayHours ?? 0) * 60 * 60 * 1000;
        await prisma.followUp.create({
          data: {
            id: randomUUID(),
            tenantId,
            leadId,
            type: (action.followUpType as string) || 'call',
            scheduledAt: new Date(Date.now() + delayMs),
            note: (action.note as string | null) ?? null,
            status: 'pending',
          },
        });
        break;
      }

      case 'fire_webhook':
      case 'call_api':
        await queues.integration.add('outbound_webhook', {
          url: action.url,
          method: action.method || 'POST',
          headers: action.headers,
          bodyTemplate: action.bodyTemplate,
          leadId,
          tenantId,
        });
        break;
    }

    await prisma.automationLog.create({
      data: { id: logId, tenantId, automationId, leadId, status: 'success' },
    });
    await prisma.automation.update({
      where: { id: automationId },
      data: { runCount: { increment: 1 }, lastRunAt: new Date() },
    });
  } catch (err) {
    await prisma.automationLog.create({
      data: { id: logId, tenantId, automationId, leadId, status: 'failed', error: String(err) },
    });
    throw err;
  }
}
