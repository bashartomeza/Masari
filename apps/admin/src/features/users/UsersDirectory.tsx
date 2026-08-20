import { useEffect, useMemo, useState } from "react";
import type { ApiClient, ApiError, AccountStatus, User, UserAccountStatus, UserDetail, UserListItem, UserPage, UserRoleFilter } from "../../api";
import { useLocale } from "../../i18n/LocaleContext";
import { AlertItem, BentoGrid, Button, Card, CardHeader, DataTable, EmptyState, Skeleton, StatusBadge, TechnicalValue, type Column } from "../../ui";

type Props = { api: ApiClient; token: string; admin: User | null; search: string; canAct?: boolean };
type DemoFilter = "all" | "demo" | "real";
const tone = (s: string) => s === "active" ? "success" : s === "pending" ? "warning" : "danger";
const statusKey = (s: string) => `accountStatus_${s}` as any;
const roleKey = (s: string) => `role_${s}` as any;

function contextText(user: UserListItem, t: (key: any) => string) {
  if (user.role_context.kind === "driver") {
    const state = user.role_context.driver_verification_status === "none" ? t("verificationStatus_no") : t(`verificationStatus_${user.role_context.driver_verification_status}` as any);
    return <span className="cell-stack__sub">{t("driverReview")}: {state} · {user.role_context.driver_profile_exists ? t("yes") : t("no")}</span>;
  }
  if (user.role_context.kind === "merchant") return <span className="cell-stack__sub">{t("pendingMerchantApprovalUnavailable")}</span>;
  return <span className="cell-stack__sub">—</span>;
}

