import { afterEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "./api";

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("Admin driver verification API client", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("loads the pending queue and detail with the Admin bearer token", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ verifications: [], page: 1, limit: 50, total: 0 }))
      .mockResolvedValueOnce(response({ verification: { id: "verification_1" } }));
    vi.stubGlobal("fetch", fetchMock);
    const api = createApiClient("http://api.test");

    await api.driverVerifications("admin-token", "pending");
    await api.driverVerification("admin-token", "driver/user 1");

    expect(fetchMock).toHaveBeenNthCalledWith(1, "http://api.test/api/v1/admin/driver-verifications?status=pending&page=1&limit=50", expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer admin-token" }) }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, "http://api.test/api/v1/admin/driver-verifications/driver%2Fuser%201", expect.objectContaining({ method: "GET" }));
  });

  it("sends revision-protected approval with only explicit profile values", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ verification: { status: "approved" } }));
    vi.stubGlobal("fetch", fetchMock);
    const api = createApiClient("http://api.test");

    await api.approveDriverVerification("admin-token", "driver_1", 4, {
      vehicle_type: "sedan",
      seats_total: 4,
      parcel_capacity: 6
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/api/v1/admin/driver-verifications/driver_1/approve",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ expected_revision: 4, profile: { vehicle_type: "sedan", seats_total: 4, parcel_capacity: 6 } })
      })
    );
  });

  it("sends the required rejection reason and preserves conflict status for stale reloads", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ error: "driver_verification_state_conflict" }, 409));
    vi.stubGlobal("fetch", fetchMock);
    const api = createApiClient("http://api.test");

    await expect(api.rejectDriverVerification("admin-token", "driver_1", 2, "Documents are unclear")).rejects.toEqual(
      expect.objectContaining({ message: "driver_verification_state_conflict", status: 409 })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/api/v1/admin/driver-verifications/driver_1/reject",
      expect.objectContaining({ body: JSON.stringify({ expected_revision: 2, reason: "Documents are unclear" }) })
    );
  });

  it("loads the bounded user directory with role, status, search, and demo filters", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ users: [], page: 2, limit: 25, total: 0 }));
    vi.stubGlobal("fetch", fetchMock);
    const api = createApiClient("http://api.test");

    await api.users("admin-token", "driver", "pending", 2, 25, "QA driver", "real");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/api/v1/admin/users?page=2&limit=25&search=QA+driver&role=driver&account_status=pending&demo_account=false",
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer admin-token" }) })
    );
  });

  it("unwraps the safe user detail and sends an expected-status guard", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ user: { id: "user_1", role: "passenger" } }))
      .mockResolvedValueOnce(response({ user: { id: "user_1", account_status: "suspended" } }));
    vi.stubGlobal("fetch", fetchMock);
    const api = createApiClient("http://api.test");

    await expect(api.user("admin-token", "user/1")).resolves.toEqual({ user: { id: "user_1", role: "passenger" } });
    await api.updateUserStatus("admin-token", "user_1", "suspended", "policy breach", "active");
    expect(fetchMock).toHaveBeenNthCalledWith(2, "http://api.test/api/v1/admin/users/user_1/status", expect.objectContaining({ body: JSON.stringify({ status: "suspended", reason: "policy breach", expected_status: "active" }) }));
  });

  it("refuses an Admin status mutation without the visible expected status", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ user: { id: "user_1", account_status: "active" } }));
    vi.stubGlobal("fetch", fetchMock);
    const api = createApiClient("http://api.test");

    await expect(
      api.updateUserStatus("admin-token", "user_1", "active", undefined, undefined as never)
    ).rejects.toThrow("Expected account status is required");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses the dedicated bounded Admin trip APIs and sends the visible status snapshot", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ trips: [], page: 2, limit: 25, total: 0 }))
      .mockResolvedValueOnce(response({ trip: { id: "trip/1", status: "accepted" } }))
      .mockResolvedValueOnce(response({ trip: { id: "trip/1", status: "pickup_started" } }));
    vi.stubGlobal("fetch", fetchMock);
    const api = createApiClient("http://api.test");

    await api.adminTrips("admin-token", "accepted", "legacy", 2, 25, "QA driver");
    await api.adminTrip("admin-token", "trip/1");
    await api.advanceAdminTrip("admin-token", "trip/1", "pickup_started", "accepted");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://api.test/api/v1/admin/trips?page=2&limit=25&search=QA+driver&status=accepted&kind=legacy",
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer admin-token" }) }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(2, "http://api.test/api/v1/admin/trips/trip%2F1", expect.objectContaining({ method: "GET" }));
    expect(fetchMock).toHaveBeenNthCalledWith(3, "http://api.test/api/v1/admin/trips/trip%2F1/status", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ status: "pickup_started", expected_status: "accepted" }),
    }));
  });

  it("sends observed current-version expectations for every route lifecycle mutation", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ version: { id: "version_1" } }))
      .mockResolvedValueOnce(response({ version: { id: "version_1" } }))
      .mockResolvedValueOnce(response({ version: { id: "version_1" } }))
      .mockResolvedValueOnce(response({ route: { id: "route_1" } }));
    vi.stubGlobal("fetch", fetchMock);
    const api = createApiClient("http://api.test");

    await api.routeVersionAction(
      "admin-token",
      "version_1",
      "pause",
      { reason: "review", expected_current_version_id: "version_1" },
      "pause-key"
    );
    await api.routeVersionAction(
      "admin-token",
      "version_1",
      "resume",
      { expected_current_version_id: "version_1" },
      "resume-key"
    );
    await api.routeVersionAction(
      "admin-token",
      "version_1",
      "retire",
      { reason: "superseded", expected_current_version_id: "version_1" },
      "retire-key"
    );
    await api.retireServiceRoute(
      "admin-token",
      "route_1",
      { reason: "service ended", expected_current_version_id: null },
      "route-retire-key"
    );

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      reason: "review",
      expected_current_version_id: "version_1"
    });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ expected_current_version_id: "version_1" });
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({
      reason: "superseded",
      expected_current_version_id: "version_1"
    });
    expect(JSON.parse(fetchMock.mock.calls[3][1].body)).toEqual({
      reason: "service ended",
      expected_current_version_id: null
    });
  });
});
