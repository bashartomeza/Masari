# ADR-003: Engineering delivery and staging boundary

Status: Accepted for M6B2.

## Decision

Use focused GitHub Actions definitions validated locally, with an ephemeral MySQL 8 service for backend integration. Pin external actions immutably, keep canonical toolchain versions in repository files, and provide repository-owned validation/security scripts.

Build the API with separate runtime and migration container targets. Database migration is an explicit controlled operation; MySQL is an independent private service. The local Compose file demonstrates boundaries and parity but is not a production hosting decision.

Backups use MySQL-native logical dumps plus SHA-256 and are considered successful only after an isolated, identity-checked restore. Release metadata contains only safe reproducible facts.

## Consequences

CI activation waits for an approved private GitHub remote. Hosting, managed secrets, encrypted scheduled backups, external rate-limit storage, production signing, onboarding, and server-managed sessions remain separate decisions. No schema, migration, domain behavior, API contract, or user interface changes are part of M6B2.
