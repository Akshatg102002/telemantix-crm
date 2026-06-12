import axios, { AxiosRequestConfig } from 'axios';
import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { encrypt, decrypt, maskSecret } from '../lib/crypto';
import { writeAuditLog } from '../lib/audit';
import { queues } from '../lib/queue';
import { normalizeLead } from './integrations/lead-normalizer';
import { assertIntegrationType, CredentialMap, INTEGRATION_DEFINITIONS, IntegrationType, NormalizedLead } from './integrations/types';
import { withRetry } from './integrations/retry';
import { runAutomations } from './automation.service';

const publicBaseUrl = () => (process.env.PUBLIC_API_URL || process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 4000}`).replace(/\/$/, '');

type RequestUser = { sub?: string; tenantId: string; role?: string; email?: string };

export class IntegrationService {
  constructor(private prisma: PrismaClient) {}

  async list(tenantId: string) {
    const integrations = await this.prisma.integration.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
    return Promise.all(integrations.map(async integration => {
      const secrets = await this.prisma.integrationSecret.findMany({ where: { tenantId, provider: integration.type, isActive: true } });
      return {
        id: integration.id,
        type: integration.type,
        name: integration.name,
        status: (integration as any).status || (integration.isConnected ? 'CONNECTED' : 'DISCONNECTED'),
        isConnected: integration.isConnected,
        config: integration.config,
        webhookToken: integration.webhookToken,
        webhookUrl: integration.webhookToken ? `${publicBaseUrl()}/api/webhooks/${integration.type}?tenantId=${tenantId}&token=${integration.webhookToken}` : null,
        lastSyncAt: integration.lastSyncAt,
        lastError: (integration as any).lastError || null,
        importedLeadCount: (integration as any).importedLeadCount || 0,
        credentials: secrets.reduce<Record<string, string>>((acc, secret) => ({ ...acc, [secret.keyName]: maskSecret(secret.encryptedValue) }), {}),
        createdAt: integration.createdAt,
        updatedAt: integration.updatedAt,
      };
    }));
  }

  async connect(tenantId: string, typeRaw: string, body: Record<string, unknown>, user?: RequestUser, requestMeta?: { ipAddress?: string; userAgent?: string }) {
    const type = assertIntegrationType(typeRaw);
    const definition = INTEGRATION_DEFINITIONS[type];
    const config = this.pickStrings(body.config as Record<string, unknown> || body, definition.configKeys);
    const credentials = this.pickStrings(body.credentials as Record<string, unknown> || body, definition.credentialKeys);
    const existing = await this.prisma.integration.findUnique({ where: { tenantId_type: { tenantId, type } } });
    const webhookToken = existing?.webhookToken || randomUUID();

    const integration = existing
      ? await this.prisma.integration.update({ where: { id: existing.id }, data: { name: definition.name, config, webhookToken, isConnected: true, status: 'CONNECTED' as any, lastError: null as any } as any })
      : await this.prisma.integration.create({ data: { id: randomUUID(), tenantId, type, name: definition.name, config, webhookToken, isConnected: true, status: 'CONNECTED' as any } as any });

    await Promise.all(Object.entries(credentials).map(([keyName, value]) => this.prisma.integrationSecret.upsert({
      where: { tenantId_provider_keyName: { tenantId, provider: type, keyName } },
      update: { encryptedValue: encrypt(value), isActive: true, testStatus: null },
      create: { id: randomUUID(), tenantId, provider: type, keyName, encryptedValue: encrypt(value), isActive: true },
    })));

    await writeAuditLog(this.prisma, { tenantId, userId: user?.sub, action: 'integration.connected', resource: 'Integration', resourceId: integration.id, metadata: { type }, ...requestMeta });
    return integration;
  }

  async disconnect(tenantId: string, typeRaw: string, user?: RequestUser, requestMeta?: { ipAddress?: string; userAgent?: string }) {
    const type = assertIntegrationType(typeRaw);
    const integration = await this.prisma.integration.findUnique({ where: { tenantId_type: { tenantId, type } } });
    if (!integration) throw new Error('INTEGRATION_NOT_FOUND');
    const updated = await this.prisma.integration.update({ where: { id: integration.id }, data: { isConnected: false, status: 'DISCONNECTED' as any } as any });
    await this.prisma.integrationSecret.updateMany({ where: { tenantId, provider: type }, data: { isActive: false } });
    await writeAuditLog(this.prisma, { tenantId, userId: user?.sub, action: 'integration.disconnected', resource: 'Integration', resourceId: integration.id, metadata: { type }, ...requestMeta });
    return updated;
  }

  async test(tenantId: string, typeRaw: string, body?: Record<string, unknown>, user?: RequestUser, requestMeta?: { ipAddress?: string; userAgent?: string }) {
    const type = assertIntegrationType(typeRaw);
    const integration = await this.prisma.integration.findUnique({ where: { tenantId_type: { tenantId, type } } });
    if (!integration) throw new Error('INTEGRATION_NOT_FOUND');
    const started = Date.now();
    try {
      const credentials = await this.credentials(tenantId, type);
      const config = { ...(integration.config as Record<string, string>), ...(body?.config as Record<string, string> || {}) };
      const result = await this.performTestCall(type, credentials, config);
      await this.prisma.integration.update({ where: { id: integration.id }, data: { status: 'CONNECTED' as any, isConnected: true, lastError: null as any } as any });
      await this.prisma.integrationSecret.updateMany({ where: { tenantId, provider: type }, data: { lastTestedAt: new Date(), testStatus: 'CONNECTED' } });
      await this.logWebhook(tenantId, integration.id, type, 'outbound', result, Date.now() - started);
      await writeAuditLog(this.prisma, { tenantId, userId: user?.sub, action: 'integration.tested', resource: 'Integration', resourceId: integration.id, metadata: { type, ok: true }, ...requestMeta });
      return result;
    } catch (err) {
      const message = this.errorMessage(err);
      await this.prisma.integration.update({ where: { id: integration.id }, data: { status: 'ERROR' as any, isConnected: false, lastError: message as any } as any });
      await this.prisma.integrationSecret.updateMany({ where: { tenantId, provider: type }, data: { lastTestedAt: new Date(), testStatus: 'ERROR' } });
      await this.logWebhook(tenantId, integration.id, type, 'outbound', { ok: false, error: message }, Date.now() - started);
      throw new Error(message);
    }
  }

  async ingestWebhook(typeRaw: string, tenantId: string, token: string, payload: Record<string, unknown>) {
    const type = assertIntegrationType(typeRaw);
    const integration = await this.prisma.integration.findFirst({ where: { tenantId, type, webhookToken: token } });
    if (!integration) throw new Error('INVALID_WEBHOOK_TOKEN');
    await this.logWebhook(tenantId, integration.id, type, 'inbound', payload);
    const normalized = normalizeLead(type, payload);
    if (!normalized) return { skipped: true, reason: 'missing_phone' };
    const lead = await this.createLead(tenantId, integration.id, normalized);
    return { leadId: lead.id, importedLeadCount: (integration as any).importedLeadCount + 1 };
  }

  async sync(typeRaw: string, tenantId: string) {
    const type = assertIntegrationType(typeRaw);
    const integration = await this.prisma.integration.findUnique({ where: { tenantId_type: { tenantId, type } } });
    if (!integration || !integration.isConnected) return { skipped: true };
    await this.prisma.integration.update({ where: { id: integration.id }, data: { status: 'SYNCING' as any } as any });
    try {
      const credentials = await this.credentials(tenantId, type);
      const config = integration.config as Record<string, string>;
      const leads = await this.fetchLeads(type, credentials, config, integration.lastSyncAt || undefined);
      let imported = 0;
      for (const normalized of leads) {
        await this.createLead(tenantId, integration.id, normalized);
        imported += 1;
      }
      const updated = await this.prisma.integration.update({ where: { id: integration.id }, data: { status: 'CONNECTED' as any, lastSyncAt: new Date(), lastError: null as any, importedLeadCount: { increment: imported } as any } as any });
      return { imported, lastSyncAt: updated.lastSyncAt };
    } catch (err) {
      const message = this.errorMessage(err);
      await this.prisma.integration.update({ where: { id: integration.id }, data: { status: 'ERROR' as any, lastError: message as any } as any });
      throw err;
    }
  }

  async enqueueSync(typeRaw: string, tenantId: string) {
    const type = assertIntegrationType(typeRaw);
    const queueName = INTEGRATION_DEFINITIONS[type].syncQueue;
    if (!queueName) return null;
    const queue = (queues as any)[queueName.replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase())] || queues.integration;
    return queue.add(`${type}:sync`, { tenantId, type }, { attempts: 5, backoff: { type: 'exponential', delay: 30000 }, removeOnComplete: 100, removeOnFail: 1000 });
  }

  private async credentials(tenantId: string, type: IntegrationType): Promise<CredentialMap> {
    const secrets = await this.prisma.integrationSecret.findMany({ where: { tenantId, provider: type, isActive: true } });
    return secrets.reduce<CredentialMap>((acc, secret) => ({ ...acc, [secret.keyName]: decrypt(secret.encryptedValue) }), {});
  }

  private pickStrings(input: Record<string, unknown>, keys: string[]) {
    return keys.reduce<Record<string, string>>((acc, key) => {
      if (typeof input[key] === 'string' && input[key]) acc[key] = input[key] as string;
      return acc;
    }, {});
  }

  private async performTestCall(type: IntegrationType, credentials: CredentialMap, config: Record<string, string>) {
    switch (type) {
      case 'meta': return this.request({ method: 'GET', url: `https://graph.facebook.com/v20.0/me`, params: { access_token: credentials.accessToken } });
      case 'whatsapp': return this.request({ method: 'GET', url: `https://graph.facebook.com/v20.0/${config.phoneNumberId}`, params: { access_token: credentials.accessToken } });
      case 'exotel': return this.request({ method: 'GET', url: `https://${credentials.apiKey}:${credentials.apiToken}@${config.subdomain || 'api.exotel.com'}/v1/Accounts/${config.sid}.json` });
      case 'sendgrid': return this.request({ method: 'GET', url: 'https://api.sendgrid.com/v3/user/account', headers: { Authorization: `Bearer ${credentials.apiKey}` } });
      case 'resend': return this.request({ method: 'GET', url: 'https://api.resend.com/domains', headers: { Authorization: `Bearer ${credentials.apiKey}` } });
      case 'google_ads': return this.googleAccessToken(credentials).then(token => ({ ok: true, provider: 'google_ads', tokenType: token.token_type }));
      case 'indiamart': return this.request({ method: 'GET', url: 'https://mapi.indiamart.com/wservce/enquiry/listing/GLUSR_MOBILE/WEBERP/', params: { glusr_mobile: config.mobileNo, glusr_crm_key: credentials.apiKey, start_time: this.indiaMartTime(new Date(Date.now() - 3600000)), end_time: this.indiaMartTime(new Date()) } });
      case 'justdial':
      case '99acres':
      case 'housing': return { ok: true, webhook: true, message: 'Webhook token is active' };
    }
  }

  private async fetchLeads(type: IntegrationType, credentials: CredentialMap, config: Record<string, string>, since?: Date): Promise<NormalizedLead[]> {
    const sinceDate = since || new Date(Date.now() - 24 * 3600000);
    if (type === 'indiamart') {
      const response = await this.request({ method: 'GET', url: 'https://mapi.indiamart.com/wservce/enquiry/listing/GLUSR_MOBILE/WEBERP/', params: { glusr_mobile: config.mobileNo, glusr_crm_key: credentials.apiKey, start_time: this.indiaMartTime(sinceDate), end_time: this.indiaMartTime(new Date()) } });
      const rows = Array.isArray((response as any).RESPONSE) ? (response as any).RESPONSE : Array.isArray(response) ? response : [];
      return rows.map((row: Record<string, unknown>) => normalizeLead(type, row)).filter(Boolean) as NormalizedLead[];
    }
    if (type === 'meta') {
      const response = await this.request({ method: 'GET', url: `https://graph.facebook.com/v20.0/${config.formId}/leads`, params: { access_token: credentials.accessToken, since: Math.floor(sinceDate.getTime() / 1000) } });
      return (((response as any).data || []) as Record<string, unknown>[]).map(row => normalizeLead(type, row)).filter(Boolean) as NormalizedLead[];
    }
    if (type === 'exotel') {
      const response = await this.request({ method: 'GET', url: `https://${credentials.apiKey}:${credentials.apiToken}@${config.subdomain || 'api.exotel.com'}/v1/Accounts/${config.sid}/Calls.json`, params: { DateCreated: sinceDate.toISOString().slice(0, 10) } });
      return (((response as any).Calls || []) as Record<string, unknown>[]).map(row => normalizeLead(type, row)).filter(Boolean) as NormalizedLead[];
    }
    if (type === 'google_ads') {
      await this.googleAccessToken(credentials);
      return [];
    }
    return [];
  }

  private async createLead(tenantId: string, integrationId: string, lead: NormalizedLead) {
    const source = await this.prisma.leadSource.upsert({
      where: { tenantId_name: { tenantId, name: lead.sourceName } },
      update: { isActive: true },
      create: { id: randomUUID(), tenantId, name: lead.sourceName, color: '#7B2FBE' },
    });
    const duplicate = await this.prisma.lead.findFirst({ where: { tenantId, OR: [{ phone: lead.phone }, ...(lead.email ? [{ email: lead.email }] : [])] }, orderBy: { createdAt: 'asc' } });
    const created = await this.prisma.lead.create({ data: { id: randomUUID(), tenantId, name: lead.name, phone: lead.phone, email: lead.email, sourceId: source.id, notes: lead.notes, originalLeadId: duplicate?.id } });
    if (duplicate) await this.prisma.lead.update({ where: { id: duplicate.id }, data: { reEnquiredCount: { increment: 1 } } });
    await this.prisma.leadHistory.create({ data: { id: randomUUID(), tenantId, leadId: created.id, event: 'integration_imported', note: `Imported by integration ${integrationId}` } });
    await this.prisma.integration.update({ where: { id: integrationId }, data: { importedLeadCount: { increment: 1 } as any } as any });
    await runAutomations(tenantId, 'lead_created', created.id, { source: lead.sourceName, integrationId, externalId: lead.externalId });
    return created;
  }

  private async request(config: AxiosRequestConfig) {
    const response = await withRetry(() => axios.request({ timeout: 15000, ...config }));
    return response.data;
  }

  private async googleAccessToken(credentials: CredentialMap) {
    return this.request({ method: 'POST', url: 'https://oauth2.googleapis.com/token', data: new URLSearchParams({ client_id: credentials.clientId, client_secret: credentials.clientSecret, refresh_token: credentials.refreshToken, grant_type: 'refresh_token' }).toString(), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  }

  private indiaMartTime(date: Date) {
    return date.toISOString().replace('T', ' ').slice(0, 19);
  }

  private async logWebhook(tenantId: string, integrationId: string, source: string, direction: string, body: unknown, durationMs?: number) {
    await this.prisma.webhookLog.create({ data: { id: randomUUID(), tenantId, integrationId, direction, source, requestBody: body as any, durationMs } });
  }

  private errorMessage(err: unknown) {
    if (axios.isAxiosError(err)) return String(err.response?.data?.error?.message || err.response?.data?.message || err.message);
    return err instanceof Error ? err.message : String(err);
  }
}
