import { Router } from "express";
import type { AppConfig } from "../config.js";
import { requireAuth } from "../middleware/auth.js";

export function createCapabilitiesRouter(appConfig: AppConfig) {
  const router = Router();

  router.get("/capabilities", requireAuth, (_req, res) => {
    res.json({
      canonical_route_catalog_available: appConfig.routeManagementEnabled,
      canonical_multi_route_entry_available:
        appConfig.routeManagementEnabled && appConfig.multiRouteEntryEnabled,
      canonical_matching_available: false,
      maps_available: false,
      live_tracking_available: false
    });
  });

  return router;
}
