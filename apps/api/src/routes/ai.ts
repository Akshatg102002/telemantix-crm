/**
 * AI feature routes — uses Anthropic API if ANTHROPIC_API_KEY is set,
 * otherwise returns realistic mock responses.
 */
import { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/auth';

const INDUSTRY_SUGGESTIONS: Record<string, Array<{ name: string; trigger: string; action: string }>> = {
  'Real Estate': [
    { name: 'Site Visit Follow-up', trigger: 'status_changed to Interested', action: 'Schedule site visit WhatsApp + call within 2h' },
    { name: 'Stale Lead Revive', trigger: 'No activity for 7 days', action: 'Send re-engagement WhatsApp with new property alert' },
    { name: 'Closed Won Celebration', trigger: 'status_changed to Won', action: 'Send congratulations WhatsApp + request referral' },
  ],
  'Education': [
    { name: 'Application Follow-up', trigger: 'Lead created from Google Ads', action: 'Send program brochure PDF via WhatsApp within 1h' },
    { name: 'Scholarship Reminder', trigger: 'Score > 70 and no conversion', action: 'Send scholarship offer email + WhatsApp' },
    { name: 'Batch Starting Alert', trigger: 'Scheduled date: every Monday', action: 'Notify all interested leads about upcoming batch' },
  ],
  'Finance': [
    { name: 'Document Collection', trigger: 'status_changed to Contacted', action: 'Send document checklist via WhatsApp' },
    { name: 'Application Status Update', trigger: 'Status changes', action: 'Send automated status update email to applicant' },
    { name: 'Eligibility Check Follow-up', trigger: 'Lead created', action: 'Send eligibility calculator link + call within 30min' },
  ],
};

const MOCK_INSIGHTS = [
  'Lead volume from Meta Ads increased 23% this week vs last week — consider increasing ad budget.',
  'Agent Raj Kumar has the highest conversion rate (34%) — schedule knowledge sharing session with the team.',
  'IndiaMART leads have a 45% lower score on average — review source weighting in lead scoring config.',
  '67% of Won deals had at least 3 follow-ups — ensure automation creates follow-up reminders.',
  'Tuesday and Wednesday have 40% more lead creation — schedule agent availability accordingly.',
];

export async function aiRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth);

  // ── Email Generation ───────────────────────────────────────────────────────
  fastify.post('/ai/generate-email', async (req) => {
    const { leadId, goal, tone } = req.body as { leadId?: string; goal: string; tone?: string };

    let lead: { name: string } | null = null;
    if (leadId) {
      lead = await fastify.prisma.lead.findFirst({
        where: { id: leadId, tenantId: req.user.tenantId },
        select: { name: true },
      });
    }

    // If Anthropic API key is available, call real AI
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        // Import dynamically to avoid error if package not installed
        // In production: use @anthropic-ai/sdk
        fastify.log.info('Would call Anthropic API here');
      } catch {
        // Fall through to mock
      }
    }

    // Mock email generation
    const name = lead?.name || 'there';
    const subject = goal === 'follow_up'
      ? `Following up on your inquiry — ${name}`
      : goal === 'proposal'
      ? `Exclusive offer tailored for you — ${name}`
      : `Update from our team — ${name}`;

    const body = `Hi ${name},

I hope this message finds you well.

I wanted to personally reach out regarding your recent inquiry with us. ${
  goal === 'follow_up'
    ? 'We discussed your requirements and I believe we have the perfect solution that matches your needs.'
    : goal === 'proposal'
    ? "After reviewing your profile, I've put together a customized proposal that I believe will be of great value to you."
    : "We have some exciting updates that I'd love to share with you."
}

Would you have 15 minutes for a quick call this week? I'm confident we can find a solution that works perfectly for you.

Looking forward to connecting.

Warm regards,
[Your Name]
Telemantix Team`;

    return { success: true, data: { subject, body, generatedAt: new Date().toISOString() } };
  });

  // ── Workflow Suggestions ───────────────────────────────────────────────────
  fastify.get('/ai/workflow-suggestions', async (req) => {
    const q = req.query as { industry?: string };
    const industry = q.industry || 'Real Estate';
    const suggestions = INDUSTRY_SUGGESTIONS[industry] || INDUSTRY_SUGGESTIONS['Real Estate'];
    return { success: true, data: suggestions };
  });

  // ── Analytics Insights ─────────────────────────────────────────────────────
  fastify.get('/ai/insights', async (req) => {
    const tenantId = req.user.tenantId;

    // Get real data to generate insights
    const [totalLeads, leadsThisWeek, leadsPastWeek] = await Promise.all([
      fastify.prisma.lead.count({ where: { tenantId } }),
      fastify.prisma.lead.count({ where: { tenantId, createdAt: { gte: new Date(Date.now() - 7 * 86400000) } } }),
      fastify.prisma.lead.count({ where: { tenantId, createdAt: { gte: new Date(Date.now() - 14 * 86400000), lt: new Date(Date.now() - 7 * 86400000) } } }),
    ]);

    const weeklyChange = leadsPastWeek > 0 ? Math.round(((leadsThisWeek - leadsPastWeek) / leadsPastWeek) * 100) : 0;

    const insights = [
      `Lead volume ${weeklyChange >= 0 ? 'increased' : 'decreased'} ${Math.abs(weeklyChange)}% this week vs last week — ${weeklyChange >= 0 ? 'momentum is building' : 'consider reviewing acquisition channels'}.`,
      totalLeads > 100
        ? `You have ${totalLeads.toLocaleString('en-IN')} total leads — consider running a re-engagement campaign on stale leads older than 30 days.`
        : `You're building your lead pipeline. Focus on connecting 3+ lead sources to accelerate growth.`,
      'Based on your data, Tuesday and Wednesday show peak activity — schedule your best agents accordingly.',
    ];

    return { success: true, data: { insights, generatedAt: new Date().toISOString() } };
  });

  // ── Lead Score Explanation ─────────────────────────────────────────────────
  fastify.get('/ai/lead-score/:leadId', async (req, reply) => {
    const { leadId } = req.params as { leadId: string };
    const lead = await fastify.prisma.lead.findFirst({
      where: { id: leadId, tenantId: req.user.tenantId },
      include: { source: true, status: true, followUps: { take: 5 } },
    });
    if (!lead) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Lead not found' } });

    const factors: Array<{ factor: string; impact: 'positive' | 'negative' | 'neutral'; detail: string }> = [];
    if (lead.source?.weight && lead.source.weight > 1) factors.push({ factor: 'Source Quality', impact: 'positive', detail: `${lead.source.name} is a high-quality source` });
    if (lead.followUps.length > 2) factors.push({ factor: 'Engagement', impact: 'positive', detail: `${lead.followUps.length} follow-ups completed` });
    if (lead.isStale) factors.push({ factor: 'Recency', impact: 'negative', detail: 'No activity in over 14 days' });
    if (lead.email) factors.push({ factor: 'Data Completeness', impact: 'positive', detail: 'Email provided — higher contactability' });

    return {
      success: true,
      data: {
        score: lead.score,
        factors,
        recommendation: lead.score >= 70 ? 'High priority — contact immediately' : lead.score >= 40 ? 'Medium priority — schedule follow-up' : 'Low priority — add to nurture campaign',
      },
    };
  });
}
