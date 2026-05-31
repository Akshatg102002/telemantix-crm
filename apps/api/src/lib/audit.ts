/**
 * Audit log helper — writes to AuditLog table.
 * Call after any significant mutation.
 */
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'

export async function writeAuditLog(
  prisma: PrismaClient,
  opts: {
    tenantId?: string
    userId?: string
    action: string
    resource: string
    resourceId?: string
    metadata?: Record<string, unknown>
    ipAddress?: string
    userAgent?: string
  },
) {
  try {
    await prisma.auditLog.create({
      data: {
        id: randomUUID(),
        tenantId: opts.tenantId,
        userId: opts.userId,
        action: opts.action,
        resource: opts.resource,
        resourceId: opts.resourceId,
        metadata: opts.metadata,
        ipAddress: opts.ipAddress,
        userAgent: opts.userAgent,
      },
    })
  } catch {
    // Audit log failures must never break the main request
  }
}
