import { FormEvent, useEffect, useMemo, useState } from "react";
import type {
  CanonicalStop,
  CanonicalStopDraft,
  RouteIdentityDraft,
  RouteStopDraft,
  RouteVersionDraft,
  ServiceRoute,
  ServiceRouteVersion,
  createApiClient
} from "../../api";

type Api = ReturnType<typeof createApiClient>;
type Locale = "ar" | "en";
type Permission = keyof Pick<
  RouteStopDraft,
  "passenger_pickup_allowed" | "passenger_dropoff_allowed" | "parcel_pickup_allowed" | "parcel_dropoff_allowed"
>;

export type RouteViewState = "loading" | "ready" | "empty" | "error";
export type RouteLifecycleAction = "clone" | "publish" | "pause" | "resume" | "retire";
export const ADMIN_ROUTE_RESPONSIVE_BREAKPOINT = 880;

export function routeCatalogView(input: { loading: boolean; error: boolean; count: number }): RouteViewState {
  if (input.loading) return "loading";
  if (input.error) return "error";
  return input.count === 0 ? "empty" : "ready";
}

export function reorderControlLabel(label: string, index: number) {
  return `${label} ${index + 1}`;
}

export function moveRouteStop(stops: RouteStopDraft[], index: number, direction: -1 | 1) {
  const target = index + direction;
  if (target < 0 || target >= stops.length) return stops;
  const reordered = [...stops];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
  return reordered.map((stop, current) => ({ ...stop, sequence: current + 1 }));
}

export function toggleRouteStopPermission(stops: RouteStopDraft[], index: number, permission: Permission) {
  return stops.map((stop, current) =>
    current === index ? { ...stop, [permission]: !stop[permission] } : stop
  );
}

export function lifecycleActions(version: ServiceRouteVersion | null) {
  if (!version) return [] as RouteLifecycleAction[];
  if (version.status === "published") return ["clone", "pause", "retire"] as RouteLifecycleAction[];
  if (version.status === "paused") return ["clone", "resume", "retire"] as RouteLifecycleAction[];
  if (version.status === "draft") return ["publish", "retire"] as RouteLifecycleAction[];
  return [] as RouteLifecycleAction[];
}

