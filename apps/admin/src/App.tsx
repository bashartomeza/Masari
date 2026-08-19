import { FormEvent, useEffect, useMemo, useState } from "react";
import { createApiClient, createDemoApiClient, type AccountStatus, type BatchResponse, type Comparison, type DashboardResponse, type DriverProfile, type DriverRoute, type LocationEvent, type MatchRunResponse, type MerchantOrder, type PassengerRequest, type Trip, type User } from "./api";
import { demoUiEnabled, getAdminBuildConfig, routeManagementUiEnabled, type AdminBuildConfig } from "./config";
import { useLocale } from "./i18n/LocaleContext";
import type { TranslationKey } from "./i18n/translations";
import { ADMIN_TOKEN_KEY, clearAdminSession, createAdminSessionExpiryHandler, isAdminSessionEndError, type TokenStorage } from "./session";
import { RouteManagement } from "./features/routes/RouteManagement";
import { OverviewDashboard, type OverviewData } from "./features/overview/OverviewDashboard";
import { RequestsBoard } from "./features/requests/RequestsBoard";
import { MatchingWorkspace } from "./features/matching/MatchingWorkspace";
import { BatchingWorkspace } from "./features/batching/BatchingWorkspace";
import { TripsTracking } from "./features/trips/TripsTracking";
import { ComparisonPanel } from "./features/comparison/ComparisonPanel";
import { SettingsPanel } from "./features/settings/SettingsPanel";
import { DriverDirectory } from "./features/verification/DriverDirectory";
import { UsersDirectory } from "./features/users/UsersDirectory";
import { DemoControl } from "./features/demo/DemoControl";
import { ModuleUnavailable } from "./features/placeholder/ModuleUnavailable";
import { ProfilePanel } from "./features/profile/ProfilePanel";
import {
  hashForModule,
  isModuleAvailable,
  moduleFromHash,
  resolveActiveModule,
  visibleNavItems,
  type AdminRouteId
} from "./navigation";
import { AppShell, Button, Icon, Notice, SideNav, TopBar } from "./ui";

export { ADMIN_TOKEN_KEY, clearAdminSession } from "./session";

const tripFlow = ["accepted", "pickup_started", "picked_up", "in_transit", "delivered", "completed"];

type NoticeState = { type: "success" | "error"; message: string } | null;
type DemoStep = { key: TranslationKey; statusValue?: string };

