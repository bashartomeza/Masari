# Mobile session management

M6C1B adds one shared, localized session-management surface for passenger, driver, and merchant users at `/security/sessions`. Admin and unsupported roles cannot enter the route.

## API clients

`SessionRepository` uses the shared authenticated client for:

- `GET /api/v1/auth/sessions`
- `DELETE /api/v1/auth/sessions/:id`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/logout-all`

The screen renders only safe session information: client type, optional device name, created/last-used/expiry times, current-session state, and revoked state. Internal session IDs are used only to address the revoke endpoint and are not displayed. No token, token hash, phone number, security version, or audit internals are rendered.

## User actions

- Revoking another session refreshes the list and keeps the current session authenticated.
- Revoking the current session clears local auth state immediately after the server confirms revocation.
- Logout revokes the current server session. Local logout still succeeds if the network is unavailable, preventing a user from being trapped in the app with stale local credentials.
- Logout-all requires confirmation and clears local auth state only after success. A server/network failure remains visible and preserves the current local bundle so the user can retry.

Destructive actions use localized confirmation dialogs and disable duplicate submission while in progress. The session status banner shares refresh and retry state with role dashboards.

## Runtime verification

On a real Android emulator backed by local MySQL, a passenger listed two safe session summaries, revoked the other session without leaving the screen, revoked the current session and returned to login, and completed logout-all. Account suspension invalidated the session immediately; reactivation did not restore the old session and required fresh login. Arabic RTL is the default and English LTR was verified on the same build.
