import { randomUUID } from 'crypto';

/**
 * Creates/updates TenantService records for a tenant based on their plan's
 * includedServices array. Core services are enabled for everyone; plan-specific
 * services are enabled based on what's in includedServices.
 */
export async function syncTenantServices(tx: any, tenantId: string, planId: string) {
  const [allServices, plan] = await Promise.all([
    tx.serviceDefinition.findMany({ where: { isEnabled: true } }),
    tx.plan.findUnique({ where: { id: planId }, select: { includedServices: true } }),
  ]);

  const included: string[] = plan?.includedServices ?? [];

  for (const svc of allServices) {
    const shouldEnable = svc.isCore || included.includes(svc.key);
    await tx.tenantService.upsert({
      where: { tenantId_serviceKey: { tenantId, serviceKey: svc.key } },
      update: {},
      create: {
        id: randomUUID(),
        tenantId,
        serviceKey: svc.key,
        isEnabled: shouldEnable,
      },
    });
  }
}
