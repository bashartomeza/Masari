import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join, relative } from "node:path";
import { run } from "./lib/process.mjs";
import { inspectManifest, readApkManifest } from "./lib/apk-location-policy.mjs";

const args = new Map();
for (let index = 2; index < process.argv.length; index++) {
  const item = process.argv[index];
  if (item === "--") continue;
  if (item.includes("=") && item.startsWith("--")) {
    const [key, ...value] = item.split("=");
    args.set(key, value.join("="));
  } else if (item.startsWith("--")) args.set(item, process.argv[++index]);
}
const positional = process.argv.slice(2).filter((value) => value !== "--" && !value.startsWith("--"));
if (!args.has("--admin-dir") && positional[0] && !positional[0].toLowerCase().endsWith(".apk")) args.set("--admin-dir", positional[0]);
if (!args.has("--apk")) {
  const apk = positional.find((value) => value.toLowerCase().endsWith(".apk"));
  if (apk) args.set("--apk", apk);
}
const roots = [];
const findings = [];
let temporary;
if (args.has("--admin-dir")) roots.push(resolve(args.get("--admin-dir")));
try {
  if (args.has("--apk")) {
    const apk = resolve(args.get("--apk"));
    for (const rule of inspectManifest(readApkManifest(apk))) findings.push({ rule, file: "AndroidManifest.xml" });
    temporary = mkdtempSync(join(tmpdir(), "masari-apk-scan-"));
    try {
      run("jar", ["-xf", apk], { cwd: temporary });
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      run("tar", ["-xf", apk, "-C", temporary]);
    }
    roots.push(temporary);
  }
  if (!roots.length) throw new Error("Provide --admin-dir <path> and/or --apk <path>");

  const rules = [
    ["demo reset endpoint", /\/api\/v1\/demo\/reset/i],
    ["demo reset header", /x-demo-reset-key/i],
    ["full demo sequence", /Full Demo Sequence/],
    ["simulation mutation", /\/simulate\/(?:step|reset)/i],
    ["known demo credential label", /DEMO_(?:PASSENGER|DRIVER|MERCHANT|ADMIN)_(?:EMAIL|PASSWORD)/],
    ["route provider server secret", /ROUTE_PROVIDER_SECRET|MAPBOX_ACCESS_TOKEN|GOOGLE_MAPS_API_KEY|HERE_API_KEY|STADIA_API_KEY/i],
    ["Flutter background location dependency", /\b(?:background_locator|flutter_background_geolocation)\b/i]
  ];
  const utf16be = new TextDecoder("utf-16be");
  function walk(root, path = root) {
    for (const entry of readdirSync(path)) {
      const file = join(path, entry);
      if (statSync(file).isDirectory()) walk(root, file);
      else {
        const buffer = readFileSync(file);
        const contents = [
          buffer.toString("utf8"), buffer.toString("utf16le"), buffer.subarray(1).toString("utf16le"),
          utf16be.decode(buffer), utf16be.decode(buffer.subarray(1))
        ];
        for (const [rule, pattern] of rules) if (contents.some((content) => pattern.test(content))) findings.push({ rule, file: relative(root, file) });
      }
    }
  }
  for (const root of roots) walk(root);
  for (const finding of findings) console.error(`ARTIFACT ${finding.rule}: ${finding.file}`);
  if (findings.length) process.exitCode = 1;
  else console.log("Production artifact scan passed.");
} finally {
  if (temporary) rmSync(temporary, { recursive: true, force: true });
}
