# Masari — مساري
 
Masari is a Palestine-focused, Arabic-first smart route-sharing logistics MVP for the locked Hebron / PPU / Bab Al-Zawiya to Bethlehem corridor.

## Local setup

Install dependencies and validate the database client:

```powershell
npm install
npm run prisma:validate
npm run prisma:generate
npm run db:migrate
```

 Start the API and admin console in separate terminals:

```powershell
npm run dev:api
```

 Build the emulator APK with the matching host URL:

```powershell
Set-Location apps/mobile
flutter build apk --debug --dart-define=APP_ENV=local --dart-define=API_BASE_URL=http://10.0.2.2:3000 --dart-define=ENABLE_DEMO_FEATURES=false
```

 The protected deterministic rehearsal requires the isolated `demo` configuration documented in `README_DEMO_START.md`. With that configuration, MySQL, API, admin, and the Android emulator running, execute:

```powershell
npm run demo:preflight
npm run demo:smoke
```

`npm audit fix --force` is intentionally prohibited because the proposed fix is a breaking Prisma downgrade.

Production HTTP controls, request IDs, proxy topology, and health/readiness contracts are documented in `docs/security/http-security-baseline.md`, `docs/operations/logging-and-request-ids.md`, and `docs/operations/health-and-readiness.md`.
