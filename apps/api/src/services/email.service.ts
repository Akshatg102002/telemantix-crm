import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { Resend } from 'resend';
import { decrypt } from '../lib/crypto';

export interface SendEmailInput {
  tenantId: string;
  to: string | string[];
  subject: string;
  html: string;
}

export class EmailService {
  constructor(private prisma: PrismaClient) {}

  async sendEmail(input: SendEmailInput) {
    const provider = await this.loadResendProvider(input.tenantId);
    const resend = new Resend(provider.apiKey);

    try {
      const result = await resend.emails.send({
        from: provider.fromEmail,
        to: input.to,
        subject: input.subject,
        html: input.html,
      });
      const providerError = this.extractProviderError(result);
      if (providerError) throw providerError;
      const providerMessageId = this.extractMessageId(result);
      const log = await this.createLog(input, provider.fromEmail, 'sent', providerMessageId);
      return { id: providerMessageId, logId: log.id, provider: 'resend', status: log.status };
    } catch (err) {
      await this.createLog(input, provider.fromEmail, 'failed');
      throw new Error(this.resendErrorMessage(err));
    }
  }

  async sendTestEmail(tenantId: string, email: string) {
    return this.sendEmail({
      tenantId,
      to: email,
      subject: 'Telemantix CRM test email',
      html: '<h1>Resend is connected</h1><p>Your Telemantix CRM Resend integration can send email successfully.</p>',
    });
  }

  async sendBulkEmail(tenantId: string, messages: Array<Omit<SendEmailInput, 'tenantId'>>) {
    const results = [];
    for (const message of messages) {
      results.push(await this.sendEmail({ tenantId, ...message }));
    }
    return results;
  }

  async listSettings(tenantId: string) {
    const integration = await this.prisma.integration.findFirst({ where: { tenantId, type: 'resend', isConnected: true, status: 'CONNECTED' as any } });
    const config = (integration?.config || {}) as Record<string, unknown>;
    const logs = await (this.prisma as any).emailLog.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 100 });
    return {
      provider: integration ? 'resend' : null,
      connectedProvider: integration?.name || null,
      senderEmail: typeof config.fromEmail === 'string' ? config.fromEmail : null,
      emails: logs,
    };
  }

  async handleResendWebhook(payload: Record<string, unknown>) {
    const data = (payload.data || payload) as Record<string, unknown>;
    const providerMessageId = String(data.email_id || data.id || data.message_id || '');
    const type = String(payload.type || data.type || '').toLowerCase();
    if (!providerMessageId) return { updated: 0 };
    const status = type.includes('delivered') ? 'delivered' : type.includes('bounce') ? 'bounced' : type.includes('complain') ? 'complained' : type || 'updated';
    const result = await (this.prisma as any).emailLog.updateMany({ where: { provider: 'resend', providerMessageId }, data: { status } });
    return { updated: result.count, status };
  }

  private async loadResendProvider(tenantId: string) {
    const integration = await this.prisma.integration.findFirst({ where: { tenantId, type: 'resend', isConnected: true, status: 'CONNECTED' as any } });
    if (!integration) throw new Error('Resend integration is not connected for this tenant.');
    const config = (integration.config || {}) as Record<string, unknown>;
    const fromEmail = typeof config.fromEmail === 'string' ? config.fromEmail.trim() : '';
    if (!fromEmail) throw new Error('Missing sender email. Configure Resend From Email before sending.');
    const secret = await this.prisma.integrationSecret.findFirst({ where: { tenantId, provider: 'resend', keyName: 'apiKey', isActive: true } });
    if (!secret) throw new Error('Invalid API key. Reconnect Resend with a valid API key.');
    return { apiKey: decrypt(secret.encryptedValue), fromEmail };
  }

  private async createLog(input: SendEmailInput, fromEmail: string, status: string, providerMessageId?: string | null) {
    return (this.prisma as any).emailLog.create({ data: { id: randomUUID(), tenantId: input.tenantId, to: Array.isArray(input.to) ? input.to.join(',') : input.to, from: fromEmail, subject: input.subject, provider: 'resend', status, providerMessageId } });
  }

  private extractProviderError(result: unknown) {
    const data = result as { error?: { message?: string; name?: string } | string };
    if (!data?.error) return null;
    return new Error(typeof data.error === 'string' ? data.error : data.error.message || data.error.name || 'Resend API failure');
  }

  private extractMessageId(result: unknown) {
    const data = result as { data?: { id?: string }; id?: string };
    return data.data?.id || data.id || null;
  }

  private resendErrorMessage(err: unknown) {
    const anyErr = err as { message?: string; name?: string; statusCode?: number; response?: { data?: { message?: string; name?: string } } };
    const raw = anyErr.response?.data?.message || anyErr.message || String(err);
    const lower = raw.toLowerCase();
    if (anyErr.statusCode === 401 || lower.includes('api key') || lower.includes('unauthorized')) return 'Invalid API key. Reconnect Resend with a valid API key.';
    if (lower.includes('domain') && (lower.includes('verify') || lower.includes('not found'))) return 'Domain not verified in Resend. Verify the sender domain before sending.';
    if (lower.includes('from') || lower.includes('sender')) return 'Missing sender email or sender domain is not verified.';
    return `Resend API failure: ${raw}`;
  }
}
