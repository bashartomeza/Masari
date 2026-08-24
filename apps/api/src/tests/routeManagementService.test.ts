import { describe, expect, it, vi } from "vitest";
import { HttpError } from "../middleware/error.js";
import { createRouteManagementService } from "../services/routeManagement.js";

const actor = { id: "admin_1", requestId: "request_1", idempotencyKey: "route-lifecycle-001" };

function lifecycleHarness(options: {
  targetVersionId: string;
  currentVersionId: string | null;
  lockedStatus: "published" | "paused" | "retired";
}) {
  const tx = {
    $queryRaw: vi.fn()
      .mockResolvedValueOnce([{ id: "route_1", status: "active", current_version_id: options.currentVersionId }])
      .mockResolvedValueOnce([{
        id: options.targetVersionId,
        service_route_id: "route_1",
        status: options.lockedStatus,
        draft_revision: 1
      }]),
    idempotencyRecord: {
      create: vi.fn().mockResolvedValue({ id: "claim_1", claim_version: 1 }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: vi.fn().mockResolvedValue({ id: "claim_1" })
    },
    serviceRouteVersion: {
      findUnique: vi.fn().mockResolvedValue({
        id: options.targetVersionId,
        service_route_id: "route_1",
        active_from: null,
        active_until: null
      }),
      update: vi.fn().mockResolvedValue({ id: options.targetVersionId, status: "retired" })
    },
    serviceRoute: {
      update: vi.fn(),
      findUnique: vi.fn().mockResolvedValue({ id: "route_1" })
    },
    driverRoute: { count: vi.fn().mockResolvedValue(0) },
    auditEvent: { create: vi.fn().mockResolvedValue({ id: "audit_1" }) }
  };
  const db = {
    $transaction: async (operation: (transaction: typeof tx) => Promise<unknown>) => operation(tx),
    serviceRoute: tx.serviceRoute
  };
  return { service: createRouteManagementService(db as never), tx };
}

async function expectCurrentVersionConflict(action: (service: ReturnType<typeof createRouteManagementService>) => Promise<unknown>) {
  const { service, tx } = lifecycleHarness({
    targetVersionId: "version_current",
    currentVersionId: "version_current",
    lockedStatus: "published"
  });

  await expect(action(service)).rejects.toEqual(new HttpError(409, "current_version_conflict"));
  expect(tx.serviceRouteVersion.update).not.toHaveBeenCalled();
  expect(tx.auditEvent.create).not.toHaveBeenCalled();
  expect(tx.idempotencyRecord.updateMany).not.toHaveBeenCalled();
}

describe("RouteManagementService lifecycle fences", () => {
  it("rejects a stale current pointer before pausing a version", async () => {
    await expectCurrentVersionConflict((service) => service.pauseVersion(
      "version_current",
      { reason: "stale operator view", expectedCurrentVersionId: "version_previous" },
      actor
    ));
  });

  it("rejects a stale current pointer before resuming a version", async () => {
    await expectCurrentVersionConflict((service) => service.resumeVersion(
      "version_current",
      { expectedCurrentVersionId: "version_previous" },
      actor
    ));
  });

  it("rejects a stale current pointer before retiring a version", async () => {
    const { service, tx } = lifecycleHarness({
      targetVersionId: "version_historical",
      currentVersionId: "version_current",
      lockedStatus: "paused"
    });

    await expect(service.retireVersion(
      "version_historical",
      { reason: "stale operator view", expectedCurrentVersionId: "version_previous" },
      actor
    )).rejects.toEqual(new HttpError(409, "current_version_conflict"));
    expect(tx.serviceRouteVersion.update).not.toHaveBeenCalled();
    expect(tx.auditEvent.create).not.toHaveBeenCalled();
    expect(tx.idempotencyRecord.updateMany).not.toHaveBeenCalled();
  });

  it("retires a historical version when its observed current pointer remains current", async () => {
    const { service, tx } = lifecycleHarness({
      targetVersionId: "version_historical",
      currentVersionId: "version_current",
      lockedStatus: "paused"
    });

    const result = await service.retireVersion(
      "version_historical",
      { reason: "superseded", expectedCurrentVersionId: "version_current" },
      actor
    );

    expect(result).toEqual({ resource: { id: "version_historical", status: "retired" }, replayed: false });
    expect(tx.serviceRoute.update).not.toHaveBeenCalled();
    expect(tx.serviceRouteVersion.update).toHaveBeenCalledOnce();
    expect(tx.auditEvent.create).toHaveBeenCalledOnce();
    expect(tx.idempotencyRecord.updateMany).toHaveBeenCalledOnce();
  });
});

describe("RouteManagementService admin detail query", () => {
  it("requests newest bounded versions and bounded ordered stops", async () => {
    const findUnique = vi.fn().mockResolvedValue({ id: "route_1" });
    const service = createRouteManagementService({ serviceRoute: { findUnique } } as never);

    await expect(service.getAdminRoute("route_1")).resolves.toEqual({ id: "route_1" });
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: "route_1" },
      include: expect.objectContaining({
        versions: expect.objectContaining({
          take: 50,
          orderBy: [{ version_number: "desc" }, { id: "desc" }],
          include: expect.objectContaining({
            stops: expect.objectContaining({ take: 100, orderBy: { sequence: "asc" } })
          })
        })
      })
    });
  });
});
