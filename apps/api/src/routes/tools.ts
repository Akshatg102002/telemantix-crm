/**
 * Import / Export tools routes.
 * Import: CSV/XLSX multipart upload → BullMQ job
 * Export: Generate CSV/JSON → return download
 */
import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { requireAuth } from '../middleware/auth';

export async function toolsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth);

  // ── Import ─────────────────────────────────────────────────────────────────
  fastify.post('/tools/import/leads', async (req, reply) => {
    const user = req.user as { sub: string; tenantId: string; role: string; email?: string };
    // In production: use @fastify/multipart to read CSV, parse fields, queue BullMQ job
    // For now: return a mock job ID that the frontend can poll
    const jobId = randomUUID();
    fastify.log.info({ jobId, tenantId: user.tenantId }, 'Lead import queued');
    reply.code(202);
    return {
      success: true,
      data: {
        jobId,
        status: 'queued',
        message: 'Import job queued. Poll /api/tools/import/:jobId/status for progress.',
      },
    };
  });

  fastify.get('/tools/import/:jobId/status', async (req) => {
    const { jobId } = req.params as { jobId: string };
    // Mock progress — in production query BullMQ job state
    return {
      success: true,
      data: {
        jobId,
        status: 'completed',
        progress: 100,
        totalRows: 150,
        imported: 142,
        skipped: 5,
        failed: 3,
        errors: [
          { row: 12, error: 'Invalid phone number format' },
          { row: 47, error: 'Duplicate email' },
          { row: 98, error: 'Missing required field: name' },
        ],
      },
    };
  });

  // ── Export ─────────────────────────────────────────────────────────────────
  fastify.post('/tools/export', async (req, reply) => {
    const user = req.user as { sub: string; tenantId: string; role: string; email?: string };
    const body = req.body as {
      entity: string;
      fields: string[];
      filters?: Record<string, unknown>;
      format: 'csv' | 'json';
    };

    if (body.entity === 'leads') {
      const leads = await fastify.prisma.lead.findMany({
        where: { tenantId: user.tenantId },
        include: {
          source: true, status: true, assignedUser: { select: { name: true } },
        },
        take: 10000,
        orderBy: { createdAt: 'desc' },
      });

      if (body.format === 'csv') {
        const headers = (body.fields?.length ? body.fields : ['name', 'phone', 'email', 'status', 'source', 'score', 'createdAt']).join(',');
        const rows = leads.map((l: any) => [
          `"${l.name}"`, l.phone, l.email || '',
          l.status?.name || '', l.source?.name || '',
          l.score, new Date(l.createdAt).toISOString(),
        ].join(',')).join('\n');

        reply.header('Content-Type', 'text/csv');
        reply.header('Content-Disposition', `attachment; filename=leads-${Date.now()}.csv`);
        return `${headers}\n${rows}`;
      }

      reply.header('Content-Type', 'application/json');
      reply.header('Content-Disposition', `attachment; filename=leads-${Date.now()}.json`);
      return JSON.stringify({ data: leads, exported_at: new Date().toISOString() });
    }

    return reply.code(400).send({ success: false, error: { code: 'UNSUPPORTED_ENTITY', message: 'Only leads export is currently supported' } });
  });

  // ── Field mapping preview ──────────────────────────────────────────────────
  fastify.post('/tools/import/preview', async (req) => {
    // Returns sample rows + detected field mapping suggestions
    return {
      success: true,
      data: {
        headers: ['Full Name', 'Mobile', 'Email ID', 'Source', 'Notes'],
        sampleRows: [
          ['Rahul Sharma', '9876543210', 'rahul@example.com', 'Meta Ads', 'Interested in 3BHK'],
          ['Priya Singh', '8765432109', 'priya@example.com', 'IndiaMART', ''],
        ],
        suggestions: {
          'Full Name': 'name',
          'Mobile': 'phone',
          'Email ID': 'email',
          'Source': 'sourceId',
          'Notes': 'notes',
        },
      },
    };
  });
}