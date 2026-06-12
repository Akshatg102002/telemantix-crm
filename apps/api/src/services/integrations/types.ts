export const INTEGRATION_TYPES = [
  'meta',
  'whatsapp',
  'exotel',
  'sendgrid',
  'resend',
  'google_ads',
  'indiamart',
  'justdial',
  '99acres',
  'housing',
] as const;

export type IntegrationType = typeof INTEGRATION_TYPES[number];
export type IntegrationStatus = 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'SYNCING';

export type CredentialMap = Record<string, string>;

export interface NormalizedLead {
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  sourceName: string;
  externalId?: string;
  rawPayload: Record<string, unknown>;
}

export interface IntegrationDefinition {
  type: IntegrationType;
  name: string;
  credentialKeys: string[];
  configKeys: string[];
  webhook: boolean;
  syncQueue?: 'indiamart-sync' | 'meta-sync' | 'googleads-sync' | 'exotel-sync';
}

export const INTEGRATION_DEFINITIONS: Record<IntegrationType, IntegrationDefinition> = {
  meta: { type: 'meta', name: 'Meta Facebook Lead Ads', credentialKeys: ['accessToken'], configKeys: ['pageId', 'formId'], webhook: true, syncQueue: 'meta-sync' },
  whatsapp: { type: 'whatsapp', name: 'WhatsApp Cloud API', credentialKeys: ['accessToken'], configKeys: ['phoneNumberId', 'businessAccountId'], webhook: true },
  exotel: { type: 'exotel', name: 'Exotel IVR', credentialKeys: ['apiKey', 'apiToken'], configKeys: ['sid', 'subdomain', 'callerId'], webhook: true, syncQueue: 'exotel-sync' },
  sendgrid: { type: 'sendgrid', name: 'SendGrid', credentialKeys: ['apiKey'], configKeys: ['fromEmail'], webhook: false },
  resend: { type: 'resend', name: 'Resend', credentialKeys: ['apiKey'], configKeys: ['fromEmail'], webhook: false },
  google_ads: { type: 'google_ads', name: 'Google Ads', credentialKeys: ['clientId', 'clientSecret', 'refreshToken', 'developerToken'], configKeys: ['customerId', 'loginCustomerId'], webhook: false, syncQueue: 'googleads-sync' },
  indiamart: { type: 'indiamart', name: 'IndiaMART', credentialKeys: ['apiKey'], configKeys: ['mobileNo'], webhook: true, syncQueue: 'indiamart-sync' },
  justdial: { type: 'justdial', name: 'JustDial', credentialKeys: [], configKeys: [], webhook: true },
  '99acres': { type: '99acres', name: '99acres', credentialKeys: [], configKeys: [], webhook: true },
  housing: { type: 'housing', name: 'Housing.com', credentialKeys: [], configKeys: [], webhook: true },
};

export function assertIntegrationType(type: string): IntegrationType {
  if (!INTEGRATION_TYPES.includes(type as IntegrationType)) throw new Error(`Unsupported integration type: ${type}`);
  return type as IntegrationType;
}
