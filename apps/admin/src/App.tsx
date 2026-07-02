import { FormEvent, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { API_BASE_URL, api, type BatchResponse, type Comparison, type DashboardResponse, type DriverRoute, type LocationEvent, type MatchRunResponse, type MerchantOrder, type PassengerRequest, type Trip, type User } from "./api";

const tripFlow = ["accepted", "pickup_started", "picked_up", "in_transit", "delivered", "completed"];

type Notice = { type: "success" | "error"; message: string } | null;

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected error";
}

function Badge({ children }: { children: string }) {
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

  async function runAction<T>(label: string, action: () => Promise<T>, success: string) {
    setBusy(label);
    setNotice(null);
    try {
      const result = await action();
      setNotice({ type: "success", message: success });
      return result;
    } catch (error) {
      setNotice({ type: "error", message: getErrorMessage(error) });
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
    const result = await runAction("login", () => api.login(phone, password), "Admin logged in.");
    if (!result) return;
    localStorage.setItem("masari_admin_token", result.token);
    setToken(result.token);
    setAdmin(result.user);
    await refreshOverview(result.token);
  }

  async function loadMe(currentToken = token) {
    const result = await runAction("me", () => api.me(currentToken), "Session loaded.");
    if (result) setAdmin(result.user);
  }

  async function resetDemo() {
    await runAction("reset", () => api.reset(token || undefined, resetKey), "Demo data reset.");
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
    if (!selectedRequest && !selectedOrder) return setNotice({ type: "error", message: "No seeded request or order found. Reset demo data first." });
    const result = await runAction(
      "match",
      () => api.runMatch(token, selectedRequest?.id, selectedOrder?.id),
      "Matching completed."
    );
    if (result) setMatchResult(result);
  }

  async function runBatch() {
    if (!selectedOrder) return setNotice({ type: "error", message: "No merchant order found. Reset demo data first." });
    const result = await runAction("batch", () => api.batchOrder(token, selectedOrder.id), "Parcel batch created.");
    if (result) {
      setBatchResult(result);
      await refreshOverview();
    }
  }

  async function runComparison() {
    const result = await runAction(
      "comparison",
      () => api.runComparison(token, selectedRequest?.id, selectedOrder?.id),
      "Comparison metrics generated."
    );
    if (!result) return;
    const read = await api.getComparison(token, result.comparison.id);
    setComparison(read.comparison);
  }

  async function acceptMatch() {
    if (!matchResult) return setNotice({ type: "error", message: "Run matching before accepting a match." });
    const result = await runAction("accept", () => api.acceptMatch(token, matchResult.match.id), "Match accepted and trip created.");
    if (result) {
      setActiveTrip(result.trip);
      await refreshTrips();
    }
  }

  async function rejectMatch() {
    if (!matchResult) return setNotice({ type: "error", message: "Run matching before rejecting a match." });
    const result = await runAction("reject", () => api.rejectMatch(token, matchResult.match.id), "Match rejected.");
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
    const result = await runAction("status", () => api.updateTripStatus(token, activeTrip.id, status), `Trip moved to ${status}.`);
    if (result) {
      setActiveTrip(result.trip);
      await refreshTrips();
    }
  }

  async function simulateStep() {
    if (!activeTrip) return;
    const result = await runAction("tracking", () => api.simulateStep(token, activeTrip.id), "Simulated location recorded.");
    if (result) {
      setLatestLocation(result.location);
      setLocationTrail((items) => [result.location, ...items].slice(0, 7));
    }
  }

  async function resetSimulation() {
    if (!activeTrip) return;
    await runAction("tracking-reset", () => api.resetSimulation(token, activeTrip.id), "Tracking simulation reset.");
    setLatestLocation(null);
    setLocationTrail([]);
  }

  async function readLatestLocation() {
    if (!activeTrip) return;
    const result = await runAction("latest", () => api.latestLocation(token, activeTrip.id), "Latest location loaded.");
    if (result) setLatestLocation(result.location);
  }

  async function runFullDemoSequence() {
    await runAction("full-demo", async () => {
      const steps: string[] = [];
      const mark = (step: string) => {
        steps.push(step);
        setDemoSteps([...steps]);
      };

      mark("Resetting deterministic judge scenario");
      await api.reset(token || undefined, resetKey);
      mark("Signing back in after reset");
      const session = await api.login(phone, password);
      localStorage.setItem("masari_admin_token", session.token);
      setToken(session.token);
      setAdmin(session.user);
      const currentToken = session.token;
      mark("Loading seeded request and merchant order");
      const overview = await Promise.all([api.requests(currentToken), api.orders(currentToken)]);
      const request = overview[0].requests[0];
      const order = overview[1].orders[0];
      if (!request || !order) throw new Error("Seeded request/order not found after reset.");
      mark("Running route-based matching");
      const match = await api.runMatch(currentToken, request.id, order.id);
      mark("Creating parcel batch");
      const batch = await api.batchOrder(currentToken, order.id);
      mark("Comparing Masari vs nearest-driver baseline");
      const comparisonRun = await api.runComparison(currentToken, request.id, order.id);
      mark("Accepting match and creating trip");
      const accepted = await api.acceptMatch(currentToken, match.match.id);
      let trip = accepted.trip;
      for (const status of ["pickup_started", "picked_up", "in_transit", "delivered", "completed"]) {
        mark(`Advancing trip to ${status}`);
        trip = (await api.updateTripStatus(currentToken, trip.id, status)).trip;
      }
      mark("Recording deterministic tracking step");
      const location = await api.simulateStep(currentToken, trip.id);
      setMatchResult(match);
      setBatchResult(batch);
      setComparison(comparisonRun.comparison);
      setActiveTrip(trip);
      setLatestLocation(location.location);
      setLocationTrail([location.location]);
      await refreshOverview(currentToken);
      mark("Demo sequence complete");
    }, "Full demo sequence completed.");
  }

  useEffect(() => {
    if (!token) return;
    void loadMe(token).then(() => refreshOverview(token));
  }, [token]);

  if (!token) {
    return (
      <main className="login-shell">
        <form className="login-card" onSubmit={login}>
          <p className="eyebrow">Masari Judge Console</p>
          <h1>Route-sharing logistics, in one demo flow.</h1>
          <p>Connect to `{API_BASE_URL}` and sign in with the seeded admin account.</p>
          <p className="credential-hint">Demo admin: +970590000005 / demo-admin-123</p>
          <label>Admin phone<input value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
          <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          <button disabled={busy === "login"}>{busy === "login" ? "Signing in..." : "Sign in"}</button>
          {notice && <div className={`notice ${notice.type}`}>{notice.message}</div>}
        </form>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Masari Demo Console</p>
          <h1>Hebron / PPU / Bab Al-Zawiya to Bethlehem</h1>
          <p>Run the seeded route-sharing story end to end: reset, match, batch, compare, accept, progress, and track.</p>
        </div>
        <div className="session-card">
          <strong>{admin?.name ?? "Admin"}</strong>
          <span>{admin?.phone}</span>
          <button onClick={() => { localStorage.removeItem("masari_admin_token"); setToken(""); }} disabled={Boolean(busy)}>Sign out</button>
        </div>
      </header>

      {notice && <div className={`notice ${notice.type}`}>{notice.message}</div>}

      <div className="grid">
        <Section title="Demo Control" action={<button onClick={runFullDemoSequence} disabled={!canAct}>Run Full Demo Sequence</button>}>
          <div className="control-row">
            <label>Reset key<input value={resetKey} onChange={(event) => setResetKey(event.target.value)} /></label>
            <button onClick={resetDemo} disabled={!canAct}>{busy === "reset" ? "Resetting..." : "Reset Demo"}</button>
            <button onClick={() => refreshOverview()} disabled={!canAct}>Refresh Data</button>
          </div>
          <p className="muted">Reset recreates the same judge scenario: seeded users, one active corridor route, one passenger request, one merchant order, and five parcels.</p>
          {demoSteps.length > 0 && <ol className="demo-steps">{demoSteps.map((step) => <li key={step}>{step}</li>)}</ol>}
        </Section>

        <Section title="System Overview">
          <div className="metric-grid">
            <div><strong>{dashboard?.counts.users ?? "-"}</strong><span>Users</span></div>
            <div><strong>{dashboard?.counts.routes ?? "-"}</strong><span>Routes</span></div>
            <div><strong>{dashboard?.counts.passenger_requests ?? "-"}</strong><span>Requests</span></div>
            <div><strong>{dashboard?.counts.merchant_orders ?? "-"}</strong><span>Orders</span></div>
            <div><strong>{dashboard?.counts.parcels ?? "-"}</strong><span>Parcels</span></div>
            <div><strong>{trips.length}</strong><span>Trips</span></div>
          </div>
          <div className="mini-list">
            <h3>Seeded data</h3>
            <p>Route: {routes[0]?.origin_label ?? "-"} to {routes[0]?.destination_label ?? "-"} <Badge>{routes[0]?.status ?? "missing"}</Badge></p>
            <p>Request: {selectedRequest?.pickup_label ?? "-"} <Badge>{selectedRequest?.status ?? "missing"}</Badge></p>
            <p>Order: {selectedOrder?.pickup_label ?? "-"} <Badge>{selectedOrder?.status ?? "missing"}</Badge> {selectedOrder?.parcels?.length ?? 0} parcels</p>
          </div>
        </Section>

        <Section title="Matching" action={<button onClick={runMatch} disabled={!canAct}>Run Match</button>}>
          {matchResult ? (
            <div className="result-card">
              <p><strong>Match:</strong> {matchResult.match.id} <Badge>{matchResult.match.status}</Badge></p>
              <p><strong>Selected driver:</strong> {matchResult.match.driver_route?.driver_id ?? "driver route"} on route {matchResult.match.driver_route_id}</p>
              <p><strong>Score:</strong> {matchResult.scoringBreakdown.finalScore}</p>
              <p>{matchResult.match.explanation}</p>
              <div className="breakdown">{Object.entries(matchResult.scoringBreakdown).map(([key, value]) => <span key={key}>{key}: {value}</span>)}</div>
            </div>
          ) : <p className="muted">Run matching to show route scoring and selection.</p>}
        </Section>

        <Section title="Parcel Batch" action={<button onClick={runBatch} disabled={!canAct}>Create Batch</button>}>
          {batchResult ? (
            <div className="result-card">
              <p><strong>Batch:</strong> {batchResult.batch.id} <Badge>{batchResult.batch.status}</Badge></p>
              <p><strong>Parcels:</strong> {batchResult.batch.merchant_order?.parcels?.length ?? selectedOrder?.parcels?.length ?? 0}</p>
              <p><strong>Estimated distance saved:</strong> {batchResult.batch.estimated_distance_saved} km</p>
              <p>{batchResult.batch.explanation}</p>
            </div>
          ) : <p className="muted">Create a batch from the seeded merchant order.</p>}
        </Section>

        <Section title="Comparison" action={<button onClick={runComparison} disabled={!canAct}>Run Comparison</button>}>
          {comparison ? (
            <table>
              <thead><tr><th>Metric</th><th>Masari</th><th>Nearest-driver</th></tr></thead>
              <tbody>
                <tr><td>Trips</td><td>{comparison.masari_trips}</td><td>{comparison.nearest_driver_trips}</td></tr>
                <tr><td>Estimated distance</td><td>{comparison.masari_estimated_distance}</td><td>{comparison.nearest_estimated_distance}</td></tr>
                <tr><td>Estimated cost</td><td>{comparison.masari_estimated_cost}</td><td>{comparison.nearest_estimated_cost}</td></tr>
                <tr><td>Parcel batching benefit</td><td colSpan={2}>{comparison.parcel_batching_benefit}</td></tr>
                <tr><td>Driver utilization</td><td>{comparison.driver_utilization}</td><td>baseline separate trips</td></tr>
                <tr><td>Winner</td><td colSpan={2}><Badge>{comparison.winner}</Badge></td></tr>
              </tbody>
            </table>
          ) : <p className="muted">Run comparison to show Masari vs nearest-driver metrics.</p>}
        </Section>

        <Section title="Trip Flow" action={<button onClick={acceptMatch} disabled={!canAct || !matchResult}>Accept Match</button>}>
          <div className="control-row">
            <button onClick={rejectMatch} disabled={!canAct || !matchResult}>Reject Match</button>
            <button onClick={refreshTrips} disabled={!canAct}>Refresh Trips</button>
          </div>
          {activeTrip ? (
            <div className="result-card">
              <p><strong>Trip:</strong> {activeTrip.id} <Badge>{activeTrip.status}</Badge></p>
              <div className="status-rail">{tripFlow.map((status) => <span className={tripFlow.indexOf(status) <= tripFlow.indexOf(activeTrip.status) ? "done" : ""} key={status}>{status}</span>)}</div>
              {nextTripStatus ? <button onClick={() => moveTrip(nextTripStatus)} disabled={!canAct}>Move to {nextTripStatus}</button> : <p className="muted">Trip lifecycle complete.</p>}
            </div>
          ) : <p className="muted">Accept a match to create the active trip.</p>}
        </Section>

        <Section title="Tracking Simulation">
          <div className="control-row">
            <button onClick={simulateStep} disabled={!canAct || !activeTrip}>Simulate Step</button>
            <button onClick={readLatestLocation} disabled={!canAct || !activeTrip}>Read Latest</button>
            <button onClick={resetSimulation} disabled={!canAct || !activeTrip}>Reset Simulation</button>
          </div>
          {latestLocation ? (
            <div className="result-card location-card">
              <p><strong>Lat/Lng:</strong> {latestLocation.lat}, {latestLocation.lng}</p>
              <p><strong>Sequence:</strong> {latestLocation.sequence}</p>
              <p><strong>Source:</strong> {latestLocation.source}</p>
              <p><strong>Recorded:</strong> {latestLocation.recorded_at}</p>
            </div>
          ) : <p className="muted">Simulate a step to record deterministic route progress.</p>}
          <div className="trail">{locationTrail.map((location) => <span key={location.id}>#{location.sequence} {location.lat},{location.lng}</span>)}</div>
        </Section>
      </div>
    </main>
  );
}