const copy = {
  ar: {
    title: "إدارة المسارات",
    subtitle: "كتالوج المسارات المعتمد وإصداراته الثابتة — من دون خرائط في هذه المرحلة.",
    routes: "المسارات",
    stops: "المحطات",
    createRoute: "إنشاء مسار",
    routeKey: "مفتاح المسار",
    groupKey: "مجموعة الاتجاهات",
    region: "منطقة الخدمة",
    direction: "الاتجاه",
    outbound: "ذهاب",
    inbound: "عودة",
    loop: "حلقي",
    create: "إنشاء",
    search: "بحث بالاسم أو المفتاح",
    loading: "جارٍ تحميل كتالوج المسارات…",
    empty: "لا توجد مسارات بعد. أنشئ أول هوية مسار معتمدة.",
    error: "تعذّر تحميل كتالوج المسارات.",
    retry: "إعادة المحاولة",
    versions: "الإصدارات",
    newVersion: "إصدار مسودة جديد",
    nameAr: "الاسم بالعربية",
    nameEn: "الاسم بالإنجليزية",
    descriptionAr: "الوصف بالعربية",
    descriptionEn: "الوصف بالإنجليزية",
    activeFrom: "فعال من",
    activeUntil: "فعال حتى",
    saveDraft: "حفظ المسودة",
    createDraft: "إنشاء المسودة",
    orderedStops: "ترتيب المحطات والصلاحيات",
    addStop: "إضافة محطة موجودة",
    saveOrder: "حفظ الترتيب",
    moveUp: "تحريك لأعلى",
    moveDown: "تحريك لأسفل",
    remove: "إزالة",
    passengerPickup: "صعود ركاب",
    passengerDropoff: "نزول ركاب",
    parcelPickup: "استلام طرد",
    parcelDropoff: "تسليم طرد",
    publish: "نشر",
    clone: "نسخ لمسودة جديدة",
    pause: "إيقاف مؤقت",
    resume: "استئناف",
    retire: "إحالة للتقاعد",
    retireRoute: "إحالة المسار للتقاعد",
    geometryReady: "الهندسة جاهزة",
    geometryPending: "الهندسة معلّقة",
    revisionConflict: "عُدّلت المسودة من جلسة أخرى. أعد تحميلها قبل الحفظ.",
    saved: "تم الحفظ بنجاح.",
    confirm: "هل تريد تنفيذ هذا الإجراء؟ سيُسجل في سجل التدقيق.",
    stopKey: "مفتاح المحطة",
    latitude: "خط العرض",
    longitude: "خط الطول",
    createStop: "إنشاء محطة",
    stopHelp: "أدخل الإحداثيات الرقمية المعتمدة. لا يوجد بحث أو معاينة خريطة في M7B.",
    status: "الحالة",
    current: "الحالي",
    chooseRoute: "اختر مساراً لعرض إصداراته.",
    reason: "سبب الإجراء",
    active: "نشط",
    retired: "متقاعد",
    draft: "مسودة",
    published: "منشور",
    paused: "متوقف مؤقتاً",
    noStops: "أضف محطتين على الأقل قبل النشر.",
    stopRetired: "تمت إحالة المحطة للتقاعد.",
    pagination: "صفحة"
  },
  en: {
    title: "Route management",
    subtitle: "The approved route catalog and immutable versions — maps are intentionally absent in this milestone.",
    routes: "Routes",
    stops: "Stops",
    createRoute: "Create route",
    routeKey: "Route key",
    groupKey: "Direction group",
    region: "Service region",
    direction: "Direction",
    outbound: "Outbound",
    inbound: "Inbound",
    loop: "Loop",
    create: "Create",
    search: "Search by name or key",
    loading: "Loading the route catalog…",
    empty: "No routes yet. Create the first canonical route identity.",
    error: "The route catalog could not be loaded.",
    retry: "Retry",
    versions: "Versions",
    newVersion: "New draft version",
    nameAr: "Arabic name",
    nameEn: "English name",
    descriptionAr: "Arabic description",
    descriptionEn: "English description",
    activeFrom: "Active from",
    activeUntil: "Active until",
    saveDraft: "Save draft",
    createDraft: "Create draft",
    orderedStops: "Stop order and permissions",
    addStop: "Add existing stop",
    saveOrder: "Save order",
    moveUp: "Move up",
    moveDown: "Move down",
    remove: "Remove",
    passengerPickup: "Passenger pickup",
    passengerDropoff: "Passenger drop-off",
    parcelPickup: "Parcel pickup",
    parcelDropoff: "Parcel drop-off",
    publish: "Publish",
    clone: "Clone to new draft",
    pause: "Pause",
    resume: "Resume",
    retire: "Retire",
    retireRoute: "Retire route",
    geometryReady: "Geometry ready",
    geometryPending: "Geometry pending",
    revisionConflict: "Another session changed this draft. Reload it before saving.",
    saved: "Saved successfully.",
    confirm: "Continue with this action? It will be recorded in the audit log.",
    stopKey: "Stop key",
    latitude: "Latitude",
    longitude: "Longitude",
    createStop: "Create stop",
    stopHelp: "Enter approved numeric coordinates. M7B has no map lookup or preview.",
    status: "Status",
    current: "Current",
    chooseRoute: "Choose a route to inspect its versions.",
    reason: "Action reason",
    active: "Active",
    retired: "Retired",
    draft: "Draft",
    published: "Published",
    paused: "Paused",
    noStops: "Add at least two stops before publication.",
    stopRetired: "Stop retired.",
    pagination: "Page"
  }
} as const;

export function routeUiText(locale: Locale) {
  return copy[locale];
}

function key(prefix: string) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}

function emptyRoute(): RouteIdentityDraft {
  return { route_key: "", route_group_key: "", service_region_key: "", direction: "outbound" };
}

function emptyVersion(): RouteVersionDraft {
  return { name_ar: "", name_en: "", description_ar: "", description_en: "", active_from: null, active_until: null };
}

function emptyStop(): CanonicalStopDraft {
  return { stop_key: "", service_region_key: "", name_ar: "", name_en: "", latitude: 31.5, longitude: 35.1 };
}

