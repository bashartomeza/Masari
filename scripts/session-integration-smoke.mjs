import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: resolve(import.meta.dirname, "../apps/api/.env"), quiet: true });

const apiOrigin = (process.env.API_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const apiBaseUrl = `${apiOrigin}/api/v1`;
const databaseUrl = process.env.DATABASE_URL;
const databaseName = databaseUrl ? new URL(databaseUrl).pathname.slice(1) : "";
const resetKey = process.env.DEMO_RESET_KEY;
const passengerCredentials = ["+970590000001", process.env.DEMO_PASSENGER_PASSWORD];
const adminCredentials = ["+970590000005", process.env.DEMO_ADMIN_PASSWORD];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertSafeShape(value, context) {
  const serialized = JSON.stringify(value);
  for (const forbidden of ["token_hash", "password_hash", "refresh_token_pepper", "security_version_at_issue", "revoke_reason"]) {
    assert(!serialized.includes(forbidden), `${context} exposed ${forbidden}`);
  }
}

async function call(path, { token, method = "GET", body, headers = {}, expected = [200] } = {}) {
  const requestHeaders = { "content-type": "application/json", ...headers };
  if (token) requestHeaders.authorization = `Bearer ${token}`;
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10_000)
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  assertSafeShape(data, `${method} ${path}`);
  const allowed = Array.isArray(expected) ? expected : [expected];
  if (!allowed.includes(response.status)) {
    throw new Error(`${method} ${path}: expected ${allowed.join("/")}, received ${response.status} (${data?.error ?? "no error code"})`);
  }
  return { status: response.status, data };
}

async function reset() {
  return call("/demo/reset", {
    method: "POST",
    body: {},
    headers: { "x-demo-reset-key": resetKey }
  });
}

async function login([phone, password], deviceName) {
  const { data } = await call("/auth/login", {
    method: "POST",
    body: { phone, password, device_name: deviceName }
  });
  return data;
}

async function expectRejected(path, token, statuses = [401]) {
  const { status } = await call(path, { token, expected: statuses });
  assert(statuses.includes(status), `${path} unexpectedly accepted a revoked identity`);
}

async function run() {
  assert(process.env.APP_ENV === "demo", "Trusted-session integration requires APP_ENV=demo");
  assert(databaseName.endsWith("_ci"), "Trusted-session integration refuses a database not ending in _ci");
  assert(resetKey && passengerCredentials[1] && adminCredentials[1], "Required demo credentials are unavailable");
  await reset();

  const initial = await login(passengerCredentials, "integration-initial");
  assert(initial.token && initial.refresh_token, "Eligible mobile login did not issue both token classes");
  assert(initial.token === initial.access_token, "Legacy token compatibility changed");
  const initialSessions = (await call("/auth/sessions", { token: initial.token })).data.sessions;
  assert(initialSessions.length === 1 && initialSessions[0].is_current, "Initial server session was not persisted");

  const rotated = (
    await call("/auth/refresh", { method: "POST", body: { refresh_token: initial.refresh_token } })
  ).data;
  assert(rotated.refresh_token && rotated.refresh_token !== initial.refresh_token, "Refresh token did not rotate");
  await call("/auth/refresh", {
    method: "POST",
    body: { refresh_token: initial.refresh_token },
    expected: [401]
  });
  await expectRejected("/me", rotated.token);

  const raceLogin = await login(passengerCredentials, "integration-race");
  const race = await Promise.all([
    call("/auth/refresh", {
      method: "POST",
      body: { refresh_token: raceLogin.refresh_token },
      expected: [200, 401]
    }),
    call("/auth/refresh", {
      method: "POST",
      body: { refresh_token: raceLogin.refresh_token },
      expected: [200, 401]
    })
  ]);
  assert(race.filter((result) => result.status === 200).length === 1, "Concurrent refresh did not produce exactly one success");
  assert(race.filter((result) => result.status === 401).length === 1, "Concurrent refresh did not reject exactly one contender");
  const raceWinner = race.find((result) => result.status === 200).data;
  await expectRejected("/me", raceWinner.token);

  const primary = await login(passengerCredentials, "integration-primary");
  const secondary = await login(passengerCredentials, "integration-secondary");
  const sessions = (await call("/auth/sessions", { token: primary.token })).data.sessions;
  const secondarySession = sessions.find((item) => item.id === secondary.session.id);
  assert(secondarySession && !secondarySession.is_current, "Own session listing did not include the second session");
  await call(`/auth/sessions/${secondary.session.id}`, { token: primary.token, method: "DELETE" });
  await expectRejected("/me", secondary.token);
  await call("/me", { token: primary.token });

  await call("/auth/logout", { token: primary.token, method: "POST" });
  await call("/auth/logout", { token: primary.token, method: "POST" });
  await expectRejected("/me", primary.token);

  const allOne = await login(passengerCredentials, "integration-all-one");
  const allTwo = await login(passengerCredentials, "integration-all-two");
  await call("/auth/logout-all", { token: allOne.token, method: "POST" });
  await expectRejected("/me", allOne.token);
  await expectRejected("/me", allTwo.token);

  const target = await login(passengerCredentials, "integration-status-target");
  const administrator = await login(adminCredentials, "integration-admin");
  assert(!("refresh_token" in administrator), "Admin browser login received a long-lived refresh token");
  await call(`/admin/users/${target.user.id}/status`, {
    token: administrator.token,
    method: "PATCH",
    body: { status: "suspended", reason: "Automated integration suspension" }
  });
  await expectRejected("/me", target.token, [403]);
  await call("/auth/login", {
    method: "POST",
    body: { phone: passengerCredentials[0], password: passengerCredentials[1] },
    expected: [403]
  });
  await call(`/admin/users/${target.user.id}/status`, {
    token: administrator.token,
    method: "PATCH",
    body: { status: "active" }
  });
  await expectRejected("/me", target.token);
  const reactivated = await login(passengerCredentials, "integration-reactivated");
  await call("/me", { token: reactivated.token });

  await reset();
  return {
    ok: true,
    databasePolicy: "dedicated _ci database",
    rotation: "passed",
    reuseRevocation: "passed",
    concurrency: "exactly one success",
    sessionRevocation: "passed",
    logoutAll: "passed",
    accountStatus: "passed",
    cleanup: "passed"
  };
}

try {
  console.log(JSON.stringify(await run()));
} catch (error) {
  console.error(`[session-integration] FAILED: ${error instanceof Error ? error.message : "unknown error"}`);
  process.exitCode = 1;
}
