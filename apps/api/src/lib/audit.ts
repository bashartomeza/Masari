import type { AuditAction, Prisma, PrismaClient } from "../generated/prisma/client.js";

export async function auditEvent(
  db: PrismaClient,
  input: {
    userId?: string;
    action: AuditAction;
    entityType?: string;
    entityId?: string;
    metadata?: Prisma.InputJsonValue;
  }
) {
  await db.auditEvent.create({
    data: {
      user_id: input.userId,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId,
      metadata: input.metadata
    }
  });
}
