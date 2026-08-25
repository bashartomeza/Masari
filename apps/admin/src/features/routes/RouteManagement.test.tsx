// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import adminPackage from "../../../package.json";
import type { CanonicalStop, RouteStopDraft, ServiceRoute, ServiceRouteVersion } from "../../api";
import {
  RouteManagement,
  RouteMembershipStopLabel,
  ADMIN_ROUTE_RESPONSIVE_BREAKPOINT,
  handleRouteMutationFailure,
  lifecycleActions,
  mutationFailureIsAuthoritative,
  mutationFingerprint,
  moveRouteStop,
  publicationReadiness,
  reconcileRouteVersionSnapshot,
  routeCatalogView,
  routeCatalogQuery,
  routeConflictRequiresReload,
  routeStatusText,
  routeUsedStopIds,
  routeUiText,
  routeUiError,
  reorderControlLabel,
  stableMutationKey,
  toggleRouteStopPermission
} from "./RouteManagement";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

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

const canonicalStops: CanonicalStop[] = [
  {
    id: "stop_1",
    stop_key: "ppu-main",
    service_region_key: "south-west-bank",
    name_ar: "جامعة بوليتكنك فلسطين",
    name_en: "Palestine Polytechnic University",
    latitude: 31.507316,
    longitude: 35.090893,
    status: "active"
  },
  {
    id: "stop_2",
    stop_key: "bab-al-zawiya",
    service_region_key: "south-west-bank",
    name_ar: "باب الزاوية",
    name_en: "Bab Al-Zawiya",
    latitude: 31.527513,
    longitude: 35.101859,
    status: "active"
  }
];

const readyVersion: ServiceRouteVersion & { service_region_key: string } = {
  ...version,
  service_region_key: "south-west-bank",
  name_ar: "الخليل الداخلية",
  name_en: "Hebron local",
  active_from: "2026-08-25T06:00:00.000Z",
  active_until: "2026-08-25T20:00:00.000Z",
  stop_count: 2,
  stops: [
    {
      id: "membership_1",
      stop_id: "stop_1",
      sequence: 1,
      passenger_pickup_allowed: true,
      passenger_dropoff_allowed: false,
      parcel_pickup_allowed: true,
      parcel_dropoff_allowed: false,
      stop: canonicalStops[0]
    },
    {
      id: "membership_2",
      stop_id: "stop_2",
      sequence: 2,
      passenger_pickup_allowed: false,
      passenger_dropoff_allowed: true,
      parcel_pickup_allowed: false,
      parcel_dropoff_allowed: true,
      stop: canonicalStops[1]
    }
  ]
};

let mountedHost: HTMLDivElement | null = null;

afterEach(() => {
  mountedHost?.remove();
  mountedHost = null;
  document.body.replaceChildren();
});

