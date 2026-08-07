# ADR-020: route/map provider selection

Status: proposed; M7D1 closed; M7D1B active and blocked on live evidence; final provider not selected.

Masari needs immutable canonical route geometry but must not couple matching or Trip creation to provider SDKs. Mapbox begins as the conditional bakeoff lead. Google, HERE, and the Stadia-hosted geocoding/routing plus possible MapLibre-rendering stack are also evaluated. MapLibre itself is not a geocoder or router.

Decision for M7D1: adopt the provider-neutral server abstraction, deterministic fake, protected entity-referenced preview, fixed-host adapters, fail-closed configuration, no fallback, and deterministic checksum. Do not persist preview results or enable any production provider. Do not add a client renderer SDK.

M7D1B evidence outcome: categorical local and CI checks found no securely available credential, so all four live candidates remain `NOT_EXECUTED` with zero live samples and null latency. The existing fake harness remains ready but supplies architecture evidence only. Current official-source review finds conditional permanent geocoding paths for Mapbox and eligible Stadia plans, an incompatible shared-canonical exception and non-Google-map restriction for Google, and a 30-day public standard retention limit for HERE. No candidate has approved rights for every route/geocode persistence field. Palestine/Arabic quality, human route safety, and credible p95 remain unmeasured. Therefore `PROVIDER_RECOMMENDATION_CANDIDATE=NONE` and `PROVIDER_SELECTION=NO_PROVIDER_APPROVED_YET`.

Consequences: M7D1B remains `ACTIVE / BLOCKED_ON_LIVE_EVIDENCE`. M7D2 cannot begin until independent review approves complete live, storage, attribution, privacy, commercial, and quota evidence for one provider or explicitly accepts the no-provider outcome and lists the next evidence. M7E remains prohibited. Any provider switch is explicit because provenance, geometry behavior, storage rights, attribution, telemetry, and price differ. Focused evidence is recorded in the five `docs/maps/provider-*evaluation` and live/review/matrix documents.
