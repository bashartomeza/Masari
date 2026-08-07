# Provider cache, quota, and timeout policy

M7D1 distinguishes raw HTTP responses, normalized draft previews, and immutable published geometry. Raw responses are never cached or persisted. The in-process preview cache stores only normalized fake/live results when configured, keyed by a SHA-256 digest of provider and normalized route input. It expires entries, rejects corruption, and changes keys for provider, stop order/coordinates, profile, locale, or options.

The default overall request timeout is 4 seconds, maximum retry count is one, and retry is limited to transport failure or 5xx with exponential 100 ms backoff. Authorization and malformed responses are never retried. The built-in Node HTTP client supplies the bounded overall timeout; the configured connect-timeout value is validated as a stricter deployment/network-client budget but is not independently enforceable without adding an HTTP dependency. No dependency was added merely for that distinction.

HTTP 429, quota exhaustion, provider authorization, timeout, 5xx/unavailability, and malformed responses normalize to categorical safe errors. Three consecutive timeout/unavailable failures open a 30-second in-process circuit. Reopening a screen does not create a background retry loop.

Provider caching remains disabled as a persistence mechanism until provider-specific rights pass review. In particular, draft cache TTL configuration is a technical ceiling, not legal permission; production must choose the lesser of configured TTL and approved provider terms.
