# Palestinian phone normalization

The server uses exact-pinned `libphonenumber-js` full metadata and a strict wrapper (`extract: false`). It converts Latin, Arabic-Indic, and Eastern Arabic/Persian digits; trims outer whitespace; accepts spaces, hyphens, and parentheses; maps `00970` to `+970`; and validates canonical E.164 at a maximum of 16 characters.

International `+970`/`00970` input is accepted. Local leading-zero input requires the caller to provide explicit region `PS`. Letters, controls, extensions, malformed plus signs, ambiguous local input, invalid ranges, and every unsupported country—including `+972`—are rejected. Architecture can add another country later only by an explicit configuration/product decision.

Lookup storage uses `HMAC-SHA-256(phone context + key version + E.164)` plus key version. Admin output is masked to country code and last four. Raw input and canonical E.164 must never be logged, audited, used as a rate-limit key, or returned by invitation APIs.

Run `npm run phone:preflight` before a phone-policy migration. It emits only total, valid, invalid, and collision counts and exits nonzero on any invalid row or canonical collision.