describe("admin route management", () => {
  it("models loading, empty, error, and populated catalog states", () => {
    expect(routeCatalogView({ loading: true, error: false, count: 0 })).toBe("loading");
    expect(routeCatalogView({ loading: false, error: true, count: 0 })).toBe("error");
    expect(routeCatalogView({ loading: false, error: false, count: 0 })).toBe("empty");
    expect(routeCatalogView({ loading: false, error: false, count: 1 })).toBe("ready");
  });

  it("renders the directory-first Arabic and English landing surface without an inline create form", () => {
    const arabic = renderToStaticMarkup(<RouteManagement api={{} as never} token="token" locale="ar" />);
    const english = renderToStaticMarkup(<RouteManagement api={{} as never} token="token" locale="en" />);
    expect(arabic).toContain("إدارة المسارات");
    expect(arabic).toContain("جارٍ تحميل كتالوج المسارات");
    expect(arabic).toContain("إنشاء مسار");
    expect(arabic).toContain("تصفية منطقة الخدمة");
    expect(arabic).not.toContain("الاسم بالعربية");
    expect(arabic).not.toContain("معاينة الخريطة غير متاحة");
    expect(english).toContain("Route management");
    expect(english).toContain("Loading the route catalog");
    expect(english).toContain("Create route");
    expect(english).toContain("Service region filter");
    expect(english).not.toContain("Arabic name");
    expect(english).not.toContain("Create stop");
    expect(english).not.toContain("Action reason");
    expect(english).not.toContain("Map preview unavailable");
  });

  it("emits all bounded directory filters while preserving the fixed page size", () => {
    expect(routeCatalogQuery({
      page: 2,
      search: "Hebron",
      status: "active",
      direction: "outbound",
      serviceRegionKey: "south-west-bank"
    }).toString()).toBe("page=2&limit=25&search=Hebron&status=active&direction=outbound&service_region_key=south-west-bank");
  });

  it("advises on missing bilingual names, minimum stops, and invalid date order", () => {
    expect(publicationReadiness({ ...readyVersion, name_ar: " " }, canonicalStops)).toEqual(["readinessMissingNames"]);
    expect(publicationReadiness({ ...readyVersion, stops: [readyVersion.stops[0]], stop_count: 1 }, canonicalStops)).toEqual([
      "readinessMinimumStops",
      "readinessPassengerPath",
      "readinessParcelPath"
    ]);
    expect(publicationReadiness({
      ...readyVersion,
      active_from: "2026-08-25T20:00:00.000Z",
      active_until: "2026-08-25T06:00:00.000Z"
    }, canonicalStops)).toEqual(["readinessDateOrder"]);
  });

  it("advises when a route membership references an inactive or foreign-region stop", () => {
    const inactive = { ...canonicalStops[1], status: "retired" as const };
    expect(publicationReadiness({
      ...readyVersion,
      stops: [readyVersion.stops[0], { ...readyVersion.stops[1], stop: inactive }]
    }, [canonicalStops[0], inactive])).toEqual(["readinessStopEligibility"]);

    const foreign = { ...canonicalStops[1], service_region_key: "central-west-bank" };
    expect(publicationReadiness({
      ...readyVersion,
      stops: [readyVersion.stops[0], { ...readyVersion.stops[1], stop: foreign }]
    }, [canonicalStops[0], foreign])).toEqual(["readinessStopEligibility"]);
  });

  it("advises on absent downstream passenger and inconsistent parcel paths", () => {
    const noPassengerPath = {
      ...readyVersion,
      stops: readyVersion.stops.map((membership) => ({ ...membership, passenger_dropoff_allowed: false }))
    };
    expect(publicationReadiness(noPassengerPath, canonicalStops)).toEqual(["readinessPassengerPath"]);

    const inconsistentParcelPath = {
      ...readyVersion,
      stops: readyVersion.stops.map((membership, index) => ({
        ...membership,
        parcel_pickup_allowed: index === 1,
        parcel_dropoff_allowed: index === 0
      }))
    };
    expect(publicationReadiness(inconsistentParcelPath, canonicalStops)).toEqual(["readinessParcelPath"]);
  });

  it("reconciles a saved stop replacement into version tabs and used-stop eligibility", () => {
    const staleVersion = {
      ...readyVersion,
      draft_revision: 1,
      stop_count: 1,
      stops: [readyVersion.stops[0]]
    };
    const route: ServiceRoute = {
      id: "route_1",
      route_key: "hebron-local",
      route_group_key: "hebron",
      service_region_key: "south-west-bank",
      direction: "loop",
      status: "active",
      current_version_id: null,
      current_version: null,
      versions: [staleVersion],
      version_count: 1,
      created_at: "2026-08-25T00:00:00.000Z",
      updated_at: "2026-08-25T00:00:00.000Z"
    };
    const savedVersion = { ...readyVersion, draft_revision: 2 };

    const reconciled = reconcileRouteVersionSnapshot(route, savedVersion);

    expect(reconciled.versions?.[0]).toEqual(savedVersion);
    expect(reconciled.versions?.[0].draft_revision).toBe(2);
    expect(reconciled.versions?.[0].stops.map((membership) => membership.stop_id)).toEqual(["stop_1", "stop_2"]);
    expect([...routeUsedStopIds(reconciled)]).toEqual(["stop_1", "stop_2"]);
  });

  it("renders embedded bilingual membership Stops beyond the bounded catalog with an isolated ID fallback", () => {
    const english = renderToStaticMarkup(
      <RouteMembershipStopLabel
        membership={stops[1]}
        version={readyVersion}
        stops={[canonicalStops[0]]}
        locale="en"
      />
    );
    const arabic = renderToStaticMarkup(
      <RouteMembershipStopLabel
        membership={stops[1]}
        version={readyVersion}
        stops={[canonicalStops[0]]}
        locale="ar"
      />
    );
    const fallback = renderToStaticMarkup(
      <RouteMembershipStopLabel
        membership={{ ...stops[1], stop_id: "stop_outside_both_bounds" }}
        version={{ ...readyVersion, stops: [] }}
        stops={[]}
        locale="en"
      />
    );

    expect(english).toContain("Bab Al-Zawiya");
    expect(arabic).toContain("باب الزاوية");
    expect(english).not.toContain("stop_2");
    expect(fallback).toContain('dir="ltr"');
    expect(fallback).toContain('class="technical-value"');
    expect(fallback).toContain("stop_outside_both_bounds");
  });

  it("renders distinct localized directory filters without making map status part of the landing header", () => {
    const english = renderToStaticMarkup(<RouteManagement api={{} as never} token="token" locale="en" />);
    const arabic = renderToStaticMarkup(<RouteManagement api={{} as never} token="token" locale="ar" />);

    for (const label of ["Route status filter", "Direction filter", "Service region filter"]) expect(english).toContain(label);
    expect(arabic).toContain("تصفية حالة المسار");
    expect(english).not.toContain("Map preview unavailable");
  });

  it("shows successful create feedback in the opened route workspace", async () => {
    const createdRoute: ServiceRoute = {
      id: "route_created",
      route_key: "hebron-local",
      route_group_key: "hebron",
      service_region_key: "south-west-bank",
      direction: "outbound",
      status: "active",
      current_version_id: version.id,
      current_version: { ...version, service_route_id: "route_created", name_en: "Created Hebron route" },
      versions: [{ ...version, service_route_id: "route_created", name_en: "Created Hebron route" }],
      version_count: 1,
      created_at: "2026-08-25T00:00:00.000Z",
      updated_at: "2026-08-25T00:00:00.000Z"
    };
    const api = {
      serviceRoutes: vi.fn().mockResolvedValue({ routes: [createdRoute], page: 1, limit: 25, total: 1 }),
      canonicalStops: vi.fn().mockResolvedValue({ stops: [], page: 1, limit: 50, total: 0 }),
      createServiceRoute: vi.fn().mockResolvedValue({ route: createdRoute }),
      serviceRoute: vi.fn().mockResolvedValue({ route: createdRoute })
    };
    mountedHost = document.createElement("div");
    document.body.append(mountedHost);
    const root = createRoot(mountedHost);

    await act(async () => { root.render(<RouteManagement api={api as never} token="token" locale="en" />); });
    await act(async () => { await Promise.resolve(); });
    const create = [...mountedHost.querySelectorAll("button")].find((button) => button.textContent?.trim() === "Create route")!;
    act(() => create.click());
    const form = mountedHost.querySelector<HTMLFormElement>("#create-route-form")!;

    for (const [name, value] of Object.entries({ route_key: " hebron-local ", route_group_key: " hebron ", service_region_key: " south-west-bank " })) {
      const input = form.querySelector<HTMLInputElement>(`input[name="${name}"]`)!;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      act(() => {
        setter.call(input, value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      });
    }
    expect(new FormData(form).get("route_key")).toBe(" hebron-local ");
    expect(new FormData(form).get("route_group_key")).toBe(" hebron ");
    expect(new FormData(form).get("service_region_key")).toBe(" south-west-bank ");
    await act(async () => { form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); await Promise.resolve(); });

    expect(mountedHost.textContent).toContain("Created Hebron route");
    expect(mountedHost.textContent).toContain("Saved successfully.");
    expect(mountedHost.querySelector('[role="dialog"]')).toBeNull();
    root.unmount();
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

  it("keeps mutation keys stable through uncertain outcomes and rotates after settlement", () => {
    const registry = new Map<string, string>();
    let sequence = 0;
    const factory = () => `key-${++sequence}`;
    const payload = { routeId: "route_1", clone_from_version_id: "version_1" };
    const first = stableMutationKey(registry, "route_version_clone", payload, factory);
    const retry = stableMutationKey(registry, "route_version_clone", payload, factory);
    expect(retry).toEqual(first);
    expect(mutationFailureIsAuthoritative(new TypeError("Failed to fetch"))).toBe(false);
    expect(mutationFailureIsAuthoritative(Object.assign(new Error("internal_server_error"), { status: 500 }))).toBe(false);
    expect(mutationFailureIsAuthoritative(Object.assign(new Error("idempotency_in_progress"), { status: 409 }))).toBe(false);
    expect(mutationFailureIsAuthoritative(Object.assign(new Error("resource_conflict"), { status: 409 }))).toBe(true);
    registry.delete(mutationFingerprint("route_version_clone", payload));
    expect(stableMutationKey(registry, "route_version_clone", payload, factory).key).toBe("key-2");
  });

  it("localizes safe errors without rendering raw API or internal error codes", () => {
    expect(routeUiError("en", new Error("draft_revision_conflict"))).toContain("Another session");
    expect(routeUiError("en", new Error("used_stop_immutable"))).toContain("already belongs to a route version");
    expect(routeUiError("ar", new Error("internal_database_detail"))).toBe(routeUiText("ar").genericError);
    expect(routeUiError("en", new Error("route_version_not_pausable"))).toBe(routeUiText("en").genericError);
    expect(routeUiError("en", new Error("route_version_not_pausable"))).not.toContain("route_version_not_pausable");
  });

  it("never renders an unknown raw route lifecycle status", () => {
    expect(routeStatusText("en", "published")).toBe("Published");
    expect(routeStatusText("ar", "retired")).toBe("متقاعد");
    expect(routeStatusText("en", "internal_future_status")).toBe(routeUiText("en").status);
    expect(routeStatusText("en", "internal_future_status")).not.toContain("internal_future_status");
  });

  it("reloads authoritative route state for every conflict and returns bounded localized feedback", async () => {
    const reload = vi.fn().mockResolvedValue(true);
    const message = await handleRouteMutationFailure(
      Object.assign(new Error("current_version_conflict"), { status: 409 }),
      reload,
      "en"
    );

    expect(routeConflictRequiresReload(Object.assign(new Error("idempotency_in_progress"), { status: 409 }))).toBe(true);
    expect(reload).toHaveBeenCalledOnce();
    expect(message).toContain("reload");
  });

  it("does not claim a conflict reload succeeded when reconciliation fails", async () => {
    const reload = vi.fn().mockResolvedValue(false);
    const message = await handleRouteMutationFailure(
      Object.assign(new Error("current_version_conflict"), { status: 409 }),
      reload,
      "en"
    );

    expect(reload).toHaveBeenCalledOnce();
    expect(message).toBe(routeUiText("en").reloadFailed);
    expect(message).not.toBe(routeUiText("en").conflictReloaded);
    expect(message).not.toBe(routeUiText("en").saved);
  });

  it("does not reload non-conflicts or expose unknown internal failure text", async () => {
    const reload = vi.fn().mockResolvedValue(undefined);
    const message = await handleRouteMutationFailure(
      Object.assign(new Error("internal_database_detail"), { status: 500 }),
      reload,
      "en"
    );

    expect(reload).not.toHaveBeenCalled();
    expect(message).toBe(routeUiText("en").genericError);
    expect(message).not.toContain("internal_database_detail");
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
