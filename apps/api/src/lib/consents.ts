import type { PrismaClient } from "../generated/prisma/client.js";
import { AuditAction } from "../generated/prisma/enums.js";
import { auditEvent } from "./audit.js";

export async function recordConsent(
  db: PrismaClient,
  input: {
    documentId: string;
    userId?: string;
    source: string;
    requestId?: string;
    ipDigest?: string;
    ipDigestVersion?: number;
    appRelease?: string;
  }
) {
  if (!input.userId) throw new Error("consent_user_required");
  return db.$transaction(async (tx) => {
    const consent = await tx.userConsent.create({
      data: {
        consent_document_id: input.documentId,
        user_id: input.userId,
        request_id: input.requestId,
        ip_digest: input.ipDigest,
        ip_digest_version: input.ipDigestVersion,
        source: input.source,
        app_release: input.appRelease
      }
    });
    await auditEvent(tx, {
      userId: input.userId,
      action: AuditAction.consent_recorded,
      entityType: "ConsentDocument",
      entityId: input.documentId,
      metadata: { source: input.source, request_id: input.requestId ?? null }
    });
    return consent;
  });
}
