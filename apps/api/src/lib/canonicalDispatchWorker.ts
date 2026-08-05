import type { Logger } from "pino";
import type { AppConfig } from "../config.js";
import { canonicalMatchingService } from "../services/canonicalMatching.js";
import { canonicalSharedMatchingService } from "../services/canonicalSharedMatching.js";

/**
 * Drives the canonical matcher on a timer.
 *
 * The matching and expiry passes were only reachable from
 * `scripts/canonicalMatchingCommand.ts`, so a passenger request created from
 * the app sat at `pending` until somebody ran a CLI command by hand — the
 * driver never received an offer, and held capacity never came back after an
 * offer lapsed. This runs the same service methods the CLI calls; it adds no
 * matching logic of its own.
 *
 * Deliberately in-process and interval-driven rather than a real job queue:
 * the goal is an integrated demo, not production dispatch infrastructure.
 */

export const CANONICAL_DISPATCH_DEFAULT_INTERVAL_MS = 5_000;

export type CanonicalDispatchWorker = { stop: () => void };

/** Mirrors the guards inside the services so the worker can never outrun them. */
export function canonicalDispatchEnabled(appConfig: AppConfig) {
  return (
    (appConfig.isLocal || appConfig.isTest || appConfig.isDemo) &&
    appConfig.multiRouteEntryEnabled &&
    appConfig.multiRouteMatchingEnabled &&
    appConfig.canonicalTripCreationEnabled
  );
}

export function startCanonicalDispatchWorker(
  appConfig: AppConfig,
  logger: Logger,
  options: { intervalMs?: number } = {}
): CanonicalDispatchWorker | null {
  if (!canonicalDispatchEnabled(appConfig)) return null;

  const intervalMs = options.intervalMs ?? CANONICAL_DISPATCH_DEFAULT_INTERVAL_MS;
  let running = false;
  let stopped = false;

  const pass = async () => {
    // Skip rather than queue: a slow tick must not stack passes on top of
    // each other, and the next tick will pick up whatever is still pending.
    if (running || stopped) return;
    running = true;
    try {
      const matched = await canonicalMatchingService.run({ requestId: "canonical-dispatch-worker" });
      const expired = await canonicalMatchingService.expire({ requestId: "canonical-dispatch-worker" });
      if (appConfig.canonicalSharedTripsEnabled) {
        await canonicalSharedMatchingService.run({ requestId: "canonical-shared-dispatch-worker" });
        await canonicalSharedMatchingService.expire({ requestId: "canonical-shared-dispatch-worker" });
      }
      if (matched.offered > 0 || matched.failed > 0 || expired.expired > 0) {
        logger.info(
          {
            event: "canonical_dispatch_pass",
            offered: matched.offered,
            unavailable: matched.unavailable,
            failed: matched.failed,
            expired: expired.expired
          },
          "Canonical dispatch pass completed"
        );
      }
    } catch (error) {
      // A failed pass must never take the API down; the next tick retries.
      logger.error(
        {
          event: "canonical_dispatch_failed",
          error_type: error instanceof Error ? error.name : "UnknownError",
          error_message: error instanceof Error ? error.message : undefined
        },
        "Canonical dispatch pass failed"
      );
    } finally {
      running = false;
    }
  };

  const timer = setInterval(() => void pass(), intervalMs);
  // Never hold the process open on its own account.
  timer.unref();
  void pass();

  logger.info(
    { event: "canonical_dispatch_worker_started", interval_ms: intervalMs },
    "Canonical dispatch worker started"
  );

  return {
    stop: () => {
      stopped = true;
      clearInterval(timer);
    }
  };
}
