# Invitation and OTP lifecycle

## Invitation

An authorized admin creates a mandatory `PS` phone-bound, passenger/driver/merchant invitation. The API returns the 20-character Crockford code once. Storage contains only its versioned HMAC, phone HMAC/version/last-four, safe operator metadata, seven-day default expiry, and one-use state. Loss of the response requires revocation and replacement; the code is intentionally unrecoverable.

Consumption conditionally increments `used_count` from zero and creates one redemption in the same transaction. Revocation is safe to repeat, cannot restore a consumed invitation, and races with consumption to one valid terminal outcome.

## OTP

The service creates a six-digit `crypto.randomInt` code and a `dispatching` challenge whose HMAC context includes the challenge ID. Provider I/O occurs outside the promotion transaction. Accepted delivery makes the challenge current and supersedes the previous working challenge atomically. Rejected/unknown delivery remains unverifiable and leaves the previous current challenge intact.

Verification requires the accepted current challenge, matching key version, unexpired/unlocked state, fewer than five attempts, and no consumption/supersession. Conditional update permits one concurrent success. Defaults are five-minute TTL, 60-second cooldown, three resends, and five sends per phone/day; durable phone/IP/invitation buckets support enforcement before future public routes.

No B1 API sends or verifies OTP. The fake provider exposes codes only to an injected test outbox and is forbidden in staging/production.
