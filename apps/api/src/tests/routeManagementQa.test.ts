import { describe, expect, it } from "vitest";
import {
  assertRouteQaDatabase,
  assertRouteQaFixtureSnapshot,
  routeQaAuditDeleteWhere,
  type RouteQaFixtureSnapshot
} from "../scripts/routeManagementQa.js";

function membership(
  stopId: string,
  sequence: number,
  passengerPickup: boolean,
  passengerDropoff: boolean,
  parcelPickup: boolean,
  parcelDropoff: boolean,
  dwellSeconds = sequence === 2 ? 120 : 60
) {
  return {
    stopId,
    sequence,
    passengerPickup,
    passengerDropoff,
    parcelPickup,
    parcelDropoff,
    scheduledOffsetSeconds: (sequence - 1) * 600,
    dwellSeconds
  };
}

function canonicalSnapshot(): RouteQaFixtureSnapshot {
  return {
    actor: { id: "qa-card6-admin", role: "admin", accountStatus: "active", demoAccount: false, hasPasswordHash: true },
    stops: [
      { id: "stop-a", stopKey: "qa-card6-a-active-stop", serviceRegionKey: "qa-card6-region", nameAr: "محطة اختبار نشطة", nameEn: "Active QA stop", latitude: "31.9038", longitude: "35.2034", status: "active" },
      { id: "stop-b", stopKey: "qa-card6-b-retired-stop", serviceRegionKey: "qa-card6-region", nameAr: "محطة اختبار متقاعدة", nameEn: "Retired QA stop", latitude: "31.907", longitude: "35.206", status: "retired" },
      { id: "stop-destination", stopKey: "qa-card6-shared-destination-stop", serviceRegionKey: "qa-card6-region", nameAr: "محطة اختبار نهائية", nameEn: "Destination QA stop", latitude: "31.915", longitude: "35.215", status: "active" },
      { id: "stop-middle", stopKey: "qa-card6-shared-middle-stop", serviceRegionKey: "qa-card6-region", nameAr: "محطة اختبار وسطى", nameEn: "Middle QA stop", latitude: "31.91", longitude: "35.21", status: "active" }
    ],
    routes: [
      {
        id: "route-c",
        routeKey: "qa-card6-c-empty-route",
        routeGroupKey: "qa-card6-empty-group",
        serviceRegionKey: "qa-card6-region",
        direction: "loop",
        status: "active",
        currentVersionId: null,
        versions: []
      },
      {
        id: "route-d",
        routeKey: "qa-card6-d-draft-route",
        routeGroupKey: "qa-card6-draft-group",
        serviceRegionKey: "qa-card6-region",
        direction: "outbound",
        status: "active",
        currentVersionId: null,
        versions: [{
          id: "version-d-1",
          versionNumber: 1,
          status: "draft",
          nameAr: "مسودة صالحة للاختبار",
          nameEn: "Valid QA draft",
          descriptionEn: "qa-card6-d-valid-draft",
          stops: [
            membership("stop-a", 1, true, false, false, false),
            membership("stop-destination", 2, false, true, false, false, 60)
          ]
        }]
      },
      {
        id: "route-e",
        routeKey: "qa-card6-e-invalid-route",
        routeGroupKey: "qa-card6-invalid-group",
        serviceRegionKey: "qa-card6-region",
        direction: "inbound",
        status: "active",
        currentVersionId: null,
        versions: [{
          id: "version-e-1",
          versionNumber: 1,
          status: "draft",
          nameAr: " ",
          nameEn: "Invalid publication QA draft",
          descriptionEn: "qa-card6-e-invalid-publication",
          stops: []
        }]
      },
      {
        id: "route-f",
        routeKey: "qa-card6-f-current-route",
        routeGroupKey: "qa-card6-history-group",
        serviceRegionKey: "qa-card6-region",
        direction: "outbound",
        status: "active",
        currentVersionId: "version-f-2",
        versions: [
          {
            id: "version-f-1",
            versionNumber: 1,
            status: "retired",
            nameAr: "المسار التجريبي الأول",
            nameEn: "QA route version one",
            descriptionEn: "qa-card6-h-retired-history",
            stops: [
              membership("stop-a", 1, true, false, true, false),
              membership("stop-middle", 2, true, true, true, true),
              membership("stop-destination", 3, false, true, false, true)
            ]
          },
          {
            id: "version-f-2",
            versionNumber: 2,
            status: "published",
            nameAr: "المسار التجريبي الأول",
            nameEn: "QA route version one",
            descriptionEn: "qa-card6-h-retired-history",
            stops: [
              membership("stop-a", 1, true, false, true, false),
              membership("stop-middle", 2, true, true, true, true),
              membership("stop-destination", 3, false, true, false, true)
            ]
          },
          {
            id: "version-f-3",
            versionNumber: 3,
            status: "draft",
            nameAr: "المسار التجريبي الأول",
            nameEn: "QA route version one",
            descriptionEn: "qa-card6-h-retired-history",
            stops: [
              membership("stop-a", 1, true, false, true, false),
              membership("stop-middle", 2, true, true, true, true),
              membership("stop-destination", 3, false, true, false, true)
            ]
          }
        ]
      },
      {
        id: "route-g",
        routeKey: "qa-card6-g-paused-route",
        routeGroupKey: "qa-card6-paused-group",
        serviceRegionKey: "qa-card6-region",
        direction: "inbound",
        status: "active",
        currentVersionId: "version-g-1",
        versions: [{
          id: "version-g-1",
          versionNumber: 1,
          status: "paused",
          nameAr: "مسار متوقف مؤقتا",
          nameEn: "Paused QA route",
          descriptionEn: "qa-card6-g-paused-current",
          stops: [
            membership("stop-a", 1, true, false, false, false),
            membership("stop-destination", 2, false, true, false, false, 60)
          ]
        }]
      },
      {
        id: "route-l",
        routeKey: "qa-card6-l-retired-route",
        routeGroupKey: "qa-card6-retired-group",
        serviceRegionKey: "qa-card6-region",
        direction: "outbound",
        status: "retired",
        currentVersionId: null,
        versions: []
      }
    ]
  };
}

