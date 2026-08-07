# M7D1 runtime validation

Validate with maps disabled first. Production/staging must parse only with `ROUTE_MAPS_ENABLED=false` and `ROUTE_PROVIDER=disabled`; fake must fail. No secret is required in the disabled state. Confirm preview requires authentication/admin, then returns `provider_disabled` without provider traffic.

For local fake validation, set route management/maps true and provider fake. Run API typecheck/tests and `npm run maps:bakeoff`. Verify two preview calls return miss then hit, edits/reordering/provider/profile changes miss, expiry misses, and malformed cache data is rejected.

For a live candidate, supply a server-only restricted credential and `ROUTE_BAKEOFF_PROVIDER`. Capture sanitized output only. Never redirect shell environment, URLs, request headers, or raw responses into artifacts. Perform human route review separately and record reviewer/date/categorical findings.

Release gates: all 18 migrations deploy from empty and repeat as no-op; five migration-18 triggers remain; API/Admin/Flutter and M7C/M7H harnesses stay at or above approved totals; preflight is 22/22; smoke metrics remain exact; Admin/API/APK scans contain no secret/raw coordinate logs/location permissions/M7E feature; all exact-head workflows pass. M7D1 remains active and the PR remains draft until independent review.
