export type ApiError = Error & { status?: number; details?: unknown };
export type ApiClientOptions = { onSessionEnded?: (error: ApiError, requestToken: string) => void };

export function createApiClient(apiBaseUrl: string, clientOptions: ApiClientOptions = {}) {
async function apiRequest<T>(path: string, options: { method?: string; token?: string; body?: unknown; idempotencyKey?: string } = {}) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.idempotencyKey) headers["Idempotency-Key"] = options.idempotencyKey;

  const response = await fetch(`${apiBaseUrl}/api/v1${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const error = new Error(data?.error ?? `Request failed with ${response.status}`) as ApiError;
    error.status = response.status;
    error.details = data;
    if (options.token) clientOptions.onSessionEnded?.(error, options.token);
    throw error;
  }
  return data as T;
}

return {
  login: (phone: string, password: string) => apiRequest<LoginResponse>("/auth/login", { method: "POST", body: { phone, password } }),
  me: (token: string) => apiRequest<MeResponse>("/me", { token }),
  dashboard: (token: string) => apiRequest<DashboardResponse>("/admin/dashboard", { token }),
  drivers: (token: string) => apiRequest<{ drivers: DriverProfile[] }>("/admin/drivers", { token }),
  driverVerifications: (token: string, status: DriverVerificationStatus = "pending", page = 1, limit = 50) =>
    apiRequest<DriverVerificationPage>(
      `/admin/driver-verifications?status=${encodeURIComponent(status)}&page=${page}&limit=${limit}`,
      { token }
    ),
  driverVerification: (token: string, userId: string) =>
    apiRequest<{ verification: DriverVerification }>(
      `/admin/driver-verifications/${encodeURIComponent(userId)}`,
      { token }
    ),
  approveDriverVerification: (
    token: string,
    userId: string,
    expectedRevision: number,
    profile?: DriverProfileDraft
  ) =>
    apiRequest<{ verification: DriverVerification }>(
      `/admin/driver-verifications/${encodeURIComponent(userId)}/approve`,
      { method: "POST", token, body: profile ? { expected_revision: expectedRevision, profile } : { expected_revision: expectedRevision } }
    ),
  rejectDriverVerification: (token: string, userId: string, expectedRevision: number, reason: string) =>
    apiRequest<{ verification: DriverVerification }>(
      `/admin/driver-verifications/${encodeURIComponent(userId)}/reject`,
      { method: "POST", token, body: { expected_revision: expectedRevision, reason } }
    ),
  /**
   * Suspend, disable or reactivate an account.
   *
   * The API requires a reason of at least three characters for anything other
   * than `active`, revokes every session the account holds, and writes an audit
   * event — so this is the one genuinely destructive control in the console.
   */
  updateUserStatus: (token: string, id: string, status: AccountStatus, reason?: string) =>
    apiRequest<{ user: AdminUser }>(`/admin/users/${id}/status`, {
      method: "PATCH",
      token,
      body: reason ? { status, reason } : { status }
    }),
  requests: (token: string) => apiRequest<{ requests: PassengerRequest[] }>("/admin/requests", { token }),
  orders: (token: string) => apiRequest<{ orders: MerchantOrder[] }>("/admin/orders", { token }),
  routes: (token: string) => apiRequest<{ routes: DriverRoute[] }>("/admin/routes", { token }),
  trips: (token: string) => apiRequest<{ trips: Trip[] }>("/trips", { token }),
  trip: (token: string, id: string) => apiRequest<{ trip: Trip }>(`/trips/${id}`, { token }),
  latestLocation: (token: string, id: string) => apiRequest<{ location: LocationEvent | null }>(`/trips/${id}/location`, { token }),
  serviceRoutes: (token: string, query = "") => apiRequest<RoutePage>(`/admin/service-routes${query}`, { token }),
  serviceRoute: (token: string, id: string) => apiRequest<{ route: ServiceRoute }>(`/admin/service-routes/${id}`, { token }),
  createServiceRoute: (token: string, body: RouteIdentityDraft, key: string) => apiRequest<{ route: ServiceRoute }>("/admin/service-routes", { method: "POST", token, body, idempotencyKey: key }),
  createRouteVersion: (token: string, routeId: string, body: RouteVersionDraft | { clone_from_version_id: string }, key: string) => apiRequest<{ version: ServiceRouteVersion }>(`/admin/service-routes/${routeId}/versions`, { method: "POST", token, body, idempotencyKey: key }),
  updateRouteVersion: (token: string, id: string, body: RouteVersionDraft & { expected_revision: number }) => apiRequest<{ version: ServiceRouteVersion }>(`/admin/route-versions/${id}`, { method: "PATCH", token, body }),
  replaceRouteStops: (token: string, id: string, body: { expected_revision: number; stops: RouteStopDraft[] }) => apiRequest<{ version: ServiceRouteVersion }>(`/admin/route-versions/${id}/stops`, { method: "PUT", token, body }),
  publishRouteVersion: (token: string, id: string, body: { expected_revision: number; expected_current_version_id: string | null }, key: string) => apiRequest<{ version: ServiceRouteVersion }>(`/admin/route-versions/${id}/publish`, { method: "POST", token, body, idempotencyKey: key }),
  routeVersionAction: (token: string, id: string, action: "pause" | "resume" | "retire", reason: string | undefined, key: string) => apiRequest<{ version: ServiceRouteVersion }>(`/admin/route-versions/${id}/${action}`, { method: "POST", token, body: reason ? { reason } : {}, idempotencyKey: key }),
  retireServiceRoute: (token: string, id: string, reason: string, key: string) => apiRequest<{ route: ServiceRoute }>(`/admin/service-routes/${id}/retire`, { method: "POST", token, body: { reason }, idempotencyKey: key }),
  canonicalStops: (token: string, query = "") => apiRequest<StopPage>(`/admin/stops${query}`, { token }),
  createCanonicalStop: (token: string, body: CanonicalStopDraft, key: string) => apiRequest<{ stop: CanonicalStop }>("/admin/stops", { method: "POST", token, body, idempotencyKey: key }),
  updateCanonicalStop: (token: string, id: string, body: Omit<CanonicalStopDraft, "stop_key">) => apiRequest<{ stop: CanonicalStop }>(`/admin/stops/${id}`, { method: "PATCH", token, body }),
  retireCanonicalStop: (token: string, id: string, reason: string, key: string) => apiRequest<{ stop: CanonicalStop }>(`/admin/stops/${id}/retire`, { method: "POST", token, body: { reason }, idempotencyKey: key })
};
}

export function createDemoApiClient(apiBaseUrl: string, clientOptions: ApiClientOptions = {}) {
  if (!__MASARI_DEMO_BUILD__) return null;
  const apiRequest = async <T>(path: string, options: { method?: string; token?: string; body?: unknown; resetKey?: string } = {}) => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (options.token) headers.Authorization = `Bearer ${options.token}`;
    if (options.resetKey) headers["x-demo-reset-key"] = options.resetKey;
    const response = await fetch(`${apiBaseUrl}/api/v1${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) {
      const error = new Error(data?.error ?? `Request failed with ${response.status}`) as ApiError;
      error.status = response.status;
      error.details = data;
      if (options.token) clientOptions.onSessionEnded?.(error, options.token);
      throw error;
    }
    return data as T;
  };
  return {
    reset: (token: string | undefined, resetKey: string) => apiRequest<{ ok: boolean; seed: unknown }>("/demo/reset", { method: "POST", token, resetKey, body: {} }),
    runMatch: (token: string, passengerRequestId?: string, merchantOrderId?: string) =>
      apiRequest<MatchRunResponse>("/matches/run", { method: "POST", token, body: { passengerRequestId, merchantOrderId } }),
    getMatch: (token: string, id: string) => apiRequest<{ match: Match; scoringBreakdown: Record<string, number> }>(`/matches/${id}`, { token }),
    batchOrder: (token: string, orderId: string) => apiRequest<BatchResponse>(`/merchant/orders/${orderId}/batch`, { method: "POST", token, body: {} }),
    runComparison: (token: string, passengerRequestId?: string, merchantOrderId?: string) =>
      apiRequest<{ comparison: Comparison }>("/compare/run", { method: "POST", token, body: { scenarioKey: "masari_batch_wins", passengerRequestId, merchantOrderId } }),
    getComparison: (token: string, id: string) => apiRequest<{ comparison: Comparison }>(`/compare/runs/${id}`, { token }),
    acceptMatch: (token: string, id: string) => apiRequest<{ trip: Trip; matchId: string }>(`/matches/${id}/accept`, { method: "POST", token, body: {} }),
    rejectMatch: (token: string, id: string) => apiRequest<{ match: Match }>(`/matches/${id}/reject`, { method: "POST", token, body: {} }),
    updateTripStatus: (token: string, id: string, status: string) =>
      apiRequest<{ trip: Trip }>(`/trips/${id}/status`, { method: "POST", token, body: { status } }),
    simulateStep: (token: string, id: string) => apiRequest<{ location: LocationEvent }>(`/trips/${id}/simulate/step`, { method: "POST", token, body: {} }),
    resetSimulation: (token: string, id: string) => apiRequest<{ ok: boolean }>(`/trips/${id}/simulate/reset`, { method: "POST", token, body: {} })
  };
}

