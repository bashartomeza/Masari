import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { DriverProfile } from "../../api";
import { LocaleProvider } from "../../i18n/LocaleContext";
import type { Locale } from "../../i18n/translations";
import { DriverDirectory, DriverReviewPanel } from "./DriverDirectory";
import { UsersDirectory } from "../users/UsersDirectory";

function withLocale(locale: Locale, children: ReactNode) {
  const storage = { getItem: () => locale, setItem: () => undefined };
  const documentRef = { documentElement: { lang: "", dir: "" } };
  return renderToStaticMarkup(
    <LocaleProvider storage={storage} documentRef={documentRef}>
      {children}
    </LocaleProvider>
  );
}

function textOf(markup: string) {
  return markup.replace(/<[^>]*>/g, " ");
}

const driver: DriverProfile = {
  id: "driver_profile_1",
  vehicle_type: "van",
  seats_total: 6,
  parcel_capacity: 12,
  verified: false,
  trust_score: 86,
  created_at: "2026-07-01T00:00:00.000Z",
  user: {
    id: "user_2",
    name: "Demo Driver Hebron Route",
    phone: "+970590000002",
    role: "driver",
    account_status: "active",
    status_reason: null,
    status_updated_at: "2026-07-01T00:00:00.000Z",
    last_login_at: "2026-08-01T10:00:00.000Z",
    demo_account: true,
    created_at: "2026-07-01T00:00:00.000Z"
  }
};

describe("driver verification module", () => {
  it("renders real driver rows rather than an unavailable placeholder", () => {
    const markup = textOf(
      withLocale("en", <DriverDirectory drivers={[driver]} search="" busy={false} onUpdateStatus={() => {}} />)
    );

    expect(markup).toContain("Demo Driver Hebron Route");
    expect(markup).toContain("+970590000002");
    expect(markup).toContain("86");
    // The placeholder copy must be gone now that the module is API-backed.
    expect(markup).not.toContain("This module is not available yet");
  });

  it("shows an honest unavailable queue without offering fake approval actions", () => {
    const markup = textOf(
      withLocale("en", <DriverDirectory drivers={[driver]} search="" busy={false} onUpdateStatus={() => {}} />)
    );

    expect(markup).toContain("Unverified");
    expect(markup).toContain("Approval queue unavailable");
    expect(markup).not.toContain("Approve");
    expect(markup).not.toContain("Reject");
    expect(markup).toContain("Review details");
  });

  it("renders real existing profile, driver, vehicle and stored verification details", () => {
    const markup = textOf(withLocale("en", <DriverReviewPanel driver={driver} />));

    expect(markup).toContain("Profile");
    expect(markup).toContain("Demo Driver Hebron Route");
    expect(markup).toContain("+970590000002");
    expect(markup).toContain("Driver profile ID");
    expect(markup).toContain("driver_profile_1");
    expect(markup).toContain("Vehicle type");
    expect(markup).toContain("van");
    expect(markup).toContain("Stored state");
    expect(markup).toContain("Unverified");
    expect(markup).toContain("Not exposed by the current API");
    expect(markup).toContain("Review history unavailable");
    expect(markup).not.toContain("Approve");
    expect(markup).not.toContain("Reject");
  });

  it("preserves equivalent read-only review semantics in Arabic", () => {
    const markup = textOf(withLocale("ar", <DriverReviewPanel driver={driver} />));

    expect(markup).toContain("مراجعة السائق");
    expect(markup).toContain("الملف الشخصي");
    expect(markup).toContain("المركبة");
    expect(markup).toContain("التوثيق");
    expect(markup).toContain("غير متاح عبر واجهة API الحالية");
  });

  it("offers suspension for an active account and reactivation for a suspended one", () => {
    const active = textOf(
      withLocale("en", <DriverDirectory drivers={[driver]} search="" busy={false} onUpdateStatus={() => {}} />)
    );
    expect(active).toContain("Suspend account");

    const suspended: DriverProfile = {
      ...driver,
      user: { ...driver.user!, account_status: "suspended", status_reason: "documents expired" }
    };
    const markup = textOf(
      withLocale("en", <DriverDirectory drivers={[suspended]} search="" busy={false} onUpdateStatus={() => {}} />)
    );

    expect(markup).toContain("Reactivate");
    expect(markup).toContain("documents expired");
    expect(markup).not.toContain("Suspend account");
  });

  it("does not turn a pending account into a fake reactivation or approval action", () => {
    const pending: DriverProfile = {
      ...driver,
      user: { ...driver.user!, account_status: "pending" }
    };
    const markup = textOf(
      withLocale("en", <DriverDirectory drivers={[pending]} search="" busy={false} onUpdateStatus={() => {}} />)
    );

    expect(markup).toContain("Pending review");
    expect(markup).toContain("Requires a separate approval contract");
    expect(markup).not.toContain("Reactivate");
    expect(markup).not.toContain("Approve");
    expect(markup).not.toContain("Reject");
  });

  it("distinguishes loading, confirmed empty and API error states", () => {
    const loading = withLocale(
      "en",
      <DriverDirectory
        drivers={[]}
        search=""
        busy={false}
        state={{ phase: "loading", hasData: false }}
        onUpdateStatus={() => {}}
      />
    );
    const empty = textOf(withLocale("en", <DriverDirectory drivers={[]} search="" busy={false} onUpdateStatus={() => {}} />));
    const failed = textOf(
      withLocale(
        "en",
        <DriverDirectory
          drivers={[]}
          search=""
          busy={false}
          state={{ phase: "error", hasData: false }}
          onUpdateStatus={() => {}}
        />
      )
    );

    expect(loading).toContain('aria-label="Loading data"');
    expect(empty).toContain("No existing driver profiles");
    expect(failed).toContain("This section could not be loaded");
    expect(failed).toContain("Retry");
    expect(failed).not.toContain("internal_server_error");
  });

  it("filters by the console search box", () => {
    const markup = textOf(
      withLocale("en", <DriverDirectory drivers={[driver]} search="nonexistent" busy={false} onUpdateStatus={() => {}} />)
    );

    expect(markup).not.toContain("Demo Driver Hebron Route");
    expect(markup).toContain("Nothing matches your search.");
  });
});

describe("users module", () => {
  it("collects users from every admin endpoint that embeds one", () => {
    const markup = textOf(
      withLocale(
        "en",
        <UsersDirectory
          drivers={[driver]}
          requests={
            [
              {
                id: "request_1",
                status: "pending",
                pickup_label: "PPU Main Gate",
                destination_label: "Bethlehem Center",
                passenger_count: 1,
                passenger: {
                  id: "user_1",
                  name: "Demo Passenger",
                  phone: "+970590000001",
                  role: "passenger",
                  account_status: "active",
                  status_reason: null,
                  status_updated_at: "2026-07-01T00:00:00.000Z",
                  last_login_at: null,
                  demo_account: true,
                  created_at: "2026-07-01T00:00:00.000Z"
                }
              }
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ] as any
          }
          orders={[]}
          search=""
        />
      )
    );

    expect(markup).toContain("Demo Passenger");
    expect(markup).toContain("Demo Driver Hebron Route");
  });
});
