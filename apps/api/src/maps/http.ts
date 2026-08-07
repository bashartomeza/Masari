import { RouteProviderError } from "./contracts.js";

export type ProviderFetch = typeof fetch;

export type ProviderHttpOptions = Readonly<{
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

export async function providerJson(url: URL, init: RequestInit, options: ProviderHttpOptions) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep = options.sleep ?? ((milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  for (let attempt = 0; attempt <= options.maxRetries; attempt += 1) {
    let response: Response;
    try {
      response = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(options.requestTimeoutMs) });
    } catch (error) {
      if (error instanceof RouteProviderError) throw error;
      const timedOut = error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
      if (timedOut) throw new RouteProviderError("provider_timeout");
      if (attempt < options.maxRetries) {
        await sleep(100 * 2 ** attempt);
        continue;
      }
      throw new RouteProviderError("provider_unavailable");
    }
    if (response.ok) {
      try {
        return await response.json() as unknown;
      } catch {
        throw new RouteProviderError("malformed_provider_response");
      }
    }
    if (response.status >= 500 && attempt < options.maxRetries) {
      await sleep(100 * 2 ** attempt);
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

export function finite(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new RouteProviderError("malformed_provider_response");
  return value;
}
