import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type {
  ApiError,
  CanonicalStop,
  CanonicalStopDraft,
  RouteIdentityDraft,
  RouteStopDraft,
  RouteVersionDraft,
  ServiceRoute,
  ServiceRouteVersion,
  createApiClient
} from "../../api";
import { Button, Card, CardHeader, EmptyState, Notice, Skeleton, StatusBadge } from "../../ui";

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
    conflictReloaded: "تغيّرت حالة المسار من جلسة أخرى. أُعيد تحميل أحدث البيانات المعتمدة؛ راجعها قبل المحاولة مرة أخرى.",
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
    reasonRequired: "أدخل سبباً قبل الإيقاف أو الإحالة للتقاعد.",
    active: "نشط",
    retired: "متقاعد",
    draft: "مسودة",
    published: "منشور",
    paused: "متوقف مؤقتاً",
    noStops: "أضف محطتين على الأقل قبل النشر.",
    stopRetired: "تمت إحالة المحطة للتقاعد.",
    pagination: "صفحة",
    genericError: "تعذّر إكمال الإجراء. أعد المحاولة أو استخدم معرّف الطلب للدعم."
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
    conflictReloaded: "Another session changed the route state. The latest authoritative data was reloaded; review it before trying again.",
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
    reasonRequired: "Enter a reason before pausing or retiring.",
    active: "Active",
    retired: "Retired",
    draft: "Draft",
    published: "Published",
    paused: "Paused",
    noStops: "Add at least two stops before publication.",
    stopRetired: "Stop retired.",
    pagination: "Page",
    genericError: "The action could not be completed. Retry or use the request ID for support."
  }
} as const;

export function routeUiText(locale: Locale) {
  return copy[locale];
}

function key(prefix: string) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}

export function mutationFingerprint(operation: string, payload: unknown) {
  return `${operation}:${JSON.stringify(payload)}`;
}

export function stableMutationKey(
  registry: Map<string, string>,
  operation: string,
  payload: unknown,
  factory: (prefix: string) => string = key
) {
  const fingerprint = mutationFingerprint(operation, payload);
  const existing = registry.get(fingerprint);
  if (existing) return { fingerprint, key: existing };
  const created = factory(operation);
  registry.set(fingerprint, created);
  return { fingerprint, key: created };
}

export function mutationFailureIsAuthoritative(error: unknown) {
  const apiError = error as ApiError | undefined;
  return Boolean(
    apiError &&
    typeof apiError.status === "number" &&
    apiError.status >= 400 &&
    apiError.status < 500 &&
    apiError.message !== "idempotency_in_progress"
  );
}

export function routeUiError(locale: Locale, error: unknown) {
  const value = error instanceof Error ? error.message : "unexpected_error";
  return value === "draft_revision_conflict" ? routeUiText(locale).revisionConflict : routeUiText(locale).genericError;
}

export function routeConflictRequiresReload(error: unknown) {
  return (error as ApiError | undefined)?.status === 409;
}