export function UsersDirectory({ api, token, admin, search, canAct = true }: Props) {
  const { t, dateTime, number } = useLocale();
  const [role, setRole] = useState<UserRoleFilter>("all");
  const [accountStatus, setAccountStatus] = useState<UserAccountStatus | "all">("all");
  const [demoAccount, setDemoAccount] = useState<DemoFilter>("all");
  const [page, setPage] = useState(1);
  const limit = 25;
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [data, setData] = useState<UserPage>({ users: [], page: 1, limit, total: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [detailPhase, setDetailPhase] = useState<"loading" | "ready" | "error">("ready");
  const [pending, setPending] = useState<{ user: UserListItem; nextStatus: AccountStatus } | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const query = useMemo(() => search.trim().slice(0, 64), [search]);

  async function loadUsers() {
    if (!token) return;
    setPhase("loading");
    try { setData(await api.users(token, role, accountStatus, page, limit, query, demoAccount)); setPhase("ready"); } catch { setPhase("error"); }
  }
  async function loadDetail(id: string) {
    setSelectedId(id); setDetailPhase("loading");
    try { setDetail((await api.user(token, id)).user); setDetailPhase("ready"); } catch { setDetail(null); setDetailPhase("error"); }
  }
  useEffect(() => { setPage(1); }, [role, accountStatus, demoAccount, query]);
  useEffect(() => { void loadUsers(); }, [token, role, accountStatus, demoAccount, page, query]);

  async function submit() {
    if (!pending || !token) return;
    const clean = reason.trim();
    if (pending.nextStatus !== "active" && clean.length < 3) return;
    setBusy(true); setError(null);
    try { await api.updateUserStatus(token, pending.user.id, pending.nextStatus, clean || undefined, pending.user.account_status); setPending(null); setReason(""); await loadUsers(); if (selectedId === pending.user.id) await loadDetail(selectedId); }
    catch (caught) { const e = caught as ApiError; const code = (e.details as { error?: string } | undefined)?.error; setError(code === "approval_required" ? (pending.user.role === "driver" ? t("pendingDriverApprovalUnavailable") : t("pendingMerchantApprovalUnavailable")) : code === "cannot_suspend_current_admin" ? t("selfAccountControlUnavailable") : t("resourceLoadErrorDescription")); }
    finally { setBusy(false); }
  }

  const columns: Column<UserListItem>[] = useMemo(() => [
    { key: "user", header: t("columnPassenger"), cell: (u) => <div><p className="cell-stack__title">{u.name}</p><p className="cell-stack__sub technical">{u.phone}</p></div> },
    { key: "role", header: t("columnRole"), cell: (u) => t(roleKey(u.role)) },
    { key: "status", header: t("columnAccountStatus"), cell: (u) => <StatusBadge tone={tone(u.account_status)}>{t(statusKey(u.account_status))}</StatusBadge> },
    { key: "context", header: t("verificationStatus"), cell: (u) => contextText(u, t) },
    { key: "detail", header: t("reviewAction"), align: "end", cell: (u) => <Button size="sm" variant="secondary" icon="search" onClick={() => void loadDetail(u.id)}>{t("reviewDetails")}</Button> },
    { key: "actions", header: t("accountControl"), align: "end", cell: (u) => {
      if (u.id === admin?.id) return <span className="muted">{t("selfAccountControlUnavailable")}</span>;
      if (u.account_status === "pending") return <span className="muted">{u.role === "driver" ? t("pendingDriverApprovalUnavailable") : u.role === "merchant" ? t("pendingMerchantApprovalUnavailable") : t("pendingAccountControlUnavailable")}</span>;
      if (!canAct) return <span className="muted">{t("loading")}</span>;
      if (u.account_status === "active") return <div className="card__actions"><Button size="sm" variant="ghost" icon="block" onClick={() => setPending({ user: u, nextStatus: "suspended" })}>{t("suspendAccount")}</Button><Button size="sm" variant="ghost" icon="block" onClick={() => setPending({ user: u, nextStatus: "disabled" })}>{t("disableAccount")}</Button></div>;
      return <Button size="sm" variant="ghost" icon="check_circle" onClick={() => setPending({ user: u, nextStatus: "active" })}>{t("reactivateAccount")}</Button>;
    } }
  ], [admin?.id, canAct, t]);
  const pages = Math.max(1, Math.ceil(data.total / data.limit));
  return <BentoGrid>
    <Card span={12} padded={false}><CardHeader title={t("userDirectory")} badge={<StatusBadge tone="info">{number(data.total)}</StatusBadge>} action={<div className="card__actions">
      <label className="field field--inline">{t("columnRole")}<select value={role} onChange={(e) => setRole(e.target.value as UserRoleFilter)}><option value="all">{t("all")}</option><option value="passenger">{t("role_passenger")}</option><option value="driver">{t("role_driver")}</option><option value="merchant">{t("role_merchant")}</option><option value="admin">{t("role_admin")}</option></select></label>
      <label className="field field--inline">{t("columnAccountStatus")}<select value={accountStatus} onChange={(e) => setAccountStatus(e.target.value as UserAccountStatus | "all")}><option value="all">{t("all")}</option><option value="active">{t("accountStatus_active")}</option><option value="pending">{t("accountStatus_pending")}</option><option value="suspended">{t("accountStatus_suspended")}</option><option value="disabled">{t("accountStatus_disabled")}</option></select></label>
      <label className="field field--inline">{t("demo")}<select value={demoAccount} onChange={(e) => setDemoAccount(e.target.value as DemoFilter)}><option value="all">{t("all")}</option><option value="demo">{t("yes")}</option><option value="real">{t("no")}</option></select></label>
    </div>} />
      {phase === "loading" && <div className="overview-resource-state" role="status"><Skeleton lines={4} /></div>}
      {phase === "error" && <EmptyState compact icon="report" title={t("resourceLoadError")} description={t("resourceLoadErrorDescription")} />}
      {phase === "ready" && <><DataTable columns={columns} rows={data.users} rowKey={(u) => u.id} empty={<EmptyState compact icon="account_circle" title={query ? t("searchNoResults") : t("noData")} />} />{pages > 1 && <div className="card__actions"><Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{t("previousPage")}</Button><span className="muted">{t("pageOf", { page: number(page), pages: number(pages) })}</span><Button size="sm" variant="ghost" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>{t("nextPage")}</Button></div>}</>}
    </Card>
    {selectedId && detailPhase === "loading" && <Card span={6}><Skeleton lines={5} /></Card>}
    {selectedId && detailPhase === "error" && <Card span={6}><EmptyState compact icon="report" title={t("verificationDetailLoadFailed")} description={t("resourceLoadErrorDescription")} /></Card>}
    {detail && <Card span={6}><CardHeader title={t("userDetail")} action={<Button size="sm" variant="ghost" onClick={() => { setSelectedId(null); setDetail(null); }}>{t("closeReview")}</Button>} /><div className="stack stack--tight">
      <p><strong>{t("profileName")}</strong> {detail.name}</p><p><strong>{t("phoneNumber")}</strong> <TechnicalValue>{detail.phone}</TechnicalValue></p><p><strong>{t("columnRole")}</strong> {t(roleKey(detail.role))}</p><p><strong>{t("columnAccountStatus")}</strong> <StatusBadge tone={tone(detail.account_status)}>{t(statusKey(detail.account_status))}</StatusBadge></p><p><strong>{t("createdAt")}</strong> {dateTime(detail.created_at)}</p><p><strong>{t("activeSessions")}</strong> {number(detail.active_session_count)}</p><p><strong>{t("lastActivity")}</strong> {detail.last_session_at ? dateTime(detail.last_session_at) : t("noData")}</p>
      {detail.role === "driver" && <>{detail.driver_verification?.status === "pending" && <AlertItem tone="info" title={t("pendingDriverApprovalUnavailable")} description={t("accountControlSeparateDescription")} />}<p><strong>{t("verificationStatus")}</strong> {detail.driver_verification ? t(`verificationStatus_${detail.driver_verification.status}` as any) : t("verificationStatus_no")}</p>{detail.driver_profile && <p><strong>{t("columnVerified")}</strong> {detail.driver_profile.verified ? t("yes") : t("no")} · {detail.driver_profile.vehicle_type}</p>}</>}
      {detail.role === "passenger" && <p><strong>{t("requestCount")}</strong> {number(detail.passenger_request_count)}</p>}{detail.role === "merchant" && <p><strong>{t("orderCount")}</strong> {number(detail.merchant_order_count)}</p>}
    </div></Card>}
    {pending && <Card span={6}><CardHeader title={pending.nextStatus === "active" ? t("reactivateAccount") : t(statusKey(pending.nextStatus))} /><AlertItem tone="info" title={t("accountControl")} description={t("accountControlSeparateDescription")} /><p>{t("accountStatusConfirm", { name: pending.user.name, status: t(statusKey(pending.nextStatus)) })}</p>{pending.nextStatus !== "active" && <label className="field">{t("statusReason")}<input value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} /></label>}{error && <p role="alert" className="overview-resource-note overview-resource-note--error">{error}</p>}<div className="card__actions"><Button variant="primary" disabled={busy || (pending.nextStatus !== "active" && reason.trim().length < 3)} onClick={() => void submit()}>{busy ? t("saving") : t("confirm")}</Button><Button variant="ghost" disabled={busy} onClick={() => { setPending(null); setReason(""); setError(null); }}>{t("cancel")}</Button></div></Card>}
  </BentoGrid>;
}
