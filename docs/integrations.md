# Production integrations setup

Telemantix stores tenant-specific integration credentials in `IntegrationSecret.encryptedValue` using AES-256-GCM via `ENCRYPTION_KEY`. The `Integration` row stores only non-secret config, connection status, last sync time, last error, imported lead count, and per-tenant webhook token.

## Required environment variables

- `ENCRYPTION_KEY`: 32+ character key used to encrypt provider credentials.
- `PUBLIC_API_URL`: Public API base URL used to render webhook URLs in the UI.
- `META_VERIFY_TOKEN`: Meta webhook verification token.
- `REDIS_URL`: Redis URL for BullMQ workers.
- `DATABASE_URL`: PostgreSQL connection string.

## API endpoints

- `GET /api/integrations`
- `POST /api/integrations/:type/connect`
- `POST /api/integrations/:type/test`
- `POST /api/integrations/:type/disconnect`
- `POST /api/integrations/:type/sync`

Supported `type` values are `meta`, `whatsapp`, `exotel`, `sendgrid`, `resend`, `google_ads`, `indiamart`, `justdial`, `99acres`, and `housing`.

## Webhook endpoints

Webhook integrations receive a tenant-scoped URL in the UI. Providers must send `tenantId` and `token` as query parameters.

- `POST /api/webhooks/whatsapp?tenantId=...&token=...`
- `POST /api/webhooks/exotel?tenantId=...&token=...`
- `POST /api/webhooks/indiamart?tenantId=...&token=...`
- `POST /api/webhooks/justdial?tenantId=...&token=...`
- `POST /api/webhooks/99acres?tenantId=...&token=...`
- `POST /api/webhooks/housing?tenantId=...&token=...`
- `POST /api/webhooks/meta?tenantId=...&token=...`

Incoming payloads are logged in `WebhookLog`, normalized to the `Lead` model, linked to a tenant lead source, and passed through lead-created automations.

## Workers

The API process starts BullMQ workers for:

- `indiamart-sync`
- `meta-sync`
- `googleads-sync`
- `exotel-sync`

Jobs use BullMQ exponential backoff and the integration service also retries transient provider requests.
