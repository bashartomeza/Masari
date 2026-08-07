# Route geometry contract

A normalized result contains encoded renderer-neutral geometry, encoding and precision, provider/API/profile provenance, distance metres, calculated duration seconds, calculation time, attribution, input checksum, and geometry checksum. Supported adapter encodings are polyline5, polyline6, segmented polyline6, and segmented HERE flexible polyline. Rendering is deferred to M7D2.

The input checksum covers provider, route/version identity, ordered stop identity and six-decimal coordinates, profile, locale, and routing options. The geometry SHA-256 additionally covers the input digest, provider calculation version, encoding/precision, geometry bytes, distance, and duration. Canonical recursively sorted JSON makes identical records hash identically; volatile provider request IDs are excluded.

Draft previews may be replaced after edits. Existing stop replacement already clears geometry fields and increments the draft revision. Published route versions, stop order, geometry, checksum, provenance, distance, and duration snapshots are immutable. A correction must clone a new draft and publish a new version.

The existing schema has partial geometry columns but lacks calculation time, API/profile version, full provenance, and attribution/storage-policy metadata. M7D1 therefore creates no migration and persists no preview. A single additive migration may be proposed in M7D2 only after a provider and storage rights are approved; historical geometry must never be fabricated.
