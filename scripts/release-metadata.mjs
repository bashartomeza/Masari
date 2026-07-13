import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(new URL("../", import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const options = new Map();
for (let i = 2; i < process.argv.length; i++) {
  const item = process.argv[i];
  if (item === "--") continue;
  if (item.includes("=") && item.startsWith("--")) {
    const [key, ...value] = item.split("=");
    options.set(key, value.join("="));
  } else options.set(item, process.argv[++i]);
}
const output = resolve(options.get("--output") ?? `${root}/release/metadata.json`);
const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const git = (...args) => spawnSync("git", args, { cwd: root, encoding: "utf8" }).stdout.trim();
const buildDate = process.env.SOURCE_DATE_EPOCH
  ? new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000).toISOString()
  : new Date().toISOString();
const artifacts = {};
for (const [key, flag] of [["api", "--api"], ["admin", "--admin"], ["mobile", "--mobile"]]) {
  const path = options.get(flag);
  if (path && existsSync(resolve(path))) artifacts[key] = { file: basename(path), sha256: sha256(resolve(path)) };
}
const migrationDir = resolve(root, "apps/api/prisma/migrations");
const migrations = (await import("node:fs")).readdirSync(migrationDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory()).map((entry) => {
    const path = resolve(migrationDir, entry.name, "migration.sql");
    return { name: entry.name, sha256: sha256(path) };
  });
const metadata = {
  schema_version: 1,
  git: { commit: git("rev-parse", "HEAD"), branch: git("branch", "--show-current") },
  app_release: options.get("--release") ?? process.env.APP_RELEASE ?? "unreleased",
  environment: options.get("--environment") ?? process.env.APP_ENV ?? "unspecified",
  build_date: buildDate,
  toolchain: {
    node: readFileSync(resolve(root, ".nvmrc"), "utf8").trim(),
    flutter: readFileSync(resolve(root, ".flutter-version"), "utf8").trim(),
    java: readFileSync(resolve(root, ".java-version"), "utf8").trim()
  },
  artifacts,
  migrations
};
mkdirSync(resolve(output, ".."), { recursive: true });
writeFileSync(output, `${JSON.stringify(metadata, null, 2)}\n`);
console.log(`Release metadata written: ${output}`);
