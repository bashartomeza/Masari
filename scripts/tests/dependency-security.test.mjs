import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const apiPackageJson = JSON.parse(readFileSync(resolve(root, "apps/api/package.json"), "utf8"));
const adminPackageJson = JSON.parse(readFileSync(resolve(root, "apps/admin/package.json"), "utf8"));
const lockfile = JSON.parse(readFileSync(resolve(root, "package-lock.json"), "utf8"));

test("security remediation keeps vulnerable dependency floors fixed", () => {
  assert.deepEqual(packageJson.overrides, {
    "@prisma/adapter-mariadb": {
      mariadb: "3.5.4"
    },
    "deepmerge-ts": "8.0.1",
    "fast-uri": "3.1.9",
    mariadb: "3.5.4",
    mysql2: "3.23.1",
    prisma: {
      mysql2: "3.23.1"
    },
    qs: "6.16.0"
  });
  assert.equal(apiPackageJson.devDependencies.vitest, "4.1.11");
  assert.equal(adminPackageJson.devDependencies.vitest, "4.1.11");
  assert.equal(adminPackageJson.dependencies.vite, "8.3.5");
  assert.equal(packageJson.devDependencies.vite, "8.3.5");
  assert.equal(apiPackageJson.dependencies.zod, "4.6.7");

  const expected = {
    "node_modules/deepmerge-ts": "8.0.1",
    "node_modules/mariadb": "3.5.4",
    "node_modules/vite": "8.3.5",
    "node_modules/zod": "4.6.7",
    "node_modules/mysql2": "3.23.1",
    "node_modules/qs": "6.16.0",
    "node_modules/vitest": "4.1.11"
  };
  // fast-uri is held at its fixed floor by the override, but no longer sits in the
  // tree at all; if something reintroduces it, it must not be a vulnerable one.
  const fastUri = lockfile.packages["node_modules/fast-uri"]?.version;
  if (fastUri) assert.equal(fastUri, "3.1.9");
  for (const [path, version] of Object.entries(expected)) {
    assert.equal(lockfile.packages[path]?.version, version, `${path} must stay on ${version}`);
  }
});
