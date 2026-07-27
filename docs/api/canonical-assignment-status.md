# Canonical assignment status API

Passenger:

- `GET /api/v1/passenger/route-requests?limit=25`
- `GET /api/v1/passenger/route-requests/:id`

Merchant:

- `GET /api/v1/merchant/route-orders?limit=25`
- `GET /api/v1/merchant/route-orders/:id`

Reads are active-owner-only and canonical-mode-only. Responses include demand status, route/version and selected stop IDs, departure window, dispatch status, `offer_pending`, `assigned`, safe timestamps, and—after acceptance only—Trip ID/status plus vehicle type. Merchant responses include parcel IDs, status, and destination stop IDs.

Before acceptance no driver identity, candidate list, scoring detail, attempt count, reservation, audit data, phone, coordinate, or parcel description is exposed. Cross-owner and wrong-role requests cannot discover another owner's record.
