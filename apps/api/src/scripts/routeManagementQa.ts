import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { PrismaClient } from "../generated/prisma/client.js";
import type { RouteManagementService, VersionStopInput } from "../services/routeManagement.js";

const ROUTE_QA_DATABASE = "masari_routes_qa";
const ROUTE_QA_HOSTS = new Set(["localhost", "127.0.0.1"]);
const FIXTURE_PREFIX = "qa-card6-";
const QA_ACTOR_ID = `${FIXTURE_PREFIX}admin`;
const QA_REGION = `${FIXTURE_PREFIX}region`;

const stopKeys = {
  active: `${FIXTURE_PREFIX}a-active-stop`,
  retired: `${FIXTURE_PREFIX}b-retired-stop`,
  middle: `${FIXTURE_PREFIX}shared-middle-stop`,
  destination: `${FIXTURE_PREFIX}shared-destination-stop`
} as const;

const routeKeys = {
  empty: `${FIXTURE_PREFIX}c-empty-route`,
  draft: `${FIXTURE_PREFIX}d-draft-route`,
  invalid: `${FIXTURE_PREFIX}e-invalid-route`,
  current: `${FIXTURE_PREFIX}f-current-route`,
  paused: `${FIXTURE_PREFIX}g-paused-route`,
  retired: `${FIXTURE_PREFIX}l-retired-route`
} as const;

export function assertRouteQaDatabase(databaseUrl: string) {
  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("route_qa_database_guard_rejected");
  }

  if (
    parsed.protocol !== "mysql:" ||
    !ROUTE_QA_HOSTS.has(parsed.hostname) ||
    parsed.pathname !== `/${ROUTE_QA_DATABASE}` ||
    parsed.search !== "" ||
    parsed.hash !== ""
  ) {
    throw new Error("route_qa_database_guard_rejected");
  }
}

export function requireRouteQaAdminPassword(value: string | undefined) {
  if (!value || value.length < 12) throw new Error("route_qa_admin_password_required");
  return value;
}

function actor(operation: string) {
  return {
    id: QA_ACTOR_ID,
    requestId: `${FIXTURE_PREFIX}${operation}`,
    idempotencyKey: `${FIXTURE_PREFIX}${operation}`
  };
}

function memberships(stopIds: string[], parcelEnabled: boolean): VersionStopInput[] {
  return stopIds.map((stopId, index) => ({
    stopId,
    sequence: index + 1,
    passengerPickupAllowed: index < stopIds.length - 1,
    passengerDropoffAllowed: index > 0,
    parcelPickupAllowed: parcelEnabled && index < stopIds.length - 1,
    parcelDropoffAllowed: parcelEnabled && index > 0,
    estimatedOffsetSeconds: index * 600,
    dwellSeconds: index === 0 || index === stopIds.length - 1 ? 60 : 120
  }));
}

function assertReady(condition: unknown, scenario: string): asserts condition {
  if (!condition) throw new Error(`route_qa_scenario_${scenario}_not_ready`);
}

async function assertFixturesAbsent(prisma: PrismaClient) {
  const [routes, stops, actorCount] = await Promise.all([
    prisma.serviceRoute.count({ where: { route_key: { startsWith: FIXTURE_PREFIX } } }),
    prisma.stop.count({ where: { stop_key: { startsWith: FIXTURE_PREFIX } } }),
    prisma.user.count({ where: { id: QA_ACTOR_ID } })
  ]);
  if (routes + stops + actorCount !== 0) throw new Error("route_qa_fixtures_already_exist");
}

