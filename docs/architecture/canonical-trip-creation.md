# Canonical trip creation

Only an active verified owner driver may accept a non-expired canonical offer. Acceptance revalidates route currency, demand state, driver authority, availability, route equality, and the held reservation inside one MySQL transaction.

Acceptance confirms the existing reservation without another decrement, marks the offer accepted, creates one `canonical_route_trip_v1` Trip, links dispatch and demand, and writes bounded offer/trip audits. Unique offer and dispatch links prevent duplicate trips after response loss or concurrent acceptance.

The immutable `canonical_route_snapshot_v1` contains canonical route identity, direction, bilingual names, route-version metadata, origin/destination names, selected pickup and destinations, and ordered relevant stops. Recursively sorted object keys and semantic array order produce a stable SHA-256 checksum. The snapshot is capped at 32 KiB and excludes users, phones, parcel descriptions, coordinates, geometry, payments, notes, and provider data.

M7C3A creates no `LocationEvent`, simulation state, GPS state, map state, or realtime subscription. Canonical trips are hidden from legacy trip, tracking, comparison, and deterministic demo paths.
