import type { ErrorRequestHandler, Request } from "express";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

function requestId(req: Request) {
  return req.requestId ?? "unavailable";
}

function errorShape(error: string, req: Request, extra: Record<string, unknown> = {}) {
  return { error, ...extra, request_id: requestId(req) };
}

function errorCode(value: unknown) {
  if (!value || typeof value !== "object" || !("code" in value) || typeof value.code !== "string") return undefined;
  return /^P\d{4}$/.test(value.code) ? value.code : undefined;
}

function errorType(value: unknown) {
  if (value instanceof Error && /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/.test(value.name)) return value.name;
  return "UnknownError";
}

export const notFoundHandler = ((req, res) => {
  res.status(404).json(errorShape("not_found", req));
}) satisfies import("express").RequestHandler;

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const code = errorCode(error);
  if (error instanceof ZodError) {
    const details = error.issues.map((issue) => ({
      path: issue.path.map(String),
      code: issue.code,
      message: "Invalid value"
    }));
    res.status(400).json(errorShape("validation_error", req, { details }));
    return;
  }

  if (error instanceof HttpError) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      req.operationalLog?.warn(
        {
          event: error.statusCode === 401 ? "authentication_failed" : "authorization_failed",
          ...(req.user ? { actor_id: req.user.id, actor_role: req.user.role } : {})
        },
        "Access request rejected"
      );
    }
    res.status(error.statusCode).json(errorShape(error.message, req));
    return;
  }

  if (error && typeof error === "object" && "type" in error && error.type === "entity.too.large") {
    res.status(413).json(errorShape("payload_too_large", req, { message: "Request body exceeds the allowed size." }));
    return;
  }

  if (error instanceof SyntaxError && "status" in error && error.status === 400) {
    res.status(400).json(errorShape("invalid_json", req, { message: "Request body contains invalid JSON." }));
    return;
  }

  if (code === "P2002") {
    res.status(409).json(errorShape("resource_conflict", req));
    return;
  }
  if (code === "P2025") {
    res.status(404).json(errorShape("resource_not_found", req));
    return;
  }
  if (code === "P2034") {
    res.status(409).json(errorShape("transaction_retry_required", req));
    return;
  }

  req.operationalLog?.error(
    {
      event: "unhandled_error",
      error_type: errorType(error),
      ...(code ? { prisma_code: code } : {})
    },
    "Unhandled request error"
  );
  res.status(500).json(
    errorShape("internal_server_error", req, { message: "An unexpected error occurred. Use the request ID for support." })
  );
};