async function prepareFixtures(prisma: PrismaClient, service: RouteManagementService, qaAdminPassword: string) {
  await assertFixturesAbsent(prisma);
  const { hash } = await import("bcryptjs");

  await prisma.user.create({
    data: {
      id: QA_ACTOR_ID,
      name: "Card 6 QA Administrator",
      phone: ["+970", "599", "900", "060"].join(""),
      password_hash: await hash(qaAdminPassword, 12),
      role: "admin"
    }
  });

  const activeStop = (await service.createStop({
    stopKey: stopKeys.active,
    serviceRegionKey: QA_REGION,
    nameAr: "محطة اختبار نشطة",
    nameEn: "Active QA stop",
    latitude: "31.903800",
    longitude: "35.203400"
  }, actor("stop-a-create"))).resource;
  const retiredStop = (await service.createStop({
    stopKey: stopKeys.retired,
    serviceRegionKey: QA_REGION,
    nameAr: "محطة اختبار متقاعدة",
    nameEn: "Retired QA stop",
    latitude: "31.907000",
    longitude: "35.206000"
  }, actor("stop-b-create"))).resource;
  const middleStop = (await service.createStop({
    stopKey: stopKeys.middle,
    serviceRegionKey: QA_REGION,
    nameAr: "محطة اختبار وسطى",
    nameEn: "Middle QA stop",
    latitude: "31.910000",
    longitude: "35.210000"
  }, actor("stop-middle-create"))).resource;
  const destinationStop = (await service.createStop({
    stopKey: stopKeys.destination,
    serviceRegionKey: QA_REGION,
    nameAr: "محطة اختبار نهائية",
    nameEn: "Destination QA stop",
    latitude: "31.915000",
    longitude: "35.215000"
  }, actor("stop-destination-create"))).resource;
  await service.retireStop(retiredStop.id, "qa_fixture_retired_stop", actor("stop-b-retire"));

  const retiredRoute = (await service.createRoute({
    routeKey: routeKeys.retired,
    routeGroupKey: `${FIXTURE_PREFIX}retired-group`,
    serviceRegionKey: QA_REGION,
    direction: "outbound"
  }, actor("route-l-create"))).resource;
  await service.retireRoute(
    retiredRoute.id,
    { reason: "qa_fixture_retired_route", expectedCurrentVersionId: null },
    actor("route-l-retire")
  );

  await service.createRoute({
    routeKey: routeKeys.empty,
    routeGroupKey: `${FIXTURE_PREFIX}empty-group`,
    serviceRegionKey: QA_REGION,
    direction: "loop"
  }, actor("route-c-create"));

  const draftRoute = (await service.createRoute({
    routeKey: routeKeys.draft,
    routeGroupKey: `${FIXTURE_PREFIX}draft-group`,
    serviceRegionKey: QA_REGION,
    direction: "outbound"
  }, actor("route-d-create"))).resource;
  const draftVersion = (await service.createVersion(draftRoute.id, {
    nameAr: "مسودة صالحة للاختبار",
    nameEn: "Valid QA draft",
    descriptionEn: `${FIXTURE_PREFIX}d-valid-draft`
  }, actor("version-d-create"))).resource;
  await service.replaceStops(
    draftVersion.id,
    draftVersion.draft_revision,
    memberships([activeStop.id, destinationStop.id], false),
    actor("version-d-stops")
  );

  const invalidRoute = (await service.createRoute({
    routeKey: routeKeys.invalid,
    routeGroupKey: `${FIXTURE_PREFIX}invalid-group`,
    serviceRegionKey: QA_REGION,
    direction: "inbound"
  }, actor("route-e-create"))).resource;
  await service.createVersion(invalidRoute.id, {
    nameAr: " ",
    nameEn: "Invalid publication QA draft",
    descriptionEn: `${FIXTURE_PREFIX}e-invalid-publication`
  }, actor("version-e-create"));

  const currentRoute = (await service.createRoute({
    routeKey: routeKeys.current,
    routeGroupKey: `${FIXTURE_PREFIX}history-group`,
    serviceRegionKey: QA_REGION,
    direction: "outbound"
  }, actor("route-f-create"))).resource;
  const currentV1 = (await service.createVersion(currentRoute.id, {
    nameAr: "المسار التجريبي الأول",
    nameEn: "QA route version one",
    descriptionEn: `${FIXTURE_PREFIX}h-retired-history`
  }, actor("version-f-v1-create"))).resource;
  const currentV1Ready = await service.replaceStops(
    currentV1.id,
    currentV1.draft_revision,
    memberships([activeStop.id, middleStop.id, destinationStop.id], true),
    actor("version-f-v1-stops")
  );
  await service.publishVersion(
    currentV1.id,
    { expectedRevision: currentV1Ready.draft_revision, expectedCurrentVersionId: null },
    actor("version-f-v1-publish")
  );
  const currentV2 = (await service.createVersion(currentRoute.id, {
    nameAr: "نسخة من المسار التجريبي",
    nameEn: "Cloned QA route version",
    cloneFromVersionId: currentV1.id
  }, actor("version-f-v2-create"))).resource;
  const publishedV2 = (await service.publishVersion(
    currentV2.id,
    { expectedRevision: currentV2.draft_revision, expectedCurrentVersionId: currentV1.id },
    actor("version-f-v2-publish")
  )).resource;
  await service.retireVersion(
    currentV1.id,
    { reason: "qa_fixture_historical_version", expectedCurrentVersionId: publishedV2.id },
    actor("version-f-v1-retire")
  );
  await service.createVersion(currentRoute.id, {
    nameAr: "مسودة مستنسخة للاختبار",
    nameEn: "Cloned QA draft",
    descriptionEn: `${FIXTURE_PREFIX}k-cloned-draft`,
    cloneFromVersionId: publishedV2.id
  }, actor("version-f-v3-create"));

  const pausedRoute = (await service.createRoute({
    routeKey: routeKeys.paused,
    routeGroupKey: `${FIXTURE_PREFIX}paused-group`,
    serviceRegionKey: QA_REGION,
    direction: "inbound"
  }, actor("route-g-create"))).resource;
  const pausedDraft = (await service.createVersion(pausedRoute.id, {
    nameAr: "مسار متوقف مؤقتا",
    nameEn: "Paused QA route",
    descriptionEn: `${FIXTURE_PREFIX}g-paused-current`
  }, actor("version-g-create"))).resource;
  const pausedReady = await service.replaceStops(
    pausedDraft.id,
    pausedDraft.draft_revision,
    memberships([activeStop.id, destinationStop.id], false),
    actor("version-g-stops")
  );
  const publishedPaused = (await service.publishVersion(
    pausedDraft.id,
    { expectedRevision: pausedReady.draft_revision, expectedCurrentVersionId: null },
    actor("version-g-publish")
  )).resource;
  await service.pauseVersion(
    publishedPaused.id,
    { reason: "qa_fixture_paused_version", expectedCurrentVersionId: publishedPaused.id },
    actor("version-g-pause")
  );

  console.log("route QA prepare complete: 12 scenarios ready; fixtures preserved");
}

