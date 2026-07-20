# Pending account experience

Driver and merchant registrations create pending accounts. The Flutter app stores only a pending-status onboarding token and shows a pending-review screen.

The pending screen displays:

- role;
- pending-review message;
- refresh action;
- local clear/logout action;
- global language switch through the app shell.

It does not display:

- account ID;
- reviewer data;
- phone;
- invitation details;
- session ID;
- audit or security-version data;
- internal review reason.

Refreshing pending status uses `Authorization: Onboarding <pending-status-token>`. If the backend returns `approved_sign_in`, the app clears the pending bundle and returns to normal login. If the account is unavailable, the app clears local pending state and returns safely to sign-in/help flow.

Pending-status recovery asks for phone, `PS` region, and password. Failures use generic invalid-credentials messaging and do not reveal whether a pending account exists.
