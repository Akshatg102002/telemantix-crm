export const ROLES = ['superadmin', 'admin', 'manager', 'agent'] as const;
export type Role = (typeof ROLES)[number];

export const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'negotiation', 'closed_won', 'closed_lost', 'revived'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const FOLLOW_UP_TYPES = ['call', 'whatsapp', 'email', 'meeting'] as const;
export type FollowUpType = (typeof FOLLOW_UP_TYPES)[number];

export const FOLLOW_UP_STATUSES = ['pending', 'done', 'missed', 'rescheduled', 'cancelled'] as const;
export type FollowUpStatus = (typeof FOLLOW_UP_STATUSES)[number];

export const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_STATUSES = ['open', 'in_progress', 'done', 'cancelled'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const CUSTOM_FIELD_TYPES = ['text', 'number', 'date', 'dropdown', 'multi_select', 'checkbox', 'file'] as const;
export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];

export const AUTOMATION_TRIGGERS = [
  'lead_created',
  'status_changed',
  'missed_follow_up',
  'lead_score_threshold',
  'webhook_received',
] as const;
export type AutomationTrigger = (typeof AUTOMATION_TRIGGERS)[number];

export const AUTOMATION_ACTIONS = [
  'send_whatsapp',
  'send_email',
  'change_status',
  'assign_agent',
  'create_follow_up',
  'fire_webhook',
  'call_api',
] as const;
export type AutomationAction = (typeof AUTOMATION_ACTIONS)[number];

export const ASSIGNMENT_MODES = ['round_robin', 'load_balanced', 'rule_based'] as const;
export type AssignmentMode = (typeof ASSIGNMENT_MODES)[number];

export const INTEGRATION_TYPES = [
  'meta_ads',
  'whatsapp',
  'exotel',
  'sendgrid',
  'resend',
  'google_ads',
  'indiamart',
  'justdial',
  'ninetynineacres',
  'housing',
  'tradeindia',
  'zapier',
] as const;
export type IntegrationType = (typeof INTEGRATION_TYPES)[number];

export const ACCESS_TOKEN_TTL = 15 * 60; // 15 minutes in seconds
export const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

export const PAGINATION_DEFAULTS = {
  page: 1,
  limit: 20,
  maxLimit: 100,
};

export const STALE_LEAD_DAYS = 7; // days without activity before lead is considered stale
export const FOLLOW_UP_REMINDER_MINUTES = 15;
