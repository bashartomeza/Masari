# Canonical merchant route orders

`POST /api/v1/merchant/route-orders` requires a live active merchant session, local/test/demo `MULTI_ROUTE_ENTRY_ENABLED=true`, and `Idempotency-Key`.

The strict order body contains one `route_version_id`, one `pickup_stop_id`, a bounded departure window, and 1–50 parcels. Each parcel contains only `destination_stop_id`, `size` (`S`, `M`, or `L`), and `priority` (`low`, `normal`, or `high`).

The pickup must allow parcel pickup. Every destination must be an active downstream member of the same immutable route version and allow parcel drop-off. Composite database foreign keys bind each parcel to both its route membership and its order route. Arbitrary coordinates/labels, mixed routes, client sequence, and multi-route splitting are rejected.

Responses expose safe route/stop IDs, status, size/priority, timestamps, and `canonical_route_v1`. They explicitly report batching and matching disabled. Canonical orders cannot enter the legacy batcher or matcher.
