import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { requireAuth, requireRole } from '../middleware/auth';

export async function customFieldRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth);

  fastify.get('/custom-fields', async (req) => {
    const user = req.user as { sub: string; tenantId: string; role: string; email?: string };
    const sections = await fastify.prisma.customSection.findMany({
      where: { tenantId: user.tenantId },
      include: { customFields: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    });
    return { success: true, data: sections };
  });

  fastify.post('/custom-fields/sections', { preHandler: [requireRole('admin', 'superadmin')] }, async (req, reply) => {
    const user = req.user as { sub: string; tenantId: string; role: string; email?: string };
    const body = req.body as Record<string, unknown>;
    const section = await fastify.prisma.customSection.create({
      data: { id: randomUUID(), tenantId: user.tenantId, name: body.name as string, serviceBoardId: body.serviceBoardId as string | undefined },
    });
    reply.code(201);
    return { success: true, data: section };
  });

  fastify.post('/custom-fields/sections/:sectionId/fields', { preHandler: [requireRole('admin', 'superadmin')] }, async (req, reply) => {
    const user = req.user as { sub: string; tenantId: string; role: string; email?: string };
    const { sectionId } = req.params as { sectionId: string };
    const body = req.body as Record<string, unknown>;
    const field = await fastify.prisma.customField.create({
      data: {
        id: randomUUID(),
        tenantId: user.tenantId,
        customSectionId: sectionId,
        name: body.name as string,
        fieldKey: (body.fieldKey as string) || (body.name as string).toLowerCase().replace(/\s+/g, '_'),
        fieldType: body.fieldType as string,
        options: (body.options as object) || null,
        isRequired: (body.isRequired as boolean) || false,
        isSearchable: (body.isSearchable as boolean) || false,
      },
    });
    reply.code(201);
    return { success: true, data: field };
  });

  fastify.patch('/custom-fields/fields/:id', { preHandler: [requireRole('admin', 'superadmin')] }, async (req) => {
    const { id } = req.params as { id: string };
    const body = req.body as Record<string, unknown>;
    const field = await fastify.prisma.customField.update({ where: { id }, data: body });
    return { success: true, data: field };
  });

  // Set custom field value for a lead
  fastify.put('/custom-fields/values', async (req) => {
    const user = req.user as { sub: string; tenantId: string; role: string; email?: string };
    const body = req.body as { leadId: string; customFieldId: string; value: unknown };
    const existing = await fastify.prisma.customFieldValue.findFirst({ where: { leadId: body.leadId, customFieldId: body.customFieldId } });

    if (existing) {
      const updated = await fastify.prisma.customFieldValue.update({
        where: { id: existing.id },
        data: { value: body.value as any },
      });
      return { success: true, data: updated };
    }

    const created = await fastify.prisma.customFieldValue.create({
      data: { id: randomUUID(), tenantId: user.tenantId, leadId: body.leadId, customFieldId: body.customFieldId, value: body.value as any },
    });
    return { success: true, data: created };
  });
}
