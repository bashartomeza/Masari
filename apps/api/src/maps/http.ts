import { RouteProviderError } from "./contracts.js";

export type ProviderFetch = typeof fetch;

export type ProviderHttpOptions = Readonly<{
  connectTimeoutMs?: number;
  requestTimeoutMs: number;
  maxRetries: number;
  fetchImpl?: ProviderFetch;
  sleep?: (milliseconds: number) => Promise<void>;
}>;

function statusError(status: number) {
  if (status === 401 || status === 403) return new RouteProviderError("provider_unauthorized");
  if (status === 429) return new RouteProviderError("provider_rate_limited");
  return new RouteProviderError("provider_unavailable");
}

const MAX_PROVIDER_JSON_BYTES = 1_000_000;

async function boundedJson(response: Response) {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_PROVIDER_JSON_BYTES) {
    throw new RouteProviderError("malformed_provider_response");
  }
  if (!response.body) throw new RouteProviderError("malformed_provider_response");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let body = "";
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    bytes += chunk.value.byteLength;
    if (bytes > MAX_PROVIDER_JSON_BYTES) {
      await reader.cancel();
      throw new RouteProviderError("malformed_provider_response");
    }
    body += decoder.decode(chunk.value, { stream: true });
  }
  body += decoder.decode();
  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new RouteProviderError("malformed_provider_response");
  }
}

export async function providerJson(url: URL, init: RequestInit, options: ProviderHttpOptions) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep = options.sleep ?? ((milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  const deadline = performance.now() + options.requestTimeoutMs;
  const maxRetries = Math.min(1, Math.max(0, Math.trunc(options.maxRetries)));
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    let response: Response;
    try {
      const remainingMs = Math.floor(deadline - performance.now());
      if (remainingMs <= 0) throw new RouteProviderError("provider_timeout");
      const connectController = new AbortController();
      const connectTimer = setTimeout(() => connectController.abort(), Math.min(options.connectTimeoutMs ?? remainingMs, remainingMs));
      try {
        response = await fetchImpl(url, { ...init, redirect: "manual", signal: AbortSignal.any([AbortSignal.timeout(remainingMs), connectController.signal]) });
      } finally {
        clearTimeout(connectTimer);
      }
    } catch (error) {
      if (error instanceof RouteProviderError) throw error;
      const timedOut = error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
      if (timedOut) throw new RouteProviderError("provider_timeout");
      if (attempt < maxRetries) {
        const backoffMs = 100 * 2 ** attempt;
        if (performance.now() + backoffMs >= deadline) throw new RouteProviderError("provider_timeout");
        await sleep(backoffMs);
        continue;
      }
      throw new RouteProviderError("provider_unavailable");
    }
    if (response.ok) {
      try {
        return await boundedJson(response);
      } catch (error) {
        if (error instanceof RouteProviderError) throw error;
        const timedOut = error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
        throw new RouteProviderError(timedOut ? "provider_timeout" : "provider_unavailable");
      }
    }
    if (response.status >= 500 && attempt < maxRetries) {
      const backoffMs = 100 * 2 ** attempt;
      if (performance.now() + backoffMs >= deadline) throw new RouteProviderError("provider_timeout");
      await sleep(backoffMs);
      continue;
    }
    throw statusError(response.status);
  }
  throw new RouteProviderError("provider_unavailable");
}

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new RouteProviderError("malformed_provider_response");
  return value as Record<string, unknown>;
}

export function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new RouteProviderError("malformed_provider_response");
  return value;
}

export function string(value: unknown) {
  if (typeof value !== "string" || value.length === 0) throw new RouteProviderError("malformed_provider_response");
  return value;
}

export function boundedString(value: unknown, maximumLength: number) {
  const result = string(value);
  if (result.length > maximumLength) throw new RouteProviderError("malformed_provider_response");
  return result;
}

export function finite(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new RouteProviderError("malformed_provider_response");
  return value;
}
