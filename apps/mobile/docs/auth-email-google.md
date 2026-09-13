# Email / password + Google sign-in

The app authenticates against the API with an **email address** (not a phone
number). Three entry points exist:

| Screen        | Flow                                             | API call            |
| ------------- | ----------------------------------------------- | ------------------- |
| `/login`      | email + password                                | `POST /auth/login`  |
| `/signup`     | name + email + password → active passenger      | `POST /auth/register` |
| Both screens  | "Continue with Google"                           | `POST /auth/google` |

## Build-time configuration (`--dart-define`)

| Define                     | Used on        | Meaning                                                            |
| -------------------------- | -------------- | ---------------------------------------------------------------- |
| `GOOGLE_WEB_CLIENT_ID`     | web (`clientId`) | Web OAuth 2.0 client ID.                                        |
| `GOOGLE_IOS_CLIENT_ID`     | iOS (`clientId`) | iOS OAuth client ID (only if an iOS target is added).          |
| `GOOGLE_SERVER_CLIENT_ID`  | all (`serverClientId`) | The client ID the **backend** expects as the ID-token audience. Normally the *Web* client ID. |

If none are set, the Google button is simply hidden — email/password still work.

The `config/*.json` files carry these keys; run with, e.g.:

```bash
flutter run -d chrome --dart-define-from-file=config/demo.web.json
```

## Google Cloud Console setup (done once, outside this repo)

1. Create a project at <https://console.cloud.google.com/> and configure the
   **OAuth consent screen** (External, add the app name and support email).
2. **APIs & Services → Credentials → Create credentials → OAuth client ID:**
   - **Web application** — add your dev origin (`http://localhost:<port>`) and
     any deployed origins to *Authorized JavaScript origins*. Copy the client
     ID into `GOOGLE_WEB_CLIENT_ID` and `GOOGLE_SERVER_CLIENT_ID`.
   - **Android** — package name `ps.masari.mobile` (see
     `android/app/build.gradle`), plus the SHA-1 of every signing keystore
     (`./gradlew signingReport`). No client ID needs to go in the app; the
     `serverClientId` above is enough for Credential Manager.
   - **iOS** (only if an iOS target is added) — bundle ID, then set
     `GOOGLE_IOS_CLIENT_ID` and add the reversed client ID as a URL scheme in
     `Info.plist`.
3. On the **API** side set `GOOGLE_OAUTH_CLIENT_IDS` (comma-separated) to every
   client ID that can appear as an ID-token `aud` — in practice the Web client
   ID, plus the iOS client ID if used. Without it `POST /auth/google` returns
   `501 google_auth_not_configured`.

## Notes

- Web interactive sign-in uses the official Google Identity Services button
  (`google_sign_in_web`); the ID token arrives on
  `GoogleSignIn.instance.authenticationEvents`. Android/iOS call
  `GoogleSignIn.authenticate()` directly.
- Self-signup (email or Google) always creates an **active passenger**.
  Driver/merchant accounts still go through the invite + review onboarding flow.
- Demo shortcuts on the login screen now fill an email (`DEMO_*_EMAIL`). The
  backend demo seed must create those users with matching email addresses.
