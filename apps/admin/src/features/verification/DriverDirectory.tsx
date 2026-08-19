import { useMemo, useState, type ReactNode } from "react";
import type { AccountStatus, DriverProfile } from "../../api";
import { useLocale } from "../../i18n/LocaleContext";
import {
  AlertItem,
  BentoGrid,
  Button,
  Card,
  CardHeader,
  DataTable,
  EmptyState,
  Skeleton,
  StatusBadge,
  TechnicalValue,
  type Column,
  type Tone
} from "../../ui";
import type { OverviewResourceState } from "../overview/overviewState";
import { matchesSearch } from "../search";

/**
 * The current Admin contract exposes existing DriverProfile rows and account
 * controls only. Pending onboarding users have no profile and are absent from
 * GET /admin/drivers; no endpoint writes `verified`, stores a verification
 * rejection, or exposes evidence/history. This module therefore keeps account
 * control distinct and offers no client-only approval or rejection action.
 */

function accountTone(status: string | undefined): Tone {
  if (status === "active") return "success";
  if (status === "pending") return "warning";
  return "danger";
}

function ReviewField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="split">
      <span className="kv__key">{label}</span>
      <span>{children}</span>
    </div>
  );
}

/** Read-only detail assembled exclusively from GET /admin/drivers. */
export function DriverReviewPanel({ driver, onClose }: { driver: DriverProfile; onClose?: () => void }) {
  const { t, number, dateTime } = useLocale();
  const user = driver.user;

  return (
    <>
      <Card span={12} id="driver-review" aria-labelledby="driver-review-title">
        <CardHeader
          title={<span id="driver-review-title">{t("driverReview")}: {user?.name ?? t("noData")}</span>}
          action={onClose ? <Button size="sm" variant="ghost" onClick={onClose}>{t("closeReview")}</Button> : undefined}
        />
        <p className="muted">{t("driverReviewReadOnly")}</p>
      </Card>

      <Card span={6}>
        <CardHeader title={t("reviewProfileSection")} />
        <div className="stack stack--tight">
          <ReviewField label={t("profileName")}>{user?.name ?? "—"}</ReviewField>
          <ReviewField label={t("phoneNumber")}><TechnicalValue>{user?.phone ?? "—"}</TechnicalValue></ReviewField>
          <ReviewField label={t("columnAccountStatus")}>
            <StatusBadge tone={accountTone(user?.account_status)}>
              {user ? t(`accountStatus_${user.account_status}`) : "—"}
            </StatusBadge>
          </ReviewField>
          <ReviewField label={t("accountStatusUpdatedAt")}>{dateTime(user?.status_updated_at)}</ReviewField>
          {user?.status_reason && <ReviewField label={t("statusReason")}>{user.status_reason}</ReviewField>}
        </div>
      </Card>

      <Card span={6}>
        <CardHeader title={t("reviewDriverSection")} />
        <div className="stack stack--tight">
          <ReviewField label={t("driverProfileId")}><TechnicalValue>{driver.id}</TechnicalValue></ReviewField>
          <ReviewField label={t("trustScore")}>{number(driver.trust_score)}</ReviewField>
          <ReviewField label={t("profileCreatedAt")}>{dateTime(driver.created_at)}</ReviewField>
        </div>
      </Card>

      <Card span={6}>
        <CardHeader title={t("reviewVehicleSection")} />
        <div className="stack stack--tight">
          <ReviewField label={t("vehicleType")}>{driver.vehicle_type}</ReviewField>
          <ReviewField label={t("seatCapacity")}>{number(driver.seats_total)}</ReviewField>
          <ReviewField label={t("parcelCapacity")}>{number(driver.parcel_capacity)}</ReviewField>
        </div>
      </Card>

      <Card span={6}>
        <CardHeader title={t("reviewVerificationSection")} />
        <div className="stack stack--tight">
          <ReviewField label={t("verificationStoredState")}>
            <StatusBadge tone={driver.verified ? "success" : "warning"}>
              {driver.verified ? t("verified") : t("unverified")}
            </StatusBadge>
          </ReviewField>
          <ReviewField label={t("verificationEvidence")}>{t("notExposedByApi")}</ReviewField>
          <ReviewField label={t("verificationRejectionReason")}>{t("notExposedByApi")}</ReviewField>
        </div>
        <p className="muted profile-panel__note">{t("verificationMutationUnavailable")}</p>
      </Card>

      <Card span={12}>
        <CardHeader title={t("reviewHistorySection")} />
        <EmptyState
          compact
          icon="verified_user"
          title={t("reviewHistoryUnavailable")}
          description={t("reviewHistoryUnavailableDescription")}
        />
      </Card>
    </>
  );
}

