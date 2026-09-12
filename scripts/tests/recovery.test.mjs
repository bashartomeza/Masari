import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { normalizeMysqlDump, safeRestoreDatabaseName } from "../lib/mysql-tools.mjs";

const root = resolve(new URL("../../", import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const node = process.execPath;

test("isolated restore database naming is fail-closed", () => {
  assert.equal(safeRestoreDatabaseName("masari_restore_rehearsal_20260713"), true);
  for (const unsafe of ["masari", "production", "masari_restore_", "masari_restore_x;DROP DATABASE masari"])
    assert.equal(safeRestoreDatabaseName(unsafe), false);
});

test("single-statement trigger dumps retain data and normalize only the invalid delimiter", () => {
  const dump = Buffer.from([
    "INSERT INTO `example` VALUES ('literal ); */;; remains');",
    "DELIMITER ;;",
    "/*!50003 CREATE*/ /*!50003 TRIGGER `guard` BEFORE UPDATE ON `example` FOR EACH ROW SET NEW.`status` = IF(1, NEW.`status`, NULL)",
    "); */;;",
    "DELIMITER ;",
    "INSERT INTO `example` VALUES ('after ); */;; remains');",
    ""
  ].join("\n"));
  const normalized = normalizeMysqlDump(dump).toString("utf8");
  assert.match(normalized, /\n\) \*\/;;\nDELIMITER ;/);
  assert.match(normalized, /literal \); \*\/;; remains/);
  assert.match(normalized, /after \); \*\/;; remains/);
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
      "20260719203000_public_onboarding_scopes",
      "20260721110000_canonical_route_catalog",
      "20260721170000_enforce_route_catalog_integrity",
      "20260722130000_multi_route_operational_foundation",
      "20260722143000_isolate_canonical_availability",
      "20260722180000_harden_multi_route_operations",
      "20260722200000_enforce_operational_mode_and_expiry_quarantine",
      "20260726130000_canonical_matching_dispatch",
      "20260726170000_enforce_match_trip_availability_mode",
      "20260727110000_harden_canonical_assignment_integrity",
      "20260728130000_canonical_shared_trip_aggregation",
      "20260729120000_harden_canonical_shared_trip_integrity",
      "20260819150000_driver_verification_approval",
      "20260820120000_global_e164_phone_constraints",
      "20260821120000_consent_management_workflow"
    ]
  );
  rmSync(directory, { recursive: true, force: true });
});
