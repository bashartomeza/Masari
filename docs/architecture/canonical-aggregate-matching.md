# Canonical aggregate matching

The M7C3C1 runner is an internal, explicitly invoked service. It is available only when route
entry, canonical matching, canonical Trip creation, and `CANONICAL_SHARED_TRIPS_ENABLED` are all
true. Staging and production reject the shared gate at startup, and no scheduler or public
runner is installed.

For each oldest pending dispatch, the service locks and revalidates the demand, excludes
previously attempted availabilities, and applies the existing `canonical_route_match_v1`
departure/capacity/trust/fairness scorer to eligible one-off DriverRoute rows. Stable score
tie-breaks select one availability. Additional compatible demands are then ordered by:

1. dispatch creation time;
2. dispatch ID.

Members must use the exact same current published route version, fit the selected departure
window, remain pending and unassigned, pass their passenger/merchant state checks, and fit all
bounded global-capacity limits. Coordinates, geometry, detours, demographics, pricing, ETA, and
legacy scores are not inputs.

Formation, one aggregate capacity decrement, manifest/membership creation, offer creation,
attempt creation, and auditing are one `READ COMMITTED` transaction. Database keys prevent two
workers from keeping overlapping membership or competing active manifests for one availability.
Terminal attempts exclude the previous DriverRoute for that demand; released demands can later
form a different manifest with independently eligible members.

The versions are `canonical_shared_trip_match_v1`, `canonical_shared_manifest_v1`, and
`canonical_global_capacity_v1`. M7C3A single-demand matching remains the compatibility path when
the shared gate is false.
