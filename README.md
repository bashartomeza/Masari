# Masari — مساري

Masari is a Palestine-focused, Arabic-first smart route-sharing logistics MVP for the locked Hebron / PPU / Bab Al-Zawiya to Bethlehem corridor.

The current implementation includes the TypeScript/Express API, MySQL/Prisma persistence, React/Vite admin judge console, and Android Flutter passenger, driver, and merchant flows. The preserved PostgreSQL release remains available at `v0.1.0-hackathon`. See [MYSQL_MIGRATION.md](MYSQL_MIGRATION.md) and [DEMO_RUNBOOK.md](DEMO_RUNBOOK.md).

## Local setup

1. Install dependencies and validate the database client:

```powershell
npm install
npm run prisma:validate
npm run prisma:generate
npm run db:migrate
```

2. Configure the current PowerShell session. Replace placeholders with local development values; do not commit them:

```powershell
$env:DATABASE_URL = "mysql://<user>:<password>@localhost:3306/masari"
$env:JWT_SECRET = "<long-local-development-secret>"
$env:DEMO_RESET_KEY = "<local-demo-reset-key>"
$env:CORS_ORIGINS = "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://127.0.0.1:5173,http://127.0.0.1:5174,http://127.0.0.1:5175"
$env:PORT = "3000"
```

3. Start the API and admin console in separate terminals:

```powershell
npm run dev:api
```

```powershell
$env:VITE_API_BASE_URL = "http://localhost:3000"
npm run dev:admin
```

4. Build the emulator APK with the matching host URL:

```powershell
Set-Location apps/mobile
flutter build apk --debug --dart-define=API_BASE_URL=http://10.0.2.2:3000
```

5. With MySQL, API, admin, and the Android emulator running, execute:

```powershell
npm run demo:preflight
npm run demo:smoke
```

`npm audit fix --force` is intentionally prohibited because the proposed fix is a breaking Prisma downgrade.
