# Telemantix CRM

> A premium dark-mode CRM built for modern telecom and real estate sales teams.

![Telemantix](https://img.shields.io/badge/Telemantix-CRM-7B2FBE?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?style=for-the-badge&logo=typescript)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)
![Fastify](https://img.shields.io/badge/Fastify-4-000000?style=for-the-badge)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=for-the-badge&logo=postgresql)

---

## Overview

Telemantix is a full-stack, multi-tenant CRM designed for sales teams managing high-volume leads. Built with a Linear.app-meets-telecom-dashboard aesthetic — dark mode, glassmorphism cards, gradient CTAs.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS v3 |
| UI | shadcn/ui (customized), Radix UI, Framer Motion |
| State | TanStack Query v5, Zustand |
| Backend | Node.js, Fastify 4, TypeScript |
| ORM | Prisma 5 (PostgreSQL, multi-schema) |
| Queues | BullMQ + Redis |
| Realtime | Socket.io |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| Fonts | DM Sans (body), Syne (headings) |

## Features

- **Authentication** — JWT access/refresh tokens, RBAC (superadmin, admin, manager, agent)
- **Lead Management** — Virtual-scrollable list, 100k+ records, Lead Score, Re-enquiry detection, Auto Revive
- **Service Boards** — Custom status/substatus pipelines per board, drag-and-drop ordering
- **Pipeline View** — Kanban board with drag-and-drop, deal value aggregation
- **Follow-up System** — BullMQ scheduled reminders, missed follow-up checker
- **Automation Engine** — Trigger → Condition → Action builder (WhatsApp, Email, Webhooks, Status Change)
- **Analytics** — Lead funnel, conversion trends, agent performance, revenue pipeline
- **Integrations** — Meta Lead Ads, WhatsApp Cloud API, Exotel IVR, SendGrid, Google Ads, IndiaMART, JustDial, 99acres, Housing.com, TradeIndia
- **Publishers** — External partner tracking with unique webhook URLs
- **Notifications** — Real-time via Socket.io, in-app bell, web push, email
- **Custom Fields** — Per-service-board custom sections and field types
- **Multi-tenancy** — Schema-per-tenant via Prisma multiSchema

## Prerequisites

- Node.js 20+
- Docker + Docker Compose
- npm 10+

## Setup

```bash
# 1. Clone the repository
git clone https://github.com/Akshatg102002/Telemantix.git
cd Telemantix

# 2. Install dependencies
npm install

# 3. Copy environment files
cp apps/api/.env.example apps/api/.env

# 4. Start databases
docker-compose up -d

# 5. Run migrations
npm run db:migrate

# 6. Seed demo data
npm run db:seed

# 7. Start development servers
npm run dev
```

Open:
- **Frontend**: http://localhost:5173
- **API**: http://localhost:4000
- **API Health**: http://localhost:4000/health

## Demo Credentials

| Role | Email | Password |
|------|-------|---------|
| Admin | admin@demo.com | Admin@123 |
| Manager | manager@demo.com | Admin@123 |
| Agent | agent1@demo.com | Admin@123 |

## Environment Variables

See `apps/api/.env.example` for all required variables. Key ones:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_ACCESS_SECRET` | Min 32-char secret for access tokens |
| `JWT_REFRESH_SECRET` | Min 32-char secret for refresh tokens |
| `META_APP_SECRET` | Meta Business App secret for Lead Ads |
| `WHATSAPP_API_TOKEN` | WhatsApp Cloud API token |

## API Overview

All endpoints return:
```json
{ "success": true, "data": {}, "meta": { "page": 1, "limit": 20, "total": 500 } }
```

Error format:
```json
{ "success": false, "error": { "code": "NOT_FOUND", "message": "Lead not found" } }
```

Route groups:
- `POST /api/auth/login` — Login
- `GET /api/leads` — List leads with filters
- `GET /api/analytics/overview` — Dashboard KPIs
- `GET /api/service-boards` — All boards
- `GET /api/automations` — Automation rules
- `GET /api/integrations` — Connected integrations
- `POST /api/webhooks/inbound/:tenantId/:token` — Generic inbound webhook

## Project Structure

```
telemantix/
├── apps/
│   ├── api/          # Fastify backend
│   │   ├── prisma/   # Schema + migrations + seed
│   │   └── src/
│   │       ├── routes/     # All API routes
│   │       ├── services/   # Business logic
│   │       ├── jobs/       # BullMQ workers
│   │       └── lib/        # Prisma, Redis, Socket.io
│   └── web/          # React frontend
│       └── src/
│           ├── components/ # UI + layout + forms
│           ├── pages/      # Route pages
│           ├── hooks/      # TanStack Query hooks
│           ├── store/      # Zustand stores
│           └── lib/        # API client, socket
├── packages/
│   └── shared/       # Zod schemas + TypeScript types
└── docker-compose.yml
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit your changes
4. Push and open a PR

Please follow the existing code style (no `any` types, Zod schemas for all inputs, strict TypeScript).

---

Built with ❤️ by the Telemantix team.
