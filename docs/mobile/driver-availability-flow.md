# M7C2 driver availability flow

An active verified driver opens the canonical availability list, selects a current eligible published route, reviews its bilingual direction and ordered textual stops, and creates one one-off availability. The form accepts only a future departure, an optional later window end, 1–8 seats, and 0–20 parcels. Route names, stops, geometry, and remaining capacity are never client-editable.

The list and detail always use server-returned status, revision, totals, and remaining capacity. Allowed actions are:

- draft: activate or cancel
- active: pause or cancel
- paused: resume or cancel
- filled, departed, completed, cancelled, expired: no lifecycle action

Every mutation uses the server's resulting record; the UI does not optimistically infer a lifecycle transition. Backend validation remains authoritative for timing, route eligibility, verification, reservations, revisions, and conflicts. A transaction retry is shown as an explicit retryable condition, while validation and reservation conflicts are terminal for that attempted payload.

Creation is idempotent and recoverable through the shared secure operation bundle. The flow makes no claim that a passenger, merchant, match, assignment, or trip exists.
