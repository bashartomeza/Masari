import { FormEvent, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { API_BASE_URL, api, type BatchResponse, type Comparison, type DashboardResponse, type DriverRoute, type LocationEvent, type MatchRunResponse, type MerchantOrder, type PassengerRequest, type Trip, type User } from "./api";
import { useLocale } from "./i18n/LocaleContext";
import type { TranslationKey } from "./i18n/translations";

const tripFlow = ["accepted", "pickup_started", "picked_up", "in_transit", "delivered", "completed"];

type Notice = { type: "success" | "error"; message: string } | null;

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

export function App() {
  const { direction, locale, toggleLocale, t, status, source, number, dateTime } = useLocale();
  const [token, setToken] = useState(() => localStorage.getItem("masari_admin_token") ?? "");
  const [admin, setAdmin] = useState<User | null>(null);
  const [phone, setPhone] = useState("+970590000005");
  const [password, setPassword] = useState("demo-admin-123");
  const [resetKey, setResetKey] = useState("m3a-reset-key");
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
  const [demoSteps, setDemoSteps] = useState<string[]>([]);

  const selectedRequest = requests[0];
  const selectedOrder = orders[0];
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
    return <button className="language-switch" type="button" onClick={toggleLocale}>{t("languageSwitch")}</button>;
  }

  async function runAction<T>(label: string, action: () => Promise<T>, success: string) {
    setBusy(label);
    setNotice(null);
    try {
      const result = await action();
      setNotice({ type: "success", message: success });
      return result;
    } catch (error) {
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

  async function login(event: FormEvent) {
    event.preventDefault();
    const result = await runAction("login", () => api.login(phone, password), t("adminLoggedIn"));
    if (!result) return;
    localStorage.setItem("masari_admin_token", result.token);
    setToken(result.token);
    setAdmin(result.user);
    await refreshOverview(result.token);
  }

  async function loadMe(currentToken = token) {
    const result = await runAction("me", () => api.me(currentToken), t("sessionLoaded"));
    if (result) setAdmin(result.user);
  }

  async function resetDemo() {
    await runAction("reset", () => api.reset(token || undefined, resetKey), t("demoDataReset"));
    const session = await api.login(phone, password);
    localStorage.setItem("masari_admin_token", session.token);
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
      () => api.runMatch(token, selectedRequest?.id, selectedOrder?.id),
      t("matchingCompleted")
    );
    if (result) setMatchResult(result);
  }

  async function runBatch() {
    if (!selectedOrder) return setNotice({ type: "error", message: t("noMerchantOrder") });
    const result = await runAction("batch", () => api.batchOrder(token, selectedOrder.id), t("parcelBatchCreated"));
    if (result) {
      setBatchResult(result);
      await refreshOverview();
    }
  }

  async function runComparison() {
    const result = await runAction(
      "comparison",
      () => api.runComparison(token, selectedRequest?.id, selectedOrder?.id),
      t("comparisonGenerated")
    );
    if (!result) return;
    const read = await api.getComparison(token, result.comparison.id);
    setComparison(read.comparison);
  }

  async function acceptMatch() {
    if (!matchResult) return setNotice({ type: "error", message: t("runMatchBeforeAccept") });
    const result = await runAction("accept", () => api.acceptMatch(token, matchResult.match.id), t("matchAccepted"));
    if (result) {
      setActiveTrip(result.trip);
      await refreshTrips();
    }
  }

  async function rejectMatch() {
    if (!matchResult) return setNotice({ type: "error", message: t("runMatchBeforeReject") });
    const result = await runAction("reject", () => api.rejectMatch(token, matchResult.match.id), t("matchRejected"));
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

  async function moveTrip(status: string) {
    if (!activeTrip) return;
    const result = await runAction("status", () => api.updateTripStatus(token, activeTrip.id, status), t("tripMoved", { status: statusLabel(status) }));
    if (result) {
      setActiveTrip(result.trip);
      await refreshTrips();
    }
  }

  async function simulateStep() {
    if (!activeTrip) return;
    const result = await runAction("tracking", () => api.simulateStep(token, activeTrip.id), t("locationRecorded"));
    if (result) {
      setLatestLocation(result.location);
      setLocationTrail((items) => [result.location, ...items].slice(0, 7));
    }
  }

  async function resetSimulation() {
    if (!activeTrip) return;
    await runAction("tracking-reset", () => api.resetSimulation(token, activeTrip.id), t("simulationReset"));
    setLatestLocation(null);
    setLocationTrail([]);
  }

  async function readLatestLocation() {
    if (!activeTrip) return;
    const result = await runAction("latest", () => api.latestLocation(token, activeTrip.id), t("latestLocationLoaded"));
    if (result) setLatestLocation(result.location);
  }

  async function runFullDemoSequence() {
    await runAction("full-demo", async () => {
      const steps: string[] = [];
      const mark = (step: string) => {
        steps.push(step);
        setDemoSteps([...steps]);
      };

      mark(t("stepReset"));
      await api.reset(token || undefined, resetKey);
      mark(t("stepLogin"));
      const session = await api.login(phone, password);
      localStorage.setItem("masari_admin_token", session.token);
      setToken(session.token);
      setAdmin(session.user);
      const currentToken = session.token;
      mark(t("stepLoadInputs"));
      const overview = await Promise.all([api.requests(currentToken), api.orders(currentToken)]);
      const request = overview[0].requests[0];
      const order = overview[1].orders[0];
      if (!request || !order) throw new Error(t("seededInputsMissingAfterReset"));
      mark(t("stepRunMatch"));
      const match = await api.runMatch(currentToken, request.id, order.id);
      mark(t("stepCreateBatch"));
      const batch = await api.batchOrder(currentToken, order.id);
      mark(t("stepRunComparison"));
      const comparisonRun = await api.runComparison(currentToken, request.id, order.id);
      mark(t("stepAcceptTrip"));
      const accepted = await api.acceptMatch(currentToken, match.match.id);
      let trip = accepted.trip;
      for (const status of ["pickup_started", "picked_up", "in_transit", "delivered", "completed"]) {
        mark(t("stepAdvanceTrip", { status: statusLabel(status) }));
        trip = (await api.updateTripStatus(currentToken, trip.id, status)).trip;
      }
      mark(t("stepRecordTracking"));
      const location = await api.simulateStep(currentToken, trip.id);
      setMatchResult(match);
      setBatchResult(batch);
      setComparison(comparisonRun.comparison);
      setActiveTrip(trip);
      setLatestLocation(location.location);
      setLocationTrail([location.location]);
      await refreshOverview(currentToken);
      mark(t("stepDemoComplete"));
    }, t("fullDemoCompleted"));
  }

  function statusLabel(value: string) {
    return status(value);
  }

  useEffect(() => {
    if (!token) return;
    void loadMe(token).then(() => refreshOverview(token));
  }, [token]);

  if (!token) {
    return (
      <main className="login-shell" dir={direction} lang={locale}>
        <form className="login-card" onSubmit={login}>
          <div className="top-actions"><LanguageSwitch /></div>
          <p className="eyebrow">{t("appName")}</p>
          <h1>{t("loginHeading")}</h1>
          <p>{t("loginDescription", { apiBaseUrl: API_BASE_URL })}</p>
          <p className="credential-hint technical">{t("demoCredentials")}</p>
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
          <button onClick={() => { localStorage.removeItem("masari_admin_token"); setToken(""); }} disabled={Boolean(busy)}>{t("logout")}</button>
        </div>
      </header>

      {notice && <div className={`notice ${notice.type}`}>{notice.message}</div>}

      <div className="grid">
        <Section title={t("demoControl")} action={<button onClick={runFullDemoSequence} disabled={!canAct}>{t("runFullDemo")}</button>}>
          <div className="control-row">
            <label>{t("resetKey")}<input className="technical" value={resetKey} onChange={(event) => setResetKey(event.target.value)} /></label>
            <button onClick={resetDemo} disabled={!canAct}>{busy === "reset" ? t("resetting") : t("resetDemo")}</button>
            <button onClick={() => refreshOverview()} disabled={!canAct}>{t("refreshData")}</button>
          </div>
          <p className="muted">{t("resetExplanation")}</p>
          {demoSteps.length > 0 && <ol className="demo-steps">{demoSteps.map((step) => <li key={step}>{step}</li>)}</ol>}
        </Section>

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
            <p>{t("route")}: {routes[0] ? `${routes[0].origin_label} -> ${routes[0].destination_label}` : t("noData")} <Badge>{routes[0] ? status(routes[0].status) : t("missing")}</Badge></p>
            <p>{t("request")}: {selectedRequest?.pickup_label ?? t("noData")} <Badge>{selectedRequest ? status(selectedRequest.status) : t("missing")}</Badge></p>
            <p>{t("order")}: {selectedOrder?.pickup_label ?? t("noData")} <Badge>{selectedOrder ? status(selectedOrder.status) : t("missing")}</Badge> {number(selectedOrder?.parcels?.length ?? 0)} {t("parcels")}</p>
          </div>
        </Section>

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
            <button onClick={refreshTrips} disabled={!canAct}>{t("refreshTrips")}</button>
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
      </div>
    </main>
  );
}
