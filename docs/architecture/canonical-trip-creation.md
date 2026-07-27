# Canonical trip creation

Only an active verified owner driver may accept a non-expired canonical offer. Acceptance revalidates route currency, demand state and fingerprint, driver authority, future departure, availability, route equality, exact reservation type/amount, and one-off availability assignment inside one MySQL transaction.

Acceptance confirms the existing reservation without another decrement, marks the offer accepted, fills the availability, creates one `canonical_route_trip_v1` Trip, links dispatch and demand through a deterministic assignment key, and writes bounded offer/trip audits. Unique offer, dispatch, and availability links prevent duplicate trips after response loss or concurrent acceptance. Until M7C3C, unused capacity is intentionally not rematched into another separate Trip.

The immutable `canonical_route_snapshot_v1` contains canonical route identity, direction, bilingual names, route-version metadata, origin/destination names, selected pickup and destinations, ordered relevant stops, and a bounded demand summary. Passenger summaries store passenger count; merchant summaries store the exact accepted parcel count and destination-stop multiset. Recursively sorted object keys and semantic array order produce a stable SHA-256 checksum. The snapshot is capped at 32 KiB and excludes users, phones, parcel descriptions, coordinates, geometry, payments, notes, and provider data.

M7C3A creates no `LocationEvent`, simulation state, GPS state, map state, or realtime subscription. Canonical trips are hidden from legacy trip, tracking, comparison, and deterministic demo paths.
