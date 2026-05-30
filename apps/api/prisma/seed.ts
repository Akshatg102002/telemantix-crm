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

  console.log('✅ Seed complete!');
  console.log('Demo credentials:');
  console.log('  admin@demo.com / Admin@123  (role: admin)');
  console.log('  manager@demo.com / Admin@123  (role: manager)');
  console.log('  agent1@demo.com / Admin@123  (role: agent)');
  console.log('  agent2@demo.com / Admin@123  (role: agent)');
}

main().catch(console.error).finally(() => prisma.$disconnect());
