# M5A visual evidence

These screenshots were captured from the real local React/Vite admin console and the Android 16/API 36 emulator during M5A. They document the final Arabic RTL and English LTR states, not mocked screens.

- `admin-*`: Arabic login, Arabic completed dashboard/results, and English dashboard/comparison.
- `mobile-passenger-*`: Arabic request/match/observer/trip, English dashboard, and controlled API-outage retry state.
- `mobile-driver-*`: Arabic own-route inbox/match/lifecycle/completion and English dashboard.
- `mobile-merchant-*`: Arabic dashboard/order/batch/read-only trip and English trip.

Technical IDs and coordinates are intentionally visible where they demonstrate real API state. No JWT, reset key, password hash, database credential, or unauthorized phone number is shown.

## Sending the verification emails for real (optional)

By default the demo only writes the normal-user email token to `.staging-data/test-env/email-codes.txt`. To also send it from `basharto20@gmail.com`:

1. In that Google account turn on 2-step verification, then create an App Password (Google Account → Security → App passwords). It is 16 letters.
2. In your own terminal run `pwsh -NoProfile -File scripts/test-env/set-mail-password.ps1` and paste it at the hidden prompt. It is stored in Windows Credential Manager, never in a file or the repo.
3. Restart: `stop.ps1` then `start.ps1`. The start message says "real emails are sent from ...".

The file is still written, and a failed send shows in `.staging-data/test-env/api.err.log` without blocking sign-up. Phone codes are not emailed: they stay in `otp.txt` because there is no SMS provider. Remove the password any time with `set-mail-password.ps1 -Remove`.
