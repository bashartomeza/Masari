# Driver canonical offer API

All endpoints require a live active session, the current `driver` role, a verified driver profile, ownership through the driver's DriverRoute, and all canonical gates. Unrelated and legacy IDs return a concealed not-found result.

## Read

- `GET /api/v1/driver/canonical-match-offers?limit=25&cursor=<id>`
- `GET /api/v1/driver/canonical-match-offers/:id`

The safe response contains offer ID/status, demand type, exact route-version ID, attempt number, offer/expiry/departure times, selected stop IDs, departure window, and requested seat or parcel count. It does not expose customer identity, phone, parcel descriptions, coordinates, reservation internals, or score internals.

## Decide

- `POST /api/v1/driver/canonical-match-offers/:id/accept`
- `POST /api/v1/driver/canonical-match-offers/:id/reject`

Both require an `Idempotency-Key` header of 8–128 allowlisted characters. Exact replay returns the existing logical result; the same key with different normalized input conflicts. Reject body:

```json
{ "reason": "schedule_conflict" }
```

Allowed reasons are `driver_declined`, `schedule_conflict`, and `capacity_unavailable`. Free-form text is rejected.
