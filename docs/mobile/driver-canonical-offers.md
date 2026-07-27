# Driver canonical offers

M7C3B adds a driver-owned Flutter inbox for canonical route offers. The entry
is visible only when the authenticated capabilities response enables canonical
entry, matching, Trip creation, and driver offers.

## List and detail

- `GET /api/v1/driver/canonical-match-offers` returns newest-first safe
  summaries and an opaque `(created_at, id)` cursor.
- Flutter treats the cursor as an opaque string, deduplicates IDs when appending
  a page, and never derives or edits it.
- Detail shows the route, ordered stop names, passenger or parcel capacity,
  departure window, offer state, and server-authoritative expiration.
- Refresh is pull-to-refresh, explicit button, or foreground resume only. There
  is no polling, push, or background matching.

Accept and reject are shown only for an `offered`, unexpired result. Reject uses
one categorical value: `driver_declined`, `schedule_conflict`, or
`capacity_unavailable`. The server remains authoritative for ownership,
eligibility, capacity, expiry, and one-Trip creation.

The UI does not expose scoring, candidate lists, phone numbers, parcel
descriptions, coordinates, reservation internals, or matching controls.

