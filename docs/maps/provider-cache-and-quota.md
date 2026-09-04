# Provider cache, quota, and timeout policy

M7D1 distinguishes raw HTTP responses, normalized draft previews, and immutable published geometry. Raw responses are never cached or persisted. The in-process preview cache stores only normalized fake/live results when configured, keyed by a SHA-256 digest of provider and normalized route input. It expires entries, verifies entry integrity, coalesces identical concurrent misses, and changes keys for provider, stop order/coordinates, profile, locale, or options.

The default overall request deadline is 4 seconds across all attempts and backoff, maximum retry count is one, and retry is limited to transport failure or 5xx with exponential 100 ms backoff. Authorization and malformed responses are never retried. The underlying fetch is aborted at the remaining overall deadline, with the configured connect budget applied through receipt of response headers. Provider JSON is capped at 1 MB. Redirects are disabled and rejected. No dependency was added merely for these controls.

HTTP 429, quota exhaustion, provider authorization, timeout, 5xx/unavailability, and malformed responses normalize to categorical safe errors. Three consecutive timeout/unavailable failures open a 30-second in-process circuit. Reopening a screen does not create a background retry loop.

Provider caching remains disabled until provider-specific rights pass review. Production-like configuration therefore requires a zero cache TTL in M7D1; a later non-zero value requires a separately reviewed provider-specific policy and terms basis.
