import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { createApiClient, createDemoApiClient, type BatchResponse, type Comparison, type DashboardResponse, type DriverRoute, type LocationEvent, type MatchRunResponse, type MerchantOrder, type PassengerRequest, type Trip, type User } from "./api";
import { demoUiEnabled, getAdminBuildConfig, type AdminBuildConfig } from "./config";
import { useLocale } from "./i18n/LocaleContext";
import type { TranslationKey } from "./i18n/translations";
import { ADMIN_TOKEN_KEY, clearAdminSession, createAdminSessionExpiryHandler, isAdminSessionEndError, type TokenStorage } from "./session";

export { ADMIN_TOKEN_KEY, clearAdminSession } from "./session";

const tripFlow = ["accepted", "pickup_started", "picked_up", "in_transit", "delivered", "completed"];

type Notice = { type: "success" | "error"; message: string } | null;
type DemoStep = { key: TranslationKey; statusValue?: string };

function getErrorMessage(error: unknown, t: (key: TranslationKey) => string) {
  if (!(error instanceof Error)) return t("unexpectedError");
  if (error.message === "Failed to fetch") return t("failedToFetch");
  if (error.message === "forbidden" || error.message === "unauthorized") return t("unauthorized");
  return error.message || t("unexpectedError");
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="badge">{children}</span>;
}

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function App({
  config = getAdminBuildConfig(),
  sessionStore = window.sessionStorage,
  legacyStore = window.localStorage
}: {
  config?: AdminBuildConfig;
  sessionStore?: TokenStorage;
  legacyStore?: TokenStorage;
} = {}) {
  const { direction, locale, toggleLocale, t, status, source, number, dateTime } = useLocale();
  const demoEnabled = demoUiEnabled(config, __MASARI_DEMO_BUILD__);
  const [token, setToken] = useState(() => {
    legacyStore.removeItem(ADMIN_TOKEN_KEY);
    return sessionStore.getItem(ADMIN_TOKEN_KEY) ?? "";
  });
  const [admin, setAdmin] = useState<User | null>(null);
  const [phone, setPhone] = useState(demoEnabled ? config.demo?.adminPhone ?? "" : "");
  const [password, setPassword] = useState(demoEnabled ? config.demo?.adminPassword ?? "" : "");
  const [resetKey, setResetKey] = useState(demoEnabled ? config.demo?.resetKey ?? "" : "");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [routes, setRoutes] = useState<DriverRoute[]>([]);
  const [requests, setRequests] = useState<PassengerRequest[]>([]);
  const [orders, setOrders] = useState<MerchantOrder[]>([]);
  const [matchResult, setMatchResult] = useState<MatchRunResponse | null>(null);
  const [batchResult, setBatchResult] = useState<BatchResponse | null>(null);
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [latestLocation, setLatestLocation] = useState<LocationEvent | null>(null);
  const [locationTrail, setLocationTrail] = useState<LocationEvent[]>([]);
  const [demoSteps, setDemoSteps] = useState<DemoStep[]>([]);

  function clearAuthenticatedData() {
    setAdmin(null);
    setDashboard(null);
    setRoutes([]);
    setRequests([]);
    setOrders([]);
    setMatchResult(null);
    setBatchResult(null);
    setComparison(null);
    setTrips([]);
    setActiveTrip(null);
    setLatestLocation(null);
    setLocationTrail([]);
    setDemoSteps([]);
  }

  const sessionExpiry = useMemo(
    () => createAdminSessionExpiryHandler({
      sessionStore,
      legacyStore,
      onExpired: () => {
        setToken("");
        clearAuthenticatedData();
        setNotice({ type: "error", message: t("sessionExpired") });
      }
    }),
    [legacyStore, sessionStore, t]
  );
  const api = useMemo(
    () => createApiClient(config.apiBaseUrl, { onSessionEnded: sessionExpiry.handle }),
    [config.apiBaseUrl, sessionExpiry]
  );
  const demoApi = useMemo(
    () => createDemoApiClient(config.apiBaseUrl, { onSessionEnded: sessionExpiry.handle }),
    [config.apiBaseUrl, sessionExpiry]
  );

  const selectedRequest = requests[0];
  const selectedOrder = orders[0];
  const selectedRoute =
    routes.find(
      (route) =>
        route.origin_label === "Hebron / PPU / Bab Al-Zawiya" && route.destination_label === "Bethlehem"
    ) ?? routes[0];
  const canAct = Boolean(token) && !busy;
  const nextTripStatus = activeTrip ? tripFlow[tripFlow.indexOf(activeTrip.status) + 1] : undefined;

  const scoringLabels: Record<string, TranslationKey> = {
    corridorOverlap: "corridorOverlap",
    pickupDistanceScore: "pickupDistanceScore",
    timingFit: "timingFit",
    trustScore: "trustScore",
    capacityFit: "capacityFit",
    finalScore: "finalScore",
    estimatedDeviationKm: "estimatedDeviationKm"
  };

  function LanguageSwitch() {
    return <button className="language-switch" type="button" onClick={() => { setNotice(null); toggleLocale(); }}>{t("languageSwitch")}</button>;
  }

  async function runAction<T>(label: string, action: () => Promise<T>, success?: string) {
    setBusy(label);
    setNotice(null);
    try {
      const result = await action();
      if (success) setNotice({ type: "success", message: success });
      return result;
    } catch (error) {
      if (isAdminSessionEndError(error)) return null;
      setNotice({ type: "error", message: getErrorMessage(error, t) });
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function refreshOverview(currentToken = token) {
    if (!currentToken) return;
    const [dashboardData, routesData, requestsData, ordersData, tripsData] = await Promise.all([
      api.dashboard(currentToken),
      api.routes(currentToken),
      api.requests(currentToken),
      api.orders(currentToken),
      api.trips(currentToken)
    ]);
    setDashboard(dashboardData);
    setRoutes(routesData.routes);
    setRequests(requestsData.requests);
    setOrders(ordersData.orders);
    setTrips(tripsData.trips);
    setActiveTrip((current) => current ?? tripsData.trips[0] ?? null);
  }

  async function refreshData() {
    await runAction("refresh", () => refreshOverview(), t("dataRefreshed"));
  }

  async function login(event: FormEvent) {
    event.preventDefault();
    const result = await runAction("login", () => api.login(phone, password), t("adminLoggedIn"));
    if (!result) return;
    sessionExpiry.reset();
    sessionStore.setItem(ADMIN_TOKEN_KEY, result.token);
    setToken(result.token);
    setAdmin(result.user);
    await refreshOverview(result.token);
  }

  async function loadMe(currentToken = token) {
    const result = await runAction("me", () => api.me(currentToken), t("sessionLoaded"));
    if (result) setAdmin(result.user);
    return result !== null;
  }

  async function resetDemo() {
    if (!demoApi) return;
    await runAction("reset", () => demoApi.reset(token || undefined, resetKey), t("demoDataReset"));
    const session = await api.login(phone, password);
    sessionExpiry.reset();
    sessionStore.setItem(ADMIN_TOKEN_KEY, session.token);
    setToken(session.token);
    setAdmin(session.user);
    setMatchResult(null);
    setBatchResult(null);
    setComparison(null);
    setTrips([]);
    setActiveTrip(null);
    setLatestLocation(null);
    setLocationTrail([]);
    setDemoSteps([]);
    await refreshOverview(session.token);
  }

  async function runMatch() {
    if (!selectedRequest && !selectedOrder) return setNotice({ type: "error", message: t("noSeededInputs") });
    const result = await runAction(
      "match",
      () => demoApi!.runMatch(token, selectedRequest?.id, selectedOrder?.id),
      t("matchingCompleted")
    );
    if (result) setMatchResult(result);
  }

  async function runBatch() {
    if (!selectedOrder) return setNotice({ type: "error", message: t("noMerchantOrder") });
    const result = await runAction("batch", () => demoApi!.batchOrder(token, selectedOrder.id), t("parcelBatchCreated"));
    if (result) {
      setBatchResult(result);
      await refreshOverview();
    }
  }

  async function runComparison() {
    const result = await runAction(
      "comparison",
      () => demoApi!.runComparison(token, selectedRequest?.id, selectedOrder?.id),
      t("comparisonGenerated")
    );
    if (!result) return;
    const read = await demoApi!.getComparison(token, result.comparison.id);
    setComparison(read.comparison);
  }

  async function acceptMatch() {
    if (!matchResult) return setNotice({ type: "error", message: t("runMatchBeforeAccept") });
    const result = await runAction("accept", () => demoApi!.acceptMatch(token, matchResult.match.id), t("matchAccepted"));
    if (result) {
      setActiveTrip(result.trip);
      setMatchResult((current) =>
        current ? { ...current, match: { ...current.match, status: "accepted" } } : current
      );
      await refreshTrips();
    }
  }

  async function rejectMatch() {
    if (!matchResult) return setNotice({ type: "error", message: t("runMatchBeforeReject") });
    const result = await runAction("reject", () => demoApi!.rejectMatch(token, matchResult.match.id), t("matchRejected"));
    if (result && matchResult) setMatchResult({ ...matchResult, match: result.match });
  }

  async function refreshTrips() {
    if (!token) return;
    const result = await api.trips(token);
    setTrips(result.trips);
    if (activeTrip) {
      const fresh = result.trips.find((trip) => trip.id === activeTrip.id);
      if (fresh) setActiveTrip(fresh);
    } else {
      setActiveTrip(result.trips[0] ?? null);
    }
  }

  async function refreshTripData() {
    await runAction("refresh-trips", () => refreshTrips(), t("dataRefreshed"));
  }

  async function moveTrip(status: string) {
    if (!activeTrip) return;
    const result = await runAction("status", () => demoApi!.updateTripStatus(token, activeTrip.id, status), t("tripMoved", { status: statusLabel(status) }));
    if (result) {
      setActiveTrip(result.trip);
      await refreshTrips();
    }
  }

  async function simulateStep() {
    if (!activeTrip) return;
    const result = await runAction("tracking", () => demoApi!.simulateStep(token, activeTrip.id), t("locationRecorded"));
    if (result) {
      setLatestLocation(result.location);
      setLocationTrail((items) => [result.location, ...items].slice(0, 7));
    }
  }

  async function resetSimulation() {
    if (!activeTrip) return;
    await runAction("tracking-reset", () => demoApi!.resetSimulation(token, activeTrip.id), t("simulationReset"));
    setLatestLocation(null);
    setLocationTrail([]);
  }

  async function readLatestLocation() {
    if (!activeTrip) return;
    const result = await runAction("latest", () => api.latestLocation(token, activeTrip.id), t("latestLocationLoaded"));
    if (result) setLatestLocation(result.location);
  }

  async function runFullDemoSequence() {
    if (!demoApi) return;
    await runAction("full-demo", async () => {
      const steps: DemoStep[] = [];
      const mark = (key: TranslationKey, statusValue?: string) => {
        steps.push({ key, statusValue });
        setDemoSteps([...steps]);
      };

      mark("stepReset");
      await demoApi.reset(token || undefined, resetKey);
      mark("stepLogin");
      const session = await api.login(phone, password);
      sessionExpiry.reset();
      sessionStore.setItem(ADMIN_TOKEN_KEY, session.token);
      setToken(session.token);
      setAdmin(session.user);
      const currentToken = session.token;
      mark("stepLoadInputs");
      const overview = await Promise.all([api.requests(currentToken), api.orders(currentToken)]);
      const request = overview[0].requests[0];
      const order = overview[1].orders[0];
      if (!request || !order) throw new Error(t("seededInputsMissingAfterReset"));
      mark("stepCreateBatch");
      const batch = await demoApi.batchOrder(currentToken, order.id);
      mark("stepRunMatch");
      const match = await demoApi.runMatch(currentToken, request.id, order.id);
      mark("stepRunComparison");
      const comparisonRun = await demoApi.runComparison(currentToken, request.id, order.id);
      mark("stepAcceptTrip");
      const accepted = await demoApi.acceptMatch(currentToken, match.match.id);
      let trip = accepted.trip;
      for (const status of ["pickup_started", "picked_up", "in_transit", "delivered", "completed"]) {
        mark("stepAdvanceTrip", status);
        trip = (await demoApi.updateTripStatus(currentToken, trip.id, status)).trip;
      }
      mark("stepRecordTracking");
      const location = await demoApi.simulateStep(currentToken, trip.id);
      setMatchResult({ ...match, match: { ...match.match, status: "accepted" } });
      setBatchResult({ ...batch, batch: { ...batch.batch, status: "delivered" } });
      setComparison(comparisonRun.comparison);
      setActiveTrip(trip);
      setLatestLocation(location.location);
      setLocationTrail([location.location]);
      await refreshOverview(currentToken);
      mark("stepDemoComplete");
    }, t("fullDemoCompleted"));
  }

  function statusLabel(value: string) {
    return status(value);
  }

  useEffect(() => {
    if (!token) return;
    void loadMe(token).then((loaded) => {
      if (loaded) void runAction("restore-overview", () => refreshOverview(token));
    });
  }, [token]);

  if (!token) {
    return (
      <main className="login-shell" dir={direction} lang={locale}>
        <form className="login-card" onSubmit={login}>
          <div className="top-actions"><LanguageSwitch /></div>
          <p className="eyebrow">{t("appName")}</p>
          <h1>{t("loginHeading")}</h1>
          <p>{t("loginDescription", { apiBaseUrl: config.apiBaseUrl })}</p>
          {demoEnabled && <p className="credential-hint technical">{t("demoCredentials")}</p>}
          <label>{t("adminPhone")}<input className="technical" value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
          <label>{t("password")}<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          <button disabled={busy === "login"}>{busy === "login" ? t("signingIn") : t("signIn")}</button>
          {notice && <div className={`notice ${notice.type}`}>{notice.message}</div>}
        </form>
      </main>
    );
  }

  return (
    <main className="app-shell" dir={direction} lang={locale}>
      <header className="hero">
        <div>
          <p className="eyebrow">{t("masariConsole")}</p>
          <h1>{t("corridorLabel")}</h1>
          <p>{t("heroDescription")}</p>
        </div>
        <div className="session-card">
          <strong>{admin?.name ?? "Admin"}</strong>
          <span className="technical">{admin?.phone}</span>
          <LanguageSwitch />
          <button onClick={() => { clearAdminSession(sessionStore, legacyStore); sessionExpiry.reset(); clearAuthenticatedData(); setNotice(null); setToken(""); }} disabled={Boolean(busy)}>{t("logout")}</button>
        </div>
      </header>

      {notice && <div className={`notice ${notice.type}`}>{notice.message}</div>}

      <div className="grid">
        {demoEnabled && <Section title={t("demoControl")} action={<button onClick={runFullDemoSequence} disabled={!canAct}>{t("runFullDemo")}</button>}>
          <div className="control-row">
            <label>{t("resetKey")}<input className="technical" value={resetKey} onChange={(event) => setResetKey(event.target.value)} /></label>
            <button onClick={resetDemo} disabled={!canAct}>{busy === "reset" ? t("resetting") : t("resetDemo")}</button>
            <button onClick={refreshData} disabled={!canAct}>{t("refreshData")}</button>
          </div>
          <p className="muted">{t("resetExplanation")}</p>
          {demoSteps.length > 0 && <ol className="demo-steps">{demoSteps.map((step, index) => <li key={`${step.key}-${index}`}>{t(step.key, step.statusValue ? { status: status(step.statusValue) } : {})}</li>)}</ol>}
        </Section>}

        <Section title={t("systemOverview")}>
          <div className="metric-grid">
            <div><strong>{dashboard ? number(dashboard.counts.users) : "-"}</strong><span>{t("users")}</span></div>
            <div><strong>{dashboard ? number(dashboard.counts.routes) : "-"}</strong><span>{t("routes")}</span></div>
            <div><strong>{dashboard ? number(dashboard.counts.passenger_requests) : "-"}</strong><span>{t("passengerRequests")}</span></div>
            <div><strong>{dashboard ? number(dashboard.counts.merchant_orders) : "-"}</strong><span>{t("merchantOrders")}</span></div>
            <div><strong>{dashboard ? number(dashboard.counts.parcels) : "-"}</strong><span>{t("parcels")}</span></div>
            <div><strong>{number(trips.length)}</strong><span>{t("trips")}</span></div>
          </div>
          <div className="mini-list">
            <h3>{t("seededData")}</h3>
            <p>{t("activeCorridor")}: {t("corridorLabel")}</p>
            <p>{t("route")}: {selectedRoute ? `${selectedRoute.origin_label} -> ${selectedRoute.destination_label}` : t("noData")} <Badge>{selectedRoute ? status(selectedRoute.status) : t("missing")}</Badge></p>
            <p>{t("request")}: {selectedRequest?.pickup_label ?? t("noData")} <Badge>{selectedRequest ? status(selectedRequest.status) : t("missing")}</Badge></p>
            <p>{t("order")}: {selectedOrder?.pickup_label ?? t("noData")} <Badge>{selectedOrder ? status(selectedOrder.status) : t("missing")}</Badge> {number(selectedOrder?.parcels?.length ?? 0)} {t("parcels")}</p>
          </div>
        </Section>

        {demoEnabled && <>
        <Section title={t("matching")} action={<button onClick={runMatch} disabled={!canAct}>{t("runMatch")}</button>}>
          {matchResult ? (
            <div className="result-card">
              <p><strong>{t("match")}:</strong> <span className="technical">{matchResult.match.id}</span> <Badge>{status(matchResult.match.status)}</Badge></p>
              <p><strong>{t("selectedDriver")}:</strong> <span className="technical">{matchResult.match.driver_route?.driver_id ?? t("driverRoute")}</span></p>
              <p><strong>{t("driverRoute")}:</strong> <span className="technical">{matchResult.match.driver_route_id}</span></p>
              <p><strong>{t("finalScore")}:</strong> {number(matchResult.scoringBreakdown.finalScore)}</p>
              <p><strong>{t("explanation")}:</strong> {t("matchDemoExplanation")}</p>
              <div className="breakdown">
                {Object.entries(matchResult.scoringBreakdown).map(([key, value]) => (
                  <span key={key}>{t(scoringLabels[key] ?? "score")}: {number(value)}</span>
                ))}
              </div>
            </div>
          ) : <p className="muted">{t("runMatchingEmpty")}</p>}
        </Section>

        <Section title={t("parcelBatch")} action={<button onClick={runBatch} disabled={!canAct}>{t("createBatch")}</button>}>
          {batchResult ? (
            <div className="result-card">
              <p><strong>{t("batch")}:</strong> <span className="technical">{batchResult.batch.id}</span> <Badge>{status(batchResult.batch.status)}</Badge></p>
              <p><strong>{t("numberOfParcels")}:</strong> {number(batchResult.batch.merchant_order?.parcels?.length ?? selectedOrder?.parcels?.length ?? 0)}</p>
              <p><strong>{t("estimatedDistanceSaved")}:</strong> {number(batchResult.batch.estimated_distance_saved)} km</p>
              <p><strong>{t("batchExplanation")}:</strong> {t("batchDemoExplanation")}</p>
            </div>
          ) : <p className="muted">{t("createBatchEmpty")}</p>}
        </Section>

        <Section title={t("comparison")} action={<button onClick={runComparison} disabled={!canAct}>{t("runComparison")}</button>}>
          {comparison ? (
            <table>
              <thead><tr><th>{t("metric")}</th><th>{t("masari")}</th><th>{t("nearestDriver")}</th></tr></thead>
              <tbody>
                <tr><td>{t("trips")}</td><td>{number(comparison.masari_trips)}</td><td>{number(comparison.nearest_driver_trips)}</td></tr>
                <tr><td>{t("estimatedDistance")}</td><td>{number(comparison.masari_estimated_distance)}</td><td>{number(comparison.nearest_estimated_distance)}</td></tr>
                <tr><td>{t("estimatedCost")}</td><td>{number(comparison.masari_estimated_cost)}</td><td>{number(comparison.nearest_estimated_cost)}</td></tr>
                <tr><td>{t("parcelBatchingBenefit")}</td><td colSpan={2}>{t("comparisonBenefitDemo")}</td></tr>
                <tr><td>{t("driverUtilization")}</td><td>{number(comparison.driver_utilization)}</td><td>{t("baselineSeparateTrips")}</td></tr>
                <tr><td>{t("winner")}</td><td colSpan={2}><Badge>{comparison.winner === "masari" ? t("masari") : t("nearestDriver")}</Badge></td></tr>
              </tbody>
            </table>
          ) : <p className="muted">{t("runComparisonEmpty")}</p>}
        </Section>

        <Section title={t("tripFlow")} action={<button onClick={acceptMatch} disabled={!canAct || !matchResult}>{t("acceptMatch")}</button>}>
          <div className="control-row">
            <button onClick={rejectMatch} disabled={!canAct || !matchResult}>{t("rejectMatch")}</button>
            <button onClick={refreshTripData} disabled={!canAct}>{t("refreshTrips")}</button>
          </div>
          {activeTrip ? (
            <div className="result-card">
              <p><strong>{t("currentTrip")}:</strong> <span className="technical">{activeTrip.id}</span> <Badge>{status(activeTrip.status)}</Badge></p>
              <p><strong>{t("currentStatus")}:</strong> {status(activeTrip.status)}</p>
              <div className="status-rail">{tripFlow.map((flowStatus) => <span className={tripFlow.indexOf(flowStatus) <= tripFlow.indexOf(activeTrip.status) ? "done" : ""} key={flowStatus}>{status(flowStatus)}</span>)}</div>
              {nextTripStatus ? <button onClick={() => moveTrip(nextTripStatus)} disabled={!canAct}>{t("moveTo", { status: status(nextTripStatus) })}</button> : <p className="muted">{t("tripLifecycleComplete")}</p>}
            </div>
          ) : <p className="muted">{t("acceptMatchEmpty")}</p>}
        </Section>

        <Section title={t("trackingSimulation")}>
          <div className="control-row">
            <button onClick={simulateStep} disabled={!canAct || !activeTrip}>{t("simulateStep")}</button>
            <button onClick={readLatestLocation} disabled={!canAct || !activeTrip}>{t("readLatest")}</button>
            <button onClick={resetSimulation} disabled={!canAct || !activeTrip}>{t("resetSimulation")}</button>
          </div>
          {latestLocation ? (
            <div className="result-card location-card">
              <p><strong>{t("latitude")} / {t("longitude")}:</strong> <span className="technical">{latestLocation.lat}, {latestLocation.lng}</span></p>
              <p><strong>{t("sequence")}:</strong> {number(latestLocation.sequence)}</p>
              <p><strong>{t("source")}:</strong> {source(latestLocation.source)}</p>
              <p><strong>{t("recordedTime")}:</strong> {dateTime(latestLocation.recorded_at)}</p>
            </div>
          ) : <p className="muted">{t("simulateEmpty")}</p>}
          <div className="trail">{locationTrail.map((location) => <span className="technical" key={location.id}>#{number(location.sequence)} {location.lat},{location.lng}</span>)}</div>
        </Section>
        </>}
      </div>
    </main>
  );
}