export type User = { id: string; name: string; phone: string; role: string };

/** The three values `PATCH /admin/users/:id/status` accepts. */
export type AccountStatus = "active" | "suspended" | "disabled";
/** Every account state the read-only Admin APIs can return. */
export type UserAccountStatus = AccountStatus | "pending";

/**
 * A user as the admin endpoints serialise it — the `safeUserSelect` shape,
 * which deliberately omits the password hash and security version.
 */
export type AdminUser = User & {
  account_status: UserAccountStatus;
  status_reason: string | null;
  status_updated_at: string;
  last_login_at: string | null;
  demo_account: boolean;
  created_at: string;
};

/**
 * A driver profile from `GET /admin/drivers`.
 *
 * `verified` is stored on the row but no endpoint writes it, so the console can
 * report the flag and must not offer to change it.
 */
export type DriverProfile = {
  id: string;
  vehicle_type: string;
  seats_total: number;
  parcel_capacity: number;
  verified: boolean;
  trust_score: number;
  created_at: string;
  user?: AdminUser;
  routes?: DriverRoute[];
};
export type DriverVerificationStatus = "pending" | "approved" | "rejected";
export type DriverProfileDraft = {
  vehicle_type: string;
  seats_total: number;
  parcel_capacity: number;
};
export type DriverVerification = {
  id: string;
  revision: number;
  status: DriverVerificationStatus;
  rejection_reason: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  reviewer: { id: string; name: string } | null;
  candidate: AdminUser;
  driver_profile: DriverProfile | null;
  evidence: { status: "not_collected" };
};
export type DriverVerificationPage = {
  verifications: DriverVerification[];
  page: number;
  limit: number;
  total: number;
};
export type ApiClient = ReturnType<typeof createApiClient>;
export type LoginResponse = { token: string; user: User };
export type MeResponse = { user: User };

