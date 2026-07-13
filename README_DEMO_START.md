# Masari Demo Start Card

## URLs

- API: `http://localhost:3000`
- Admin: `http://localhost:5173`
- Android emulator API embedded in APK: `http://10.0.2.2:3000`

## Safe local environment

Set real local values in the PowerShell session only. Never add them to this file or the release package.

```powershell
$env:DATABASE_URL = "postgresql://<user>:<password>@localhost:5432/masari?schema=public"
$env:JWT_SECRET = "<long-local-development-secret>"
$env:DEMO_RESET_KEY = "<local-demo-reset-key>"
$env:CORS_ORIGINS = "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://127.0.0.1:5173,http://127.0.0.1:5174,http://127.0.0.1:5175"
$env:PORT = "3000"
```

## Startup

1. Start PostgreSQL and confirm port 5432.
2. Terminal A: set the environment above, then run `npm run dev:api`.
3. Terminal B: set `$env:VITE_API_BASE_URL = "http://localhost:3000"`, then run `npm run dev:admin`.
4. Cold-boot AVD `Medium_Phone_API_36.0`.
5. Install `app-debug.apk` with `adb install -r app-debug.apk`.
6. From the repository root with the API environment set, run `npm run demo:preflight` and require 10/10.
7. Run `npm run demo:smoke` and require `"ok":true`.
8. Run one protected reset and open `JUDGE_SCRIPT.md`.

## Fast recovery

- API down: restart `npm run dev:api`, verify health, then Retry/Refresh.
- Vite down: run `npm run dev:admin` and reopen port 5173.
- Uncertain data: protected reset, then smoke—never manual database edits.
- Live surface unavailable after two minutes: use `BACKUP_DEMO.md` and packaged screenshots.