function toApiDate(value: string | null | undefined) {
  return value ? new Date(value).toISOString() : null;
}

function toInputDate(value: string | null | undefined) {
  return value ? value.slice(0, 16) : "";
}

function draftFromVersion(version: ServiceRouteVersion): RouteVersionDraft {
  return {
    name_ar: version.name_ar,
    name_en: version.name_en,
    description_ar: version.description_ar ?? "",
    description_en: version.description_en ?? "",
    active_from: toInputDate(version.active_from),
    active_until: toInputDate(version.active_until)
  };
}

function membershipsFromVersion(version: ServiceRouteVersion): RouteStopDraft[] {
  return version.stops.map((membership, index) => ({
    stop_id: membership.stop.id,
    sequence: index + 1,
    passenger_pickup_allowed: membership.passenger_pickup_allowed,
    passenger_dropoff_allowed: membership.passenger_dropoff_allowed,
    parcel_pickup_allowed: membership.parcel_pickup_allowed,
    parcel_dropoff_allowed: membership.parcel_dropoff_allowed,
    estimated_offset_seconds: membership.estimated_offset_seconds,
    dwell_seconds: membership.dwell_seconds
  }));
}

export function RouteManagement({ api, token, locale }: { api: Api; token: string; locale: Locale }) {
  const text = routeUiText(locale);
  const [view, setView] = useState<RouteViewState>("loading");
  const [routes, setRoutes] = useState<ServiceRoute[]>([]);
  const [stops, setStops] = useState<CanonicalStop[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<ServiceRoute | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<ServiceRouteVersion | null>(null);
  const [routeDraft, setRouteDraft] = useState<RouteIdentityDraft>(emptyRoute);
  const [versionDraft, setVersionDraft] = useState<RouteVersionDraft>(emptyVersion);
  const [stopDraft, setStopDraft] = useState<CanonicalStopDraft>(emptyStop);
  const [memberships, setMemberships] = useState<RouteStopDraft[]>([]);
  const [stopToAdd, setStopToAdd] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const activeStops = useMemo(() => stops.filter((stop) => stop.status === "active"), [stops]);
  const actions = lifecycleActions(selectedVersion);

  function showError(error: unknown) {
    const value = error instanceof Error ? error.message : "unexpected_error";
    setMessage({ kind: "error", text: value === "draft_revision_conflict" ? text.revisionConflict : value });
  }

  async function loadCatalog(nextPage = page) {
    setView("loading");
    setMessage(null);
    try {
      const query = new URLSearchParams({ page: String(nextPage), limit: "25" });
      if (search.trim()) query.set("search", search.trim());
      if (statusFilter) query.set("status", statusFilter);
      const [routePage, stopPage] = await Promise.all([
        api.serviceRoutes(token, `?${query}`),
        api.canonicalStops(token, "?limit=50")
      ]);
      setRoutes(routePage.routes);
      setStops(stopPage.stops);
      setTotal(routePage.total);
      setPage(nextPage);
      setView(routePage.routes.length ? "ready" : "empty");
    } catch (error) {
      setView("error");
      showError(error);
    }
  }

  useEffect(() => {
    void loadCatalog(1);
  }, []);

  async function loadRoute(routeId: string) {
    setBusy("route-detail");
    setMessage(null);
    try {
      const response = await api.serviceRoute(token, routeId);
      setSelectedRoute(response.route);
      const version = response.route.versions?.[0] ?? response.route.current_version;
      selectVersion(version ?? null);
    } catch (error) {
      showError(error);
    } finally {
      setBusy("");
    }
  }

  function selectVersion(version: ServiceRouteVersion | null) {
    setSelectedVersion(version);
    setVersionDraft(version ? draftFromVersion(version) : emptyVersion());
    setMemberships(version ? membershipsFromVersion(version) : []);
  }

  async function submitRoute(event: FormEvent) {
    event.preventDefault();
    setBusy("create-route");
    setMessage(null);
    try {
      const response = await api.createServiceRoute(token, routeDraft, key("route"));
      setRouteDraft(emptyRoute());
      await loadCatalog(1);
      await loadRoute(response.route.id);
      setMessage({ kind: "success", text: text.saved });
    } catch (error) {
      showError(error);
    } finally {
      setBusy("");
    }
  }

  async function submitStop(event: FormEvent) {
    event.preventDefault();
    setBusy("create-stop");
    setMessage(null);
    try {
      await api.createCanonicalStop(token, stopDraft, key("stop"));
      const page = await api.canonicalStops(token, "?limit=50");
      setStops(page.stops);
      setStopDraft(emptyStop());
      setMessage({ kind: "success", text: text.saved });
    } catch (error) {
      showError(error);
    } finally {
      setBusy("");
    }
  }

  async function submitVersion(event: FormEvent) {
    event.preventDefault();
    if (!selectedRoute) return;
    setBusy("save-version");
    setMessage(null);
    try {
      const payload = { ...versionDraft, active_from: toApiDate(versionDraft.active_from), active_until: toApiDate(versionDraft.active_until) };
      const response = selectedVersion?.status === "draft"
        ? await api.updateRouteVersion(token, selectedVersion.id, { ...payload, expected_revision: selectedVersion.draft_revision })
        : await api.createRouteVersion(token, selectedRoute.id, payload, key("version"));
      await loadRoute(selectedRoute.id);
      selectVersion(response.version);
      setMessage({ kind: "success", text: text.saved });
    } catch (error) {
      showError(error);
    } finally {
      setBusy("");
    }
  }

  function addExistingStop() {
    if (!stopToAdd || memberships.some((membership) => membership.stop_id === stopToAdd)) return;
    setMemberships((current) => [
      ...current,
      {
        stop_id: stopToAdd,
        sequence: current.length + 1,
        passenger_pickup_allowed: current.length === 0,
        passenger_dropoff_allowed: false,
        parcel_pickup_allowed: current.length === 0,
        parcel_dropoff_allowed: false
      }
    ]);
    setStopToAdd("");
  }

  async function saveStops() {
    if (!selectedVersion || selectedVersion.status !== "draft") return;
    setBusy("save-stops");
    setMessage(null);
    try {
      const response = await api.replaceRouteStops(token, selectedVersion.id, {
        expected_revision: selectedVersion.draft_revision,
        stops: memberships
      });
      selectVersion(response.version);
      setMessage({ kind: "success", text: text.saved });
    } catch (error) {
      showError(error);
    } finally {
      setBusy("");
    }
  }

  async function cloneVersion() {
    if (!selectedRoute || !selectedVersion) return;
    setBusy("clone");
    try {
      const response = await api.createRouteVersion(
        token,
        selectedRoute.id,
        { clone_from_version_id: selectedVersion.id },
        key("clone")
      );
      await loadRoute(selectedRoute.id);
      selectVersion(response.version);
      setMessage({ kind: "success", text: text.saved });
    } catch (error) {
      showError(error);
    } finally {
      setBusy("");
    }
  }

  async function versionAction(action: "publish" | "pause" | "resume" | "retire") {
    if (!selectedRoute || !selectedVersion || !window.confirm(text.confirm)) return;
    setBusy(action);
    setMessage(null);
    try {
      const response = action === "publish"
        ? await api.publishRouteVersion(
            token,
            selectedVersion.id,
            { expected_revision: selectedVersion.draft_revision, expected_current_version_id: selectedRoute.current_version_id },
            key("publish")
          )
        : await api.routeVersionAction(
            token,
            selectedVersion.id,
            action,
            action === "resume" ? undefined : `${action}_by_admin`,
            key(action)
          );
      await loadRoute(selectedRoute.id);
      selectVersion(response.version);
      setMessage({ kind: "success", text: text.saved });
    } catch (error) {
      showError(error);
    } finally {
      setBusy("");
    }
  }

  async function retireRoute() {
    if (!selectedRoute || !window.confirm(text.confirm)) return;
    setBusy("retire-route");
    try {
      await api.retireServiceRoute(token, selectedRoute.id, "retired_by_admin", key("retire-route"));
      setSelectedRoute(null);
      selectVersion(null);
      await loadCatalog(page);
    } catch (error) {
      showError(error);
    } finally {
      setBusy("");
    }
  }

  async function retireStop(stop: CanonicalStop) {
    if (!window.confirm(text.confirm)) return;
    setBusy(`retire-stop-${stop.id}`);
    try {
      await api.retireCanonicalStop(token, stop.id, "retired_by_admin", key("retire-stop"));
      const page = await api.canonicalStops(token, "?limit=50");
      setStops(page.stops);
      setMessage({ kind: "success", text: text.stopRetired });
    } catch (error) {
      showError(error);
    } finally {
      setBusy("");
    }
  }

  const statusText = (value: string) => text[value as keyof typeof text] ?? value;

  return (
    <section className="route-workspace" aria-labelledby="route-management-title">
      <header className="route-workspace__header">
        <div>
          <p className="eyebrow">M7B</p>
          <h2 id="route-management-title">{text.title}</h2>
          <p>{text.subtitle}</p>
        </div>
        <span className="route-chip route-chip--safe">{text.geometryPending}</span>
      </header>

      {message && <div role="status" className={`notice ${message.kind}`}>{message.text}</div>}

      <div className="route-layout">
        <aside className="route-sidebar" aria-label={text.routes}>
          <form className="route-filter" onSubmit={(event) => { event.preventDefault(); void loadCatalog(1); }}>
            <label>{text.search}<input value={search} onChange={(event) => setSearch(event.target.value)} /></label>
            <label>{text.status}<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">—</option><option value="active">{text.active}</option><option value="retired">{text.retired}</option></select></label>
            <button type="submit">{text.search}</button>
          </form>

          {view === "loading" && <p className="route-state" aria-live="polite">{text.loading}</p>}
          {view === "error" && <div className="route-state"><p>{text.error}</p><button onClick={() => void loadCatalog(page)}>{text.retry}</button></div>}
          {view === "empty" && <p className="route-state">{text.empty}</p>}
          {view === "ready" && <div className="route-catalog">{routes.map((route) => (
            <button
              type="button"
              className={selectedRoute?.id === route.id ? "route-catalog__item is-selected" : "route-catalog__item"}
              key={route.id}
              onClick={() => void loadRoute(route.id)}
            >
              <strong>{locale === "ar" ? route.current_version?.name_ar ?? route.route_key : route.current_version?.name_en ?? route.route_key}</strong>
              <span>{route.route_key}</span>
              <small>{statusText(route.status)} · {text[route.direction]}</small>
            </button>
          ))}</div>}
          <div className="route-pagination"><span>{text.pagination} {page} · {total}</span><button type="button" disabled={page <= 1 || Boolean(busy)} onClick={() => void loadCatalog(page - 1)}>‹</button><button type="button" disabled={page * 25 >= total || Boolean(busy)} onClick={() => void loadCatalog(page + 1)}>›</button></div>
        </aside>

        <div className="route-main">
          <details className="route-card">
            <summary>{text.createRoute}</summary>
            <form className="route-form route-form--grid" onSubmit={submitRoute}>
              <label>{text.routeKey}<input required value={routeDraft.route_key} onChange={(event) => setRouteDraft({ ...routeDraft, route_key: event.target.value })} /></label>
              <label>{text.groupKey}<input required value={routeDraft.route_group_key} onChange={(event) => setRouteDraft({ ...routeDraft, route_group_key: event.target.value })} /></label>
              <label>{text.region}<input required value={routeDraft.service_region_key} onChange={(event) => setRouteDraft({ ...routeDraft, service_region_key: event.target.value })} /></label>
              <label>{text.direction}<select value={routeDraft.direction} onChange={(event) => setRouteDraft({ ...routeDraft, direction: event.target.value as RouteIdentityDraft["direction"] })}><option value="outbound">{text.outbound}</option><option value="inbound">{text.inbound}</option><option value="loop">{text.loop}</option></select></label>
              <button disabled={Boolean(busy)}>{text.create}</button>
            </form>
          </details>

          {!selectedRoute ? <div className="route-card route-state">{text.chooseRoute}</div> : <>
            <article className="route-card route-identity">
              <div><span className="route-chip">{selectedRoute.route_key}</span><h3>{selectedRoute.current_version ? (locale === "ar" ? selectedRoute.current_version.name_ar : selectedRoute.current_version.name_en) : selectedRoute.route_key}</h3><p>{selectedRoute.service_region_key} · {text[selectedRoute.direction]}</p></div>
              <div className="route-actions"><span className={`route-chip route-status--${selectedRoute.status}`}>{statusText(selectedRoute.status)}</span><button className="button-danger" type="button" onClick={() => void retireRoute()} disabled={Boolean(busy)}>{text.retireRoute}</button></div>
            </article>

            <article className="route-card">
              <div className="route-card__heading"><h3>{text.versions}</h3><button type="button" onClick={() => selectVersion(null)}>{text.newVersion}</button></div>
              <div className="version-tabs">{selectedRoute.versions?.map((version) => <button type="button" key={version.id} className={selectedVersion?.id === version.id ? "is-selected" : ""} onClick={() => selectVersion(version)}>v{version.version_number} · {statusText(version.status)}</button>)}</div>
              <form className="route-form route-form--grid" onSubmit={submitVersion}>
                <label>{text.nameAr}<input dir="rtl" required value={versionDraft.name_ar} onChange={(event) => setVersionDraft({ ...versionDraft, name_ar: event.target.value })} disabled={selectedVersion ? selectedVersion.status !== "draft" : false} /></label>
                <label>{text.nameEn}<input dir="ltr" required value={versionDraft.name_en} onChange={(event) => setVersionDraft({ ...versionDraft, name_en: event.target.value })} disabled={selectedVersion ? selectedVersion.status !== "draft" : false} /></label>
                <label>{text.descriptionAr}<textarea dir="rtl" value={versionDraft.description_ar ?? ""} onChange={(event) => setVersionDraft({ ...versionDraft, description_ar: event.target.value })} disabled={selectedVersion ? selectedVersion.status !== "draft" : false} /></label>
                <label>{text.descriptionEn}<textarea dir="ltr" value={versionDraft.description_en ?? ""} onChange={(event) => setVersionDraft({ ...versionDraft, description_en: event.target.value })} disabled={selectedVersion ? selectedVersion.status !== "draft" : false} /></label>
                <label>{text.activeFrom}<input type="datetime-local" value={versionDraft.active_from ?? ""} onChange={(event) => setVersionDraft({ ...versionDraft, active_from: event.target.value })} disabled={selectedVersion ? selectedVersion.status !== "draft" : false} /></label>
                <label>{text.activeUntil}<input type="datetime-local" value={versionDraft.active_until ?? ""} onChange={(event) => setVersionDraft({ ...versionDraft, active_until: event.target.value })} disabled={selectedVersion ? selectedVersion.status !== "draft" : false} /></label>
                {(!selectedVersion || selectedVersion.status === "draft") && <button disabled={Boolean(busy)}>{selectedVersion ? text.saveDraft : text.createDraft}</button>}
              </form>
              {selectedVersion && <div className="route-lifecycle"><span className={`route-chip route-status--${selectedVersion.status}`}>{statusText(selectedVersion.status)}</span><span className={`route-chip ${selectedVersion.geometry.ready ? "route-chip--safe" : "route-chip--pending"}`}>{selectedVersion.geometry.ready ? text.geometryReady : text.geometryPending}</span>{actions.includes("clone") && <button type="button" onClick={() => void cloneVersion()}>{text.clone}</button>}{actions.includes("publish") && <button type="button" onClick={() => void versionAction("publish")}>{text.publish}</button>}{actions.includes("pause") && <button type="button" onClick={() => void versionAction("pause")}>{text.pause}</button>}{actions.includes("resume") && <button type="button" onClick={() => void versionAction("resume")}>{text.resume}</button>}{actions.includes("retire") && <button className="button-danger" type="button" onClick={() => void versionAction("retire")}>{text.retire}</button>}</div>}
            </article>

            {selectedVersion?.status === "draft" && <article className="route-card">
              <h3>{text.orderedStops}</h3>
              <div className="route-add-stop"><select aria-label={text.addStop} value={stopToAdd} onChange={(event) => setStopToAdd(event.target.value)}><option value="">{text.addStop}</option>{activeStops.filter((stop) => !memberships.some((membership) => membership.stop_id === stop.id)).map((stop) => <option value={stop.id} key={stop.id}>{locale === "ar" ? stop.name_ar : stop.name_en}</option>)}</select><button type="button" onClick={addExistingStop} disabled={!stopToAdd}>{text.addStop}</button></div>
              {memberships.length === 0 && <p className="route-state">{text.noStops}</p>}
              <ol className="stop-editor">{memberships.map((membership, index) => {
                const stop = stops.find((item) => item.id === membership.stop_id);
                return <li key={membership.stop_id}>
                  <div className="stop-editor__title"><span className="route-chip">{index + 1}</span><strong>{stop ? (locale === "ar" ? stop.name_ar : stop.name_en) : membership.stop_id}</strong><div><button aria-label={reorderControlLabel(text.moveUp, index)} type="button" disabled={index === 0} onClick={() => setMemberships(moveRouteStop(memberships, index, -1))}>↑</button><button aria-label={reorderControlLabel(text.moveDown, index)} type="button" disabled={index === memberships.length - 1} onClick={() => setMemberships(moveRouteStop(memberships, index, 1))}>↓</button><button aria-label={reorderControlLabel(text.remove, index)} className="button-danger" type="button" onClick={() => setMemberships(memberships.filter((_, current) => current !== index).map((item, current) => ({ ...item, sequence: current + 1 })))}>×</button></div></div>
                  <div className="permission-grid">{(["passenger_pickup_allowed", "passenger_dropoff_allowed", "parcel_pickup_allowed", "parcel_dropoff_allowed"] as Permission[]).map((permission) => <label key={permission}><input type="checkbox" checked={membership[permission]} onChange={() => setMemberships(toggleRouteStopPermission(memberships, index, permission))} />{permission === "passenger_pickup_allowed" ? text.passengerPickup : permission === "passenger_dropoff_allowed" ? text.passengerDropoff : permission === "parcel_pickup_allowed" ? text.parcelPickup : text.parcelDropoff}</label>)}</div>
                </li>;
              })}</ol>
              <button type="button" onClick={() => void saveStops()} disabled={memberships.length < 2 || Boolean(busy)}>{text.saveOrder}</button>
            </article>}
          </>}

          <details className="route-card">
            <summary>{text.createStop}</summary>
            <p>{text.stopHelp}</p>
            <form className="route-form route-form--grid" onSubmit={submitStop}>
              <label>{text.stopKey}<input required value={stopDraft.stop_key} onChange={(event) => setStopDraft({ ...stopDraft, stop_key: event.target.value })} /></label>
              <label>{text.region}<input required value={stopDraft.service_region_key} onChange={(event) => setStopDraft({ ...stopDraft, service_region_key: event.target.value })} /></label>
              <label>{text.nameAr}<input dir="rtl" required value={stopDraft.name_ar} onChange={(event) => setStopDraft({ ...stopDraft, name_ar: event.target.value })} /></label>
              <label>{text.nameEn}<input dir="ltr" required value={stopDraft.name_en} onChange={(event) => setStopDraft({ ...stopDraft, name_en: event.target.value })} /></label>
              <label>{text.latitude}<input type="number" step="0.000001" min="-90" max="90" required value={stopDraft.latitude} onChange={(event) => setStopDraft({ ...stopDraft, latitude: Number(event.target.value) })} /></label>
              <label>{text.longitude}<input type="number" step="0.000001" min="-180" max="180" required value={stopDraft.longitude} onChange={(event) => setStopDraft({ ...stopDraft, longitude: Number(event.target.value) })} /></label>
              <button disabled={Boolean(busy)}>{text.createStop}</button>
            </form>
            <div className="stop-catalog">{stops.map((stop) => <div key={stop.id}><div><strong>{locale === "ar" ? stop.name_ar : stop.name_en}</strong><span>{stop.stop_key} · {stop.latitude.toFixed(6)}, {stop.longitude.toFixed(6)}</span></div><span className={`route-chip route-status--${stop.status}`}>{statusText(stop.status)}</span>{stop.status === "active" && <button type="button" className="button-danger" onClick={() => void retireStop(stop)} disabled={Boolean(busy)}>{text.retire}</button>}</div>)}</div>
          </details>
        </div>
      </div>
    </section>
  );
}