export async function handleRouteMutationFailure(
  error: unknown,
  reload: () => Promise<unknown>,
  locale: Locale
) {
  if (!routeConflictRequiresReload(error)) return routeUiError(locale, error);
  try {
    await reload();
    return routeUiText(locale).conflictReloaded;
  } catch {
    return routeUiText(locale).genericError;
  }
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
  const [actionReason, setActionReason] = useState("");
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const busyRef = useRef("");
  const mutationKeys = useRef(new Map<string, string>());

  const activeStops = useMemo(() => stops.filter((stop) => stop.status === "active"), [stops]);
  const actions = lifecycleActions(selectedVersion);

  function showError(error: unknown) {
    setMessage({ kind: "error", text: routeUiError(locale, error) });
  }

  async function showMutationError(error: unknown, reload: () => Promise<unknown>) {
    setMessage({ kind: "error", text: await handleRouteMutationFailure(error, reload, locale) });
  }

  function beginBusy(label: string) {
    if (busyRef.current) return false;
    busyRef.current = label;
    setBusy(label);
    setMessage(null);
    return true;
  }

  function endBusy() {
    busyRef.current = "";
    setBusy("");
  }

  function pendingMutation(operation: string, payload: unknown) {
    return stableMutationKey(mutationKeys.current, operation, payload);
  }

  function settleMutation(fingerprint: string, error?: unknown) {
    if (error === undefined || mutationFailureIsAuthoritative(error)) mutationKeys.current.delete(fingerprint);
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

  async function loadStops() {
    const stopPage = await api.canonicalStops(token, "?limit=50");
    setStops(stopPage.stops);
  }

  useEffect(() => {
    void loadCatalog(1);
  }, []);

  async function loadRoute(routeId: string, nested = false) {
    if (!nested && !beginBusy("route-detail")) return;
    try {
      const response = await api.serviceRoute(token, routeId);
      setSelectedRoute(response.route);
      const version = response.route.versions?.[0] ?? response.route.current_version;
      selectVersion(version ?? null);
    } catch (error) {
      showError(error);
    } finally {
      if (!nested) endBusy();
    }
  }

  function selectVersion(version: ServiceRouteVersion | null) {
    setSelectedVersion(version);
    setVersionDraft(version ? draftFromVersion(version) : emptyVersion());
    setMemberships(version ? membershipsFromVersion(version) : []);
  }

  async function submitRoute(event: FormEvent) {
    event.preventDefault();
    if (!beginBusy("create-route")) return;
    const mutation = pendingMutation("route_create", routeDraft);
    try {
      const response = await api.createServiceRoute(token, routeDraft, mutation.key);
      settleMutation(mutation.fingerprint);
      setRouteDraft(emptyRoute());
      await loadCatalog(1);
      await loadRoute(response.route.id, true);
      setMessage({ kind: "success", text: text.saved });
    } catch (error) {
      settleMutation(mutation.fingerprint, error);
      await showMutationError(error, () => loadCatalog(1));
    } finally {
      endBusy();
    }
  }

  async function submitStop(event: FormEvent) {
    event.preventDefault();
    if (!beginBusy("create-stop")) return;
    const mutation = pendingMutation("stop_create", stopDraft);
    try {
      await api.createCanonicalStop(token, stopDraft, mutation.key);
      settleMutation(mutation.fingerprint);
      await loadStops();
      setStopDraft(emptyStop());
      setMessage({ kind: "success", text: text.saved });
    } catch (error) {
      settleMutation(mutation.fingerprint, error);
      await showMutationError(error, loadStops);
    } finally {
      endBusy();
    }
  }

  async function submitVersion(event: FormEvent) {
    event.preventDefault();
    if (!selectedRoute) return;
    if (!beginBusy("save-version")) return;
    let mutation: ReturnType<typeof pendingMutation> | undefined;
    try {
      const payload = { ...versionDraft, active_from: toApiDate(versionDraft.active_from), active_until: toApiDate(versionDraft.active_until) };
      if (selectedVersion?.status !== "draft") mutation = pendingMutation("route_version_create", { routeId: selectedRoute.id, ...payload });
      const response = selectedVersion?.status === "draft"
        ? await api.updateRouteVersion(token, selectedVersion.id, { ...payload, expected_revision: selectedVersion.draft_revision })
        : await api.createRouteVersion(token, selectedRoute.id, payload, mutation!.key);
      if (mutation) settleMutation(mutation.fingerprint);
      await loadRoute(selectedRoute.id, true);
      selectVersion(response.version);
      setMessage({ kind: "success", text: text.saved });
    } catch (error) {
      if (mutation) settleMutation(mutation.fingerprint, error);
      await showMutationError(error, () => loadRoute(selectedRoute.id, true));
    } finally {
      endBusy();
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
    if (!beginBusy("save-stops")) return;
    try {
      const response = await api.replaceRouteStops(token, selectedVersion.id, {
        expected_revision: selectedVersion.draft_revision,
        stops: memberships
      });
      selectVersion(response.version);
      setMessage({ kind: "success", text: text.saved });
    } catch (error) {
      await showMutationError(error, () => loadRoute(selectedVersion.service_route_id, true));
    } finally {
      endBusy();
    }
  }

  async function cloneVersion() {
    if (!selectedRoute || !selectedVersion) return;
    if (!beginBusy("clone")) return;
    const payload = { routeId: selectedRoute.id, clone_from_version_id: selectedVersion.id };
    const mutation = pendingMutation("route_version_clone", payload);
    try {
      const response = await api.createRouteVersion(
        token,
        selectedRoute.id,
        { clone_from_version_id: selectedVersion.id },
        mutation.key
      );
      settleMutation(mutation.fingerprint);
      await loadRoute(selectedRoute.id, true);
      selectVersion(response.version);
      setMessage({ kind: "success", text: text.saved });
    } catch (error) {
      settleMutation(mutation.fingerprint, error);
      await showMutationError(error, () => loadRoute(selectedRoute.id, true));
    } finally {
      endBusy();
    }
  }

  async function versionAction(action: "publish" | "pause" | "resume" | "retire") {
    const reason = actionReason.trim();
    if ((action === "pause" || action === "retire") && !reason) {
      setMessage({ kind: "error", text: text.reasonRequired });
      return;
    }
    if (!selectedRoute || !selectedVersion || !window.confirm(text.confirm)) return;
    if (!beginBusy(action)) return;
    const lifecycleExpectation = { expected_current_version_id: selectedRoute.current_version_id };
    const payload = action === "publish"
      ? { id: selectedVersion.id, expected_revision: selectedVersion.draft_revision, ...lifecycleExpectation }
      : { id: selectedVersion.id, action, ...(action === "resume" ? lifecycleExpectation : { reason, ...lifecycleExpectation }) };
    const mutation = pendingMutation(`route_version_${action}`, payload);
    try {
      const response = action === "publish"
        ? await api.publishRouteVersion(
            token,
            selectedVersion.id,
            { expected_revision: selectedVersion.draft_revision, expected_current_version_id: selectedRoute.current_version_id },
            mutation.key
          )
        : await api.routeVersionAction(
            token,
            selectedVersion.id,
            action,
            action === "resume" ? lifecycleExpectation : { reason, ...lifecycleExpectation },
            mutation.key
          );
      settleMutation(mutation.fingerprint);
      await loadRoute(selectedRoute.id, true);
      selectVersion(response.version);
      setActionReason("");
      setMessage({ kind: "success", text: text.saved });
    } catch (error) {
      settleMutation(mutation.fingerprint, error);
      await showMutationError(error, () => loadRoute(selectedRoute.id, true));
    } finally {
      endBusy();
    }
  }

  async function retireRoute() {
    const reason = actionReason.trim();
    if (!reason) {
      setMessage({ kind: "error", text: text.reasonRequired });
      return;
    }
    if (!selectedRoute || !window.confirm(text.confirm)) return;
    if (!beginBusy("retire-route")) return;
    const retirement = { reason, expected_current_version_id: null as null };
    const payload = { id: selectedRoute.id, ...retirement };
    const mutation = pendingMutation("service_route_retire", payload);
    try {
      await api.retireServiceRoute(token, selectedRoute.id, retirement, mutation.key);
      settleMutation(mutation.fingerprint);
      setSelectedRoute(null);
      selectVersion(null);
      setActionReason("");
      await loadCatalog(page);
    } catch (error) {
      settleMutation(mutation.fingerprint, error);
      await showMutationError(error, async () => {
        await loadCatalog(page);
        await loadRoute(selectedRoute.id, true);
      });
    } finally {
      endBusy();
    }
  }

  async function retireStop(stop: CanonicalStop) {
    const reason = actionReason.trim();
    if (!reason) {
      setMessage({ kind: "error", text: text.reasonRequired });
      return;
    }
    if (!window.confirm(text.confirm)) return;
    if (!beginBusy(`retire-stop-${stop.id}`)) return;
    const payload = { id: stop.id, reason };
    const mutation = pendingMutation("stop_retire", payload);
    try {
      await api.retireCanonicalStop(token, stop.id, reason, mutation.key);
      settleMutation(mutation.fingerprint);
      await loadStops();
      setActionReason("");
      setMessage({ kind: "success", text: text.stopRetired });
    } catch (error) {
      settleMutation(mutation.fingerprint, error);
      await showMutationError(error, loadStops);
    } finally {
      endBusy();
    }
  }

  const statusText = (value: string) => text[value as keyof typeof text] ?? value;

  const disabledUnlessDraft = selectedVersion ? selectedVersion.status !== "draft" : false;

  return (
    <section className="stack" aria-labelledby="route-management-title">
      <div className="split">
        <h2 id="route-management-title" className="page-header__title">{text.title}</h2>
        <StatusBadge tone="warning">{text.geometryPending}</StatusBadge>
      </div>
      <p className="muted">{text.subtitle}</p>

      {message && <Notice kind={message.kind}>{message.text}</Notice>}

      <div className="route-layout">
        <aside className="route-sidebar" aria-label={text.routes}>
          <Card>
            <form className="stack stack--tight" onSubmit={(event) => { event.preventDefault(); void loadCatalog(1); }}>
              <label className="field">{text.search}<input value={search} onChange={(event) => setSearch(event.target.value)} /></label>
              <label className="field">{text.status}<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">—</option><option value="active">{text.active}</option><option value="retired">{text.retired}</option></select></label>
              <Button type="submit" variant="primary" icon="search" disabled={Boolean(busy)}>{text.search}</Button>
            </form>
          </Card>

          <Card>
            {view === "loading" && <div aria-live="polite"><p className="muted">{text.loading}</p><Skeleton /></div>}
            {view === "error" && <EmptyState compact icon="warning" title={text.error} action={<Button variant="outline" icon="refresh" onClick={() => void loadCatalog(page)} disabled={Boolean(busy)}>{text.retry}</Button>} />}
            {view === "empty" && <EmptyState compact icon="edit_road" title={text.empty} />}
            {view === "ready" && <div className="route-catalog">{routes.map((route) => (
              <button
                type="button"
                className={selectedRoute?.id === route.id ? "route-catalog__item is-selected" : "route-catalog__item"}
                key={route.id}
                onClick={() => void loadRoute(route.id)}
                disabled={Boolean(busy)}
              >
                <strong>{locale === "ar" ? route.current_version?.name_ar ?? route.route_key : route.current_version?.name_en ?? route.route_key}</strong>
                <span>{route.route_key}</span>
                <small>{statusText(route.status)} · {text[route.direction]}</small>
              </button>
            ))}</div>}
            <div className="route-pagination">
              <span>{text.pagination} {page} · {total}</span>
              <div className="button-row">
                <Button variant="outline" size="sm" disabled={page <= 1 || Boolean(busy)} onClick={() => void loadCatalog(page - 1)}>‹</Button>
                <Button variant="outline" size="sm" disabled={page * 25 >= total || Boolean(busy)} onClick={() => void loadCatalog(page + 1)}>›</Button>
              </div>
            </div>
          </Card>
        </aside>

        <div className="stack">
          <Card>
            <details className="disclosure">
              <summary>{text.createRoute}</summary>
              <form className="field-grid" onSubmit={submitRoute}>
                <label className="field">{text.routeKey}<input required value={routeDraft.route_key} onChange={(event) => setRouteDraft({ ...routeDraft, route_key: event.target.value })} /></label>
                <label className="field">{text.groupKey}<input required value={routeDraft.route_group_key} onChange={(event) => setRouteDraft({ ...routeDraft, route_group_key: event.target.value })} /></label>
                <label className="field">{text.region}<input required value={routeDraft.service_region_key} onChange={(event) => setRouteDraft({ ...routeDraft, service_region_key: event.target.value })} /></label>
                <label className="field">{text.direction}<select value={routeDraft.direction} onChange={(event) => setRouteDraft({ ...routeDraft, direction: event.target.value as RouteIdentityDraft["direction"] })}><option value="outbound">{text.outbound}</option><option value="inbound">{text.inbound}</option><option value="loop">{text.loop}</option></select></label>
                <Button type="submit" icon="add" disabled={Boolean(busy)}>{text.create}</Button>
              </form>
            </details>
          </Card>

          <Card>
            <label className="field">{text.reason}<input value={actionReason} maxLength={500} onChange={(event) => setActionReason(event.target.value)} disabled={Boolean(busy)} /></label>
          </Card>

          {!selectedRoute ? <Card><EmptyState icon="edit_road" title={text.chooseRoute} /></Card> : <>
            <Card>
              <div className="split">
                <div>
                  <StatusBadge tone="neutral">{selectedRoute.route_key}</StatusBadge>
                  <h3 className="card__title">{selectedRoute.current_version ? (locale === "ar" ? selectedRoute.current_version.name_ar : selectedRoute.current_version.name_en) : selectedRoute.route_key}</h3>
                  <p className="muted">{selectedRoute.service_region_key} · {text[selectedRoute.direction]}</p>
                </div>
                <div className="button-row">
                  <StatusBadge status={selectedRoute.status}>{statusText(selectedRoute.status)}</StatusBadge>
                  <Button variant="destructive" icon="close" onClick={() => void retireRoute()} disabled={Boolean(busy)}>{text.retireRoute}</Button>
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader
                title={text.versions}
                action={<Button variant="secondary" icon="add" onClick={() => selectVersion(null)} disabled={Boolean(busy)}>{text.newVersion}</Button>}
              />
              <div className="version-tabs">{selectedRoute.versions?.map((version) => (
                <Button
                  key={version.id}
                  variant="outline"
                  size="sm"
                  className={selectedVersion?.id === version.id ? "is-selected" : undefined}
                  onClick={() => selectVersion(version)}
                  disabled={Boolean(busy)}
                >
                  {`v${version.version_number} · ${statusText(version.status)}`}
                </Button>
              ))}</div>
              <form className="field-grid" onSubmit={submitVersion}>
                <label className="field">{text.nameAr}<input dir="rtl" required value={versionDraft.name_ar} onChange={(event) => setVersionDraft({ ...versionDraft, name_ar: event.target.value })} disabled={disabledUnlessDraft} /></label>
                <label className="field">{text.nameEn}<input dir="ltr" required value={versionDraft.name_en} onChange={(event) => setVersionDraft({ ...versionDraft, name_en: event.target.value })} disabled={disabledUnlessDraft} /></label>
                <label className="field">{text.descriptionAr}<textarea dir="rtl" value={versionDraft.description_ar ?? ""} onChange={(event) => setVersionDraft({ ...versionDraft, description_ar: event.target.value })} disabled={disabledUnlessDraft} /></label>
                <label className="field">{text.descriptionEn}<textarea dir="ltr" value={versionDraft.description_en ?? ""} onChange={(event) => setVersionDraft({ ...versionDraft, description_en: event.target.value })} disabled={disabledUnlessDraft} /></label>
                <label className="field">{text.activeFrom}<input type="datetime-local" value={versionDraft.active_from ?? ""} onChange={(event) => setVersionDraft({ ...versionDraft, active_from: event.target.value })} disabled={disabledUnlessDraft} /></label>
                <label className="field">{text.activeUntil}<input type="datetime-local" value={versionDraft.active_until ?? ""} onChange={(event) => setVersionDraft({ ...versionDraft, active_until: event.target.value })} disabled={disabledUnlessDraft} /></label>
                {(!selectedVersion || selectedVersion.status === "draft") && <Button type="submit" icon="check" disabled={Boolean(busy)}>{selectedVersion ? text.saveDraft : text.createDraft}</Button>}
              </form>
              {selectedVersion && <div className="route-lifecycle">
                <StatusBadge status={selectedVersion.status}>{statusText(selectedVersion.status)}</StatusBadge>
                <StatusBadge tone={selectedVersion.geometry.ready ? "success" : "warning"}>{selectedVersion.geometry.ready ? text.geometryReady : text.geometryPending}</StatusBadge>
                {actions.includes("clone") && <Button variant="outline" size="sm" onClick={() => void cloneVersion()} disabled={Boolean(busy)}>{text.clone}</Button>}
                {actions.includes("publish") && <Button variant="action" size="sm" icon="check" onClick={() => void versionAction("publish")} disabled={Boolean(busy)}>{text.publish}</Button>}
                {actions.includes("pause") && <Button variant="outline" size="sm" onClick={() => void versionAction("pause")} disabled={Boolean(busy)}>{text.pause}</Button>}
                {actions.includes("resume") && <Button variant="secondary" size="sm" onClick={() => void versionAction("resume")} disabled={Boolean(busy)}>{text.resume}</Button>}
                {actions.includes("retire") && <Button variant="destructive" size="sm" onClick={() => void versionAction("retire")} disabled={Boolean(busy)}>{text.retire}</Button>}
              </div>}
            </Card>

            {selectedVersion?.status === "draft" && <Card>
              <CardHeader title={text.orderedStops} />
              <div className="button-row">
                <select className="input" aria-label={text.addStop} value={stopToAdd} onChange={(event) => setStopToAdd(event.target.value)} disabled={Boolean(busy)}>
                  <option value="">{text.addStop}</option>
                  {activeStops.filter((stop) => !memberships.some((membership) => membership.stop_id === stop.id)).map((stop) => <option value={stop.id} key={stop.id}>{locale === "ar" ? stop.name_ar : stop.name_en}</option>)}
                </select>
                <Button variant="secondary" icon="add" onClick={addExistingStop} disabled={!stopToAdd || Boolean(busy)}>{text.addStop}</Button>
              </div>
              {memberships.length === 0 && <EmptyState compact icon="location_on" title={text.noStops} />}
              <ol className="stop-editor">{memberships.map((membership, index) => {
                const stop = stops.find((item) => item.id === membership.stop_id);
                return <li key={membership.stop_id}>
                  <div className="stop-editor__title">
                    <StatusBadge tone="info">{index + 1}</StatusBadge>
                    <strong>{stop ? (locale === "ar" ? stop.name_ar : stop.name_en) : membership.stop_id}</strong>
                    <div className="button-row">
                      <Button variant="outline" size="sm" aria-label={reorderControlLabel(text.moveUp, index)} disabled={index === 0 || Boolean(busy)} onClick={() => setMemberships(moveRouteStop(memberships, index, -1))}>↑</Button>
                      <Button variant="outline" size="sm" aria-label={reorderControlLabel(text.moveDown, index)} disabled={index === memberships.length - 1 || Boolean(busy)} onClick={() => setMemberships(moveRouteStop(memberships, index, 1))}>↓</Button>
                      <Button variant="destructive" size="sm" aria-label={reorderControlLabel(text.remove, index)} disabled={Boolean(busy)} onClick={() => setMemberships(memberships.filter((_, current) => current !== index).map((item, current) => ({ ...item, sequence: current + 1 })))}>×</Button>
                    </div>
                  </div>
                  <div className="permission-grid">{(["passenger_pickup_allowed", "passenger_dropoff_allowed", "parcel_pickup_allowed", "parcel_dropoff_allowed"] as Permission[]).map((permission) => <label key={permission}><input type="checkbox" checked={membership[permission]} disabled={Boolean(busy)} onChange={() => setMemberships(toggleRouteStopPermission(memberships, index, permission))} />{permission === "passenger_pickup_allowed" ? text.passengerPickup : permission === "passenger_dropoff_allowed" ? text.passengerDropoff : permission === "parcel_pickup_allowed" ? text.parcelPickup : text.parcelDropoff}</label>)}</div>
                </li>;
              })}</ol>
              <Button icon="check" onClick={() => void saveStops()} disabled={memberships.length < 2 || Boolean(busy)}>{text.saveOrder}</Button>
            </Card>}
          </>}

          <Card>
            <details className="disclosure">
              <summary>{text.createStop}</summary>
              <p className="muted">{text.stopHelp}</p>
              <form className="field-grid" onSubmit={submitStop}>
                <label className="field">{text.stopKey}<input required value={stopDraft.stop_key} onChange={(event) => setStopDraft({ ...stopDraft, stop_key: event.target.value })} /></label>
                <label className="field">{text.region}<input required value={stopDraft.service_region_key} onChange={(event) => setStopDraft({ ...stopDraft, service_region_key: event.target.value })} /></label>
                <label className="field">{text.nameAr}<input dir="rtl" required value={stopDraft.name_ar} onChange={(event) => setStopDraft({ ...stopDraft, name_ar: event.target.value })} /></label>
                <label className="field">{text.nameEn}<input dir="ltr" required value={stopDraft.name_en} onChange={(event) => setStopDraft({ ...stopDraft, name_en: event.target.value })} /></label>
                <label className="field">{text.latitude}<input type="number" step="0.000001" min="-90" max="90" required value={stopDraft.latitude} onChange={(event) => setStopDraft({ ...stopDraft, latitude: Number(event.target.value) })} /></label>
                <label className="field">{text.longitude}<input type="number" step="0.000001" min="-180" max="180" required value={stopDraft.longitude} onChange={(event) => setStopDraft({ ...stopDraft, longitude: Number(event.target.value) })} /></label>
                <Button type="submit" icon="add" disabled={Boolean(busy)}>{text.createStop}</Button>
              </form>
              <div className="stop-catalog">{stops.map((stop) => <div key={stop.id}>
                <div>
                  <strong>{locale === "ar" ? stop.name_ar : stop.name_en}</strong>
                  <span>{stop.stop_key} · {stop.latitude.toFixed(6)}, {stop.longitude.toFixed(6)}</span>
                </div>
                <StatusBadge status={stop.status}>{statusText(stop.status)}</StatusBadge>
                {stop.status === "active" && <Button variant="destructive" size="sm" onClick={() => void retireStop(stop)} disabled={Boolean(busy)}>{text.retire}</Button>}
              </div>)}</div>
            </details>
          </Card>
        </div>
      </div>
    </section>
  );
}
