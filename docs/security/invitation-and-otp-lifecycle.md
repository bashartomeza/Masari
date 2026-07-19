# Invitation and OTP lifecycle

## Invitation

An authorized admin creates a mandatory `PS` phone-bound, passenger/driver/merchant invitation. The API returns the 20-character Crockford code once. Storage contains only its versioned HMAC, phone HMAC/version/last-four, safe operator metadata, seven-day default expiry, and one-use state. Loss of the response requires revocation and replacement; the code is intentionally unrecoverable.

Attempt creation and consumption both require the same invitation ID, intended role, phone HMAC/version, usable lifetime, and one-use state. Consumption conditionally increments `used_count` from zero and creates one redemption in the same transaction. Revocation is safe to repeat, cannot restore a consumed invitation, and races with consumption to one valid terminal outcome.

## OTP

The service creates a six-digit `crypto.randomInt` code and acquires a durable, challenge-ID-fenced dispatch claim before creating a `dispatching` challenge whose HMAC context includes that ID. Provider I/O occurs outside the promotion transaction. Only the holder of the live claim can promote accepted delivery; accepted delivery makes the challenge current and supersedes the previous working challenge atomically. Rejected/unknown delivery remains unverifiable and conditionally restores the prior state without overwriting a newer claim. A stale claim is reclaimable after the bounded dispatch lease, while its late provider result cannot replace the new claimant.

Verification requires an eligible, unexpired `otp_sent` attempt plus its accepted current challenge, matching key version, unexpired/unlocked state, fewer than five attempts, and no consumption/supersession. Challenge consumption, attempt transition, and audit evidence commit in one transaction, permitting one concurrent success without a partial state. Defaults are five-minute TTL, 60-second cooldown, three accepted resends, and five sends per phone/day; durable phone/IP/invitation buckets support enforcement before future public routes.

No B1 API sends or verifies OTP. The fake provider exposes codes only to an injected test outbox and is forbidden in staging/production.
