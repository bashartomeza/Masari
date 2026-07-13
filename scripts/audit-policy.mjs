import { spawnSync } from "node:child_process";
import { executable } from "./lib/process.mjs";

const approvedModerate = new Set(["@hono/node-server", "@prisma/dev", "prisma"]);
const npmFile = process.platform === "win32" && process.env.npm_execpath ? process.execPath : executable("npm");
const npmArgs = process.platform === "win32" && process.env.npm_execpath
  ? [process.env.npm_execpath, "audit", "--omit=dev", "--json"]
  : ["audit", "--omit=dev", "--json"];
const result = spawnSync(npmFile, npmArgs, { encoding: "utf8", shell: false });
if (result.error) throw result.error;
let report;
try { report = JSON.parse(result.stdout || "{}"); } catch { throw new Error("npm audit did not return valid JSON"); }
const vulnerabilities = report.vulnerabilities ?? {};
const blocking = [];
const approved = [];
for (const [name, item] of Object.entries(vulnerabilities)) {
  if (["high", "critical"].includes(item.severity)) blocking.push(`${name} (${item.severity})`);
  else if (item.severity === "moderate") {
    if (approvedModerate.has(name)) approved.push(name);
    else blocking.push(`${name} (moderate, not approved)`);
  }
}
if (approved.length) console.log(`Documented Prisma CLI moderate exception: ${approved.sort().join(", ")}.`);
if (blocking.length) {
  for (const item of blocking) console.error(`AUDIT ${item}`);
  process.exit(1);
}
console.log("Dependency audit policy passed: no high, critical, or unapproved moderate findings.");
