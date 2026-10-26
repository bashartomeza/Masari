# Evidence index — recovered and new features

Closes the register item EDIT-12 as a **starting index**. It lists what was actually run, on which source, and what was not. It is not a release attestation: nothing here establishes production readiness, and the owner-action items (EDIT-01 to EDIT-10) stay open.

## Source under test

| Item | Value |
| --- | --- |
| Branch | `feat/driver-verification-evidence` (PR #69, on top of `production-readiness` at `b371523`) |
| Commit | `b19ff956fc96863ced887b349204703dccc42012` |
| Tree | `6d902f8c170d0d2505da72ba59e1ab82d20f1ff4` |
| Run date | 2026-10-26, local Windows machine; hosted runs on GitHub Actions |

## Runs on that commit

| Check | Where | Result |
| --- | --- | --- |
| API typecheck and build | local | Pass |
| API unit tests | local | 63 files, 834 tests, all passed |
| Admin unit tests | local | 30 files, 380 tests, all passed |
| Tooling tests | local | 78 tests, 76 passed, 0 failed (2 skipped) |
| Flutter analyze and tests | local | No issues; 628 tests passed |
| Hosted workflows: admin, backend-mysql, mobile, security | GitHub Actions on PR #69 | All four passed |
| Driver documents over HTTP against real MySQL (`masari_demo`) | local, separate server on port 3100 | Passed: real onboarding, upload (content-sniffed type), refusals leave nothing on disk, Admin download byte-identical, applicant delete, refusal after approval, retention purge after backdating |
| Driver documents on an Android emulator (API 36, English) | local debug APK | Passed: sign-up through the real flow, system file picker, document listed, visible and downloadable by Admin, removed from the app and from disk |

## Earlier evidence (not re-run on this commit)

These come from section 20 of `MASARI_FULL_PRD_AND_REMAINING_EDITS.md` (2026-10-25, `753b489`) and were not repeated here: real-MySQL CI suites on disposable databases, `demo:smoke`, `demo:features`, `demo:approvals`, the Android debug build, the artifact and secret scans, the headless-Chrome pass over the Admin console, and the Android emulator pass. Hosted Backend/MySQL, Admin, Flutter and Security workflows passed on `753b489`. Treat all of it as dated to that commit.

## Not run or not covered

- Arabic screens of the document card on a device; a PDF upload from a device; the Admin console's Download button and evidence form in a real browser.
- The earlier 2026-10-25 device gaps: Merchant inbox, English Merchant/Driver screens, CSV files in Excel, Admin console at phone width.
- Human acceptance of the recovered flows (`docs/demo/FEATURE_WALKTHROUGH.md`).
- The document upload has not run on the real hosting environment (Injazat): persistent storage, backups and the scheduled purge are unverified.
- Everything gated by owner actions: live provider conformance, credential rotation confirmation, freshness policy, redistribution permission.

## Keeping this current

Re-run the table above after any change that lands on `production-readiness`, update the commit and tree, and keep failures in the table rather than deleting them.
