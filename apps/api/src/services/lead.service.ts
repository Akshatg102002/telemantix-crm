import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma';
import { emitToTenant } from '../lib/socket';
import { CreateLeadInput, UpdateLeadInput, LeadFilterInput, BulkLeadActionInput } from '@telemantix/shared';

export class LeadService {
  async list(tenantId: string, filters: LeadFilterInput) {
    const { page, limit, search, statusId, subStatusId, sourceId, serviceBoardId,
      assignedUserId, scoreMin, scoreMax, createdFrom, createdTo, isStale,
      hasOverdueFollowUp, sortBy, sortOrder } = filters;

    const where: Record<string, unknown> = { tenantId };
    if (search) where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
    if (statusId) where.statusId = statusId;
    if (subStatusId) where.subStatusId = subStatusId;
    if (sourceId) where.sourceId = sourceId;
    if (serviceBoardId) where.serviceBoardId = serviceBoardId;
    if (assignedUserId) where.assignedUserId = assignedUserId;
    if (scoreMin !== undefined) where.score = { ...(where.score as object || {}), gte: scoreMin };
    if (scoreMax !== undefined) where.score = { ...(where.score as object || {}), lte: scoreMax };
    if (createdFrom) where.createdAt = { ...(where.createdAt as object || {}), gte: new Date(createdFrom) };
    if (createdTo) where.createdAt = { ...(where.createdAt as object || {}), lte: new Date(createdTo) };
    if (isStale !== undefined) where.isStale = isStale;
    if (hasOverdueFollowUp) {
      where.followUps = { some: { status: 'pending', scheduledAt: { lt: new Date() } } };
    }

    const [total, leads] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        include: {
          source: true,
          status: true,
          subStatus: true,
          assignedUser: { select: { id: true, name: true, avatarUrl: true } },
          serviceBoard: true,
          _count: { select: { followUps: true, tasks: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
    ]);

    return { leads, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findById(tenantId: string, id: string) {
    const lead = await prisma.lead.findFirst({
      where: { id, tenantId },
      include: {
        source: true,
        status: true,
        subStatus: true,
        serviceBoard: { include: { statuses: { include: { subStatuses: true } } } },
        assignedUser: { select: { id: true, name: true, avatarUrl: true, email: true } },
        publisher: true,
        reEnquiries: { select: { id: true, name: true, createdAt: true } },
        histories: { orderBy: { createdAt: 'desc' }, take: 50 },
        followUps: { where: { status: { not: 'cancelled' } }, orderBy: { scheduledAt: 'asc' } },
        tasks: { where: { status: { not: 'cancelled' } }, orderBy: { dueDate: 'asc' } },
        customFieldValues: { include: { customField: { include: { customSection: true } } } },
      },
    });
    if (!lead) throw new Error('LEAD_NOT_FOUND');
    return lead;
  }

  async create(tenantId: string, userId: string, input: CreateLeadInput) {
    // Check for duplicate phone/email → re-enquiry
    const duplicate = await prisma.lead.findFirst({
      where: { tenantId, OR: [{ phone: input.phone }, ...(input.email ? [{ email: input.email }] : [])] },
      orderBy: { createdAt: 'asc' },
    });

    const lead = await prisma.lead.create({
      data: {
        id: randomUUID(),
        tenantId,
        createdByUserId: userId,
        ...input,
        originalLeadId: duplicate?.id,
        reEnquiredCount: 0,
      },
    });

    if (duplicate) {
      await prisma.lead.update({
        where: { id: duplicate.id },
        data: { reEnquiredCount: { increment: 1 } },
      });
    }

    await this.logHistory(tenantId, lead.id, userId, 'created', null, null, null, 'Lead created');
    emitToTenant(tenantId, 'activity:new', { type: 'lead_created', payload: { leadId: lead.id, name: lead.name } });

    return lead;
  }

  async update(tenantId: string, leadId: string, userId: string, input: UpdateLeadInput) {
    const existing = await prisma.lead.findFirst({ where: { id: leadId, tenantId } });
    if (!existing) throw new Error('LEAD_NOT_FOUND');

    const lead = await prisma.lead.update({
      where: { id: leadId },
      data: input,
    });

    // Log field changes
    for (const [field, newVal] of Object.entries(input)) {
      const oldVal = (existing as Record<string, unknown>)[field];
      if (oldVal !== newVal) {
        await this.logHistory(tenantId, leadId, userId, 'updated', field, String(oldVal ?? ''), String(newVal ?? ''));
      }
    }

    if (input.statusId && input.statusId !== existing.statusId) {
      emitToTenant(tenantId, 'lead:status_changed', { leadId, statusId: input.statusId });
    }
    if (input.assignedUserId && input.assignedUserId !== existing.assignedUserId) {
      emitToTenant(tenantId, 'lead:assigned', { leadId, agentId: input.assignedUserId });
    }

    return lead;
  }

  async bulkAction(tenantId: string, userId: string, input: BulkLeadActionInput) {
    const { leadIds, action, assignUserId, statusId, subStatusId, note } = input;

    switch (action) {
      case 'assign':
        if (!assignUserId) throw new Error('assignUserId required');
        await prisma.lead.updateMany({ where: { id: { in: leadIds }, tenantId }, data: { assignedUserId: assignUserId } });
        break;
      case 'change_status':
        if (!statusId) throw new Error('statusId required');
        await prisma.lead.updateMany({ where: { id: { in: leadIds }, tenantId }, data: { statusId, subStatusId: subStatusId ?? null } });
        break;
      case 'revive':
        await prisma.lead.updateMany({ where: { id: { in: leadIds }, tenantId }, data: { isStale: false } });
        break;
    }

    for (const leadId of leadIds) {
      await this.logHistory(tenantId, leadId, userId, `bulk_${action}`, null, null, null, note);
    }

    return { affected: leadIds.length };
  }

  async computeScore(tenantId: string, leadId: string): Promise<number> {
    const [lead, rules] = await Promise.all([
      prisma.lead.findFirst({ where: { id: leadId, tenantId } }),
      prisma.leadScore.findMany({ where: { tenantId, isActive: true } }),
    ]);
    if (!lead) return 0;

    let score = 0;
    for (const rule of rules) {
      const fieldVal = (lead as Record<string, unknown>)[rule.field];
      const ruleVal = rule.value as unknown;
      let match = false;

      if (rule.operator === 'equals') match = fieldVal === ruleVal;
      else if (rule.operator === 'not_equals') match = fieldVal !== ruleVal;
      else if (rule.operator === 'greater_than') match = Number(fieldVal) > Number(ruleVal);
      else if (rule.operator === 'less_than') match = Number(fieldVal) < Number(ruleVal);

      if (match) score += rule.weight;
    }

    const clamped = Math.min(100, Math.max(0, Math.round(score)));
    await prisma.lead.update({ where: { id: leadId }, data: { score: clamped } });
    return clamped;
  }

  private async logHistory(
    tenantId: string, leadId: string, userId: string, event: string,
    field: string | null, oldValue: string | null, newValue: string | null, note?: string | null
  ) {
    await prisma.leadHistory.create({
      data: { id: randomUUID(), tenantId, leadId, userId, event, field, oldValue, newValue, note },
    });
  }
}
