# M7C2 runtime validation

M7C2 is validated only with explicit local/demo `ROUTE_MANAGEMENT_ENABLED=true` and `MULTI_ROUTE_ENTRY_ENABLED=true`. `MULTI_ROUTE_MATCHING_ENABLED` remains false. Staging/production must reject entry enablement and advertise catalog/entry capability truthfully without exposing environment values.

Runtime evidence must cover three published routes, multiple directions, at least five ordered stops, passenger-only and parcel-only permissions, paused/retired/replaced/inactive versions, active role authorization, route replacement during a form, response loss and process restart for each atomic create, 50/51 parcel behavior, lifecycle conflicts, access-token refresh, logout/session revocation, Arabic/English, 200% text, rotation, and system/gesture back.

The gate also reruns all 13 migrations from empty/current status, M7C1 real-MySQL assertions, trusted sessions, public onboarding, backup/restore cleanup, 22/22 preflight, deterministic smoke, production-like capability isolation, and artifact/log scans. Expected deterministic demo values remain score `0.9317`, sequence `2`, trips `1` versus `6`, distance `21.53` versus `129.19`, cost `43.06` versus `258.38`, and winner `masari`.

No database migration or data cleanup is introduced by M7C2. Canonical test records are disposable owner data; the protected deterministic reset remains the approved demo reset.
