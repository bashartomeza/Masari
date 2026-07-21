# Route lifecycle operations

Enable the admin module only after the migration is current:

```text
ROUTE_MANAGEMENT_ENABLED=true
MULTI_ROUTE_ENTRY_ENABLED=false
VITE_ROUTE_MANAGEMENT_ENABLED=true
```

`MULTI_ROUTE_ENTRY_ENABLED=true` is deliberately invalid in M7B and prevents startup.

## Normal workflow

1. Create or reuse active canonical stops.
2. Create a stable route identity with region, direction group, and explicit direction.
3. Create a bilingual draft version.
4. Set active dates when needed.
5. Add at least two unique active stops in contiguous order beginning at one.
6. Review passenger and parcel pickup/drop-off permissions.
7. Save the draft using its current revision.
8. Publish using the same revision and the currently observed current-version ID.

Publication is transactional. A conflicting current pointer or stale revision must be reloaded and reviewed; operators must not blindly retry a changed payload with the same idempotency key.

## Correction and lifecycle

- Clone a published/paused version before correcting names, dates, stops, permissions, or geometry.
- Pause only the current published version and supply a reason. Paused versions remain readable but are intended to reject new M7C demand/availability.
- Resume only the current paused version while its route and active dates remain valid.
- Retire a version only after active known driver availability/trips are absent. Retirement is terminal and clears the current pointer when necessary.
- Retire the stable route only after every version is retired, no current pointer exists, and known active usage is absent.

There is no destructive version or published-route endpoint. Retired data remains readable to admins for history.

## Incident guidance

- `draft_revision_conflict`: reload the version, compare changes, then intentionally reapply.
- `current_version_conflict`: reload the route and repeat publication review against the new current pointer.
- `route_version_has_active_usage`: resolve/complete known availability or trips; do not delete or bypass the FK.
- `beta_route_limit_reached`: the controlled beta already has five active stable routes.
- `idempotency_in_progress`: wait for the original request outcome; do not rotate keys until its outcome is known.
