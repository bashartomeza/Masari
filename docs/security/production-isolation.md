# Production isolation and sensitive-data policy

M6B1A removes the frozen demo's Critical production-launch risks without changing its isolated rehearsal behavior.

## Enforced boundaries

- Staging and production do not register the reset router, tracking simulation mutation router, or deterministic comparison router. Requests receive `404` because no route exists.
- Normal auth, passenger, driver, merchant, matching, trip lifecycle, trip reads, and latest-location reads remain registered.
- Demo passwords have no source fallback. The reset module receives validated values from the demo-only environment.
- Admin production-like builds omit credential presets, reset controls, deterministic comparison, tracking simulation, and full-sequence automation.
- Flutter staging/production configurations require HTTPS and render neither demo account presets nor driver simulation controls.
- Admin bearer tokens use `sessionStorage` as an interim control. Logout and startup clear the legacy persistent token location. Server-managed admin sessions remain future work.

## Safe serialization

API responses must never return `password_hash` or future authentication material. Admin relations use explicit user selections limited to `id`, `name`, operational phone, `role`, non-production demo marker where present, and `created_at`. Response serialization repeats that allowlist as defense in depth.

## Verification

Configuration, route-registration, serialization, admin build configuration, mobile configuration, and hidden-control regressions accompany the normal suites. Production-like artifacts are scanned for the former known demo passwords and demo-tool strings. Real secrets must never be used as scan needles or printed in logs.
