import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(new URL("../../", import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const migrationRoot = resolve(root, "apps/api/prisma/migrations");
const expected = {
  "20260713114812_mysql_baseline": "77249c976947c6ff53975f78d60cb268c7dc22fe157cfde4c1f90fc93ee4042d",
  "20260713114851_preserve_text_capacity": "7da499b45db3782c861e74ad146c2d359bbc25b6af06a97f413c6d0fc4af6eaa",
  "20260717094000_trusted_sessions": "0ff9b924bd942647727eb8db9825d44bbf0d72542b952884bf6ae39238ee22ce",
  "20260717195454_onboarding_foundation": "fa992faa0767fecb247c09948f2ef01dfc4acdb5f557ac6c616a70b160a418cd",
  "20260719120000_harden_onboarding_foundation": "908fcdd4404cfba8b3f4d3617d746e8bd605a91ae8e7e179913f25560bb9a7fa",
  "20260719123000_enforce_single_invitation_attempt": "87ca5c72bb496c1a7a68e96f01ff8047e33f2489a129c7db97377a8cc872086e",
  "20260719203000_public_onboarding_scopes": "33200cf1528fa8b68135373f0a6a195cae06955a16d3f0b7faf739104b9818d8",
  "20260721110000_canonical_route_catalog": "bba0b3807998394b35a20d68b0f5cbf637eb10f4bbf4a5e34cce253e8749adbc",
  "20260721170000_enforce_route_catalog_integrity": "9b6896aa311bc597db1cb17a39328017243497f6c90e5aa106062bf8c5c7edc2",
  "20260722130000_multi_route_operational_foundation": "f306c5a5122d9376dc8399703e1bbf834117f1ccda38937352bebcafdc8ae30c",
  "20260722143000_isolate_canonical_availability": "530aaac38e8f7e9533855bf7005832ee8b126bc3072706c9d77b34551e0b350c",
  "20260722180000_harden_multi_route_operations": "0a2f166377916bf44f2e45f7d70c7775dfc360b573367fa764f6ec5e15938684"
};

function normalizedChecksum(path) {
  const normalized = readFileSync(path, "utf8").replaceAll("\r\n", "\n");
  return createHash("sha256").update(Buffer.from(normalized, "utf8")).digest("hex");
}

test("approved Prisma migration history remains byte-stable apart from line endings", () => {
  const names = readdirSync(migrationRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  assert.deepEqual(names, Object.keys(expected).sort());
  for (const [name, checksum] of Object.entries(expected)) {
    assert.equal(
      normalizedChecksum(resolve(migrationRoot, name, "migration.sql")),
      checksum,
      `${name} does not match its approved canonical checksum`
    );
  }
});