describe("route management QA safety", () => {
  it("rejects raw empty query and fragment delimiters", () => {
    for (const unsafeUrl of [
      "mysql://localhost:3306/masari_routes_qa?",
      "mysql://localhost:3306/masari_routes_qa#",
      "mysql://localhost:3306/masari_routes_qa?#"
    ]) {
      expect(() => assertRouteQaDatabase(unsafeUrl)).toThrow("route_qa_database_guard_rejected");
    }
  });

  it("limits audit cleanup to selected fixture entity ids", () => {
    const where = routeQaAuditDeleteWhere(["fixture-route", "fixture-version"]);

    expect(where).toEqual({ entity_id: { in: ["fixture-route", "fixture-version"] } });
    expect(JSON.stringify(where)).not.toContain("user_id");
    expect(JSON.stringify(where)).not.toContain("qa-card6-admin");
  });

  it("accepts only the exact canonical fixture snapshot", () => {
    expect(() => assertRouteQaFixtureSnapshot(canonicalSnapshot())).not.toThrow();

    const mutations: Array<[string, (snapshot: RouteQaFixtureSnapshot) => void]> = [
      ["actor", (snapshot) => { snapshot.actor = null; }],
      ["route identity", (snapshot) => { snapshot.routes[0].direction = "outbound"; }],
      ["current pointer", (snapshot) => { snapshot.routes[3].currentVersionId = "version-f-1"; }],
      ["version number", (snapshot) => { snapshot.routes[3].versions[1].versionNumber = 4; }],
      ["stop order", (snapshot) => { snapshot.routes[1].versions[0].stops[0].stopId = "stop-destination"; }],
      ["parcel permission", (snapshot) => { snapshot.routes[3].versions[1].stops[0].parcelPickup = false; }],
      ["metadata", (snapshot) => { snapshot.routes[4].versions[0].descriptionEn = null; }]
    ];

    for (const [name, mutate] of mutations) {
      const snapshot = canonicalSnapshot();
      mutate(snapshot);
      expect(() => assertRouteQaFixtureSnapshot(snapshot), name).toThrow("route_qa_scenario_");
    }
  });
});
