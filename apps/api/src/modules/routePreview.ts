import { Router, type Request } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import type { AppConfig } from "../config.js";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import type { RoutePreviewService } from "../maps/previewService.js";

const id = z.string().min(1).max(191);
const base = z.strictObject({ expected_revision: z.number().int().positive(), locale: z.enum(["ar", "en"]) });
const previewSchema = base.extend({
  profile: z.literal("driving").default("driving"),
  options: z.strictObject({ avoid_tolls: z.boolean().default(false), avoid_ferries: z.boolean().default(false) }).default({ avoid_tolls: false, avoid_ferries: false })
});

function parameter(req: Request, name: string) { return id.parse(Array.isArray(req.params[name]) ? req.params[name][0] : req.params[name]); }

function previewRateLimit(config: AppConfig) {
  return rateLimit({
    windowMs: config.routeMaps.rateLimit.windowMs,
    limit: config.routeMaps.rateLimit.max,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
    keyGenerator: (req: AuthenticatedRequest) => req.user?.id ?? "unauthenticated",
    handler: (req, res) => res.status(429).json({ error: "route_provider_rate_limited", request_id: req.requestId })
  });
}

export function createRoutePreviewRouter(config: AppConfig, service: RoutePreviewService) {
  const router = Router();
  const paths = ["/admin/route-versions/:versionId/preview", "/admin/route-versions/:versionId/stops/:stopId/geocode"];
  router.use(paths, requireAuth, requireRole("admin"), previewRateLimit(config));

  router.post(paths[0], async (req: AuthenticatedRequest, res, next) => {
    try {
      const body = previewSchema.parse(req.body);
      const response = await service.calculate(parameter(req, "versionId"), {
        expectedRevision: body.expected_revision,
        locale: body.locale,
        profile: body.profile,
        avoidTolls: body.options.avoid_tolls,
        avoidFerries: body.options.avoid_ferries
      });
      req.operationalLog?.info({ event: "route_preview_calculated", actor_id: req.user!.id, route_version_id: parameter(req, "versionId"), provider: response.result.provenance.provider, result: "success", cache_status: response.cacheStatus }, "Canonical route preview calculated");
      res.json({
        preview: {
          encoded_geometry: response.result.encodedGeometry,
          geometry_encoding: response.result.geometryEncoding,
          geometry_precision: response.result.geometryPrecision,
          distance_meters: response.result.distanceMeters,
          calculated_duration_seconds: response.result.durationSeconds,
          calculated_at: response.result.calculatedAt,
          provider: response.result.provenance.provider,
          attribution: response.result.attribution,
          geometry_checksum: response.result.geometryChecksum
        },
        cache_status: response.cacheStatus,
        request_id: req.requestId
      });
    } catch (error) { next(error); }
  });

  router.post(paths[1], async (req: AuthenticatedRequest, res, next) => {
    try {
      const body = base.parse(req.body);
      const result = await service.geocode(parameter(req, "versionId"), parameter(req, "stopId"), { expectedRevision: body.expected_revision, locale: body.locale });
      req.operationalLog?.info({ event: "canonical_stop_geocoded", actor_id: req.user!.id, route_version_id: parameter(req, "versionId"), stop_id: parameter(req, "stopId"), provider: result.provenance.provider, result: "success" }, "Canonical stop geocoded");
      res.json({ geocode: { display_label: result.displayLabel, latitude: result.coordinates.latitude, longitude: result.coordinates.longitude, confidence: result.confidence, category: result.category, provider: result.provenance.provider, attribution: result.attribution }, request_id: req.requestId });
    } catch (error) { next(error); }
  });
  return router;
}
