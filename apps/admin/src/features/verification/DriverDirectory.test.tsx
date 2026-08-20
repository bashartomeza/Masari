import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { DriverProfile, DriverVerification } from "../../api";
import { LocaleProvider } from "../../i18n/LocaleContext";
import type { Locale } from "../../i18n/translations";
import { DriverDirectory, DriverReviewPanel } from "./DriverDirectory";

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

const verification: DriverVerification = {
  id: "verification_1",
  revision: 1,
  status: "pending",
  rejection_reason: null,
  submitted_at: "2026-08-18T10:00:00.000Z",
  reviewed_at: null,
  reviewer: null,
  candidate: { ...driver.user!, account_status: "pending" },
  driver_profile: null,
  evidence: { status: "not_collected" }
};

const panelProps = {
  busy: false,
  action: null,
  reason: "",
  profile: { vehicle_type: "", seats_total: "", parcel_capacity: "" },
  onAction: () => undefined,
  onReasonChange: () => undefined,
  onProfileChange: () => undefined,
  onConfirm: () => undefined,
  onClose: () => undefined
} as const;

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

  it("renders the real pending queue and its server-backed review action", () => {
    const markup = textOf(
      withLocale("en", <DriverDirectory drivers={[driver]} initialVerifications={[verification]} search="" busy={false} onUpdateStatus={() => {}} />)
    );

    expect(markup).toContain("Unverified");
    expect(markup).toContain("1 verification requests");
    expect(markup).toContain("Demo Driver Hebron Route");
    expect(markup).not.toContain("Approve");
    expect(markup).not.toContain("Reject");
    expect(markup).toContain("Review details");
  });

  it("renders authoritative candidate state and honestly reports missing evidence and profile", () => {
    const markup = textOf(withLocale("en", <DriverReviewPanel verification={verification} {...panelProps} />));

    expect(markup).toContain("Profile");
    expect(markup).toContain("Demo Driver Hebron Route");
    expect(markup).toContain("+970590000002");
    expect(markup).toContain("No driver profile exists yet");
    expect(markup).toContain("does not collect verification documents or evidence");
    expect(markup).toContain("Approve driver");
    expect(markup).toContain("Reject driver");
  });

  it("preserves equivalent queue and decision semantics in Arabic", () => {
    const markup = textOf(withLocale("ar", <DriverReviewPanel verification={verification} {...panelProps} />));

    expect(markup).toContain("مراجعة السائق");
    expect(markup).toContain("الملف الشخصي");
    expect(markup).toContain("المركبة");
    expect(markup).toContain("التوثيق");
    expect(markup).toContain("لا يجمع مسار التسجيل الحالي مستندات أو أدلة توثيق");
    expect(markup).toContain("قبول السائق");
    expect(markup).toContain("رفض السائق");
  });

  it("requires explicit vehicle values for a candidate without a profile", () => {
    const markup = withLocale("en", <DriverReviewPanel verification={verification} {...panelProps} action="approve" />);

    expect(textOf(markup)).toContain("Confirm driver approval");
    expect(markup).toContain('type="number"');
    expect(markup).toContain("disabled");
  });

  it("shows the persisted rejection reason without further decision buttons", () => {
    const rejected = { ...verification, status: "rejected", revision: 2, rejection_reason: "Licence image was unreadable", reviewed_at: "2026-08-19T09:00:00.000Z", reviewer: { id: "admin_1", name: "Demo Admin" } } satisfies DriverVerification;
    const markup = textOf(withLocale("en", <DriverReviewPanel verification={rejected} {...panelProps} />));

    expect(markup).toContain("Rejected");
    expect(markup).toContain("Licence image was unreadable");
    expect(markup).toContain("Demo Admin");
    expect(markup).not.toContain("Approve driver");
    expect(markup).not.toContain("Reject driver");
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
    expect(markup).not.toContain("Approve driver");
    expect(markup).not.toContain("Reject driver");
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
