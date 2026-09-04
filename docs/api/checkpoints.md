# Checkpoint / barrier feed

`GET /api/v1/checkpoints` returns the barriers drawn on the passenger and driver
maps. It requires a trusted active session, and the path does not exist unless
`CHECKPOINTS_ENABLED` is on — a client that ignores `capabilities.checkpoints_available`
gets a `404` rather than an empty list it might read as "no barriers".

## Why this is a proxy, not a direct call

The upstream is a Supabase PostgREST table. The mobile app does **not** call it
directly. Doing so would ship the upstream key inside the APK, put a second
network origin outside the session boundary, and leave the app parsing a schema
owned by another team. The key lives in server config; the app sees one
authenticated Masari endpoint.

## Configuration

| Variable | Required | Notes |
| --- | --- | --- |
| `CHECKPOINTS_ENABLED` | — | Requires `MAPS_ENABLED` |
| `CHECKPOINTS_URL` | when enabled | Must be HTTPS |
| `CHECKPOINTS_API_KEY` | when enabled | Never leaves the server |
| `CHECKPOINTS_TIMEOUT_MS` | no | 500–15000, default 6000 |
| `CHECKPOINTS_CACHE_TTL_SECONDS` | no | 0–3600, default 60 |

## Response

```json
{
  "checkpoints": [
    {
      "id": "7",
      "name_ar": "حاجز الكونتينر",
      "name_en": "Container Checkpoint",
      "latitude": 31.7054,
      "longitude": 35.2024,
      "status": "closed",
      "updated_at": "2026-08-01T10:00:00Z"
    }
  ],
  "fetched_at": "2026-08-01T10:05:00Z",
  "stale": false
}
```

`status` is one of `open`, `congested`, `closed`, `unknown`. An upstream value
that does not map to the first three becomes `unknown`, never `open` — an
unconfirmed barrier must not render as passable.

`stale: true` means the upstream read failed and this is the last good response
still in cache. The mobile map labels it.

## Upstream tolerance

The upstream column names are not pinned by a contract we control, so each field
accepts several spellings (`lat`/`latitude`, `name_en`/`title_en`/`name`,
`status`/`state`/`condition`, and so on — see `services/checkpoints.ts`). A row
that still yields no usable coordinate is **dropped**, not placed at a default
position.

## Failure

| Condition | Status | Body `error` |
| --- | --- | --- |
| Upstream unreachable / timed out | 503 | `checkpoints_upstream_unreachable` |
| Upstream returned non-2xx (including a missing grant) | 503 | `checkpoints_upstream_rejected` |
| Upstream returned a non-array or unparseable body | 502 | `checkpoints_upstream_invalid` |

The upstream hostname, key, and error text never reach the client. A failure is
never converted into an empty barrier list.

## Known operational blocker

As of 2026-09-01 the configured anon key is rejected by the upstream table:

```
GET .../rest/v1/checkpoints  ->  401
{"code":"42501","message":"permission denied for table checkpoints"}
```

The key authenticates to PostgREST, but the `anon` role has no `SELECT` grant or
RLS policy on `checkpoints`. Until that grant is added upstream, this endpoint
answers `503` and the map shows its barrier-unavailable state. No client change
is needed when it is fixed.
