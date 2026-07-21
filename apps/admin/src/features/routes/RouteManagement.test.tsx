import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import adminPackage from "../../../package.json";
import type { RouteStopDraft, ServiceRouteVersion } from "../../api";
import {
  RouteManagement,
  ADMIN_ROUTE_RESPONSIVE_BREAKPOINT,
  lifecycleActions,
  moveRouteStop,
  routeCatalogView,
  routeUiText,
  reorderControlLabel,
  toggleRouteStopPermission
} from "./RouteManagement";

const version: ServiceRouteVersion = {
  id: "version_1",
  service_route_id: "route_1",
  version_number: 1,
  status: "draft",
  name_ar: "الخليل إلى بيت لحم",
  name_en: "Hebron to Bethlehem",
  description_ar: null,
  description_en: null,
  active_from: null,
  active_until: null,
  draft_revision: 1,
  stop_count: 0,
  stops: [],
  geometry: { status: "pending", ready: false }
};

const stops: RouteStopDraft[] = [
  {
    stop_id: "stop_1",
    sequence: 1,
    passenger_pickup_allowed: true,
    passenger_dropoff_allowed: false,
    parcel_pickup_allowed: true,
    parcel_dropoff_allowed: false
  },
  {
    stop_id: "stop_2",
    sequence: 2,
    passenger_pickup_allowed: false,
    passenger_dropoff_allowed: true,
    parcel_pickup_allowed: false,
    parcel_dropoff_allowed: true
  }
];

describe("admin route management", () => {
  it("models loading, empty, error, and populated catalog states", () => {
    expect(routeCatalogView({ loading: true, error: false, count: 0 })).toBe("loading");
    expect(routeCatalogView({ loading: false, error: true, count: 0 })).toBe("error");
    expect(routeCatalogView({ loading: false, error: false, count: 0 })).toBe("empty");
    expect(routeCatalogView({ loading: false, error: false, count: 1 })).toBe("ready");
  });

  it("renders Arabic RTL-ready and English LTR-ready copy, loading state, and create forms", () => {
    const arabic = renderToStaticMarkup(<RouteManagement api={{} as never} token="token" locale="ar" />);
    const english = renderToStaticMarkup(<RouteManagement api={{} as never} token="token" locale="en" />);
    expect(arabic).toContain("إدارة المسارات");
    expect(arabic).toContain("جارٍ تحميل كتالوج المسارات");
    expect(arabic).toContain("الاسم بالعربية");
    expect(arabic).toContain("إنشاء محطة");
    expect(arabic).toContain("سبب الإجراء");
    expect(english).toContain("Route management");
    expect(english).toContain("Loading the route catalog");
    expect(english).toContain("Arabic name");
    expect(english).toContain("Create stop");
    expect(english).toContain("Action reason");
  });

  it("reorders stops deterministically and preserves contiguous server-authoritative sequence", () => {
    const moved = moveRouteStop(stops, 1, -1);
    expect(moved.map((stop) => [stop.stop_id, stop.sequence])).toEqual([
      ["stop_2", 1],
      ["stop_1", 2]
    ]);
    expect(moveRouteStop(stops, 0, -1)).toBe(stops);
  });

  it("toggles one permission without mutating the remaining editor state", () => {
    const changed = toggleRouteStopPermission(stops, 1, "parcel_pickup_allowed");
    expect(changed[1].parcel_pickup_allowed).toBe(true);
    expect(changed[0]).toEqual(stops[0]);
    expect(stops[1].parcel_pickup_allowed).toBe(false);
  });

  it("shows only valid draft, published, paused, and retired lifecycle actions", () => {
    expect(lifecycleActions(version)).toEqual(["publish", "retire"]);
    expect(lifecycleActions({ ...version, status: "published" })).toEqual(["clone", "pause", "retire"]);
    expect(lifecycleActions({ ...version, status: "paused" })).toEqual(["clone", "resume", "retire"]);
    expect(lifecycleActions({ ...version, status: "retired" })).toEqual([]);
  });

  it("provides localized stale-revision and confirmation guidance", () => {
    expect(routeUiText("ar").revisionConflict).toContain("جلسة أخرى");
    expect(routeUiText("en").revisionConflict).toContain("Another session");
    expect(routeUiText("ar").confirm).toContain("سجل التدقيق");
    expect(routeUiText("en").confirm).toContain("audit log");
  });

  it("has no map dependency or demo-control leakage and retains accessible responsive controls", () => {
    const dependencies = JSON.stringify(adminPackage.dependencies);
    const markup = renderToStaticMarkup(<RouteManagement api={{} as never} token="token" locale="en" />);
    expect(dependencies).not.toMatch(/mapbox|google.maps|leaflet|socket\.io/i);
    expect(markup).not.toMatch(/x-demo-reset-key|reset demo|simulate step|demo credentials/i);
    expect(reorderControlLabel("Move up", 0)).toBe("Move up 1");
    expect(reorderControlLabel("تحريك لأسفل", 1)).toBe("تحريك لأسفل 2");
    expect(ADMIN_ROUTE_RESPONSIVE_BREAKPOINT).toBe(880);
  });
});
