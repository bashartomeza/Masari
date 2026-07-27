import { Router } from "express";
import type { AppConfig } from "../config.js";
import { requireAuth } from "../middleware/auth.js";

export function createCapabilitiesRouter(appConfig: AppConfig) {
  const router = Router();

  router.get("/capabilities", requireAuth, (_req, res) => {
    const canonicalEntryAvailable =
      appConfig.routeManagementEnabled && appConfig.multiRouteEntryEnabled;
    const canonicalMatchingAvailable =
      canonicalEntryAvailable &&
      appConfig.multiRouteMatchingEnabled &&
      appConfig.canonicalTripCreationEnabled;
    res.json({
      canonical_route_catalog_available: appConfig.routeManagementEnabled,
      canonical_multi_route_entry_available: canonicalEntryAvailable,
      canonical_matching_available: canonicalMatchingAvailable,
      canonical_trip_creation_available: canonicalMatchingAvailable,
      driver_canonical_offers_available: canonicalMatchingAvailable,
      canonical_assignment_status_available: canonicalEntryAvailable,
      maps_available: false,
      live_tracking_available: false
    });
  });

  return router;
}
