import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { executable } from "./lib/process.mjs";

if (process.env.APP_ENV !== "demo") throw new Error("CI MySQL integration requires APP_ENV=demo");
const database = new URL(process.env.DATABASE_URL).pathname.slice(1);
if (!database.endsWith("_ci")) throw new Error("CI MySQL integration refuses a database not ending in _ci");
const root = resolve(new URL("../", import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const child = spawn(process.execPath, ["apps/api/dist/server.js"], { cwd: root, env: process.env, stdio: "inherit" });
try {
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    await delay(500);
    try {
      const response = await fetch("http://127.0.0.1:3000/api/v1/health/ready");
      if (response.ok) { ready = true; break; }
    } catch {}
  }
  if (!ready) throw new Error("CI API did not become ready");
  const npmFile = process.platform === "win32" && process.env.npm_execpath ? process.execPath : executable("npm");
  const npmArgs = process.platform === "win32" && process.env.npm_execpath
    ? [process.env.npm_execpath, "run", "demo:smoke"]
    : ["run", "demo:smoke"];
  const smoke = spawn(npmFile, npmArgs, { cwd: root, env: process.env, stdio: "inherit" });
  const status = await new Promise((resolveStatus) => smoke.once("exit", resolveStatus));
  if (status !== 0) throw new Error("Real-MySQL deterministic smoke failed");
} finally {
  child.kill("SIGTERM");
  await Promise.race([new Promise((done) => child.once("exit", done)), delay(12_000)]);
  if (child.exitCode === null) child.kill("SIGKILL");
}
