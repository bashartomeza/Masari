# Public onboarding feature gate

`PUBLIC_ONBOARDING_ENABLED` defaults to `false`. Disabled mode leaves only the safe config endpoint registered. Enabled mode additionally requires `INVITATIONS_ENABLED=true`, `OTP_PROVIDER=fake`, all distinct onboarding peppers, a distinct idempotency-payload pepper, and `APP_ENV=local|test|demo`.

Staging and production reject public enablement, fake delivery, and test legal fixtures during configuration parsing. They remain disabled until an approved real provider is implemented. The config response never identifies the provider or environment. It reports enabled only when all three legally approved, current documents exist in both Arabic and English.

Local validation uses ignored secrets only. Never commit `.env`, test OTPs, provider outboxes, credentials, or legal fixtures. Production templates intentionally keep the feature disabled.
