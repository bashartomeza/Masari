# Provider security and secrets

All routing and geocoding credentials remain in backend environment configuration. They are never serialized, audited, logged, placed in Flutter/Admin configuration, or included in errors. Provider URLs are assembled inside adapters from fixed HTTPS hosts; API input cannot select scheme, host, port, path, callback, or provider.

The preview endpoints require an active, unrevoked authenticated admin session. They reference an existing active draft route version, exact draft revision, contiguous active membership, and 2–100 server-owned stops. The scoped geocoder uses the stored Arabic or English stop name and accepts no arbitrary address. Global and route-provider-specific limits apply.

Operational events contain actor ID, route-version ID, stop ID where relevant, provider, categorical outcome, and cache hit/miss only. Coordinates, provider URLs, raw requests/responses, headers, tokens, and billing identifiers are excluded. Logger redaction retains latitude/longitude and credential protection.

When disabled, no provider instance exists, no secret is required, no call or retry occurs, and `provider_disabled` is returned safely. Staging/production reject fake. A later publishable rendering token must be separately classified and application/domain/package, quota, and provider-API restricted; M7D1 exposes none.
