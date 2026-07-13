# Masari Hackathon Demo — Release Notes

- Release name: **Masari Hackathon Demo**
- Release date: **2026-07-13**
- Final Git reference: annotated tag **`v0.1.0-hackathon`** (the packaged copy resolves this to the tag's commit SHA)
- Source freeze baseline: `13c1f47 chore: harden full Masari demo`
- APK SHA-256: `0F9C367DEFC1A9E986E1522D2E2331962EE6E5D685B32D217FA09DB4B425B619`

## Scope freeze

Masari feature development is frozen for the hackathon presentation. Only presentation-blocking corrections are permitted.

## Implemented systems

- TypeScript/Express API with PostgreSQL and Prisma 7.
- Protected deterministic demo reset and seeded demo identities.
- JWT login, `/me`, role authorization, and ownership isolation.
- Passenger requests, driver locked routes, merchant orders/parcels/batching, explainable combined matching, acceptance, trip lifecycle, and deterministic tracking.
- Masari versus nearest-driver deterministic comparison.
- Arabic-first React/Vite admin judge console.
- Android Flutter app for passenger, driver, and merchant roles.
- Preflight, full API smoke, runbook, eight-minute judge script, and screenshot backup.

## Supported presentation contract

- Roles: passenger, selected driver, alternate-driver isolation proof, merchant, and admin.
- Languages: Arabic default RTL; English optional LTR with persistence.
- Locked corridor: Hebron / PPU / Bab Al-Zawiya to Bethlehem.
- Architecture: local PostgreSQL on 5432, API on localhost:3000, admin on localhost:5173, Android emulator API on 10.0.2.2:3000.
- Primary story: one passenger request plus one five-parcel merchant batch on one selected driver route and one shared trip.

## Deterministic simulation disclosure

- Tracking is simulated and polled through REST. It is not live GPS, maps, Socket.IO, or background tracking.
- Matching and comparison values are deterministic hackathon demo metrics, not production routing, prices, or city-wide measured outcomes.
- Expected proof: score `0.9317`; sequence `2`; trips `1` versus `6`; distance `21.53` versus `129.19`; cost `43.06` versus `258.38`; winner `masari`.

## Validation summary

- API: 6 files / 60 tests passed in the final M5B gate.
- Admin: 1 file / 7 tests passed in the final M5B gate.
- Mobile: 62 tests passed with clean analysis, clean formatting, and Android debug APK build.
- Designated-machine cold readiness completed in 33.71 seconds; protected reset completed in 0.73 seconds.
- Visual API-outage recovery completed in 89.07 seconds without losing authenticated mobile/admin state or editing PostgreSQL.
- Three final technical rehearsals returned the same score, sequence, trips, distance, cost, winner, and clean-reset recovery.
- Exact package/ZIP checksums and final commit are recorded in the packaged copy of these notes and its checksum manifest.

## Known limitations

- Local PostgreSQL, API, Vite, and Android emulator infrastructure are required.
- No AI parser, live GPS, maps, payments, public registration, multi-city support, app-store delivery, or production deployment is implemented.
- The release uses a debug APK for the local hackathon presentation.
- Three moderate findings remain through Prisma CLI transitive `@hono/node-server`. The breaking `npm audit fix --force` downgrade was not applied.

## Startup requirements

Follow `README_DEMO_START.md`, then require `npm run demo:preflight` 10/10 and `npm run demo:smoke` success before judges arrive. The full operational procedure is in `DEMO_RUNBOOK.md`; presenter cues are in `JUDGE_SCRIPT.md`; fallback is in `BACKUP_DEMO.md`.
