import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createConfig } from "../config.js";
import { HttpError } from "../middleware/error.js";

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  authSession: { findUnique: vi.fn(), update: vi.fn() },
  auditEvent: { create: vi.fn() },
  driverRoute: { findMany: vi.fn() }
}));
vi.mock("../lib/prisma.js", () => ({ prisma: prismaMock }));

const { createApp } = await import("../app.js");

type Role = "passenger" | "driver" | "merchant" | "admin";
const users: Record<string, { id: string; role: Role }> = {
  admin_1: { id: "admin_1", role: "admin" },
  driver_1: { id: "driver_1", role: "driver" },
  passenger_1: { id: "passenger_1", role: "passenger" }
};

const baseEnvironment = {
  APP_ENV: "local",
  DATABASE_URL: "mysql://test:test@localhost:3306/masari_test",
  JWT_SECRET: "test-only-jwt-secret-with-at-least-thirty-two-characters",
  CORS_ORIGINS: "http://localhost:5173",
  LOG_LEVEL: "silent",
  ROUTE_MANAGEMENT_ENABLED: "true"
};
const enabledConfig = createConfig(baseEnvironment);
const disabledConfig = createConfig({ ...baseEnvironment, ROUTE_MANAGEMENT_ENABLED: "false" });
const entryEnabledConfig = createConfig({
  ...baseEnvironment,
  MULTI_ROUTE_ENTRY_ENABLED: "true"
});
const mapsEnabledConfig = createConfig({ ...baseEnvironment, MAPS_ENABLED: "true" });

function auth(userId: keyof typeof users) {
  const user = users[userId];
  const token = jwt.sign(
    { role: user.role, sid: `session_${user.id}`, ver: 1 },
    baseEnvironment.JWT_SECRET,
    { subject: user.id, expiresIn: "1h" }
  );
  return { Authorization: `Bearer ${token}` };
}

const stop = {
  id: "stop_1",
  stop_key: "hebron-center",
  service_region_key: "south-west-bank",
  name_ar: "وسط الخليل",
  name_en: "Hebron Center",
  latitude: "31.532600",
  longitude: "35.099800",
  status: "active",
  retired_at: null,
  retirement_reason: "must-not-leak",
  created_at: new Date("2026-07-01T00:00:00Z"),
  updated_at: new Date("2026-07-01T00:00:00Z")
};
const version = {
  id: "version_1",
  service_route_id: "route_1",
  version_number: 1,
  status: "published",
  name_ar: "الخليل إلى بيت لحم",
  name_en: "Hebron to Bethlehem",
  description_ar: null,
  description_en: null,
  active_from: null,
  active_until: null,
  origin_stop_id: "stop_1",
  destination_stop_id: "stop_2",
  geometry_status: "pending",
  geometry_precision: null,
  estimated_distance_meters: null,
  estimated_duration_seconds: null,
  draft_revision: 2,
  encoded_geometry: "must-not-leak",
  geometry_provider: "must-not-leak",
  published_by_user_id: "must-not-leak",
  stops: [{
    id: "membership_1",
    sequence: 1,
    passenger_pickup: true,
    passenger_dropoff: false,
    parcel_pickup: true,
    parcel_dropoff: false,
    scheduled_offset_seconds: 0,
    dwell_seconds: 30,
    stop
  }],
  published_at: new Date("2026-07-01T00:00:00Z"),
  paused_at: null,
  pause_reason: null,
  retired_at: null,
  retirement_reason: null,
  created_at: new Date("2026-07-01T00:00:00Z"),
  updated_at: new Date("2026-07-01T00:00:00Z"),
  _count: { driver_routes: 0 }
};
const route = {
  id: "route_1",
  route_key: "hebron-to-bethlehem",
  route_group_key: "hebron-bethlehem",
  service_region_key: "south-west-bank",
  direction: "outbound",
  status: "active",
  current_version_id: "version_1",
  current_version: version,
  versions: [version],
  created_by_user_id: "must-not-leak",
  retired_at: null,
  retirement_reason: null,
  created_at: new Date("2026-07-01T00:00:00Z"),
  updated_at: new Date("2026-07-01T00:00:00Z"),
  _count: { versions: 1 }
};

