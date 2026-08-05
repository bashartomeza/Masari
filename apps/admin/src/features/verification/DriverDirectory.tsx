import { useMemo, useState } from "react";
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
  StatusBadge,
  TechnicalValue,
  type Column
} from "../../ui";
import { matchesSearch } from "../search";

/**
 * Driver verification and account control, backed by `GET /admin/drivers` and
 * `PATCH /admin/users/:id/status`.
 *
 * Both endpoints have existed for some time; the console rendered an
 * "unavailable" placeholder for this tab anyway, so nothing read them. What the
 * flow diagram calls "approve / reject documents" is genuinely absent — there
 * is no document model and no endpoint writes `DriverProfile.verified` — so the
 * verified flag is reported and never offered as an action. The account
 * controls below it are real, and are the lever an admin actually has.
 */
export function DriverDirectory({
  drivers,
  search,
  busy,
  onUpdateStatus
}: {
  drivers: DriverProfile[];
  search: string;
  busy: boolean;
  onUpdateStatus: (userId: string, status: AccountStatus, reason?: string) => void;
}) {
  const { t, number } = useLocale();
  const [pending, setPending] = useState<{ driver: DriverProfile; status: AccountStatus } | null>(null);
  const [reason, setReason] = useState("");

  const visible = useMemo(
    () =>
      drivers.filter((driver) =>
        matchesSearch([driver.id, driver.user?.name, driver.user?.phone, driver.vehicle_type, driver.user?.account_status], search)
      ),
    [drivers, search]
  );

  const unverified = visible.filter((driver) => !driver.verified).length;

  function submit() {
    if (!pending) return;
    // The API rejects a suspension without a reason of at least three
    // characters, so the dialog enforces the same rule before sending.
    const trimmed = reason.trim();
    if (pending.status !== "active" && trimmed.length < 3) return;
    onUpdateStatus(pending.driver.user!.id, pending.status, trimmed || undefined);
    setPending(null);
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
          <StatusBadge tone={driver.user?.account_status === "active" ? "success" : "danger"}>
            {t(`accountStatus_${driver.user?.account_status ?? "active"}`)}
          </StatusBadge>
          {driver.user?.status_reason && <p className="cell-stack__sub">{driver.user.status_reason}</p>}
        </div>
      )
    },
    {
      key: "actions",
      header: t("columnActions"),
      align: "end",
      cell: (driver) =>
        !driver.user ? (
          <TechnicalValue>{driver.id}</TechnicalValue>
        ) : driver.user.account_status === "active" ? (
          <Button
            variant="ghost"
            size="sm"
            icon="block"
            disabled={busy}
            onClick={() => {
              setReason("");
              setPending({ driver, status: "suspended" });
            }}
          >
            {t("suspendAccount")}
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            icon="check_circle"
            disabled={busy}
            onClick={() => {
              setReason("");
              setPending({ driver, status: "active" });
            }}
          >
            {t("reactivateAccount")}
          </Button>
        )
    }
  ];

  return (
    <BentoGrid>
      {/* Named up front so the missing half of this flow is not mistaken for a
          control the admin failed to find. */}
      <Card span={12}>
        <AlertItem tone="info" icon="verified_user" title={t("columnVerified")} description={t("verificationDocumentsUnavailable")} />
      </Card>

      <Card span={12} padded={false}>
        <CardHeader
          title={t("driverDirectory")}
          badge={
            <StatusBadge tone={unverified > 0 ? "warning" : "success"}>
              {t("unverifiedCount", { count: number(unverified) })}
            </StatusBadge>
          }
        />
        <DataTable
          columns={columns}
          rows={visible}
          rowKey={(driver) => driver.id}
          empty={<EmptyState compact icon="verified_user" title={search ? t("searchNoResults") : t("noData")} />}
        />
      </Card>

      {pending && (
        <Card span={12}>
          <CardHeader title={pending.status === "active" ? t("reactivateAccount") : t("suspendAccount")} />
          <p className="muted">
            {t("accountStatusConfirm", {
              name: pending.driver.user?.name ?? "",
              status: t(`accountStatus_${pending.status}`)
            })}
          </p>
          {pending.status !== "active" && (
            <label className="field">
              {t("statusReason")}
              <input value={reason} onChange={(event) => setReason(event.target.value)} minLength={3} />
            </label>
          )}
          <div className="card__actions">
            <Button
              variant="primary"
              disabled={busy || (pending.status !== "active" && reason.trim().length < 3)}
              onClick={submit}
            >
              {t("confirm")}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setPending(null)}>
              {t("cancel")}
            </Button>
          </div>
        </Card>
      )}
    </BentoGrid>
  );
}
