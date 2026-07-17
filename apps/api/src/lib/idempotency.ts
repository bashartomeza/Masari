import { Prisma, type PrismaClient } from "../generated/prisma/client.js";
import { AuditAction } from "../generated/prisma/enums.js";
import { auditEvent } from "./audit.js";

export async function claimIdempotency(
  db: PrismaClient,
  input: {
    operation: string;
    scopeDigest: string;
    keyDigest: string;
    keyVersion: number;
    requestDigest: string;
    expiresAt: Date;
  }
) {
  await db.idempotencyRecord.deleteMany({
    where: {
      operation: input.operation,
      scope_digest: input.scopeDigest,
      idempotency_key: input.keyDigest,
      key_version: input.keyVersion,
      expires_at: { lte: new Date() }
    }
  });
  try {
    const record = await db.idempotencyRecord.create({
      data: {
        operation: input.operation,
        scope_digest: input.scopeDigest,
        idempotency_key: input.keyDigest,
        key_version: input.keyVersion,
        request_digest: input.requestDigest,
        expires_at: input.expiresAt
      }
    });
    return { kind: "claimed" as const, record };
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
    const record = await db.idempotencyRecord.findUniqueOrThrow({
      where: {
        operation_scope_digest_idempotency_key_key_version: {
          operation: input.operation,
          scope_digest: input.scopeDigest,
          idempotency_key: input.keyDigest,
          key_version: input.keyVersion
        }
      }
    });
    if (record.request_digest !== input.requestDigest) {
      await auditEvent(db, {
        action: AuditAction.idempotency_conflict,
        entityType: "IdempotencyRecord",
        entityId: record.id,
        metadata: { operation: input.operation }
      });
      return { kind: "conflict" as const, record };
    }
    return { kind: record.state === "completed" ? ("replay" as const) : ("in_progress" as const), record };
  }
}

export async function completeIdempotency(
  db: PrismaClient,
  input: { recordId: string; resourceType: string; resourceId: string; responseStatus: number }
) {
  return db.idempotencyRecord.update({
    where: { id: input.recordId },
    data: {
      state: "completed",
      resource_type: input.resourceType,
      resource_id: input.resourceId,
      response_status: input.responseStatus,
      completed_at: new Date()
    }
  });
}