function serviceMock() {
  return {
    listAdminRoutes: vi.fn().mockResolvedValue({ routes: [route], total: 1, page: 1, limit: 25 }),
    getAdminRoute: vi.fn().mockResolvedValue(route),
    createRoute: vi.fn().mockResolvedValue({ resource: route, replayed: false }),
    createVersion: vi.fn().mockResolvedValue({ resource: version, replayed: false }),
    getAdminVersion: vi.fn().mockResolvedValue(version),
    updateDraft: vi.fn().mockResolvedValue({ ...version, status: "draft", draft_revision: 2 }),
    replaceStops: vi.fn().mockResolvedValue({ ...version, status: "draft", draft_revision: 3 }),
    publishVersion: vi.fn().mockResolvedValue({ resource: version, replayed: false }),
    pauseVersion: vi.fn().mockResolvedValue({ resource: { ...version, status: "paused" }, replayed: false }),
    resumeVersion: vi.fn().mockResolvedValue({ resource: version, replayed: false }),
    retireVersion: vi.fn().mockResolvedValue({ resource: { ...version, status: "retired" }, replayed: false }),
    retireRoute: vi.fn().mockResolvedValue({ resource: { ...route, status: "retired" }, replayed: false }),
    listStops: vi.fn().mockResolvedValue({ stops: [stop], total: 1, page: 1, limit: 25 }),
    createStop: vi.fn().mockResolvedValue({ resource: stop, replayed: false }),
    updateStop: vi.fn().mockResolvedValue(stop),
    retireStop: vi.fn().mockResolvedValue({ resource: { ...stop, status: "retired" }, replayed: false }),
    listPublishedRoutes: vi.fn().mockResolvedValue({ routes: [route], total: 1, page: 1, limit: 25 }),
    getPublishedRoute: vi.fn().mockResolvedValue(route),
    getPublishedVersionStops: vi.fn().mockResolvedValue(version)
  };
}

function app(service = serviceMock(), config = enabledConfig) {
  return { server: createApp(config, { routeManagementService: service as never }), service };
}

