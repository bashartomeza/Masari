import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ApiClient, ApiError } from "../../api";
import { useLocale } from "../../i18n/LocaleContext";
import { Button, Card, DataTable, EmptyState, Notice, StatusBadge, type Column } from "../../ui";
import { RouteDialog } from "../routes/RouteDialog";
import type { DemandKind, MatchQueryInput, MatchRow, MatchStatus, Page } from "./contracts";
import { createObservationGate, type ObservationState } from "./monitoringState";

const statuses: MatchStatus[] = ["proposed", "sent_to_driver", "accepted", "rejected", "expired", "invalidated"];
const kinds: DemandKind[] = ["passenger_only", "merchant_only", "combined"];

function errorStatus(error: unknown) { return (error as ApiError | undefined)?.status; }
function isTerminal(error: unknown) { return errorStatus(error) === 401 || errorStatus(error) === 403; }
function utcInput(value: string) { return new Date(`${value}:00.000Z`).toISOString(); }

export function MatchingResults({ api, token }: { api: ApiClient; token: string }) {
  const { direction, t, status: localizedStatus, dateTime, number } = useLocale();
  const listGate = useRef(createObservationGate());
  const detailGate = useRef(createObservationGate());
  const [list, setList] = useState<ObservationState<Page<MatchRow>["data"]>>({ last: null, loading: true, error: null });
  const [detail, setDetail] = useState<ObservationState<MatchRow>>({ last: null, loading: false, error: null });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<MatchStatus | "">("");
  const [kindFilter, setKindFilter] = useState<DemandKind | "">("");
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [fromDraft, setFromDraft] = useState("");
  const [untilDraft, setUntilDraft] = useState("");
  const [explicitRange, setExplicitRange] = useState<{ from: string; until: string } | null>(null);
  const [validation, setValidation] = useState<string | null>(null);

  function queryFor(page: number, echoRange = false, overrides: Partial<{ status: MatchStatus | ""; kind: DemandKind | ""; search: string; range: typeof explicitRange }> = {}): MatchQueryInput {
    const nextStatus = overrides.status ?? statusFilter;
    const nextKind = overrides.kind ?? kindFilter;
    const nextSearch = overrides.search ?? search;
    const nextRange = overrides.range === undefined ? explicitRange : overrides.range;
    const query: MatchQueryInput = { page, limit: 25 };
    if (nextStatus) query.status = nextStatus;
    if (nextKind) query.demand_kind = nextKind;
    if (nextSearch.trim()) query.search = nextSearch.trim();
    const range = nextRange ?? (echoRange ? list.last?.data.range : null);
    if (range) Object.assign(query, range);
    return query;
  }

  function load(query: MatchQueryInput) {
    const generation = listGate.current.begin();
    setList((previous) => ({ ...previous, loading: true, error: null }));
    void api.monitoringMatches(token, query).then((response) => {
      if (listGate.current.isCurrent(generation)) setList({ last: response, loading: false, error: null });
    }).catch((error: unknown) => {
      if (!listGate.current.isCurrent(generation)) return;
      setList((previous) => ({
        last: isTerminal(error) ? null : previous.last,
        loading: false,
        error: error instanceof Error ? error.message : t("monitoringLoadFailed")
      }));
    });
  }

  function closeDetail() {
    detailGate.current.invalidate();
    setSelectedId(null);
    setDetail({ last: null, loading: false, error: null });
  }

  function loadDetail(id: string) {
    const generation = detailGate.current.begin();
    setSelectedId(id);
    setDetail((previous) => ({ last: previous.last?.data.id === id ? previous.last : null, loading: true, error: null }));
    void api.monitoringMatch(token, id).then((response) => {
      if (detailGate.current.isCurrent(generation)) setDetail({ last: response, loading: false, error: null });
    }).catch((error: unknown) => {
      if (!detailGate.current.isCurrent(generation)) return;
      if (errorStatus(error) === 404 || isTerminal(error)) {
        setSelectedId(null);
        setDetail({ last: null, loading: false, error: null });
        return;
      }
      setDetail((previous) => ({
        last: previous.last?.data.id === id ? previous.last : null,
        loading: false,
        error: error instanceof Error ? error.message : t("monitoringLoadFailed")
      }));
    });
  }

  useEffect(() => {
    listGate.current.invalidate();
    detailGate.current.invalidate();
    setSelectedId(null);
    setDetail({ last: null, loading: false, error: null });
    setList({ last: null, loading: true, error: null });
    load({ page: 1, limit: 25 });
    return () => { listGate.current.invalidate(); detailGate.current.invalidate(); };
  }, [api, token]);

  function changeStatus(next: MatchStatus | "") {
    setStatusFilter(next);
    load(queryFor(1, false, { status: next }));
  }
  function changeKind(next: DemandKind | "") {
    setKindFilter(next);
    load(queryFor(1, false, { kind: next }));
  }
  function submitSearch(event: FormEvent) {
    event.preventDefault();
    const next = searchDraft.trim();
    setSearch(next);
    load(queryFor(1, false, { search: next }));
  }
  function applyRange() {
    if (!fromDraft || !untilDraft) { setValidation(t("monitoringSelectBothDates")); return; }
    const range = { from: utcInput(fromDraft), until: utcInput(untilDraft) };
    setValidation(null);
    setExplicitRange(range);
    load(queryFor(1, false, { range }));
  }
  function resetRange() {
    setFromDraft(""); setUntilDraft(""); setExplicitRange(null); setValidation(null);
    load(queryFor(1, false, { range: null }));
  }
  function refresh() {
    load(queryFor(1, false));
  }

  const data = list.last?.data;
  const currentPage = data?.page ?? 1;
  const recognizedStatus = (value: string) => statuses.includes(value as MatchStatus);
  const statusText = (value: string) => recognizedStatus(value) ? localizedStatus(value) : t("monitoringUnknown");
  const kindText = (value: DemandKind) => t(value === "passenger_only" ? "monitoringKindPassenger" : value === "merchant_only" ? "monitoringKindMerchant" : "monitoringKindCombined");
  const columns: Column<MatchRow>[] = [
    { key: "id", header: t("monitoringMatchId"), cell: (row) => <span className="technical-value">{row.id}</span> },
    { key: "created", header: t("monitoringCreated"), cell: (row) => dateTime(row.created_at) },
    { key: "kind", header: t("monitoringDemandKind"), cell: (row) => <div><span>{kindText(row.demand_kind)}</span>{row.passenger_request && <a className="monitoring-id-link technical-value" href="#/deliveries-orders">{row.passenger_request.id}</a>}{row.merchant_order && <a className="monitoring-id-link technical-value" href="#/deliveries-orders">{row.merchant_order.id}</a>}</div> },
    { key: "status", header: t("monitoringCurrentStatus"), cell: (row) => <StatusBadge status={recognizedStatus(row.status) ? row.status : undefined}>{statusText(row.status)}</StatusBadge> },
    { key: "score", header: t("monitoringScore"), cell: (row) => <span className="technical-value">{row.score}</span> },
    { key: "route", header: t("monitoringSelectedRoute"), cell: (row) => <span className="technical-value">{row.driver_route.id}</span> },
    { key: "action", header: t("monitoringDetails"), align: "end", cell: (row) => <Button data-testid={`open-match-${row.id}`} variant="ghost" size="sm" onClick={() => loadDetail(row.id)}>{t("monitoringView")}</Button> }
  ];

  const selected = detail.last?.data;
  return (
    <section className="matching-results" dir={direction}>
      <div className="monitoring-toolbar">
        <div><h2>{t("monitoringMatchingResults")}</h2>{list.last && <p className="monitoring-observed">{t("monitoringObserved", { time: "" })}<time dateTime={list.last.observed_at}>{dateTime(list.last.observed_at)}</time></p>}</div>
        <Button data-testid="matches-refresh" variant="outline" icon="refresh" onClick={refresh}>{list.loading ? t("monitoringRefreshing") : t("monitoringRefresh")}</Button>
      </div>
      <Card>
        <form data-testid="match-filters" className="monitoring-filters" onSubmit={submitSearch}>
          <label className="field">{t("monitoringExactId")}<input name="search" value={searchDraft} maxLength={191} onChange={(event) => setSearchDraft(event.target.value)} /></label>
          <label className="field">{t("monitoringCurrentStatus")}<select name="status" value={statusFilter} onChange={(event) => changeStatus(event.target.value as MatchStatus | "")}><option value="">{t("all")}</option>{statuses.map((value) => <option key={value} value={value}>{localizedStatus(value)}</option>)}</select></label>
          <label className="field">{t("monitoringDemandKind")}<select name="demand_kind" value={kindFilter} onChange={(event) => changeKind(event.target.value as DemandKind | "")}><option value="">{t("all")}</option>{kinds.map((value) => <option key={value} value={value}>{kindText(value)}</option>)}</select></label>
          <label className="field">{t("monitoringFrom")}<input name="from" type="datetime-local" value={fromDraft} onChange={(event) => setFromDraft(event.target.value)} /></label>
          <label className="field">{t("monitoringUntil")}<input name="until" type="datetime-local" value={untilDraft} onChange={(event) => setUntilDraft(event.target.value)} /></label>
          <div className="button-row monitoring-filter-actions"><Button type="submit" variant="primary">{t("monitoringSearch")}</Button><Button data-testid="apply-range" variant="outline" onClick={applyRange}>{t("monitoringApplyRange")}</Button><Button variant="ghost" onClick={resetRange}>{t("monitoringServerDefaultRange")}</Button></div>
        </form>
        {validation && <Notice kind="error">{validation}</Notice>}
        <p className="muted">{t("monitoringExactSearchHelp")}</p>
      </Card>
      {list.error && list.last && <Notice kind="error">{t("monitoringStaleData")}: {list.error}</Notice>}
      {!data && list.loading && <div className="monitoring-state" role="status">{t("monitoringLoading")}</div>}
      {!data && !list.loading && <EmptyState title={t("monitoringMatchesUnavailable")} description={list.error ?? t("monitoringLoadFailed")} />}
      {data && <Card padded={false} className="monitoring-table-card"><DataTable columns={columns} rows={data.items} rowKey={(row) => row.id} empty={<EmptyState compact title={t("monitoringNoMatches")} description={t("monitoringNoMatchesDescription")} />} /></Card>}
      {data && <div className="monitoring-pagination"><span>{t("pageOf", { page: number(currentPage), pages: number(Math.max(1, Math.ceil(data.total / data.limit))) })}</span><div className="button-row"><Button variant="outline" disabled={currentPage <= 1 || list.loading} onClick={() => load(queryFor(currentPage - 1, true))}>{t("previousPage")}</Button><Button data-testid="matches-next" variant="outline" disabled={!data.has_more || currentPage >= 1000 || list.loading} onClick={() => load(queryFor(currentPage + 1, true))}>{t("nextPage")}</Button></div>{currentPage >= 1000 && data.has_more && <p className="monitoring-page-cap">{t("monitoringPageCap")}</p>}</div>}
      <RouteDialog open={Boolean(selectedId)} title={t("monitoringMatchDetail")} description={selectedId ?? undefined} dir={direction} onClose={closeDetail}>
        {detail.loading && !selected && <div role="status">{t("monitoringLoading")}</div>}
        {detail.error && <Notice kind="error">{selected ? `${t("monitoringStaleData")}: ${detail.error}` : detail.error}</Notice>}
        {selected && <div className="monitoring-detail">
          <div><span>{t("monitoringMatchId")}</span><strong className="technical-value">{selected.id}</strong></div>
          <div><span>{t("monitoringCurrentStatus")}</span><StatusBadge status={recognizedStatus(selected.status) ? selected.status : undefined}>{statusText(selected.status)}</StatusBadge></div>
          <div><span>{t("monitoringScore")}</span><strong className="technical-value">{selected.score}</strong></div>
          <div><span>{t("monitoringMethod")}</span><strong>{selected.method === "masari_route_score" ? t("monitoringMasariRouteScore") : t("monitoringUnknown")}</strong></div>
          <div><span>{t("monitoringSelectedRoute")}</span><strong className="technical-value">{selected.driver_route.id}</strong></div>
          {selected.passenger_request && <section><h3>{t("monitoringPassengerRequest")}</h3><p className="technical-value">{selected.passenger_request.id}</p><p>{t("monitoringCurrentStatus")}: {localizedStatus(selected.passenger_request.status)}</p><p>{t("monitoringRequestedPassengers")}: {number(selected.passenger_request.passenger_count)}</p></section>}
          {selected.merchant_order && <section><h3>{t("monitoringMerchantOrder")}</h3><p className="technical-value">{selected.merchant_order.id}</p><p>{t("monitoringCurrentStatus")}: {localizedStatus(selected.merchant_order.status)}</p><p>{t("monitoringCurrentOrderParcels")}: {number(selected.merchant_order.parcel_count)}</p></section>}
          {selected.parcel_batch && <div><span>{t("monitoringParcelBatch")}</span><strong className="technical-value">{selected.parcel_batch.id}</strong></div>}
          <p className="monitoring-observed">{t("monitoringObserved", { time: dateTime(detail.last?.observed_at) })}</p>
          <Button data-testid="detail-refresh" variant="outline" icon="refresh" onClick={() => loadDetail(selected.id)}>{t("monitoringRefreshDetail")}</Button>
        </div>}
      </RouteDialog>
    </section>
  );
}
