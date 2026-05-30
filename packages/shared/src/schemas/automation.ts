import { z } from 'zod';
import { AUTOMATION_TRIGGERS, AUTOMATION_ACTIONS } from '../constants';

export const AutomationConditionSchema = z.object({
  field: z.string(),
  operator: z.enum(['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'in', 'not_in']),
  value: z.unknown(),
});

export const AutomationActionConfigSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('send_whatsapp'),
    templateId: z.string(),
    phoneField: z.string().default('phone'),
    variables: z.record(z.string(), z.string()).optional(),
  }),
  z.object({
    type: z.literal('send_email'),
    templateId: z.string().optional(),
    subject: z.string(),
    body: z.string(),
    toField: z.string().default('email'),
  }),
  z.object({
    type: z.literal('change_status'),
    statusId: z.string().uuid(),
    subStatusId: z.string().uuid().optional(),
  }),
  z.object({
    type: z.literal('assign_agent'),
    userId: z.string().uuid().optional(),
    mode: z.enum(['specific', 'round_robin', 'load_balanced']).default('specific'),
  }),
  z.object({
    type: z.literal('create_follow_up'),
    followUpType: z.string(),
    delayHours: z.number().min(0),
    note: z.string().optional(),
  }),
  z.object({
    type: z.literal('fire_webhook'),
    url: z.string().url(),
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH']).default('POST'),
    headers: z.record(z.string(), z.string()).optional(),
    bodyTemplate: z.string().optional(),
  }),
  z.object({
    type: z.literal('call_api'),
    url: z.string().url(),
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH']).default('POST'),
    headers: z.record(z.string(), z.string()).optional(),
    bodyTemplate: z.string().optional(),
  }),
]);

export const CreateAutomationSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  trigger: z.enum(AUTOMATION_TRIGGERS),
  triggerConfig: z.record(z.string(), z.unknown()).optional(),
  conditions: z.array(AutomationConditionSchema).optional(),
  actions: z.array(AutomationActionConfigSchema).min(1),
  isActive: z.boolean().default(true),
  serviceBoardId: z.string().uuid().optional().nullable(),
});

export const UpdateAutomationSchema = CreateAutomationSchema.partial();

export type AutomationCondition = z.infer<typeof AutomationConditionSchema>;
export type AutomationActionConfig = z.infer<typeof AutomationActionConfigSchema>;
export type CreateAutomationInput = z.infer<typeof CreateAutomationSchema>;
export type UpdateAutomationInput = z.infer<typeof UpdateAutomationSchema>;
