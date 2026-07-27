# Passenger canonical assignment status

The passenger Flutter flow lists and opens only canonical requests owned by the
authenticated passenger.

States are server values: `pending`, `offered`, `assigned`, `unavailable`, and
`cancelled`. Before acceptance, the response and UI contain no driver identity.
After assignment, Flutter shows only the canonical Trip ID/status, departure,
and minimum vehicle type summary.

Updates are manual, pull-to-refresh, or foreground-resume reads. M7C3B does not
add cancellation, rematching, Trip lifecycle mutation, maps, ETA, or live
tracking.

