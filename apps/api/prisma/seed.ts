import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Telemantix demo data...');

  // Tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {},
    create: { id: randomUUID(), name: 'Telemantix Demo', slug: 'demo', timezone: 'Asia/Kolkata', currency: 'INR' },
  });

  // Users
  const passwordHash = await bcrypt.hash('Admin@123', 12);
  const admin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@demo.com' } },
    update: {},
    create: { id: randomUUID(), tenantId: tenant.id, name: 'Admin User', email: 'admin@demo.com', passwordHash, role: 'admin' },
  });
  const manager = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'manager@demo.com' } },
    update: {},
    create: { id: randomUUID(), tenantId: tenant.id, name: 'Sarah Manager', email: 'manager@demo.com', passwordHash, role: 'manager' },
  });
  const agent1 = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'agent1@demo.com' } },
    update: {},
    create: { id: randomUUID(), tenantId: tenant.id, name: 'Raj Kumar', email: 'agent1@demo.com', passwordHash, role: 'agent' },
  });
  const agent2 = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'agent2@demo.com' } },
    update: {},
    create: { id: randomUUID(), tenantId: tenant.id, name: 'Priya Singh', email: 'agent2@demo.com', passwordHash, role: 'agent' },
  });
  const agents = [admin, manager, agent1, agent2];

  // Lead Sources
  const sourceData = [
    { name: 'Meta Ads', color: '#1877F2' },
    { name: 'IndiaMART', color: '#E87722' },
    { name: '99acres', color: '#E63946' },
    { name: 'JustDial', color: '#FF6B35' },
    { name: 'Housing.com', color: '#00B894' },
    { name: 'Google Ads', color: '#4285F4' },
    { name: 'Manual Entry', color: '#8A8A99' },
    { name: 'WhatsApp Inbound', color: '#25D366' },
    { name: 'TradeIndia', color: '#7B2FBE' },
    { name: 'Referral', color: '#F59E0B' },
  ];
  const sources = await Promise.all(
    sourceData.map(s =>
      prisma.leadSource.upsert({
        where: { id: s.name },
        update: {},
        create: { id: randomUUID(), tenantId: tenant.id, ...s },
      }).catch(() => prisma.leadSource.create({ data: { id: randomUUID(), tenantId: tenant.id, ...s } }))
    )
  );

  // Service Boards
  const boardData = [
    { name: 'Real Estate', color: '#7B2FBE' },
    { name: 'Education', color: '#C43E8A' },
    { name: 'Finance & Loans', color: '#E8622A' },
    { name: 'Health & Insurance', color: '#22C55E' },
    { name: 'General', color: '#8A8A99' },
  ];

  const boards = await Promise.all(
    boardData.map(b => prisma.serviceBoard.create({ data: { id: randomUUID(), tenantId: tenant.id, ...b } }))
  );

  // Statuses per board
  const statusNames = ['New', 'Contacted', 'Site Visit', 'Negotiation', 'Closed Won', 'Closed Lost'];
  const allStatuses: Array<{ id: string; boardId: string; name: string }> = [];
  for (const board of boards) {
    for (let i = 0; i < statusNames.length; i++) {
      const s = await prisma.status.create({
        data: {
          id: randomUUID(),
          tenantId: tenant.id,
          serviceBoardId: board.id,
          name: statusNames[i],
          sortOrder: i,
          isTerminal: statusNames[i].startsWith('Closed'),
        },
      });
      allStatuses.push({ id: s.id, boardId: board.id, name: s.name });
    }
  }

  // 500 leads
  console.log('Creating 500 leads...');
  for (let i = 0; i < 500; i++) {
    const board = faker.helpers.arrayElement(boards);
    const boardStatuses = allStatuses.filter(s => s.boardId === board.id);
    const status = faker.helpers.arrayElement(boardStatuses);
    const source = faker.helpers.arrayElement(sources);
    const agent = faker.helpers.arrayElement(agents);
    const createdAt = faker.date.between({ from: new Date('2024-01-01'), to: new Date() });

    const lead = await prisma.lead.create({
      data: {
        id: randomUUID(),
        tenantId: tenant.id,
        name: faker.person.fullName(),
        phone: `+91${faker.string.numeric(10)}`,
        email: faker.helpers.maybe(() => faker.internet.email(), { probability: 0.7 }),
        sourceId: source.id,
        serviceBoardId: board.id,
        statusId: status.id,
        assignedUserId: agent.id,
        dealValue: faker.helpers.maybe(() => faker.number.float({ min: 10000, max: 5000000, fractionDigits: 0 }), { probability: 0.6 }),
        score: faker.number.int({ min: 0, max: 100 }),
        isStale: faker.datatype.boolean({ probability: 0.1 }),
        notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.4 }),
        createdAt,
        updatedAt: faker.date.between({ from: createdAt, to: new Date() }),
      },
    });

    // Follow-ups
    const numFollowUps = faker.number.int({ min: 0, max: 3 });
    for (let j = 0; j < numFollowUps; j++) {
      const scheduledAt = faker.date.between({ from: new Date(Date.now() - 14 * 86400000), to: new Date(Date.now() + 14 * 86400000) });
      const isPast = scheduledAt < new Date();
      await prisma.followUp.create({
        data: {
          id: randomUUID(),
          tenantId: tenant.id,
          leadId: lead.id,
          assignedUserId: agent.id,
          type: faker.helpers.arrayElement(['call', 'whatsapp', 'email', 'meeting']),
          scheduledAt,
          status: isPast ? faker.helpers.arrayElement(['done', 'missed', 'done']) : 'pending',
          completedAt: isPast && Math.random() > 0.3 ? scheduledAt : null,
        },
      });
    }
  }

  // 5 automation rules
  const automations = [
    { name: 'Auto Assign New Lead', trigger: 'lead_created', actions: [{ type: 'assign_agent', mode: 'round_robin' }] },
    { name: 'Follow-up on New Lead', trigger: 'lead_created', actions: [{ type: 'create_follow_up', followUpType: 'call', delayHours: 2, note: 'Initial contact call' }] },
    { name: 'Missed Follow-up Checker', trigger: 'missed_follow_up', isSystem: true, actions: [{ type: 'create_follow_up', followUpType: 'call', delayHours: 24 }] },
    { name: 'Won Lead Notification', trigger: 'status_changed', conditions: [{ field: 'status.name', operator: 'equals', value: 'Closed Won' }], actions: [{ type: 'send_whatsapp', templateId: 'lead_won', phoneField: 'phone' }] },
    { name: 'Stale Lead Revive', trigger: 'lead_score_threshold', conditions: [{ field: 'isStale', operator: 'equals', value: true }], actions: [{ type: 'assign_agent', mode: 'load_balanced' }] },
  ];

  for (const a of automations) {
    await prisma.automation.create({
      data: {
        id: randomUUID(),
        tenantId: tenant.id,
        name: a.name,
        trigger: a.trigger,
        conditions: a.conditions || [],
        actions: a.actions,
        isSystem: a.isSystem || false,
        isActive: true,
      },
    });
  }

  // ── Plans ────────────────────────────────────────────────────────────────
  const starterFeatures = ['Lead Management', 'Follow-up System', 'Basic Analytics', '3 Integrations', 'Email Support'];
  const growthFeatures = ['Everything in Starter', 'Automation Engine', 'All Integrations', 'WhatsApp & IVR', 'Advanced Analytics', 'Custom Fields', 'Priority Support'];
  const enterpriseFeatures = ['Everything in Growth', 'Unlimited Users', 'Unlimited Leads', 'Dedicated Account Manager', 'SLA Support', 'Custom Integrations', 'On-premise Option'];

  const starterIncluded = ['leads', 'pipeline', 'followups', 'tasks', 'contacts', 'basic_analytics', 'email', 'import_export'];
  const growthIncluded = [...starterIncluded, 'service_boards', 'publishers', 'whatsapp', 'meta_ads', 'google_ads', 'indiamart', 'automation_engine', 'advanced_analytics', 'audit_logs', 'api_access'];
  const enterpriseIncluded = [...growthIncluded, 'ivr_dialer', 'sms', 'justdial', 'acres99', 'housing', 'tradeindia', 'zapier', 'call_insights', 'workflow_builder', 'ai_scoring', 'ai_email', 'ai_chatbot'];

  const starterPlan = await prisma.plan.upsert({
    where: { slug: 'starter' },
    update: { includedServices: starterIncluded },
    create: { id: randomUUID(), name: 'Starter', slug: 'starter', price: 1999, yearlyPrice: 19990, maxUsers: 5, maxLeads: 1000, features: starterFeatures, includedServices: starterIncluded, sortOrder: 0 },
  });

  const growthPlan = await prisma.plan.upsert({
    where: { slug: 'growth' },
    update: { includedServices: growthIncluded },
    create: { id: randomUUID(), name: 'Growth', slug: 'growth', price: 1799, yearlyPrice: 17990, maxUsers: 20, maxLeads: 10000, features: growthFeatures, includedServices: growthIncluded, isPopular: true, sortOrder: 1 },
  });

  const enterprisePlan = await prisma.plan.upsert({
    where: { slug: 'enterprise' },
    update: { includedServices: enterpriseIncluded },
    create: { id: randomUUID(), name: 'Enterprise', slug: 'enterprise', price: 1599, yearlyPrice: 15990, maxUsers: -1, maxLeads: -1, features: enterpriseFeatures, includedServices: enterpriseIncluded, sortOrder: 2 },
  });

  await prisma.plan.upsert({
    where: { slug: 'custom' },
    update: {},
    create: { id: randomUUID(), name: 'Custom', slug: 'custom', price: 0, yearlyPrice: 0, maxUsers: -1, maxLeads: -1, features: ['Custom feature set', 'Configured by our team', 'Contact us for pricing'], includedServices: [], sortOrder: 3 },
  });

  // ── Service Definitions ───────────────────────────────────────────────────
  const serviceDefinitions = [
    // CRM — core
    { key: 'leads', name: 'Leads', category: 'crm', isCore: true },
    { key: 'pipeline', name: 'Pipeline', category: 'crm', isCore: true },
    { key: 'followups', name: 'Follow-ups', category: 'crm', isCore: true },
    { key: 'tasks', name: 'Tasks', category: 'crm', isCore: true },
    { key: 'contacts', name: 'Contacts', category: 'crm', isCore: true },
    { key: 'service_boards', name: 'Service Boards', category: 'crm', isCore: false },
    { key: 'publishers', name: 'Publishers', category: 'crm', isCore: false },
    // Communication
    { key: 'whatsapp', name: 'WhatsApp', category: 'communication', isCore: false },
    { key: 'email', name: 'Email', category: 'communication', isCore: true },
    { key: 'ivr_dialer', name: 'IVR Dialer', category: 'communication', isCore: false },
    { key: 'sms', name: 'SMS', category: 'communication', isCore: false },
    // Integration
    { key: 'meta_ads', name: 'Meta Ads', category: 'integration', isCore: false },
    { key: 'google_ads', name: 'Google Ads', category: 'integration', isCore: false },
    { key: 'indiamart', name: 'IndiaMART', category: 'integration', isCore: false },
    { key: 'justdial', name: 'JustDial', category: 'integration', isCore: false },
    { key: 'acres99', name: '99Acres', category: 'integration', isCore: false },
    { key: 'housing', name: 'Housing.com', category: 'integration', isCore: false },
    { key: 'tradeindia', name: 'TradeIndia', category: 'integration', isCore: false },
    { key: 'zapier', name: 'Zapier', category: 'integration', isCore: false },
    // Analytics
    { key: 'basic_analytics', name: 'Basic Analytics', category: 'analytics', isCore: true },
    { key: 'advanced_analytics', name: 'Advanced Analytics', category: 'analytics', isCore: false },
    { key: 'call_insights', name: 'Call Insights', category: 'analytics', isCore: false },
    // Automation
    { key: 'automation_engine', name: 'Automation Engine', category: 'automation', isCore: false },
    { key: 'workflow_builder', name: 'Workflow Builder', category: 'automation', isCore: false },
    // AI
    { key: 'ai_scoring', name: 'AI Scoring', category: 'ai', isCore: false },
    { key: 'ai_email', name: 'AI Email', category: 'ai', isCore: false },
    { key: 'ai_chatbot', name: 'AI Chatbot', category: 'ai', isCore: false },
    // Security/Data
    { key: 'api_access', name: 'API Access', category: 'security', isCore: false },
    { key: 'audit_logs', name: 'Audit Logs', category: 'security', isCore: false },
    { key: 'import_export', name: 'Import/Export', category: 'security', isCore: true },
  ];

  for (const svc of serviceDefinitions) {
    await prisma.serviceDefinition.upsert({
      where: { key: svc.key },
      update: { name: svc.name, category: svc.category, isCore: svc.isCore },
      create: { id: randomUUID(), key: svc.key, name: svc.name, category: svc.category, isCore: svc.isCore },
    });
  }

  // Attach subscription to demo tenant
  await prisma.subscription.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      id: randomUUID(), tenantId: tenant.id, planId: growthPlan.id, status: 'active',
      billingCycle: 'monthly', trialEndsAt: new Date(Date.now() + 14 * 86400000),
      currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
    },
  });

  // ── Super Admin ───────────────────────────────────────────────────────────
  const superAdminHash = await bcrypt.hash('SuperAdmin@123', 12);
  await prisma.superAdmin.upsert({
    where: { email: 'superadmin@telemantix.io' },
    update: {},
    create: { id: randomUUID(), name: 'Super Admin', email: 'superadmin@telemantix.io', passwordHash: superAdminHash },
  });

  // ── 5 Demo Companies ──────────────────────────────────────────────────────
  const demoCompanies = [
    { name: 'Estee Advisors', slug: 'estee-advisors', plan: growthPlan, status: 'active', users: 12, leads: 450, industry: 'Finance' },
    { name: 'TechVentures India', slug: 'techventures-india', plan: starterPlan, status: 'trial', users: 3, leads: 89, industry: 'Technology' },
    { name: 'PropDeals Realty', slug: 'propdeals-realty', plan: growthPlan, status: 'active', users: 8, leads: 320, industry: 'Real Estate' },
    { name: 'EduConnect', slug: 'educonnect', plan: enterprisePlan, status: 'active', users: 25, leads: 1200, industry: 'Education' },
    { name: 'FinServ Solutions', slug: 'finserv-solutions', plan: starterPlan, status: 'suspended', users: 2, leads: 45, industry: 'Finance' },
  ];

  for (const company of demoCompanies) {
    const existing = await prisma.tenant.findUnique({ where: { slug: company.slug } });
    if (existing) continue;

    const companyId = randomUUID();
    await prisma.tenant.create({
      data: {
        id: companyId, name: company.name, slug: company.slug,
        industry: company.industry, companySize: '11-50', isActive: company.status !== 'suspended',
        onboardedAt: faker.date.past({ years: 1 }),
      },
    });

    await prisma.subscription.create({
      data: {
        id: randomUUID(), tenantId: companyId, planId: company.plan.id,
        status: company.status, billingCycle: 'monthly',
        trialEndsAt: new Date(Date.now() + 14 * 86400000),
        currentPeriodStart: faker.date.recent({ days: 30 }),
        currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
      },
    });

    // Create admin user for each company
    const companyAdminHash = await bcrypt.hash('Admin@123', 10);
    await prisma.user.create({
      data: {
        id: randomUUID(), tenantId: companyId,
        name: `${company.name} Admin`,
        email: `admin@${company.slug}.demo`,
        passwordHash: companyAdminHash, role: 'admin',
      },
    });

    // Create additional agents
    for (let i = 1; i < Math.min(company.users, 4); i++) {
      await prisma.user.create({
        data: {
          id: randomUUID(), tenantId: companyId,
          name: faker.person.fullName(), email: faker.internet.email(),
          passwordHash: companyAdminHash, role: 'agent',
        },
      });
    }

    // Create a basic service board + leads
    const board = await prisma.serviceBoard.create({
      data: { id: randomUUID(), tenantId: companyId, name: 'Sales Pipeline', color: '#7B2FBE' },
    });
    const statusNew = await prisma.status.create({
      data: { id: randomUUID(), tenantId: companyId, serviceBoardId: board.id, name: 'New', color: '#8A8A99', sortOrder: 0, isDefault: true },
    });

    // Seed leads for this company
    const leadsCount = Math.min(company.leads, 30); // cap at 30 for seeding speed
    for (let i = 0; i < leadsCount; i++) {
      await prisma.lead.create({
        data: {
          id: randomUUID(), tenantId: companyId,
          name: faker.person.fullName(), phone: faker.phone.number(),
          email: faker.internet.email(), statusId: statusNew.id,
          serviceBoardId: board.id, score: faker.number.int({ min: 10, max: 95 }),
          createdAt: faker.date.past({ years: 1 }),
          updatedAt: faker.date.recent({ days: 30 }),
        },
      });
    }
  }

  // ── Global Settings ───────────────────────────────────────────────────────
  const globalSettings = [
    { key: 'platform_name', value: 'Telemantix', category: 'general' },
    { key: 'support_email', value: 'support@telemantix.io', category: 'general' },
    { key: 'smtp_host', value: '', category: 'email' },
    { key: 'smtp_port', value: 587, category: 'email' },
    { key: 'maintenance_mode', value: false, category: 'system' },
    { key: 'max_tenants', value: 1000, category: 'limits' },
  ];
  for (const s of globalSettings) {
    await prisma.globalSetting.upsert({
      where: { key: s.key },
      update: {},
      create: { id: randomUUID(), ...s },
    });
  }

  console.log('✅ Seed complete!');
  console.log('');
  console.log('Demo CRM credentials:');
  console.log('  admin@demo.com / Admin@123  (role: admin)');
  console.log('  manager@demo.com / Admin@123  (role: manager)');
  console.log('  agent1@demo.com / Admin@123  (role: agent)');
  console.log('');
  console.log('Super Admin credentials:');
  console.log('  superadmin@telemantix.io / SuperAdmin@123');
  console.log('  Login at: /super-admin/login');
}

main().catch(console.error).finally(() => prisma.$disconnect());
