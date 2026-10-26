# Evidence index — recovered and new features

Closes the register item EDIT-12 as a **starting index**. It lists what was actually run, on which source, and what was not. It is not a release attestation: nothing here establishes production readiness, and the owner-action items (EDIT-01 to EDIT-10) stay open.

## Source under test

| Item | Value |
| --- | --- |
| Branch | `feat/driver-verification-evidence` (PR #69, on top of `production-readiness` at `b371523`) |
| Commit | `d15ce9ed0f9f6862daec32b0510ead22b716bda4` |
| Tree | `36910d3e9b28e01794d51203c0c15fe72cea42ca` |
| Run date | 2026-10-26, local Windows machine, working tree clean apart from the untracked PRD file |

## Local runs on that commit

| Check | Command | Result |
| --- | --- | --- |
| API typecheck | `npm run typecheck` | Pass |
| API unit tests | `npm test` | 62 files, 823 tests, all passed |
| Admin unit tests | `npm run test:admin` | 30 files, 380 tests, all passed |
| Tooling tests | `npm run test:tooling` | 78 tests, 76 passed, 0 failed (2 skipped) |
| Flutter analysis | `flutter analyze` (apps/mobile) | No issues |
| Flutter tests | `flutter test` (apps/mobile) | 623 tests, all passed |

## Earlier evidence (not re-run on this commit)

These come from section 20 of `MASARI_FULL_PRD_AND_REMAINING_EDITS.md` (2026-10-25, `753b489`) and were not repeated here: real-MySQL CI suites on disposable databases, `demo:smoke`, `demo:features`, `demo:approvals`, the Android debug build, the artifact and secret scans, the headless-Chrome pass over the Admin console, and the Android emulator pass. Hosted Backend/MySQL, Admin, Flutter and Security workflows passed on `753b489`. Treat all of it as dated to that commit.

## Not run or not covered

- Hosted CI on `d15ce9e` (PR #69 has not run yet).
- Real-MySQL integration suites for the new evidence table. The migration was applied to the local `masari` database only.
- The evidence form in a real browser.
- The Merchant inbox and English Merchant/Driver screens on a device; CSV files in Excel; the Admin console at phone width.
- Human acceptance of the recovered flows (`docs/demo/FEATURE_WALKTHROUGH.md`).
- Everything gated by owner actions: live provider conformance, credential rotation confirmation, freshness policy, redistribution permission.

## Keeping this current

Re-run the table above after any change that lands on `production-readiness`, update the commit and tree, and keep failures in the table rather than deleting them.
