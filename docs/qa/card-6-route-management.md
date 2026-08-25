# Card 6 route-management QA

This runbook is only for disposable local QA. Every fixture command requires `--confirm-disposable` and accepts only a MySQL URL whose host is exactly `localhost` or `127.0.0.1`, whose database path is exactly `masari_routes_qa`, and which has no query string or fragment. Never run these commands against `masari`.

## Environment boundary

- Database: `masari_routes_qa` only
- API: `http://localhost:3100`
- Admin: `http://localhost:5174`
- API route management: enabled process-locally
- Admin route management: enabled process-locally
- Maps: disabled
- Route provider: disabled
- Demo features and demo reset: disabled

Start from a securely loaded local `DATABASE_URL` without printing it, then change only its parsed database path in the current PowerShell process:

```powershell
$qaDatabaseUrl = [System.UriBuilder]$env:DATABASE_URL
$qaDatabaseUrl.Path = 'masari_routes_qa'
$qaDatabaseUrl.Query = ''
$qaDatabaseUrl.Fragment = ''
$env:DATABASE_URL = $qaDatabaseUrl.Uri.AbsoluteUri
$env:ROUTE_QA_ADMIN_PASSWORD = Read-Host 'Disposable QA admin password (12+ characters)' -MaskInput
```

The QA administrator password has no default and is hashed only after the database guard passes. Never paste the password into this file, a command, or QA evidence. Prepare once, then verify. Preparation refuses to overwrite an existing `qa-card6-` fixture set. `verify` performs reads only and leaves the fixtures intact.

```powershell
npm run qa:routes -- prepare --confirm-disposable
npm run qa:routes -- verify --confirm-disposable
```

In an API terminal, retain the guarded process-local `DATABASE_URL` and run:

```powershell
$env:APP_ENV = 'local'
$env:PORT = '3100'
$env:CORS_ORIGINS = 'http://localhost:5174'
$env:ENABLE_DEMO_FEATURES = 'false'
$env:ROUTE_MANAGEMENT_ENABLED = 'true'
$env:ROUTE_MAPS_ENABLED = 'false'
$env:ROUTE_PROVIDER = 'disabled'
npm run dev:api
```

In a separate Admin terminal, run:

```powershell
$env:VITE_APP_ENV = 'local'
$env:VITE_ENABLE_DEMO_FEATURES = 'false'
$env:VITE_API_BASE_URL = 'http://localhost:3100'
$env:VITE_ROUTE_MANAGEMENT_ENABLED = 'true'
npm run dev -w @masari/admin -- --port 5174
```

## Fixture identities

All route and stop keys are synthetic and use the fixed `qa-card6-` prefix.

| Scenario | Fixed identity | Expected state |
| --- | --- | --- |
| A | `qa-card6-a-active-stop` | Active stop visible in the stop catalog |
| B | `qa-card6-b-retired-stop` | Retired stop visible with the retired filter |
| C | `qa-card6-c-empty-route` | Active route with no versions and no current version |
| D | `qa-card6-d-draft-route` | Valid two-stop draft, ready for editing |
| E | `qa-card6-e-invalid-route` | Draft with a missing Arabic name and no stops; publication must remain blocked |
| F | `qa-card6-f-current-route` | Published current version with valid passenger movement |
| G | `qa-card6-g-paused-route` | Paused current version |
| H | `qa-card6-f-current-route`, version 1 | Retired historical version |
| I | `qa-card6-f-current-route`, version 2 | Published parcel-compatible current version |
| J | `qa-card6-f-current-route` | Three-version history: retired, published, and draft |
| K | `qa-card6-f-current-route`, version 3 | Cloned draft with three ordered stops |
| L | `qa-card6-l-retired-route` | Retired route with no current version |

Supporting active stops use `qa-card6-shared-middle-stop` and `qa-card6-shared-destination-stop`. The service-region and route-group keys also use the same fixed prefix.

## Manual checklist

Authenticate with the synthetic QA administrator and the locally supplied password; do not record the login identifier or password in QA evidence.

1. Open `http://localhost:5174/#/routes`; confirm all fixed route identities appear with the expected active or retired state.
2. Search by `qa-card6-`, then exercise status, direction, and service-region filters.
3. Open scenario C and confirm its honest empty-history state.
4. Open scenario D, edit bilingual draft fields and ordered stop permissions, save, and confirm the detail reloads.
5. Open scenario E and confirm readiness explains why publication is blocked; do not repair it if the fixture must remain reusable.
6. Open scenarios F/J and inspect deterministic newest-first version history, current-version state, and ordered passenger/parcel stops.
7. Confirm the retired historical version H is not editable and cloned draft K remains editable.
8. Open scenario G and exercise resume/pause using the currently displayed version; confirm the detail reloads after each action.
9. Confirm scenario L cannot accept new versions and the retired-stop filter shows scenario B.
10. In a second Admin tab, load a lifecycle action, change the current version in the first tab, and confirm the stale tab receives a conflict and reloads authoritative state.
11. Confirm route preview reports unavailable while maps/providers remain disabled.
12. Rerun verification and confirm all 12 fixture categories remain ready before handoff.

Manual edits can intentionally change fixture state. Exact `verify` is expected to fail after such mutations until an operator deliberately restores the canonical A-L set with guarded cleanup followed by guarded prepare. Do not run cleanup while the current fixture set is being preserved for handoff.

## Cleanup

Cleanup deletes only the exact QA actor and rows reached from route/stop roots whose keys start with `qa-card6-`. It clears current-version pointers and removes memberships, audit/idempotency rows, versions, routes, stops, and the synthetic actor in dependency order. It does not call demo reset and does not drop the database.

Run only when human QA is finished:

```powershell
npm run qa:routes -- cleanup --confirm-disposable
```
