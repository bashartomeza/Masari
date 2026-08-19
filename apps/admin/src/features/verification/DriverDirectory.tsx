import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { AccountStatus, ApiClient, ApiError, DriverProfile, DriverProfileDraft, DriverVerification, DriverVerificationStatus } from "../../api";
import { useLocale } from "../../i18n/LocaleContext";
import { AlertItem, BentoGrid, Button, Card, CardHeader, DataTable, EmptyState, Skeleton, StatusBadge, TechnicalValue, type Column, type Tone } from "../../ui";
import type { OverviewResourceState } from "../overview/overviewState";
import { matchesSearch } from "../search";

type VerificationApi = Pick<ApiClient, "driverVerifications" | "driverVerification" | "approveDriverVerification" | "rejectDriverVerification">;
type ProfileForm = { vehicle_type: string; seats_total: string; parcel_capacity: string };

function accountTone(status?: string): Tone {
  if (status === "active") return "success";
  if (status === "pending") return "warning";
  return "danger";
}

function verificationTone(status: DriverVerification["status"]): Tone {
  return status === "approved" ? "success" : status === "rejected" ? "danger" : "warning";
}

function ReviewField({ label, children }: { label: string; children: ReactNode }) {
  return <div className="split"><span className="kv__key">{label}</span><span>{children}</span></div>;
}

