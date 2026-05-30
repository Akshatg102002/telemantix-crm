import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { LeadService } from '../services/lead.service';
import { runAutomations } from '../services/automation.service';

/**
 * Generic inbound webhook endpoint for external integrations.
 * Each tenant gets a unique token per integration. Payload is mapped
 * to lead fields via the field-mapping config stored in Integration.config.
 */
export async function webhookRoutes(fastify: FastifyInstance) {
  const leadService = new LeadService();

  fastify.post('/webhooks/inbound/:tenantId/:token', async (req, reply) => {
    const { tenantId, token } = req.params as { tenantId: string; token: string };
    const body = req.body as Record<string, unknown>;

    const integration = await fastify.prisma.integration.findFirst({
      where: { tenantId, webhookToken: token },
    });
    if (!integration) return reply.code(401).send({ success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid webhook token' } });

    // Log inbound webhook
    await fastify.prisma.webhookLog.create({
      data: {
        id: randomUUID(),
        tenantId,
        integrationId: integration.id,
        direction: 'inbound',
        source: integration.type,
        requestBody: body,
      },
    });

    // Map payload to lead fields using integration config
    const config = integration.config as Record<string, unknown>;
    const fieldMap = (config.fieldMapping as Record<string, string>) || {};

    const leadData: Record<string, unknown> = {
      sourceId: config.leadSourceId,
    };
    for (const [leadField, payloadPath] of Object.entries(fieldMap)) {
      const pathParts = (payloadPath as string).split('.');
      let val: unknown = body;
      for (const part of pathParts) {
        val = (val as Record<string, unknown>)?.[part];
      }
      leadData[leadField] = val;
    }

    // Fallback for common field names across known portals
    if (!leadData.name) leadData.name = body.name || body.sender_name || body.full_name || 'Unknown';
    if (!leadData.phone) leadData.phone = body.phone || body.mobile || body.contact_number || '';
    if (!leadData.email) leadData.email = body.email || body.email_id || null;

    if (!leadData.phone) return reply.code(200).send({ success: true, data: { skipped: true, reason: 'no_phone' } });

    try {
      const lead = await leadService.create(tenantId, 'system', {
        name: String(leadData.name),
        phone: String(leadData.phone),
        email: leadData.email ? String(leadData.email) : undefined,
        sourceId: leadData.sourceId ? String(leadData.sourceId) : undefined,
        notes: `Inbound from ${integration.type}`,
      });
      await runAutomations(tenantId, 'lead_created', lead.id, { source: integration.type });
      return { success: true, data: { leadId: lead.id } };
    } catch (err) {
      return reply.code(500).send({ success: false, error: { code: 'CREATE_FAILED', message: String(err) } });
    }
  });

  // Meta webhook verification
  fastify.get('/webhooks/meta', async (req, reply) => {
    const q = req.query as Record<string, string>;
    if (q['hub.verify_token'] === process.env.META_VERIFY_TOKEN) {
      return reply.send(q['hub.challenge']);
    }
    return reply.code(403).send('Forbidden');
  });

  // Meta lead ads webhook
  fastify.post('/webhooks/meta', async (req, reply) => {
    const body = req.body as Record<string, unknown>;
    const entries = (body.entry as Array<Record<string, unknown>>) || [];

    for (const entry of entries) {
      const changes = (entry.changes as Array<Record<string, unknown>>) || [];
      for (const change of changes) {
        if (change.field === 'leadgen') {
          const val = change.value as Record<string, unknown>;
          const tenantId = val.ad_account_id as string;
          const integration = await fastify.prisma.integration.findFirst({
            where: { type: 'meta_ads', isConnected: true },
          });
          if (!integration) continue;

          await fastify.prisma.webhookLog.create({
            data: { id: randomUUID(), tenantId: integration.tenantId, integrationId: integration.id, direction: 'inbound', source: 'meta_ads', requestBody: val },
          });
        }
      }
    }

    return reply.send('EVENT_RECEIVED');
  });
}