function hasForwardPermission(
  stops: Array<{ passenger_pickup: boolean; passenger_dropoff: boolean; parcel_pickup: boolean; parcel_dropoff: boolean }>,
  kind: "passenger" | "parcel"
) {
  const pickup = kind === "passenger" ? "passenger_pickup" : "parcel_pickup";
  const dropoff = kind === "passenger" ? "passenger_dropoff" : "parcel_dropoff";
  return stops.some((origin, originIndex) =>
    origin[pickup] && stops.some((destination, destinationIndex) => destinationIndex > originIndex && destination[dropoff])
  );
}

async function verifyFixtures(prisma: PrismaClient) {
  const [stops, routes] = await Promise.all([
    prisma.stop.findMany({ where: { stop_key: { startsWith: FIXTURE_PREFIX } } }),
    prisma.serviceRoute.findMany({
      where: { route_key: { startsWith: FIXTURE_PREFIX } },
      include: {
        current_version: { include: { stops: { orderBy: { sequence: "asc" } } } },
        versions: { include: { stops: { orderBy: { sequence: "asc" } } }, orderBy: { version_number: "asc" } }
      }
    })
  ]);
  const stopByKey = new Map(stops.map((stop) => [stop.stop_key, stop]));
  const routeByKey = new Map(routes.map((route) => [route.route_key, route]));
  const empty = routeByKey.get(routeKeys.empty);
  const draft = routeByKey.get(routeKeys.draft);
  const invalid = routeByKey.get(routeKeys.invalid);
  const current = routeByKey.get(routeKeys.current);
  const paused = routeByKey.get(routeKeys.paused);
  const retired = routeByKey.get(routeKeys.retired);

  assertReady(stopByKey.get(stopKeys.active)?.status === "active", "a");
  assertReady(stopByKey.get(stopKeys.retired)?.status === "retired", "b");
  assertReady(empty?.status === "active" && empty.current_version_id === null && empty.versions.length === 0, "c");
  assertReady(draft?.versions.length === 1 && draft.versions[0].status === "draft" && draft.versions[0].stops.length === 2, "d");
  assertReady(
    invalid?.versions.length === 1 && invalid.versions[0].status === "draft" &&
      invalid.versions[0].name_ar.trim() === "" && invalid.versions[0].stops.length === 0,
    "e"
  );
  assertReady(current?.current_version?.status === "published" && hasForwardPermission(current.current_version.stops, "passenger"), "f");
  assertReady(paused?.current_version?.status === "paused", "g");
  assertReady(current?.versions.some((version) => version.status === "retired"), "h");
  assertReady(current?.current_version && hasForwardPermission(current.current_version.stops, "parcel"), "i");
  assertReady(current?.versions.length === 3, "j");
  assertReady(current?.versions.some((version) => version.status === "draft" && version.stops.length === 3), "k");
  assertReady(retired?.status === "retired" && retired.current_version_id === null, "l");

  console.log("route QA verify complete: 12/12 scenarios ready; no mutations performed");
}