export function DriverReviewPanel({ verification, busy, action, reason, profile, error, onAction, onReasonChange, onProfileChange, onConfirm, onClose }: {
  verification: DriverVerification;
  busy: boolean;
  action: "approve" | "reject" | null;
  reason: string;
  profile: ProfileForm;
  error?: string | null;
  onAction: (action: "approve" | "reject" | null) => void;
  onReasonChange: (reason: string) => void;
  onProfileChange: (profile: ProfileForm) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { t, number, dateTime } = useLocale();
  const candidate = verification.candidate;
  const driver = verification.driver_profile;
  const profileValid = profile.vehicle_type.trim().length >= 2 && Number.isInteger(Number(profile.seats_total)) && Number(profile.seats_total) >= 1 && Number(profile.seats_total) <= 8 && Number.isInteger(Number(profile.parcel_capacity)) && Number(profile.parcel_capacity) >= 0 && Number(profile.parcel_capacity) <= 20;
  const confirmDisabled = busy || (action === "reject" && reason.trim().length < 3) || (action === "approve" && !driver && !profileValid);

  return <>
    <Card span={12} id="driver-review" aria-labelledby="driver-review-title">
      <CardHeader title={<span id="driver-review-title">{t("driverReview")}: {candidate.name}</span>} action={<Button size="sm" variant="ghost" onClick={onClose}>{t("closeReview")}</Button>} />
      <div className="split"><StatusBadge tone={verificationTone(verification.status)}>{t(`verificationStatus_${verification.status}`)}</StatusBadge><span className="muted">{t("verificationRevision", { revision: number(verification.revision) })}</span></div>
    </Card>
    <Card span={6}>
      <CardHeader title={t("reviewProfileSection")} />
      <div className="stack stack--tight">
        <ReviewField label={t("profileName")}>{candidate.name}</ReviewField>
        <ReviewField label={t("phoneNumber")}><TechnicalValue>{candidate.phone}</TechnicalValue></ReviewField>
        <ReviewField label={t("columnAccountStatus")}><StatusBadge tone={accountTone(candidate.account_status)}>{t(`accountStatus_${candidate.account_status}`)}</StatusBadge></ReviewField>
        <ReviewField label={t("accountStatusUpdatedAt")}>{dateTime(candidate.status_updated_at)}</ReviewField>
      </div>
    </Card>
    <Card span={6}>
      <CardHeader title={t("reviewVehicleSection")} />
      {driver ? <div className="stack stack--tight">
        <ReviewField label={t("vehicleType")}>{driver.vehicle_type}</ReviewField>
        <ReviewField label={t("seatCapacity")}>{number(driver.seats_total)}</ReviewField>
        <ReviewField label={t("parcelCapacity")}>{number(driver.parcel_capacity)}</ReviewField>
        <ReviewField label={t("verificationStoredState")}>{driver.verified ? t("verified") : t("unverified")}</ReviewField>
      </div> : <EmptyState compact icon="directions_car" title={t("noDriverProfileYet")} description={t("profileCreatedOnApproval")} />}
    </Card>
    <Card span={6}>
      <CardHeader title={t("reviewVerificationSection")} />
      <div className="stack stack--tight">
        <ReviewField label={t("verificationSubmittedAt")}>{dateTime(verification.submitted_at)}</ReviewField>
        <ReviewField label={t("verificationEvidence")}>{t("verificationEvidenceNotCollected")}</ReviewField>
        <ReviewField label={t("verificationReviewedAt")}>{dateTime(verification.reviewed_at ?? undefined)}</ReviewField>
        <ReviewField label={t("verificationReviewer")}>{verification.reviewer?.name ?? "—"}</ReviewField>
        {verification.rejection_reason && <ReviewField label={t("verificationRejectionReason")}>{verification.rejection_reason}</ReviewField>}
      </div>
    </Card>
    <Card span={6}>
      <CardHeader title={t("reviewDecisionSection")} />
      {verification.status !== "pending" ? <AlertItem tone={verification.status === "approved" ? "success" : "warning"} title={t("verificationDecisionRecorded")} description={t("verificationDecisionFinal")} /> : action === null ? <>
        <p className="muted">{t("verificationDecisionDescription")}</p>
        <div className="card__actions"><Button variant="primary" icon="check_circle" disabled={busy} onClick={() => onAction("approve")}>{t("approveDriver")}</Button><Button variant="secondary" icon="block" disabled={busy} onClick={() => onAction("reject")}>{t("rejectDriver")}</Button></div>
      </> : <div className="stack">
        <AlertItem tone={action === "approve" ? "info" : "warning"} title={action === "approve" ? t("confirmDriverApproval") : t("confirmDriverRejection")} description={action === "approve" ? t("approvalEffectDescription") : t("rejectionEffectDescription")} />
        {action === "approve" && !driver && <>
          <label className="field">{t("vehicleType")}<input value={profile.vehicle_type} maxLength={80} onChange={(event) => onProfileChange({ ...profile, vehicle_type: event.target.value })} /></label>
          <label className="field">{t("seatCapacity")}<input type="number" min={1} max={8} value={profile.seats_total} onChange={(event) => onProfileChange({ ...profile, seats_total: event.target.value })} /></label>
          <label className="field">{t("parcelCapacity")}<input type="number" min={0} max={20} value={profile.parcel_capacity} onChange={(event) => onProfileChange({ ...profile, parcel_capacity: event.target.value })} /></label>
        </>}
        {action === "reject" && <label className="field">{t("verificationRejectionReason")}<textarea value={reason} minLength={3} maxLength={500} onChange={(event) => onReasonChange(event.target.value)} /></label>}
        {error && <p role="alert" className="overview-resource-note overview-resource-note--error">{error}</p>}
        <div className="card__actions"><Button variant="primary" disabled={confirmDisabled} onClick={onConfirm}>{busy ? t("saving") : t("confirm")}</Button><Button variant="ghost" disabled={busy} onClick={() => onAction(null)}>{t("cancel")}</Button></div>
      </div>}
    </Card>
  </>;
}

export function DriverDirectory({ api, token, drivers, search, busy, onUpdateStatus, state = { phase: "ready", hasData: true }, onRefresh = () => undefined, initialVerifications }: {
  api?: VerificationApi;
  token?: string;
  drivers: DriverProfile[];
  search: string;
  busy: boolean;
  onUpdateStatus: (userId: string, status: AccountStatus, reason?: string) => void;
  state?: OverviewResourceState;
  onRefresh?: () => void;
  initialVerifications?: DriverVerification[];
}) {
  const { t, number, dateTime } = useLocale();
  const [accountChange, setAccountChange] = useState<{ driver: DriverProfile; status: AccountStatus } | null>(null);
  const [accountReason, setAccountReason] = useState("");
  const [pending, setPending] = useState(initialVerifications ?? []);
  const [pendingTotal, setPendingTotal] = useState(initialVerifications?.length ?? 0);
  const [queueStatus, setQueueStatus] = useState<DriverVerificationStatus>("pending");
  const [queuePage, setQueuePage] = useState(1);
  const [queuePhase, setQueuePhase] = useState<"loading" | "ready" | "error">(initialVerifications ? "ready" : "loading");
  const [selected, setSelected] = useState<DriverVerification | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [decisionBusy, setDecisionBusy] = useState(false);
  const [decision, setDecision] = useState<"approve" | "reject" | null>(null);
  const [decisionReason, setDecisionReason] = useState("");
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileForm>({ vehicle_type: "", seats_total: "", parcel_capacity: "" });

  async function loadPending() {
    if (!api || !token) return;
    setQueuePhase("loading");
    try {
      const page = await api.driverVerifications(token, queueStatus, queuePage);
      setPending(page.verifications);
      setPendingTotal(page.total);
      setQueuePhase("ready");
    } catch { setQueuePhase("error"); }
  }

  useEffect(() => { if (!initialVerifications) void loadPending(); }, [api, token, queueStatus, queuePage]);

  async function openReview(userId: string) {
    if (!api || !token) return;
    setDetailLoading(true);
    setDecisionError(null);
    try {
      const result = await api.driverVerification(token, userId);
      setSelected(result.verification);
      setDecision(null);
      setDecisionReason("");
      setProfile({ vehicle_type: "", seats_total: "", parcel_capacity: "" });
    } catch { setSelected(null); setDecisionError(t("verificationDetailLoadFailed")); }
    finally { setDetailLoading(false); }
  }

  async function confirmDecision() {
    if (!api || !token || !selected || !decision) return;
    setDecisionBusy(true);
    setDecisionError(null);
    try {
      const result = decision === "approve"
        ? await api.approveDriverVerification(token, selected.candidate.id, selected.revision, selected.driver_profile ? undefined : ({ vehicle_type: profile.vehicle_type.trim(), seats_total: Number(profile.seats_total), parcel_capacity: Number(profile.parcel_capacity) } satisfies DriverProfileDraft))
        : await api.rejectDriverVerification(token, selected.candidate.id, selected.revision, decisionReason);
      setSelected(result.verification);
      setDecision(null);
      setDecisionReason("");
      await loadPending();
      onRefresh();
    } catch (error) {
      const conflict = (error as ApiError)?.status === 409;
      if (conflict) {
        await openReview(selected.candidate.id);
        await loadPending();
        setDecisionError(t("verificationStale"));
      } else {
        setDecisionError(t("verificationActionFailed"));
      }
    } finally { setDecisionBusy(false); }
  }

  const visible = useMemo(() => drivers.filter((driver) => matchesSearch([driver.id, driver.user?.name, driver.user?.phone, driver.vehicle_type, driver.user?.account_status], search)), [drivers, search]);
  const visiblePending = useMemo(() => pending.filter((item) => matchesSearch([item.candidate.name, item.candidate.phone, item.candidate.account_status], search)), [pending, search]);
  const unverified = visible.filter((driver) => !driver.verified).length;

  function submitAccountChange() {
    if (!accountChange) return;
    const trimmed = accountReason.trim();
    if (accountChange.status !== "active" && trimmed.length < 3) return;
    onUpdateStatus(accountChange.driver.user!.id, accountChange.status, trimmed || undefined);
    setAccountChange(null);
    setAccountReason("");
  }

  const pendingColumns: Column<DriverVerification>[] = [
    { key: "driver", header: t("columnDriver"), cell: (item) => <div><p className="cell-stack__title">{item.candidate.name}</p><p className="cell-stack__sub technical">{item.candidate.phone}</p></div> },
    { key: "submitted", header: t("verificationSubmittedAt"), cell: (item) => dateTime(item.submitted_at) },
    { key: "account", header: t("columnAccountStatus"), cell: (item) => <StatusBadge tone={accountTone(item.candidate.account_status)}>{t(`accountStatus_${item.candidate.account_status}`)}</StatusBadge> },
    { key: "review", header: t("reviewAction"), align: "end", cell: (item) => <Button variant="primary" size="sm" icon="id_card" disabled={detailLoading} onClick={() => void openReview(item.candidate.id)}>{t("reviewDetails")}</Button> }
  ];
  const columns: Column<DriverProfile>[] = [
    { key: "driver", header: t("columnDriver"), cell: (driver) => <div><p className="cell-stack__title">{driver.user?.name ?? t("noData")}</p><p className="cell-stack__sub technical">{driver.user?.phone ?? ""}</p></div> },
    { key: "vehicle", header: t("columnVehicle"), cell: (driver) => <div><p className="cell-stack__title">{driver.vehicle_type}</p><p className="cell-stack__sub">{t("seatsAndParcels", { seats: number(driver.seats_total), parcels: number(driver.parcel_capacity) })}</p></div> },
    { key: "verified", header: t("columnVerified"), cell: (driver) => <StatusBadge tone={driver.verified ? "success" : "warning"}>{driver.verified ? t("verified") : t("unverified")}</StatusBadge> },
    { key: "trust", header: t("trustScore"), cell: (driver) => number(driver.trust_score) },
    { key: "account", header: t("columnAccountStatus"), cell: (driver) => <div><StatusBadge tone={accountTone(driver.user?.account_status)}>{t(`accountStatus_${driver.user?.account_status ?? "active"}`)}</StatusBadge>{driver.user?.status_reason && <p className="cell-stack__sub">{driver.user.status_reason}</p>}</div> },
    { key: "review", header: t("reviewAction"), cell: (driver) => <Button variant="secondary" size="sm" icon="id_card" disabled={!driver.user || detailLoading} onClick={() => driver.user && void openReview(driver.user.id)}>{t("reviewDetails")}</Button> },
    { key: "account-control", header: t("accountControl"), align: "end", cell: (driver) => {
      if (!driver.user) return <TechnicalValue>{driver.id}</TechnicalValue>;
      if (driver.user.account_status === "pending") return <span className="muted">{t("pendingAccountControlUnavailable")}</span>;
      const status: AccountStatus = driver.user.account_status === "active" ? "suspended" : "active";
      return <Button variant="ghost" size="sm" icon={status === "active" ? "check_circle" : "block"} disabled={busy} onClick={() => { setAccountReason(""); setAccountChange({ driver, status }); }}>{status === "active" ? t("reactivateAccount") : t("suspendAccount")}</Button>;
    } }
  ];
  const initialLoading = !state.hasData && (state.phase === "idle" || state.phase === "loading");
  const initialError = !state.hasData && state.phase === "error";

  return <BentoGrid>
    <Card span={12} padded={false}>
      <CardHeader
        title={t("pendingDriverQueue")}
        badge={queuePhase === "ready" ? <StatusBadge tone={queueStatus === "pending" && pendingTotal ? "warning" : "success"}>{t("verificationResultCount", { count: number(pendingTotal) })}</StatusBadge> : undefined}
        action={!initialVerifications ? <label className="field field--inline">{t("verificationStatusFilter")}<select value={queueStatus} onChange={(event) => { setQueueStatus(event.target.value as DriverVerificationStatus); setQueuePage(1); }}><option value="pending">{t("verificationStatus_pending")}</option><option value="approved">{t("verificationStatus_approved")}</option><option value="rejected">{t("verificationStatus_rejected")}</option></select></label> : undefined}
      />
      {queuePhase === "loading" && <div className="overview-resource-state" role="status"><Skeleton lines={3} /></div>}
      {queuePhase === "error" && <EmptyState compact icon="report" title={t("verificationQueueLoadFailed")} action={<Button size="sm" variant="secondary" icon="refresh" onClick={() => void loadPending()}>{t("retry")}</Button>} />}
      {queuePhase === "ready" && <DataTable columns={pendingColumns} rows={visiblePending} rowKey={(item) => item.id} empty={<EmptyState compact icon="verified_user" title={search ? t("searchNoResults") : t("noDriverVerificationsForStatus")} />} />}
      {queuePhase === "ready" && pendingTotal > 50 && <div className="card__actions"><Button size="sm" variant="ghost" disabled={queuePage === 1} onClick={() => setQueuePage((page) => Math.max(1, page - 1))}>{t("previousPage")}</Button><span className="muted">{t("pageOf", { page: number(queuePage), pages: number(Math.ceil(pendingTotal / 50)) })}</span><Button size="sm" variant="ghost" disabled={queuePage >= Math.ceil(pendingTotal / 50)} onClick={() => setQueuePage((page) => page + 1)}>{t("nextPage")}</Button></div>}
    </Card>
    {selected && <DriverReviewPanel verification={selected} busy={decisionBusy} action={decision} reason={decisionReason} profile={profile} error={decisionError} onAction={(next) => { setDecision(next); setDecisionError(null); }} onReasonChange={setDecisionReason} onProfileChange={setProfile} onConfirm={() => void confirmDecision()} onClose={() => setSelected(null)} />}
    {!selected && decisionError && <Card span={12}><AlertItem tone="warning" icon="report" title={t("verificationDetailLoadFailed")} description={decisionError} /></Card>}
    <Card span={12} padded={false}>
      <CardHeader title={t("driverDirectory")} badge={state.hasData ? <StatusBadge tone={unverified > 0 ? "warning" : "success"}>{t("unverifiedCount", { count: number(unverified) })}</StatusBadge> : undefined} />
      {initialLoading && <div className="overview-resource-state" role="status" aria-label={t("metricLoading")}><Skeleton lines={5} /></div>}
      {initialError && <EmptyState compact icon="report" title={t("resourceLoadError")} description={t("resourceLoadErrorDescription")} action={<Button size="sm" variant="secondary" icon="refresh" onClick={onRefresh}>{t("retry")}</Button>} />}
      {state.hasData && <DataTable columns={columns} rows={visible} rowKey={(driver) => driver.id} empty={<EmptyState compact icon="verified_user" title={search ? t("searchNoResults") : t("noExistingDriverProfiles")} />} />}
    </Card>
    {accountChange && <Card span={12}>
      <CardHeader title={accountChange.status === "active" ? t("reactivateAccount") : t("suspendAccount")} />
      <AlertItem tone="info" title={t("accountControl")} description={t("accountControlSeparateDescription")} />
      <p className="muted">{t("accountStatusConfirm", { name: accountChange.driver.user?.name ?? "", status: t(`accountStatus_${accountChange.status}`) })}</p>
      {accountChange.status !== "active" && <label className="field">{t("statusReason")}<input value={accountReason} onChange={(event) => setAccountReason(event.target.value)} minLength={3} /></label>}
      <div className="card__actions"><Button variant="primary" disabled={busy || (accountChange.status !== "active" && accountReason.trim().length < 3)} onClick={submitAccountChange}>{t("confirm")}</Button><Button variant="ghost" disabled={busy} onClick={() => setAccountChange(null)}>{t("cancel")}</Button></div>
    </Card>}
  </BentoGrid>;
}
