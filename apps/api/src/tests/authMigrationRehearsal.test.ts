import { describe, expect, it } from "vitest";

const { runAuthMigrationRehearsal } = await import(
  new URL("../../../../scripts/auth-migration-rehearsal.mjs", import.meta.url).href
);

describe("auth migration rehearsal", () => {
  it("rejects a non-disposable rehearsal database", async () => {
    await expect(runAuthMigrationRehearsal({ database: "masari" }))
      .rejects.toThrow("disposable_database_required");
  });
});
