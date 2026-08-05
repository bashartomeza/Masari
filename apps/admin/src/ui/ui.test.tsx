import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "../i18n/LocaleContext";
import type { Locale } from "../i18n/translations";
import { NAV_ITEMS } from "../navigation";
import { translate } from "../i18n/locale";
import { SideNav, initialOf } from "./AppShell";
import { toneForStatus } from "./StatusBadge";
import { ModuleUnavailable } from "../features/placeholder/ModuleUnavailable";
import { OverviewDashboard, deriveAlerts } from "../features/overview/OverviewDashboard";
import { matchesSearch } from "../features/search";
import { railSteps } from "../features/trips/TripsTracking";
import { parcelSteps } from "../features/batching/BatchingWorkspace";
import { scorePercent } from "../features/matching/MatchingWorkspace";

/**
 * The suite runs in a node environment, so the provider is given explicit
 * storage and document stubs instead of the `window` defaults.
 */
function withLocale(locale: Locale, children: ReactNode) {
  const storage = { getItem: () => locale, setItem: () => undefined };
  const documentRef = { documentElement: { lang: "", dir: "" } };
  return renderToStaticMarkup(
    <LocaleProvider storage={storage} documentRef={documentRef}>
      {children}
    </LocaleProvider>
  );
}

/** React escapes entities in static markup, so expectations must escape too. */
function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

/** Visible text only — strips tags so SVG path data is not mistaken for content. */
function textOf(markup: string) {
  return markup.replace(/<[^>]*>/g, " ");
}

const emptyOverview = { dashboard: null, routes: [], requests: [], orders: [], trips: [] };

describe("admin shell", () => {
  it("renders every sidebar tab label in Arabic and English", () => {
    for (const locale of ["ar", "en"] as Locale[]) {
      const markup = renderToStaticMarkup(
        <SideNav
          items={NAV_ITEMS}
          active="overview"
          onSelect={() => undefined}
          labels={{
            brand: "Masari",
            subtitle: "",
            navigation: "nav",
            label: (item) => translate(locale, item.labelKey)
          }}
          footer={null}
        />
      );
      for (const item of NAV_ITEMS) {
        expect(markup).toContain(escapeHtml(translate(locale, item.labelKey)));
      }
    }
  });

  it("marks exactly one tab as the current page", () => {
    const markup = renderToStaticMarkup(
      <SideNav
        items={NAV_ITEMS}
        active="trips"
        onSelect={() => undefined}
        labels={{ brand: "", subtitle: "", navigation: "nav", label: (item) => item.id }}
        footer={null}
      />
    );
    expect(markup.match(/aria-current="page"/g)).toHaveLength(1);
    expect(markup).toContain('class="sidenav__item is-active"');
  });

  it("derives avatar initials without assuming a Latin alphabet", () => {
    expect(initialOf("أحمد محمود")).toBe("أ");
    expect(initialOf("Sara Mansour")).toBe("S");
    expect(initialOf(undefined)).toBe("؟");
  });
});

describe("status tones", () => {
  it("maps lifecycle statuses onto the design system tones", () => {
    expect(toneForStatus("completed")).toBe("success");
    expect(toneForStatus("in_transit")).toBe("info");
    expect(toneForStatus("pending")).toBe("warning");
    expect(toneForStatus("cancelled")).toBe("danger");
  });

  it("falls back to neutral for a status the backend adds later", () => {
    expect(toneForStatus("some_future_status")).toBe("neutral");
  });
});

describe("modules without a backing endpoint", () => {
  it("states the module is unavailable and renders no sample records", () => {
    const markup = withLocale("en", <ModuleUnavailable icon="verified_user" reason="no-api" />);
    expect(markup).toContain("This module is not available yet");
    expect(textOf(markup)).not.toMatch(/\d/);
  });

  it("distinguishes a demo-only module from a missing endpoint", () => {
    const markup = withLocale("en", <ModuleUnavailable icon="alt_route" reason="demo-only" />);
    expect(markup).toContain("Demo builds only");
    expect(markup).not.toContain("This module is not available yet");
  });

  it("localizes both states into Arabic", () => {
    expect(withLocale("ar", <ModuleUnavailable icon="psychology" reason="no-api" />)).toContain("غير متاحة بعد");
    expect(withLocale("ar", <ModuleUnavailable icon="alt_route" reason="demo-only" />)).toContain("إصدار العرض فقط");
  });
});

describe("overview dashboard", () => {
  it("renders empty states rather than placeholder numbers when the API returned nothing", () => {
    const markup = withLocale(
      "en",
      <OverviewDashboard data={emptyOverview} search="" busy={false} onRefresh={() => undefined} />
    );
    expect(markup).toContain("No active operations right now.");
    expect(markup).toContain("No critical alerts");
    expect(markup).toContain("—");
  });

  it("derives alerts only from data the API actually returned", () => {
    expect(deriveAlerts(emptyOverview)).toEqual({
      unmatchedRequests: 0,
      unverifiedDriverRoutes: 0,
      unbatchedOrders: 0
    });

    const alerts = deriveAlerts({
      ...emptyOverview,
      requests: [
        { id: "r1", status: "pending", pickup_label: "a", destination_label: "b", passenger_count: 1 },
        { id: "r2", status: "matched", pickup_label: "a", destination_label: "b", passenger_count: 1 }
      ],
      routes: [
        {
          id: "route_1",
          status: "active",
          origin_label: "a",
          destination_label: "b",
          seats_available: 2,
          parcel_capacity_available: 3,
          driver: { verified: false }
        }
      ],
      orders: [{ id: "o1", status: "created", pickup_label: "a" }]
    });
    expect(alerts).toEqual({ unmatchedRequests: 1, unverifiedDriverRoutes: 1, unbatchedOrders: 1 });
  });

  it("searches case-insensitively across the operator-facing fields", () => {
    expect(matchesSearch(["Hebron", "Bethlehem"], "hebr")).toBe(true);
    expect(matchesSearch(["Hebron"], "nablus")).toBe(false);
    expect(matchesSearch([undefined, 12], "")).toBe(true);
  });
});

describe("progress rails", () => {
  it("splits the trip lifecycle into done, current, and pending steps", () => {
    const flow = ["accepted", "picked_up", "in_transit", "completed"];
    expect(railSteps(flow, "in_transit").map((step) => step.state)).toEqual(["done", "done", "current", "pending"]);
  });

  it("treats an unknown trip status as entirely pending rather than crashing", () => {
    const flow = ["accepted", "completed"];
    expect(railSteps(flow, "unknown").map((step) => step.state)).toEqual(["pending", "pending"]);
  });

  it("marks the first undelivered parcel as the current delivery stop", () => {
    const parcels = [
      { id: "p1", status: "delivered", destination_label: "a", size: "s", priority: "normal" },
      { id: "p2", status: "in_transit", destination_label: "b", size: "s", priority: "normal" },
      { id: "p3", status: "created", destination_label: "c", size: "s", priority: "normal" }
    ];
    expect(parcelSteps(parcels, (value) => value).map((step) => step.state)).toEqual(["done", "current", "pending"]);
  });

  it("scales match sub-scores to a percentage but leaves the deviation distance alone", () => {
    expect(scorePercent("trustScore", 0.82)).toBeCloseTo(82);
    expect(scorePercent("estimatedDeviationKm", 4.2)).toBeNull();
    expect(scorePercent("timingFit", 3)).toBe(100);
  });
});
