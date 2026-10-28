# In-app notifications

A per-user inbox. There is no push channel: clients poll `GET /api/v1/notifications` (the mobile app every 10 s while a bell or the inbox is on screen).

## Endpoints (any authenticated role; always scoped to the caller)

| Method / path | Purpose |
| --- | --- |
| `GET /notifications?limit=1..100&unread_only=true` | Newest first, plus `unread_count` for the badge. |
| `POST /notifications/:id/read` | Mark one read. Another user's id returns `404`. |
| `POST /notifications/read-all` | Mark every unread entry read. |

Entries carry `type` and `params`, never display text; each client words them in its own locale.

## Events

| `type` | Recipient | Emitted when |
| --- | --- | --- |
| `match_offered` | Driver | A legacy match is created for their route. |
| `match_accepted` / `match_rejected` | Passenger or Merchant behind the match | The driver accepts or rejects. |
| `trip_status` (`params.status`) | Passenger and/or Merchant on the trip | The trip advances (driver or Admin). |
| `driver_verification_approved` / `_rejected` (`params.reason`) | The driver | An Admin decides their verification. |
| `driver_documents_expiring` (`params.kind`, `expires_on`, `days_left`, `threshold`) | The driver | A recorded document expires in 30 days, and again in 7 days (once per document, date and tier). |
| `driver_documents_expired` (`params.kinds`) | The driver | The expiry job restricted the account. |
| `driver_documents_renewal_submitted` | The driver | They sent renewed documents to Admin re-review. |
| `incident_updated` (`params.status`) | The reporter | An Admin moves their incident report forward. |

## Guarantees

- Emission is best-effort and never fails or rolls back the business action.
- `UNIQUE(user_id, dedupe_key)` makes every event announce at most once per recipient.
- Canonical (multi-route) matching does not emit notifications yet.
