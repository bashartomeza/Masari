export type ApiError = Error & { status?: number; details?: unknown };
export type ApiClientOptions = { onSessionEnded?: (error: ApiError) => void };

export function createApiClient(apiBaseUrl: string, clientOptions: ApiClientOptions = {}) {
async function apiRequest<T>(path: string, options: { method?: string; token?: string; body?: unknown } = {}) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

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
    if (options.token) clientOptions.onSessionEnded?.(error);
    throw error;
  }
  return data as T;
}

return {
  login: (phone: string, password: string) => apiRequest<LoginResponse>("/auth/login", { method: "POST", body: { phone, password } }),
  me: (token: string) => apiRequest<MeResponse>("/me", { token }),
  dashboard: (token: string) => apiRequest<DashboardResponse>("/admin/dashboard", { token }),
  drivers: (token: string) => apiRequest<{ drivers: Array<{ id: string; user?: User; routes?: DriverRoute[] }> }>("/admin/drivers", { token }),
  requests: (token: string) => apiRequest<{ requests: PassengerRequest[] }>("/admin/requests", { token }),
  orders: (token: string) => apiRequest<{ orders: MerchantOrder[] }>("/admin/orders", { token }),
  routes: (token: string) => apiRequest<{ routes: DriverRoute[] }>("/admin/routes", { token }),
  trips: (token: string) => apiRequest<{ trips: Trip[] }>("/trips", { token }),
  trip: (token: string, id: string) => apiRequest<{ trip: Trip }>(`/trips/${id}`, { token }),
  latestLocation: (token: string, id: string) => apiRequest<{ location: LocationEvent | null }>(`/trips/${id}/location`, { token })
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
      if (options.token) clientOptions.onSessionEnded?.(error);
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
