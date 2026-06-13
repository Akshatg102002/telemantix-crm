CREATE TABLE IF NOT EXISTS "public"."EmailLog" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "to" TEXT NOT NULL,
  "from" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "providerMessageId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EmailLog_tenantId_createdAt_idx" ON "public"."EmailLog"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "EmailLog_tenantId_provider_idx" ON "public"."EmailLog"("tenantId", "provider");

ALTER TABLE "public"."EmailLog"
  ADD CONSTRAINT "EmailLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
