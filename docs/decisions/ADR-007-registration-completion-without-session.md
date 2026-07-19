# ADR-007: Registration completion without an operational session

- Status: Accepted
- Date: 2026-07-19
- Milestone: M6C2B2

## Decision

Registration completion atomically creates the user and required consent evidence but never authenticates the user. Active passengers must call the existing login endpoint. Pending drivers and merchants receive only a purpose-bound onboarding-status credential that no operational route accepts.

## Rationale and consequences

Separating identity creation from authentication keeps password verification, account-status enforcement, trusted-session creation, refresh rotation, and audit behavior in one established login boundary. It also prevents pending roles from receiving capabilities before a future approval workflow exists. The extra client step is intentional. Flutter onboarding, real SMS, driver/merchant approval, and production enablement remain separate reviewed milestones.
