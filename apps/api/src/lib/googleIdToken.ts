import { createPublicKey } from "node:crypto";
import jwt from "jsonwebtoken";

type GoogleJwk = {
  kid?: string;
  kty?: string;
  n?: string;
  e?: string;
  alg?: string;
  use?: string;
};

/**
 * Minimal Google ID-token verifier.
 *
 * Google's OpenID configuration is stable enough that we hard-code the JWKS and
 * issuer endpoints rather than fetching the discovery document. Keys are cached
 * for the lifetime advertised by the JWKS response's `Cache-Control` header, so
 * steady-state sign-ins do no extra network I/O. Verification itself is done
 * locally with Node's crypto + `jsonwebtoken`; no third-party dependency.
 */

const GOOGLE_JWKS_URI = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"] as const;

export type GoogleIdentity = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
};

export class GoogleIdTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleIdTokenError";
  }
}

type CachedKey = { pem: string };
let keyCache = new Map<string, CachedKey>();
let keyCacheExpiresAt = 0;
let inflight: Promise<void> | null = null;

async function refreshKeys(): Promise<void> {
  const response = await fetch(GOOGLE_JWKS_URI);
  if (!response.ok) {
    throw new GoogleIdTokenError(`google_jwks_unavailable_${response.status}`);
  }
  const body = (await response.json()) as { keys?: GoogleJwk[] };
  if (!body.keys || body.keys.length === 0) {
    throw new GoogleIdTokenError("google_jwks_empty");
  }
  const next = new Map<string, CachedKey>();
  for (const jwk of body.keys) {
    if (!jwk.kid) continue;
    try {
      const pem = createPublicKey({ key: jwk as never, format: "jwk" })
        .export({ type: "spki", format: "pem" })
        .toString();
      next.set(jwk.kid, { pem });
    } catch {
      // Skip keys Node cannot import rather than failing the whole refresh.
    }
  }
  if (next.size === 0) {
    throw new GoogleIdTokenError("google_jwks_unusable");
  }
  keyCache = next;

  const cacheControl = response.headers.get("cache-control") ?? "";
  const maxAge = Number(/max-age=(\d+)/i.exec(cacheControl)?.[1] ?? "3600");
  keyCacheExpiresAt = Date.now() + Math.max(60, maxAge) * 1_000;
}

async function ensureKeys(force = false): Promise<void> {
  if (!force && keyCache.size > 0 && Date.now() < keyCacheExpiresAt) return;
  if (!inflight) {
    inflight = refreshKeys().finally(() => {
      inflight = null;
    });
  }
  await inflight;
}

async function keyForKid(kid: string): Promise<string> {
  await ensureKeys();
  let entry = keyCache.get(kid);
  if (!entry) {
    // A rotated key we have not seen yet — force one refresh before giving up.
    await ensureKeys(true);
    entry = keyCache.get(kid);
  }
  if (!entry) throw new GoogleIdTokenError("google_signing_key_not_found");
  return entry.pem;
}

/**
 * Verifies a Google-issued ID token and returns the identity claims.
 *
 * @param idToken   the raw JWT from Google Sign-In on the client
 * @param audiences the OAuth client IDs this backend accepts (web/android/ios)
 */
export async function verifyGoogleIdToken(
  idToken: string,
  audiences: string[]
): Promise<GoogleIdentity> {
  const [firstAudience, ...restAudiences] = audiences;
  if (firstAudience === undefined) {
    throw new GoogleIdTokenError("google_auth_not_configured");
  }

  const decoded = jwt.decode(idToken, { complete: true });
  if (!decoded || typeof decoded === "string" || !decoded.header.kid) {
    throw new GoogleIdTokenError("google_token_malformed");
  }

  const pem = await keyForKid(decoded.header.kid);

  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(idToken, pem, {
      algorithms: ["RS256"],
      audience: [firstAudience, ...restAudiences],
      issuer: [GOOGLE_ISSUERS[0], GOOGLE_ISSUERS[1]]
    }) as jwt.JwtPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new GoogleIdTokenError("google_token_expired");
    }
    throw new GoogleIdTokenError("google_token_invalid");
  }

  const sub = typeof payload.sub === "string" ? payload.sub : null;
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : null;
  if (!sub || !email) {
    throw new GoogleIdTokenError("google_token_missing_claims");
  }

  return {
    sub,
    email,
    emailVerified: payload.email_verified === true || payload.email_verified === "true",
    name: typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : null,
    picture: typeof payload.picture === "string" ? payload.picture : null
  };
}
