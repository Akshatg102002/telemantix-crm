import { z } from 'zod';
import { FOLLOW_UP_TYPES, FOLLOW_UP_STATUSES, TASK_PRIORITIES, TASK_STATUSES } from '../constants';

export const CreateLeadSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().min(7).max(20),
  email: z.string().email().optional().nullable(),
  sourceId: z.string().uuid().optional().nullable(),
  serviceBoardId: z.string().uuid().optional().nullable(),
  assignedUserId: z.string().uuid().optional().nullable(),
  dealValue: z.number().min(0).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  customFields: z.record(z.string(), z.unknown()).optional(),
});

export const UpdateLeadSchema = CreateLeadSchema.partial().extend({
  statusId: z.string().uuid().optional().nullable(),
  subStatusId: z.string().uuid().optional().nullable(),
  score: z.number().min(0).max(100).optional(),
});

export const LeadFilterSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  statusId: z.string().uuid().optional(),
  subStatusId: z.string().uuid().optional(),
  sourceId: z.string().uuid().optional(),
  serviceBoardId: z.string().uuid().optional(),
  assignedUserId: z.string().uuid().optional(),
  scoreMin: z.coerce.number().optional(),
  scoreMax: z.coerce.number().optional(),
  createdFrom: z.string().datetime().optional(),
  createdTo: z.string().datetime().optional(),
  isStale: z.coerce.boolean().optional(),
  hasOverdueFollowUp: z.coerce.boolean().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name', 'score', 'dealValue']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const BulkLeadActionSchema = z.object({
  leadIds: z.array(z.string().uuid()).min(1).max(500),
  action: z.enum(['assign', 'refer', 'change_status', 'change_substatus', 'revive', 'export']),
  assignUserId: z.string().uuid().optional(),
  statusId: z.string().uuid().optional(),
  subStatusId: z.string().uuid().optional(),
  note: z.string().max(1000).optional(),
});

export const CreateFollowUpSchema = z.object({
  leadId: z.string().uuid(),
  type: z.enum(FOLLOW_UP_TYPES),
  scheduledAt: z.string().datetime(),
  note: z.string().max(2000).optional().nullable(),
  assignedUserId: z.string().uuid().optional().nullable(),
});

export const UpdateFollowUpSchema = z.object({
  type: z.enum(FOLLOW_UP_TYPES).optional(),
  scheduledAt: z.string().datetime().optional(),
  note: z.string().max(2000).optional().nullable(),
  status: z.enum(FOLLOW_UP_STATUSES).optional(),
  completedAt: z.string().datetime().optional().nullable(),
});

export const CreateTaskSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(5000).optional().nullable(),
  leadId: z.string().uuid().optional().nullable(),
  assignedUserId: z.string().uuid().optional().nullable(),
  priority: z.enum(TASK_PRIORITIES).default('medium'),
  dueDate: z.string().datetime().optional().nullable(),
});

export const UpdateTaskSchema = CreateTaskSchema.partial().extend({
  status: z.enum(TASK_STATUSES).optional(),
});

export type CreateLeadInput = z.infer<typeof CreateLeadSchema>;
export type UpdateLeadInput = z.infer<typeof UpdateLeadSchema>;
export type LeadFilterInput = z.infer<typeof LeadFilterSchema>;
export type BulkLeadActionInput = z.infer<typeof BulkLeadActionSchema>;
export type CreateFollowUpInput = z.infer<typeof CreateFollowUpSchema>;
export type UpdateFollowUpInput = z.infer<typeof UpdateFollowUpSchema>;
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
