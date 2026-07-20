# Public onboarding demo testing

Use only a dedicated disposable MySQL database and an ignored local environment. Apply migrations with `npm run db:migrate`, build the API, then run `npm run test:integration:public-onboarding`. The harness resets deterministic demo data, inserts clearly labeled test-only Arabic/English legal fixtures directly into MySQL, injects the in-memory fake provider, exercises passenger/driver/merchant outcomes and races, and resets all onboarding data on success.

The fake outbox exists only in the test process and has no public route. The harness never prints OTPs, passwords, phones, tokens, grants, peppers, or database credentials. It verifies start/resume, accepted/rejected resend, verify replay, transactional completion, pending status/recovery, token isolation, privacy, and cleanup. Test legal documents are deleted by demo reset and are not embedded in runtime production artifacts.
