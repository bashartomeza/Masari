import type { PrismaClient } from "../generated/prisma/client.js";
import { AuditAction } from "../generated/prisma/enums.js";
import { auditEvent } from "./audit.js";

export async function recordConsent(
  db: PrismaClient,
  input: {
    documentId: string;
    userId: string;
    source: string;
    requestId?: string;
    ipDigest?: string;
    ipDigestVersion?: number;
    appRelease?: string;
    now?: Date;
  }
) {
  const now = input.now ?? new Date();
  return db.$transaction(async (tx) => {
    const document = await tx.consentDocument.findFirst({
      where: {
        id: input.documentId,
        legal_approved_at: { not: null },
        effective_at: { lte: now },
        OR: [{ retired_at: null }, { retired_at: { gt: now } }]
      },
      select: { id: true }
    });
    if (!document) throw new Error("consent_document_unavailable");
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
      metadata: { request_id: input.requestId ?? null }
    });
    return consent;
  });
}
