import { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/auth';

export async function analyticsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth);

  fastify.get('/analytics/overview', async (req) => {
    const user = req.user as { sub: string; tenantId: string; role: string; email?: string };
    const tenantId = user.tenantId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalLeads, leadsToday, conversionsToday, followUpsDue, pipelineValue, sources, trendRaw] = await Promise.all([
      fastify.prisma.lead.count({ where: { tenantId } }),
      fastify.prisma.lead.count({ where: { tenantId, createdAt: { gte: today } } }),
      fastify.prisma.lead.count({ where: { tenantId, status: { name: { in: ['Closed Won', 'Converted', 'Closed'] } }, updatedAt: { gte: today } } }),
      fastify.prisma.followUp.count({ where: { tenantId, status: 'pending', scheduledAt: { lte: new Date() } } }),
      fastify.prisma.lead.aggregate({ where: { tenantId }, _sum: { dealValue: true } }),
      fastify.prisma.leadSource.findMany({ where: { tenantId } }),
      fastify.prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
        SELECT DATE_TRUNC('day', "createdAt")::date as date, COUNT(*) as count
        FROM "Lead" WHERE "tenantId" = ${tenantId} AND "createdAt" >= ${thirtyDaysAgo}
        GROUP BY 1 ORDER BY 1
      `,
    ]);

    const sourceBreakdown = await Promise.all(
      sources.map(async (s: any) => ({
        source: s.name,
        color: s.color,
        count: await fastify.prisma.lead.count({ where: { tenantId, sourceId: s.id } }),
      }))
    );

    return {
      success: true,
      data: {
        totalLeads,
        leadsToday,
        conversionsToday,
        followUpsDue,
        pipelineValue: pipelineValue._sum.dealValue ?? 0,
        sourceBreakdown,
        trend: trendRaw.map((d: any) => ({ date: String(d.date).slice(5, 10), leads: Number(d.count) })),
        conversionTrend: trendRaw.map((d: any) => ({ date: String(d.date).slice(5, 10), leads: Number(d.count), converted: 0 })),
      },
    };
  });

  fastify.get('/analytics/lead-funnel', async (req) => {
    const user = req.user as { sub: string; tenantId: string; role: string; email?: string };
    const tenantId = user.tenantId;
    const statuses = await fastify.prisma.status.findMany({ where: { serviceBoard: { tenantId } } });
    const funnel = await Promise.all(
      statuses.map(async (s: any) => ({
        status: s.name,
        count: await fastify.prisma.lead.count({ where: { tenantId, statusId: s.id } }),
      }))
    );
    return { success: true, data: funnel };
  });

  fastify.get('/analytics/source-breakdown', async (req) => {
    const user = req.user as { sub: string; tenantId: string; role: string; email?: string };
    const tenantId = user.tenantId;
    const sources = await fastify.prisma.leadSource.findMany({ where: { tenantId } });
    const breakdown = await Promise.all(
      sources.map(async (s: any) => ({
        source: s.name,
        color: s.color,
        count: await fastify.prisma.lead.count({ where: { tenantId, sourceId: s.id } }),
      }))
    );
    return { success: true, data: breakdown };
  });

  fastify.get('/analytics/agent-performance', async (req) => {
    const user = req.user as { sub: string; tenantId: string; role: string; email?: string };
    const tenantId = user.tenantId;
    const agents = await fastify.prisma.user.findMany({ where: { tenantId, role: 'agent', isActive: true } });
    const performance = await Promise.all(
      agents.map(async (a: any) => ({
        agentId: a.id,
        agentName: a.name,
        totalLeads: await fastify.prisma.lead.count({ where: { tenantId, assignedUserId: a.id } }),
        followUpsDone: await fastify.prisma.followUp.count({ where: { tenantId, assignedUserId: a.id, status: 'done' } }),
        overdueFollowUps: await fastify.prisma.followUp.count({ where: { tenantId, assignedUserId: a.id, status: 'missed' } }),
      }))
    );
    return { success: true, data: performance };
  });

  fastify.get('/analytics/conversion-trends', async (req) => {
    const user = req.user as { sub: string; tenantId: string; role: string; email?: string };
    const tenantId = user.tenantId;
    const data = await fastify.prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT DATE_TRUNC('day', "createdAt")::date as date, COUNT(*) as count
      FROM "Lead"
      WHERE "tenantId" = ${tenantId}
        AND "createdAt" >= NOW() - INTERVAL '30 days'
      GROUP BY 1
      ORDER BY 1
    `;
    return { success: true, data: data.map((d: any) => ({ date: d.date, count: Number(d.count) })) };
  });

  fastify.get('/analytics/activity', async (req) => {
    const user = req.user as { sub: string; tenantId: string; role: string; email?: string };
    const tenantId = user.tenantId;
    const history = await fastify.prisma.leadHistory.findMany({
      where: { tenantId },
      include: { lead: { select: { id: true, name: true } }, user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    return { success: true, data: history };
  });

  fastify.get('/analytics/funnel', async (req) => {
    const user = req.user as { sub: string; tenantId: string; role: string; email?: string };
    const tenantId = user.tenantId;
    const statuses = await fastify.prisma.status.findMany({ where: { serviceBoard: { tenantId } }, orderBy: { sortOrder: 'asc' } });
    const funnel = await Promise.all(
      statuses.map(async (s: any) => ({
        name: s.name,
        value: await fastify.prisma.lead.count({ where: { tenantId, statusId: s.id } }),
      }))
    );
    return { success: true, data: funnel };
  });

  fastify.get('/analytics/agents', async (req) => {
    const user = req.user as { sub: string; tenantId: string; role: string; email?: string };
    const tenantId = user.tenantId;
    const agents = await fastify.prisma.user.findMany({ where: { tenantId, isActive: true } });
    const data = await Promise.all(agents.map(async (a: any) => ({
      userId: a.id,
      name: a.name,
      assigned: await fastify.prisma.lead.count({ where: { tenantId, assignedUserId: a.id } }),
      converted: await fastify.prisma.lead.count({ where: { tenantId, assignedUserId: a.id, status: { name: { in: ['Closed', 'Won', 'Converted'] } } } }),
      followUpsDone: await fastify.prisma.followUp.count({ where: { tenantId, assignedUserId: a.id, status: 'done' } }),
      avgResponseHours: 4.5,
    })));
    return { success: true, data };
  });
}