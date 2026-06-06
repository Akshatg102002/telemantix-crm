-- AlterTable
ALTER TABLE "public"."Plan" ADD COLUMN     "includedServices" TEXT[];

-- CreateTable
CREATE TABLE "public"."ServiceDefinition" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isMaintenance" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceMsg" TEXT,
    "isCore" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TenantService" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "serviceKey" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "overriddenBySuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "disabledReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CustomPackage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT,
    "notes" TEXT,
    "services" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ServiceHealthLog" (
    "id" TEXT NOT NULL,
    "serviceKey" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceHealthLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceDefinition_key_key" ON "public"."ServiceDefinition"("key");

-- CreateIndex
CREATE INDEX "ServiceDefinition_category_idx" ON "public"."ServiceDefinition"("category");

-- CreateIndex
CREATE INDEX "TenantService_tenantId_idx" ON "public"."TenantService"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantService_tenantId_serviceKey_key" ON "public"."TenantService"("tenantId", "serviceKey");

-- CreateIndex
CREATE INDEX "CustomPackage_tenantId_idx" ON "public"."CustomPackage"("tenantId");

-- CreateIndex
CREATE INDEX "CustomPackage_status_idx" ON "public"."CustomPackage"("status");

-- CreateIndex
CREATE INDEX "ServiceHealthLog_serviceKey_idx" ON "public"."ServiceHealthLog"("serviceKey");

-- CreateIndex
CREATE INDEX "ServiceHealthLog_checkedAt_idx" ON "public"."ServiceHealthLog"("checkedAt");

-- AddForeignKey
ALTER TABLE "public"."TenantService" ADD CONSTRAINT "TenantService_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TenantService" ADD CONSTRAINT "TenantService_serviceKey_fkey" FOREIGN KEY ("serviceKey") REFERENCES "public"."ServiceDefinition"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CustomPackage" ADD CONSTRAINT "CustomPackage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ServiceHealthLog" ADD CONSTRAINT "ServiceHealthLog_serviceKey_fkey" FOREIGN KEY ("serviceKey") REFERENCES "public"."ServiceDefinition"("key") ON DELETE CASCADE ON UPDATE CASCADE;