describe("M7B route management APIs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.authSession.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
      const user = users[where.id.replace("session_", "")];
      return user
        ? {
            id: where.id,
            user_id: user.id,
            user: { ...user, account_status: "active", security_version: 1 },
            security_version_at_issue: 1,
            expires_at: new Date(Date.now() + 60_000),
            revoked_at: null
          }
        : null;
    });
    prismaMock.authSession.update.mockResolvedValue({});
  });

  it("fails closed when route management is disabled", async () => {
    const disabled = app(serviceMock(), disabledConfig);
    await request(disabled.server).get("/api/v1/admin/service-routes").set(auth("admin_1")).expect(404);
    const catalog = await request(disabled.server).get("/api/v1/routes").set(auth("passenger_1")).expect(200);
    expect(catalog.body).toEqual(expect.objectContaining({ enabled: false, routes: [], total: 0 }));
    await request(disabled.server).get("/api/v1/routes/route_1").set(auth("passenger_1")).expect(404);
    await request(disabled.server).post("/api/v1/driver/availabilities").set(auth("driver_1")).send({}).expect(404);
  });

  it("requires authentication and the admin role", async () => {
    const target = app();
    await request(target.server).get("/api/v1/routes").expect(401);
    await request(target.server).get("/api/v1/admin/service-routes").expect(401);
    await request(target.server).get("/api/v1/admin/service-routes").set(auth("driver_1")).expect(403);
    await request(target.server)
      .post("/api/v1/admin/service-routes")
      .set(auth("driver_1"))
      .set("Idempotency-Key", "route-create-001")
      .send({})
      .expect(403);
    expect(target.service.createRoute).not.toHaveBeenCalled();
  });

  it("returns only authenticated server-authoritative mobile capabilities", async () => {
    const enabled = app(serviceMock(), entryEnabledConfig);
    await request(enabled.server).get("/api/v1/capabilities").expect(401);
    const response = await request(enabled.server)
      .get("/api/v1/capabilities")
      .set(auth("passenger_1"))
      .expect(200);
    expect(response.body).toEqual({
      canonical_route_catalog_available: true,
      canonical_multi_route_entry_available: true,
      canonical_matching_available: false,
      canonical_trip_creation_available: false,
      driver_canonical_offers_available: false,
      canonical_assignment_status_available: true,
      canonical_shared_trip_presentation_available: false,
      canonical_shared_driver_offers_available: false,
      canonical_shared_assignment_status_available: false,
      maps_available: false,
      checkpoints_available: false,
      live_tracking_available: false
    });

    const disabled = app(serviceMock(), disabledConfig);
    const disabledResponse = await request(disabled.server)
      .get("/api/v1/capabilities")
      .set(auth("driver_1"))
      .expect(200);
    expect(disabledResponse.body).toEqual(
      expect.objectContaining({
        canonical_route_catalog_available: false,
        canonical_multi_route_entry_available: false
      })
    );
  });

  it("normalizes route keys and requires idempotency", async () => {
    const target = app();
    const body = {
      route_key: " Hebron_To_Bethlehem ",
      route_group_key: " Hebron Bethlehem ",
      service_region_key: " South West Bank ",
      direction: "outbound"
    };
    await request(target.server).post("/api/v1/admin/service-routes").set(auth("admin_1")).send(body).expect(400);
    const response = await request(target.server)
      .post("/api/v1/admin/service-routes")
      .set(auth("admin_1"))
      .set("Idempotency-Key", "route-create-001")
      .send(body)
      .expect(201);
    expect(target.service.createRoute).toHaveBeenCalledWith(
      expect.objectContaining({
        routeKey: "hebron-to-bethlehem",
        routeGroupKey: "hebron-bethlehem",
        serviceRegionKey: "south-west-bank"
      }),
      expect.objectContaining({ id: "admin_1", idempotencyKey: "route-create-001", requestId: expect.any(String) })
    );
    expect(response.body.request_id).toEqual(expect.any(String));
  });

  it("maps duplicate keys and stale revisions to safe conflicts", async () => {
    const duplicate = app();
    duplicate.service.createRoute.mockRejectedValueOnce({ code: "P2002" });
    await request(duplicate.server)
      .post("/api/v1/admin/service-routes")
      .set(auth("admin_1"))
      .set("Idempotency-Key", "route-create-002")
      .send({ route_key: "duplicate", route_group_key: "group", service_region_key: "region", direction: "inbound" })
      .expect(409);

    const stale = app();
    stale.service.updateDraft.mockRejectedValueOnce(new HttpError(409, "draft_revision_conflict"));
    const response = await request(stale.server)
      .patch("/api/v1/admin/route-versions/version_1")
      .set(auth("admin_1"))
      .send({ expected_revision: 1, name_ar: "اسم", name_en: "Name" })
      .expect(409);
    expect(response.body.error).toBe("draft_revision_conflict");
    expect(response.body.request_id).toEqual(expect.any(String));
  });

  it("validates stop coordinates and strict allowlists", async () => {
    const target = app();
    const valid = {
      stop_key: "hebron-center",
      service_region_key: "south-west-bank",
      name_ar: "وسط الخليل",
      name_en: "Hebron Center",
      latitude: 31.5326,
      longitude: 35.0998
    };
    await request(target.server)
      .post("/api/v1/admin/stops")
      .set(auth("admin_1"))
      .set("Idempotency-Key", "stop-create-001")
      .send({ ...valid, latitude: 91 })
      .expect(400);
    await request(target.server)
      .post("/api/v1/admin/stops")
      .set(auth("admin_1"))
      .set("Idempotency-Key", "stop-create-002")
      .send({ ...valid, created_by_user_id: "attacker" })
      .expect(400);
    await request(target.server)
      .post("/api/v1/admin/stops")
      .set(auth("admin_1"))
      .set("Idempotency-Key", "stop-create-003")
      .send(valid)
      .expect(201);
    expect(target.service.createStop).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: "31.532600", longitude: "35.099800" }),
      expect.objectContaining({ id: "admin_1" })
    );
  });

  it("validates and replaces a contiguous ordered stop list", async () => {
    const target = app();
    const membership = (stopId: string, sequence: number) => ({
      stop_id: stopId,
      sequence,
      passenger_pickup_allowed: sequence === 1,
      passenger_dropoff_allowed: sequence === 2,
      parcel_pickup_allowed: sequence === 1,
      parcel_dropoff_allowed: sequence === 2
    });
    await request(target.server)
      .put("/api/v1/admin/route-versions/version_1/stops")
      .set(auth("admin_1"))
      .send({ expected_revision: 1, stops: [membership("stop_1", 1), membership("stop_2", 3)] })
      .expect(200);
    expect(target.service.replaceStops).toHaveBeenCalledWith(
      "version_1",
      1,
      expect.arrayContaining([expect.objectContaining({ stopId: "stop_1", sequence: 1 })]),
      expect.objectContaining({ id: "admin_1" })
    );
  });

  it("wires version create, clone, publish, pause, resume, and retire actions", async () => {
    const target = app();
    const admin = auth("admin_1");
    await request(target.server)
      .post("/api/v1/admin/service-routes/route_1/versions")
      .set(admin)
      .set("Idempotency-Key", "version-create-001")
      .send({ name_ar: "مسار جديد", name_en: "New route" })
      .expect(201);
    await request(target.server)
      .post("/api/v1/admin/service-routes/route_1/versions")
      .set(admin)
      .set("Idempotency-Key", "version-clone-001")
      .send({ clone_from_version_id: "version_1" })
      .expect(201);
    await request(target.server)
      .post("/api/v1/admin/route-versions/version_1/publish")
      .set(admin)
      .set("Idempotency-Key", "version-publish-001")
      .send({ expected_revision: 2, expected_current_version_id: null })
      .expect(200);
    for (const [action, body] of [
      ["pause", { reason: "service review" }],
      ["resume", {}],
      ["retire", { reason: "superseded" }]
    ] as const) {
      await request(target.server)
        .post(`/api/v1/admin/route-versions/version_1/${action}`)
        .set(admin)
        .set("Idempotency-Key", `version-${action}-001`)
        .send(body)
        .expect(200);
    }
    expect(target.service.createVersion).toHaveBeenCalledTimes(2);
    expect(target.service.publishVersion).toHaveBeenCalledOnce();
    expect(target.service.pauseVersion).toHaveBeenCalledOnce();
    expect(target.service.resumeVersion).toHaveBeenCalledOnce();
    expect(target.service.retireVersion).toHaveBeenCalledOnce();
  });

  it("returns only safe catalog fields and preserves bilingual RTL text", async () => {
    const target = app();
    const response = await request(target.server).get("/api/v1/routes").set(auth("passenger_1")).expect(200);
    expect(response.body.enabled).toBe(true);
    expect(response.body.routes[0].current_version.name_ar).toBe("الخليل إلى بيت لحم");
    expect(response.body.routes[0].current_version).not.toHaveProperty("geometry");
    const serialized = JSON.stringify(response.body);
    for (const forbidden of ["created_by_user_id", "published_by_user_id", "encoded_geometry", "geometry_provider", "must-not-leak", "created_at", "updated_at", "published_at", "paused_at", "origin_stop_id", "destination_stop_id", "service_route_id", "service_region_key", "route_key", "route_group_key", "stop_key", "estimated_offset_seconds", "dwell_seconds"]) {
      expect(serialized).not.toContain(forbidden);
    }

    const stopResponse = await request(target.server)
      .get("/api/v1/route-versions/version_1/stops")
      .set(auth("passenger_1"))
      .expect(200);
    expect(stopResponse.body.stops[0]).not.toHaveProperty("id");
    expect(stopResponse.body.stops[0].stop).toEqual({
      id: "stop_1",
      name_ar: "وسط الخليل",
      name_en: "Hebron Center"
    });
  });

  it("releases coordinates and ready geometry to the catalog only when maps are enabled", async () => {
    const readyVersion = {
      ...version,
      geometry_status: "available",
      geometry_encoding: "demo-json-v1",
      encoded_geometry: '[{"lat":31.5326,"lng":35.0998}]',
      geometry_precision: 6,
      estimated_distance_meters: 21_530
    };
    const service = serviceMock();
    service.listPublishedRoutes.mockResolvedValue({
      routes: [{ ...route, current_version: readyVersion }],
      total: 1,
      page: 1,
      limit: 25
    });
    service.getPublishedVersionStops.mockResolvedValue(readyVersion);
    const target = app(service, mapsEnabledConfig);

    const response = await request(target.server).get("/api/v1/routes").set(auth("passenger_1")).expect(200);
    const current = response.body.routes[0].current_version;
    expect(current.stops[0].stop).toEqual({
      id: "stop_1",
      name_ar: "وسط الخليل",
      name_en: "Hebron Center",
      latitude: 31.5326,
      longitude: 35.0998
    });
    expect(current.geometry).toEqual(
      expect.objectContaining({
        status: "available",
        ready: true,
        encoding: "demo-json-v1",
        encoded: '[{"lat":31.5326,"lng":35.0998}]'
      })
    );

    // Widening the contract must not widen it any further than coordinates and
    // the geometry the client draws.
    const serialized = JSON.stringify(response.body);
    for (const forbidden of ["geometry_provider", "must-not-leak", "created_by_user_id", "stop_key", "service_region_key"]) {
      expect(serialized).not.toContain(forbidden);
    }

    const stopResponse = await request(target.server)
      .get("/api/v1/route-versions/version_1/stops")
      .set(auth("passenger_1"))
      .expect(200);
    expect(stopResponse.body.stops[0].stop.latitude).toBe(31.5326);
  });

  it("withholds geometry from the catalog while a version is still pending", async () => {
    const target = app(serviceMock(), mapsEnabledConfig);
    const response = await request(target.server).get("/api/v1/routes").set(auth("passenger_1")).expect(200);
    const geometry = response.body.routes[0].current_version.geometry;
    expect(geometry).toEqual(expect.objectContaining({ status: "pending", ready: false, encoded: null, encoding: null }));
    expect(JSON.stringify(response.body)).not.toContain("must-not-leak");
  });

  it("passes bounded pagination and excludes draft access through the public service boundary", async () => {
    const target = app();
    await request(target.server).get("/api/v1/routes?page=2&limit=50").set(auth("driver_1")).expect(200);
    expect(target.service.listPublishedRoutes).toHaveBeenCalledWith(2, 50);
    target.service.getPublishedRoute.mockRejectedValueOnce(new HttpError(404, "route_not_found"));
    await request(target.server).get("/api/v1/routes/draft_route").set(auth("passenger_1")).expect(404);
    await request(target.server).get("/api/v1/routes?limit=51").set(auth("passenger_1")).expect(400);
  });

  it("surfaces safe idempotency replay and conflict responses", async () => {
    const replay = app();
    replay.service.createStop.mockResolvedValueOnce({ resource: stop, replayed: true });
    const response = await request(replay.server)
      .post("/api/v1/admin/stops")
      .set(auth("admin_1"))
      .set("Idempotency-Key", "stop-replay-001")
      .send({
        stop_key: "hebron-center",
        service_region_key: "south-west-bank",
        name_ar: "وسط الخليل",
        name_en: "Hebron Center",
        latitude: 31.5326,
        longitude: 35.0998
      })
      .expect(200);
    expect(response.body.replayed).toBe(true);

    const conflict = app();
    conflict.service.createStop.mockRejectedValueOnce(new HttpError(409, "idempotency_conflict"));
    await request(conflict.server)
      .post("/api/v1/admin/stops")
      .set(auth("admin_1"))
      .set("Idempotency-Key", "stop-conflict-001")
      .send({
        stop_key: "hebron-center",
        service_region_key: "south-west-bank",
        name_ar: "وسط الخليل",
        name_en: "Hebron Center",
        latitude: 31.5326,
        longitude: 35.0998
      })
      .expect(409);
  });
});
