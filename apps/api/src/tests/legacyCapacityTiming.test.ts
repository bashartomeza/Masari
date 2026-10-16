import { describe, expect, it, vi } from "vitest";
import { reserveLegacyCapacity } from "../services/legacyCapacity.js";

describe("legacy capacity timing boundary", () => {
  it("guards departure and expiry in the same atomic capacity claim while allowing undated routes", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const before = new Date();
    await reserveLegacyCapacity({ driverRoute: { updateMany } } as never,
      { driverRouteId: "route_1", seats: 1, parcelUnits: 0 });
    const where = updateMany.mock.calls[0]![0].where;
    expect(where.departed_at).toBeNull();
    expect(where.AND).toEqual(expect.arrayContaining([
      { OR: [{ departure_at: null }, { departure_at: { gt: expect.any(Date) } }] },
      { OR: [{ availability_window_end: null }, { availability_window_end: { gt: expect.any(Date) } }] },
    ]));
    expect(where.AND[0].OR[1].departure_at.gt.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });
});
