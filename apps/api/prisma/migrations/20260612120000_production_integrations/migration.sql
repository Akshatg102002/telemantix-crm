-- Production integration state and encrypted credential support.
DO $$ BEGIN
  CREATE TYPE "public"."IntegrationStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'ERROR', 'SYNCING');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "public"."Integration"
  ADD COLUMN IF NOT EXISTS "status" "public"."IntegrationStatus" NOT NULL DEFAULT 'DISCONNECTED',
  ADD COLUMN IF NOT EXISTS "lastError" TEXT,
  ADD COLUMN IF NOT EXISTS "importedLeadCount" INTEGER NOT NULL DEFAULT 0;

UPDATE "public"."Integration"
SET "status" = CASE WHEN "isConnected" THEN 'CONNECTED'::"public"."IntegrationStatus" ELSE 'DISCONNECTED'::"public"."IntegrationStatus" END
WHERE "status" = 'DISCONNECTED'::"public"."IntegrationStatus";

CREATE UNIQUE INDEX IF NOT EXISTS "LeadSource_tenantId_name_key" ON "public"."LeadSource"("tenantId", "name");
CREATE INDEX IF NOT EXISTS "Integration_tenantId_status_idx" ON "public"."Integration"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "IntegrationSecret_tenantId_provider_isActive_idx" ON "public"."IntegrationSecret"("tenantId", "provider", "isActive");