export function DriverDirectory({
  drivers,
  search,
  busy,
  onUpdateStatus,
  state = { phase: "ready", hasData: true },
  onRefresh = () => undefined
}: {
  drivers: DriverProfile[];
  search: string;
  busy: boolean;
  onUpdateStatus: (userId: string, status: AccountStatus, reason?: string) => void;
  state?: OverviewResourceState;
  onRefresh?: () => void;
}) {
  const { t, number } = useLocale();
  const [accountChange, setAccountChange] = useState<{ driver: DriverProfile; status: AccountStatus } | null>(null);
  const [reason, setReason] = useState("");
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  const visible = useMemo(
    () =>
      drivers.filter((driver) =>
        matchesSearch([driver.id, driver.user?.name, driver.user?.phone, driver.vehicle_type, driver.user?.account_status], search)
      ),
    [drivers, search]
  );
  const selectedDriver = selectedDriverId ? drivers.find((driver) => driver.id === selectedDriverId) : undefined;
  const unverified = visible.filter((driver) => !driver.verified).length;

  function submitAccountChange() {
    if (!accountChange) return;
    const trimmed = reason.trim();
    if (accountChange.status !== "active" && trimmed.length < 3) return;
    onUpdateStatus(accountChange.driver.user!.id, accountChange.status, trimmed || undefined);
    setAccountChange(null);
    setReason("");
  }

  const columns: Column<DriverProfile>[] = [
    {
      key: "driver",
      header: t("columnDriver"),
      cell: (driver) => (
        <div>
          <p className="cell-stack__title">{driver.user?.name ?? t("noData")}</p>
          <p className="cell-stack__sub technical">{driver.user?.phone ?? ""}</p>
        </div>
      )
    },
    {
      key: "vehicle",
      header: t("columnVehicle"),
      cell: (driver) => (
        <div>
          <p className="cell-stack__title">{driver.vehicle_type}</p>
          <p className="cell-stack__sub">
            {t("seatsAndParcels", { seats: number(driver.seats_total), parcels: number(driver.parcel_capacity) })}
          </p>
        </div>
      )
    },
    {
      key: "verified",
      header: t("columnVerified"),
      cell: (driver) => (
        <StatusBadge tone={driver.verified ? "success" : "warning"}>
          {driver.verified ? t("verified") : t("unverified")}
        </StatusBadge>
      )
    },
    { key: "trust", header: t("trustScore"), cell: (driver) => number(driver.trust_score) },
    {
      key: "account",
      header: t("columnAccountStatus"),
      cell: (driver) => (
        <div>
          <StatusBadge tone={accountTone(driver.user?.account_status)}>
            {t(`accountStatus_${driver.user?.account_status ?? "active"}`)}
          </StatusBadge>
          {driver.user?.status_reason && <p className="cell-stack__sub">{driver.user.status_reason}</p>}
        </div>
      )
    },
    {
      key: "review",
      header: t("reviewAction"),
      cell: (driver) => (
        <Button variant="secondary" size="sm" icon="id_card" onClick={() => setSelectedDriverId(driver.id)}>
          {t("reviewDetails")}
        </Button>
      )
    },
    {
      key: "account-control",
      header: t("accountControl"),
      align: "end",
      cell: (driver) => {
        if (!driver.user) return <TechnicalValue>{driver.id}</TechnicalValue>;
        if (driver.user.account_status === "pending") return <span className="muted">{t("pendingAccountControlUnavailable")}</span>;
        if (driver.user.account_status === "active") {
          return (
            <Button
              variant="ghost"
              size="sm"
              icon="block"
              disabled={busy}
              onClick={() => {
                setReason("");
                setAccountChange({ driver, status: "suspended" });
              }}
            >
              {t("suspendAccount")}
            </Button>
          );
        }
        return (
          <Button
            variant="ghost"
            size="sm"
            icon="check_circle"
            disabled={busy}
            onClick={() => {
              setReason("");
              setAccountChange({ driver, status: "active" });
            }}
          >
            {t("reactivateAccount")}
          </Button>
        );
      }
    }
  ];

  const initialLoading = !state.hasData && (state.phase === "idle" || state.phase === "loading");
  const initialError = !state.hasData && state.phase === "error";

  return (
    <BentoGrid>
      <Card span={12}>
        <CardHeader title={t("pendingDriverQueue")} />
        <EmptyState
          compact
          icon="verified_user"
          title={t("pendingQueueUnavailable")}
          description={t("pendingQueueUnavailableDescription")}
        />
      </Card>

      <Card span={12} padded={false}>
        <CardHeader
          title={t("driverDirectory")}
          badge={state.hasData ? (
            <StatusBadge tone={unverified > 0 ? "warning" : "success"}>
              {t("unverifiedCount", { count: number(unverified) })}
            </StatusBadge>
          ) : undefined}
        />
        {initialLoading && <div className="overview-resource-state" role="status" aria-label={t("metricLoading")}><Skeleton lines={5} /></div>}
        {initialError && (
          <EmptyState
            compact
            icon="report"
            title={t("resourceLoadError")}
            description={t("resourceLoadErrorDescription")}
            action={<Button size="sm" variant="secondary" icon="refresh" onClick={onRefresh}>{t("retry")}</Button>}
          />
        )}
        {state.hasData && (
          <>
            {state.phase === "loading" && <p className="overview-resource-note" role="status">{t("metricRefreshing")}</p>}
            {state.phase === "error" && <p className="overview-resource-note overview-resource-note--error" role="alert">{t("metricRefreshError")}</p>}
            <DataTable
              columns={columns}
              rows={visible}
              rowKey={(driver) => driver.id}
              empty={<EmptyState compact icon="verified_user" title={search ? t("searchNoResults") : t("noExistingDriverProfiles")} />}
            />
          </>
        )}
      </Card>

      {selectedDriver && <DriverReviewPanel driver={selectedDriver} onClose={() => setSelectedDriverId(null)} />}
      {selectedDriverId && !selectedDriver && (
        <Card span={12}>
          <AlertItem tone="warning" icon="report" title={t("staleDriverReview")} description={t("staleDriverReviewDescription")} />
          <div className="card__actions">
            <Button size="sm" variant="secondary" icon="refresh" onClick={onRefresh}>{t("refreshData")}</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedDriverId(null)}>{t("closeReview")}</Button>
          </div>
        </Card>
      )}

      {accountChange && (
        <Card span={12}>
          <CardHeader title={accountChange.status === "active" ? t("reactivateAccount") : t("suspendAccount")} />
          <AlertItem tone="info" title={t("accountControl")} description={t("accountControlSeparateDescription")} />
          <p className="muted">
            {t("accountStatusConfirm", {
              name: accountChange.driver.user?.name ?? "",
              status: t(`accountStatus_${accountChange.status}`)
            })}
          </p>
          {accountChange.status !== "active" && (
            <label className="field">
              {t("statusReason")}
              <input value={reason} onChange={(event) => setReason(event.target.value)} minLength={3} />
            </label>
          )}
          <div className="card__actions">
            <Button
              variant="primary"
              disabled={busy || (accountChange.status !== "active" && reason.trim().length < 3)}
              onClick={submitAccountChange}
            >
              {t("confirm")}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setAccountChange(null)}>
              {t("cancel")}
            </Button>
          </div>
        </Card>
      )}
    </BentoGrid>
  );
}
