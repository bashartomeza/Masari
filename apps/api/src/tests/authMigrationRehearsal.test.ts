import { describe, expect, it } from "vitest";

const { runAuthMigrationRehearsal } = await import(
  new URL("../../../../scripts/auth-migration-rehearsal.mjs", import.meta.url).href
);

describe("auth migration rehearsal", () => {
  it("rejects a non-disposable rehearsal database", async () => {
    await expect(runAuthMigrationRehearsal({ database: "masari" }))
      .rejects.toThrow("disposable_database_required");
  });

  it("backfills google_sub without dropping it", async () => {
    const report = await runAuthMigrationRehearsal({
      database: "masari_auth_rehearsal_task_2",
      legacyUsers: [{ id: "legacy-user", google_sub: "legacy-sub" }]
    });

    expect(report.externalIdentities).toContainEqual(
      expect.objectContaining({
        user_id: "legacy-user",
        provider: "google",
        provider_subject: "legacy-sub"
      })
    );
    expect(report.legacyGoogleSubColumnPresent).toBe(true);
  });

  it("aborts the fixture rehearsal when legacy Google subjects conflict", async () => {
    await expect(
      runAuthMigrationRehearsal({
        database: "masari_auth_rehearsal_task_2",
        legacyUsers: [
          { id: "legacy-user-1", google_sub: "duplicate-sub" },
          { id: "legacy-user-2", google_sub: "duplicate-sub" }
        ]
      })
    ).rejects.toThrow("external_identity_duplicate_google_subject");
  });

  it("aborts the fixture rehearsal when a Google identity already conflicts", async () => {
    await expect(
      runAuthMigrationRehearsal({
        database: "masari_auth_rehearsal_task_2",
        legacyUsers: [{ id: "legacy-user", google_sub: "legacy-sub" }],
        existingExternalIdentities: [
          { user_id: "other-user", provider: "google", provider_subject: "legacy-sub" }
        ]
      })
    ).rejects.toThrow("external_identity_google_subject_conflict");
  });
});