function getErrorMessage(error: unknown, t: (key: TranslationKey) => string) {
  if (!(error instanceof Error)) return t("unexpectedError");
  if (error.message === "Failed to fetch") return t("failedToFetch");
  if (error.message === "forbidden" || error.message === "unauthorized") return t("unauthorized");
  return error.message || t("unexpectedError");
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
  const { direction, locale, toggleLocale, t, status } = useLocale();
  const demoEnabled = demoUiEnabled(config, __MASARI_DEMO_BUILD__);
  const routeManagementEnabled = routeManagementUiEnabled(config);
  const [token, setToken] = useState(() => {
    legacyStore.removeItem(ADMIN_TOKEN_KEY);
    return sessionStore.getItem(ADMIN_TOKEN_KEY) ?? "";
  });
  const [admin, setAdmin] = useState<User | null>(null);
  const [phone, setPhone] = useState(demoEnabled ? config.demo?.adminPhone ?? "" : "");
  const [password, setPassword] = useState(demoEnabled ? config.demo?.adminPassword ?? "" : "");
  const [resetKey, setResetKey] = useState(demoEnabled ? config.demo?.resetKey ?? "" : "");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState>(null);

  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
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
  const [activeModule, setActiveModule] = useState<AdminRouteId>(() => moduleFromHash(window.location.hash));
  const [search, setSearch] = useState("");

  const flags = { demoEnabled, routeManagementEnabled };
  const navItems = visibleNavItems(flags);
  const currentModule = resolveActiveModule(activeModule, flags);

  function clearAuthenticatedData() {
    setAdmin(null);
    setDashboard(null);
    setDrivers([]);
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

  async function runAction<T>(label: string, action: () => Promise<T>, success?: string) {
    setBusy(label);
    setNotice(null);
    try {
      const result = await action();
      if (success) setNotice({ type: "success", message: success });
      return result;
    } catch (error) {
      if (token && isAdminSessionEndError(error)) return null;
      setNotice({ type: "error", message: getErrorMessage(error, t) });
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function refreshOverview(currentToken = token) {
    if (!currentToken) return;
    const [dashboardData, driversData, routesData, requestsData, ordersData, tripsData] = await Promise.all([
      api.dashboard(currentToken),
      api.drivers(currentToken),
      api.routes(currentToken),
      api.requests(currentToken),
      api.orders(currentToken),
      api.trips(currentToken)
    ]);
    setDashboard(dashboardData);
    setDrivers(driversData.drivers);
    setRoutes(routesData.routes);
    setRequests(requestsData.requests);
    setOrders(ordersData.orders);
    setTrips(tripsData.trips);
    setActiveTrip((current) => current ?? tripsData.trips[0] ?? null);
  }

  /**
   * Suspend, disable or reactivate an account.
   *
   * The full overview is reloaded afterwards rather than the row being patched
   * locally: the API revokes the target's sessions and may reject the change
   * (the last active admin cannot be suspended), so the console shows what the
   * server actually decided.
   */
  async function updateUserStatus(userId: string, status: AccountStatus, reason?: string) {
    const result = await runAction(
      "user-status",
      () => api.updateUserStatus(token, userId, status, reason),
      t("accountStatusUpdated")
    );
    if (result) await refreshOverview();
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

  useEffect(() => {
    const syncModuleFromUrl = () => setActiveModule(moduleFromHash(window.location.hash));
    window.addEventListener("hashchange", syncModuleFromUrl);
    if (!window.location.hash) window.history.replaceState(null, "", hashForModule(activeModule));
    return () => window.removeEventListener("hashchange", syncModuleFromUrl);
  }, []);

  function navigateToModule(id: AdminRouteId) {
    setActiveModule(id);
    setNotice(null);
    const nextHash = hashForModule(id);
    if (window.location.hash !== nextHash) window.location.hash = nextHash.slice(1);
  }

  if (!token) {
    return (
      <main className="login-shell" dir={direction} lang={locale}>
        <form className="login-card" onSubmit={login}>
          <div className="login-card__actions">
            <Button variant="ghost" size="sm" icon="language" onClick={() => { setNotice(null); toggleLocale(); }}>
              {t("languageSwitch")}
            </Button>
          </div>
          <div className="login-card__brand">
            <span className="sidenav__logo">
              <Icon name="local_shipping" size={22} />
            </span>
            <div>
              <p className="sidenav__brand-name">{t("brandName")}</p>
              <p className="sidenav__brand-subtitle">{t("appName")}</p>
            </div>
          </div>
          <h1>{t("loginHeading")}</h1>
          <p className="login-card__description">{t("loginDescription", { apiBaseUrl: config.apiBaseUrl })}</p>
          {demoEnabled && <p className="login-card__hint technical">{t("demoCredentials")}</p>}
          <label className="field">{t("adminPhone")}<input className="technical" value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
          <label className="field">{t("password")}<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          <button className="btn btn--primary" disabled={busy === "login"}>{busy === "login" ? t("signingIn") : t("signIn")}</button>
          {notice && <Notice kind={notice.type}>{notice.message}</Notice>}
        </form>
      </main>
    );
  }

  const overviewData: OverviewData = { dashboard, routes, requests, orders, trips };
  const activeNavItem = navItems.find((item) => item.id === currentModule);
  const moduleTitle = currentModule === "profile"
    ? t("navProfile")
    : activeNavItem
      ? t(activeNavItem.labelKey)
      : t("navOverview");

  function renderModule() {
    switch (currentModule) {
      case "overview":
        return (
          <>
            {demoEnabled && demoApi && (
              <DemoControl
                resetKey={resetKey}
                onResetKeyChange={setResetKey}
                steps={demoSteps.map((step) => t(step.key, step.statusValue ? { status: status(step.statusValue) } : {}))}
                canAct={canAct}
                busy={busy}
                onReset={() => void resetDemo()}
                onRefresh={() => void refreshData()}
                onRunFullDemo={() => void runFullDemoSequence()}
              />
            )}
            <OverviewDashboard
              data={overviewData}
              search={search}
              busy={Boolean(busy)}
              onRefresh={() => void refreshData()}
            />
          </>
        );

      case "deliveries":
        return <RequestsBoard requests={requests} orders={orders} search={search} />;

      case "matchingBatching":
        return isModuleAvailable("matchingBatching", flags) ? (
          <>
            <MatchingWorkspace
              request={selectedRequest}
              order={selectedOrder}
              matchResult={matchResult}
              canAct={canAct}
              busy={busy === "match"}
              onRunMatch={() => void runMatch()}
              onAccept={() => void acceptMatch()}
              onReject={() => void rejectMatch()}
              scoreLabel={(key) => t(scoringLabels[key] ?? "score")}
            />
            <BatchingWorkspace
              order={selectedOrder}
              batchResult={batchResult}
              canAct={canAct}
              onCreateBatch={() => void runBatch()}
            />
            <ComparisonPanel comparison={comparison} canAct={canAct} onRunComparison={() => void runComparison()} />
          </>
        ) : (
          <ModuleUnavailable icon="alt_route" reason="demo-only" />
        );

      case "trips":
        return (
          <TripsTracking
            trips={trips}
            activeTrip={activeTrip}
            tripFlow={tripFlow}
            nextTripStatus={nextTripStatus}
            latestLocation={latestLocation}
            locationTrail={locationTrail}
            search={search}
            canAct={canAct}
            demoEnabled={demoEnabled && Boolean(demoApi)}
            onSelectTrip={setActiveTrip}
            onRefreshTrips={() => void refreshTripData()}
            onMoveTrip={(next) => void moveTrip(next)}
            onSimulateStep={() => void simulateStep()}
            onReadLatest={() => void readLatestLocation()}
            onResetSimulation={() => void resetSimulation()}
          />
        );

      case "routes":
        return routeManagementEnabled ? (
          <RouteManagement api={api} token={token} locale={locale} />
        ) : (
          <ModuleUnavailable icon="edit_road" reason="no-api" />
        );

      case "settings":
        return <SettingsPanel config={config} admin={admin} />;

      case "profile":
        return <ProfilePanel admin={admin} />;

      case "users":
        return <UsersDirectory drivers={drivers} requests={requests} orders={orders} search={search} />;

      case "drivers":
        return (
          <DriverDirectory
            drivers={drivers}
            search={search}
            busy={Boolean(busy)}
            onUpdateStatus={(userId, status, reason) => void updateUserStatus(userId, status, reason)}
          />
        );

      case "incidentsSafety":
        return <ModuleUnavailable icon="emergency" reason="no-api" />;

      case "reports":
        return <ModuleUnavailable icon="assessment" reason="no-api" />;

      default:
        return null;
    }
  }

  const moduleDescription: Partial<Record<AdminRouteId, string>> = {
    overview: t("overviewDescription"),
    deliveries: t("requestsDescription"),
    matchingBatching: t("matchingDescription"),
    trips: t("tripsDescription"),
    users: t("usersDescription"),
    drivers: t("verificationDescription"),
    settings: t("settingsDescription"),
    profile: t("profileDescription")
  };

  return (
    <div dir={direction} lang={locale}>
      <AppShell
        sidenav={
          <SideNav
            items={navItems}
            active={currentModule === "profile" ? null : currentModule}
            onSelect={navigateToModule}
            labels={{
              brand: t("brandName"),
              subtitle: t("adminConsoleSubtitle"),
              navigation: t("navigationLabel"),
              label: (item) => t(item.labelKey),
              groupLabel: (labelKey) => t(labelKey)
            }}
            footer={
              <>
                <Button
                  variant="ghost"
                  icon="account_circle"
                  className={currentModule === "profile" ? "is-active" : undefined}
                  aria-current={currentModule === "profile" ? "page" : undefined}
                  onClick={() => navigateToModule("profile")}
                >
                  {t("navProfile")}
                </Button>
                <Button variant="ghost" icon="language" onClick={() => { setNotice(null); toggleLocale(); }}>
                  {t("languageSwitch")}
                </Button>
                <Button
                  variant="ghost"
                  icon="logout"
                  className="btn--signout"
                  disabled={Boolean(busy)}
                  onClick={() => { clearAdminSession(sessionStore, legacyStore); sessionExpiry.reset(); clearAuthenticatedData(); setNotice(null); setToken(""); }}
                >
                  {t("logout")}
                </Button>
              </>
            }
          />
        }
        topbar={
          <TopBar
            title={moduleTitle}
            search={search}
            onSearch={setSearch}
            searchPlaceholder={t("searchPlaceholder")}
            searchLabel={t("searchLabel")}
            helpLabel={t("helpLabel")}
            notificationsLabel={t("notificationsLabel")}
            notificationsTitle={t("notificationsTitle")}
            notificationsDescription={t("notificationsUnavailableDescription")}
            closeNotificationsLabel={t("closeNotifications")}
            user={{ name: admin?.name ?? "Admin", detail: admin?.phone ?? "" }}
          />
        }
      >
        {/* The module title already sits in the top bar, so the canvas shows only its description. */}
        {moduleDescription[currentModule] && <p className="muted">{moduleDescription[currentModule]}</p>}
        {notice && <Notice kind={notice.type}>{notice.message}</Notice>}
        {renderModule()}
      </AppShell>
    </div>
  );
}