async function cleanupFixtures(prisma: PrismaClient) {
  const [routes, stops] = await Promise.all([
    prisma.serviceRoute.findMany({
      where: { route_key: { startsWith: FIXTURE_PREFIX } },
      select: { id: true, versions: { select: { id: true } } }
    }),
    prisma.stop.findMany({ where: { stop_key: { startsWith: FIXTURE_PREFIX } }, select: { id: true } })
  ]);
  const routeIds = routes.map((route) => route.id);
  const versionIds = routes.flatMap((route) => route.versions.map((version) => version.id));
  const stopIds = stops.map((stop) => stop.id);
  const resourceIds = [...routeIds, ...versionIds, ...stopIds];

  await prisma.$transaction(async (tx) => {
    if (routeIds.length > 0) {
      await tx.serviceRoute.updateMany({ where: { id: { in: routeIds } }, data: { current_version_id: null } });
    }
    if (versionIds.length > 0) {
      await tx.routeVersionStop.deleteMany({ where: { service_route_version_id: { in: versionIds } } });
    }
    if (resourceIds.length > 0) {
      await tx.auditEvent.deleteMany({
        where: { OR: [{ entity_id: { in: resourceIds } }, { user_id: QA_ACTOR_ID }] }
      });
      await tx.idempotencyRecord.deleteMany({ where: { resource_id: { in: resourceIds } } });
    }
    if (versionIds.length > 0) {
      await tx.serviceRouteVersion.deleteMany({ where: { id: { in: versionIds } } });
    }
    if (routeIds.length > 0) await tx.serviceRoute.deleteMany({ where: { id: { in: routeIds } } });
    if (stopIds.length > 0) await tx.stop.deleteMany({ where: { id: { in: stopIds } } });
    await tx.user.deleteMany({ where: { id: QA_ACTOR_ID } });
  });

  console.log(`route QA cleanup complete: ${routeIds.length} routes, ${versionIds.length} versions, ${stopIds.length} stops`);
}

async function main() {
  const mode = process.argv.slice(2).find((argument) => !argument.startsWith("--"));
  if (!process.argv.includes("--confirm-disposable")) throw new Error("route_qa_confirmation_required");
  if (mode !== "prepare" && mode !== "verify" && mode !== "cleanup") throw new Error("route_qa_mode_required");
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("route_qa_database_guard_rejected");

  assertRouteQaDatabase(databaseUrl);
  const qaAdminPassword = mode === "prepare"
    ? requireRouteQaAdminPassword(process.env.ROUTE_QA_ADMIN_PASSWORD)
    : undefined;

  const [{ prisma }, { createRouteManagementService }] = await Promise.all([
    import("../lib/prisma.js"),
    import("../services/routeManagement.js")
  ]);
  const service = createRouteManagementService(prisma);
  try {
    if (mode === "prepare") await prepareFixtures(prisma, service, qaAdminPassword!);
    if (mode === "verify") await verifyFixtures(prisma);
    if (mode === "cleanup") await cleanupFixtures(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch(() => {
    console.error("route QA command failed; details withheld");
    process.exitCode = 1;
  });
}
