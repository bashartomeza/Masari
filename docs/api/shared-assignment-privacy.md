# Shared assignment privacy

Shared manifests do not change the passenger or merchant ownership boundary.

A passenger can read only their own `CanonicalDemandDispatch` and request status. A merchant can
read only their own dispatch and order status. Before acceptance neither owner receives driver,
vehicle, candidate, score, reservation, manifest, or co-member information. After acceptance,
the existing owner-status contract returns only its minimum Trip/vehicle assignment summary.

Owners never receive another member's request/order ID, name, phone, seat count, parcel count,
parcel description, recipient, stop selection, or status. Cross-owner lookups remain not found.
Driver aggregate endpoints expose counts and public route stops, not member identities or demand
payloads. Admin receives no new shared-manifest write or dispatch control in M7C3C1.

Audit and error output use categorical actions and safe identifiers. Request bodies,
fingerprints, snapshots, idempotency keys, credentials, and private rows are not logged.
