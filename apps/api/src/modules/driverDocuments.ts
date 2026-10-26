import express, { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { auditEvent } from "../lib/audit.js";
import type { AppConfig } from "../config.js";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { HttpError } from "../middleware/error.js";
import { requireOnboardingToken, type OnboardingAuthenticatedRequest } from "../middleware/onboardingAuth.js";
import { AuditAction, DriverVerificationStatus } from "../generated/prisma/enums.js";
import { Prisma } from "../generated/prisma/client.js";
import {
  DOCUMENT_KINDS,
  MAX_DOCUMENTS_PER_REVISION,
  MAX_DOCUMENT_BYTES,
  createDocumentStorage,
  sniffDocumentMime
} from "../services/driverDocumentStorage.js";

const uploadQuerySchema = z.object({ kind: z.enum(DOCUMENT_KINDS) });

const EXTENSIONS: Record<string, string> = { "application/pdf": "pdf", "image/png": "png", "image/jpeg": "jpg" };

function routeParam(value: string | string[] | undefined) {
  if (typeof value !== "string" || value.length === 0 || value.length > 191) throw new HttpError(400, "invalid_route_param");
  return value;
}

function serializeDocument(row: { id: string; kind: string; mime_type: string; size_bytes: number; created_at: Date }) {
  return { id: row.id, kind: row.kind, mime_type: row.mime_type, size_bytes: row.size_bytes, created_at: row.created_at };
}

function isWriteConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

/**
 * Applicant document upload (pending-status session) and Admin download.
 * Disabled unless DRIVER_DOCUMENTS_ENABLED is set with a storage directory.
 */
export function createDriverDocumentsRouter(appConfig: AppConfig) {
  const router = Router();
  const settings = appConfig.driverDocuments;
  const storage = settings ? createDocumentStorage(settings.dir) : null;
  const available = (_req: unknown, _res: unknown, next: (error?: unknown) => void) =>
    next(storage ? undefined : new HttpError(404, "driver_documents_unavailable"));
  const applicant = requireOnboardingToken(appConfig, ["pending_status"]);

  /** The applicant's own verification, only while it is pending review. */
  async function pendingVerificationFor(req: OnboardingAuthenticatedRequest) {
    const context = req.onboarding!;
    if (context.userRole !== "driver" || context.userStatus !== "pending" || !context.userId) {
      throw new HttpError(403, "driver_documents_unavailable");
    }
    const verification = await prisma.driverVerification.findUnique({ where: { user_id: context.userId } });
    if (!verification || verification.status !== DriverVerificationStatus.pending) {
      throw new HttpError(409, "driver_verification_state_conflict");
    }
    return verification;
  }

  router.get("/onboarding/driver-documents", available, applicant, async (req: OnboardingAuthenticatedRequest, res, next) => {
    try {
      const verification = await pendingVerificationFor(req);
      const documents = await prisma.driverVerificationDocument.findMany({
        where: { verification_id: verification.id, revision: verification.revision },
        orderBy: [{ created_at: "asc" }, { id: "asc" }]
      });
      res.json({
        documents: documents.map(serializeDocument),
        limits: { max_documents: MAX_DOCUMENTS_PER_REVISION, max_bytes: MAX_DOCUMENT_BYTES, kinds: DOCUMENT_KINDS },
        request_id: req.requestId
      });
    } catch (error) {
      next(error);
    }
  });

  router.post(
    "/onboarding/driver-documents",
    available,
    applicant,
    express.raw({ type: () => true, limit: MAX_DOCUMENT_BYTES }),
    async (req: OnboardingAuthenticatedRequest, res, next) => {
      let savedKey: string | null = null;
      try {
        const { kind } = uploadQuerySchema.parse(req.query);
        const verification = await pendingVerificationFor(req);
        const bytes = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
        if (bytes.length === 0) throw new HttpError(400, "document_empty");
        const mime = sniffDocumentMime(bytes);
        if (!mime) throw new HttpError(415, "document_type_unsupported");

        const saved = await storage!.save(bytes);
        savedKey = saved.key;
        const created = await prisma.$transaction(
          async (tx) => {
            const current = await tx.driverVerification.findUnique({ where: { id: verification.id } });
            if (!current || current.status !== DriverVerificationStatus.pending || current.revision !== verification.revision) {
              throw new HttpError(409, "driver_verification_state_conflict");
            }
            const count = await tx.driverVerificationDocument.count({
              where: { verification_id: current.id, revision: current.revision }
            });
            if (count >= MAX_DOCUMENTS_PER_REVISION) throw new HttpError(409, "driver_document_limit");
            const row = await tx.driverVerificationDocument.create({
              data: {
                verification_id: current.id,
                revision: current.revision,
                kind,
                mime_type: mime,
                size_bytes: bytes.length,
                sha256: saved.sha256,
                storage_key: saved.key
              }
            });
            await auditEvent(tx, {
              userId: req.onboarding!.userId,
              action: AuditAction.driver_verification,
              entityType: "DriverVerification",
              entityId: current.id,
              metadata: { action: "driver_document_uploaded", kind, size_bytes: bytes.length, request_id: req.requestId }
            });
            return row;
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
        );
        savedKey = null;
        res.status(201).json({ document: serializeDocument(created), request_id: req.requestId });
      } catch (error) {
        // The row never committed, so the file must not outlive the request.
        if (savedKey) await storage!.remove(savedKey).catch(() => undefined);
        next(isWriteConflict(error) ? new HttpError(409, "driver_verification_state_conflict") : error);
      }
    }
  );

  router.delete("/onboarding/driver-documents/:id", available, applicant, async (req: OnboardingAuthenticatedRequest, res, next) => {
    try {
      const verification = await pendingVerificationFor(req);
      const id = routeParam(req.params.id);
      const document = await prisma.driverVerificationDocument.findFirst({
        where: { id, verification_id: verification.id, revision: verification.revision }
      });
      if (!document) throw new HttpError(404, "driver_document_not_found");
      await prisma.$transaction(async (tx) => {
        await tx.driverVerificationDocument.delete({ where: { id: document.id } });
        await auditEvent(tx, {
          userId: req.onboarding!.userId,
          action: AuditAction.driver_verification,
          entityType: "DriverVerification",
          entityId: verification.id,
          metadata: { action: "driver_document_deleted", kind: document.kind, request_id: req.requestId }
        });
      });
      await storage!.remove(document.storage_key);
      res.json({ deleted: true, request_id: req.requestId });
    } catch (error) {
      next(error);
    }
  });

  router.get(
    "/admin/driver-verifications/:userId/documents/:documentId",
    available,
    requireAuth,
    requireRole("admin"),
    async (req: AuthenticatedRequest, res, next) => {
      try {
        const userId = routeParam(req.params.userId);
        const documentId = routeParam(req.params.documentId);
        const document = await prisma.driverVerificationDocument.findFirst({
          where: { id: documentId, verification: { user_id: userId } }
        });
        if (!document) throw new HttpError(404, "driver_document_not_found");
        let bytes: Buffer;
        try {
          bytes = await storage!.read(document.storage_key);
        } catch {
          throw new HttpError(404, "driver_document_not_found");
        }
        await auditEvent(prisma, {
          userId: req.user!.id,
          action: AuditAction.admin_action,
          entityType: "DriverVerification",
          entityId: document.verification_id,
          metadata: { action: "driver_document_viewed", document_id: document.id, kind: document.kind, request_id: req.requestId }
        });
        // Documents are attachments, never rendered in the console's own origin.
        res.set({
          "Content-Type": document.mime_type,
          "Content-Disposition": `attachment; filename="${document.id}.${EXTENSIONS[document.mime_type] ?? "bin"}"`,
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "no-store",
          "Content-Length": String(bytes.length)
        });
        res.send(bytes);
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}
