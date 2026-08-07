# ADR-020: route/map provider selection

Status: proposed; M7D1 active; final provider not selected.

Masari needs immutable canonical route geometry but must not couple matching or Trip creation to provider SDKs. Mapbox begins as the conditional bakeoff lead. Google, HERE, and the Stadia-hosted geocoding/routing plus possible MapLibre-rendering stack are also evaluated. MapLibre itself is not a geocoder or router.

Decision for M7D1: adopt the provider-neutral server abstraction, deterministic fake, protected entity-referenced preview, fixed-host adapters, fail-closed configuration, no fallback, and deterministic checksum. Do not persist preview results or enable any production provider. Do not add a client renderer SDK.

Evidence outcome: all four live candidates are `NOT_EXECUTED` because credentials are absent. Public terms review does not yet approve permanent normalized geometry, distance, duration, provider reference, geocoded coordinates, and label as one immutable Masari record for any candidate. Palestine/Arabic quality, human route safety, and p95 are also unmeasured. Therefore `PREFERRED_PROVIDER_RECOMMENDATION=NO_PROVIDER_APPROVED_YET`.

Consequences: M7D2 cannot begin until independent review approves one provider or explicitly accepts the no-provider outcome and lists the next evidence. M7E remains prohibited. Any provider switch is explicit because provenance, geometry behavior, storage rights, attribution, telemetry, and price differ.