export type DashboardResponse = {
  counts: {
    users: number;
    drivers: number;
    routes: number;
    passenger_requests: number;
    merchant_orders: number;
    parcels: number;
  };
};

export type DriverRoute = {
  id: string;
  driver_id?: string;
  status: string;
  origin_label: string;
  destination_label: string;
  seats_available: number;
  parcel_capacity_available: number;
  driver?: { user?: User; trust_score?: number; verified?: boolean };
};

export type PassengerRequest = {
  id: string;
  status: string;
  pickup_label: string;
  destination_label: string;
  passenger_count: number;
  passenger?: User;
};

export type MerchantOrder = {
  id: string;
  status: string;
  pickup_label: string;
  merchant?: User;
  parcels?: Array<{ id: string; status: string; destination_label: string; size: string; priority: string }>;
};

export type Match = {
  id: string;
  status: string;
  score: string;
  method: string;
  explanation: string;
  driver_route_id: string;
  passenger_request_id?: string;
  merchant_order_id?: string;
  driver_route?: DriverRoute;
};

export type MatchRunResponse = { match: Match; scoringBreakdown: Record<string, number>; candidatesConsidered: number };
export type BatchResponse = { batch: { id: string; status: string; estimated_distance_saved: string; explanation: string; merchant_order?: MerchantOrder } };
export type Comparison = {
  id: string;
  winner: string;
  masari_trips: number;
  nearest_driver_trips: number;
  masari_estimated_distance: string;
  nearest_estimated_distance: string;
  masari_estimated_cost: string;
  nearest_estimated_cost: string;
  parcel_batching_benefit: string;
  driver_utilization: string;
};
export type Trip = { id: string; status: string; driver_route_id: string; passenger_request_id?: string; merchant_order_id?: string; created_at?: string };
export type LocationEvent = { id: string; lat: string; lng: string; source: string; sequence: number; recorded_at: string };

export type CanonicalStop = {
  id: string;
  stop_key: string;
  service_region_key: string;
  name_ar: string;
  name_en: string;
  latitude: number;
  longitude: number;
  status: "active" | "retired";
};
export type CanonicalStopDraft = Omit<CanonicalStop, "id" | "status">;
export type RouteStopDraft = {
  stop_id: string;
  sequence: number;
  passenger_pickup_allowed: boolean;
  passenger_dropoff_allowed: boolean;
  parcel_pickup_allowed: boolean;
  parcel_dropoff_allowed: boolean;
  estimated_offset_seconds?: number | null;
  dwell_seconds?: number | null;
};
export type RouteVersionStop = RouteStopDraft & { id: string; stop: CanonicalStop };
export type ServiceRouteVersion = {
  id: string;
  service_route_id: string;
  version_number: number;
  status: "draft" | "published" | "paused" | "retired";
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  active_from: string | null;
  active_until: string | null;
  draft_revision: number;
  stop_count: number;
  stops: RouteVersionStop[];
  geometry: { status: "pending" | "available" | "unavailable"; ready: boolean };
};
export type RouteVersionDraft = {
  name_ar: string;
  name_en: string;
  description_ar?: string | null;
  description_en?: string | null;
  active_from?: string | null;
  active_until?: string | null;
};
export type RouteIdentityDraft = {
  route_key: string;
  route_group_key: string;
  service_region_key: string;
  direction: "outbound" | "inbound" | "loop";
};
export type ServiceRoute = RouteIdentityDraft & {
  id: string;
  status: "active" | "retired";
  current_version_id: string | null;
  current_version: ServiceRouteVersion | null;
  versions?: ServiceRouteVersion[];
  version_count: number;
  created_at: string;
  updated_at: string;
};
export type RoutePage = { routes: ServiceRoute[]; page: number; limit: number; total: number };
export type StopPage = { stops: CanonicalStop[]; page: number; limit: number; total: number };
