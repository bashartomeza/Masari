import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { safeRestoreDatabaseName } from "../lib/mysql-tools.mjs";

const root = resolve(new URL("../../", import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const node = process.execPath;

test("isolated restore database naming is fail-closed", () => {
  assert.equal(safeRestoreDatabaseName("masari_restore_rehearsal_20260713"), true);
  for (const unsafe of ["masari", "production", "masari_restore_", "masari_restore_x;DROP DATABASE masari"])
    assert.equal(safeRestoreDatabaseName(unsafe), false);
});

test("backup fails safely when ignored configuration is missing", () => {
  const missing = join(tmpdir(), `missing-masari-${Date.now()}.env`);
  const result = spawnSync(node, ["scripts/mysql-backup.mjs"], {
    cwd: root,
    env: { ...process.env, DATABASE_URL: "", MASARI_ENV_FILE: missing },
    encoding: "utf8"
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Backup failed safely/);
  assert.doesNotMatch(result.stderr, /mysql:\/\//);
});

test("restore rejects an unsafe destination before database access", () => {
  const directory = mkdtempSync(join(tmpdir(), "masari-restore-test-"));
  const dump = join(directory, "test.sql");
  writeFileSync(dump, "SELECT 1;\n");
  const result = spawnSync(node, ["scripts/mysql-restore-verify.mjs", "--dump", dump, "--database", "masari", "--confirm-isolated"], {
    cwd: root, encoding: "utf8"
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Restore database must match/);
  rmSync(directory, { recursive: true, force: true });
});

test("release metadata is reproducible with SOURCE_DATE_EPOCH and excludes secret fields", () => {
  const directory = mkdtempSync(join(tmpdir(), "masari-metadata-test-"));
  const first = join(directory, "one.json");
  const second = join(directory, "two.json");
  const env = { ...process.env, SOURCE_DATE_EPOCH: "1783900800", APP_RELEASE: "m6b2-test", APP_ENV: "staging" };
  for (const output of [first, second]) {
    const result = spawnSync(node, ["scripts/release-metadata.mjs", "--output", output], { cwd: root, env, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
  }
  const content = readFileSync(first, "utf8");
  assert.equal(content, readFileSync(second, "utf8"));
  for (const forbidden of ["DATABASE_URL", "JWT_SECRET", "DEMO_RESET_KEY", "password"])
    assert.equal(content.includes(forbidden), false);
  const metadata = JSON.parse(content);
  assert.ok(metadata.git.commit);
  assert.deepEqual(
    metadata.migrations.map((migration) => migration.name).sort(),
    [
      "20260713114812_mysql_baseline",
      "20260713114851_preserve_text_capacity",
      "20260717094000_trusted_sessions",
      "20260717195454_onboarding_foundation",
      "20260719120000_harden_onboarding_foundation",
      "20260719123000_enforce_single_invitation_attempt",
      "20260719203000_public_onboarding_scopes"
    ]
  );
  rmSync(directory, { recursive: true, force: true });
});
