# M7D1B Palestine route review

Evidence date: 2026-08-07. Classification: `TEST FIXTURE DATA — NOT USER LOCATION DATA`.

No live provider credential was securely available, so no live route was calculated and no route can be classified `PASS`, `CONDITIONAL`, or `FAIL`. Mapbox, Google, HERE, and Stadia are each `NOT_EXECUTED`; route sample count is zero; normalized distance, duration, geometry encoding, decoded point count, latency, checksum, and attribution are absent.

## Approved future review set

The committed public fixture defines two canonical ordered routes and the public stops needed to review Hebron, Palestine Polytechnic University, Bab Al-Zawiya, and Bethlehem. A credentialed rerun may add other public corridor points, but never private residential or user locations.

For each successful provider route the evidence record must include provider, driving profile, ordered public fixture stop IDs, distance, duration, encoding, decoded point count, monotonic call latency, safe error category, normalized checksum, and returned attribution metadata. Provider responses must not be copied wholesale.

## Human checklist

The reviewer must independently confirm all of the following from normalized geometry:

- origin and destination are sane;
- every intermediate stop is sane and stop order is preserved;
- geometry follows a plausible road network without impossible jumps or inaccessible terrain;
- there is no absurd detour;
- distance and duration are plausible for the provider's stated conditions;
- observable behavior is recorded without geopolitical assumptions based on labels.

Shortest does not mean safest or correct. Each route receives `PASS`, `CONDITIONAL`, or `FAIL`; any provider with a failed mandatory route is ineligible. A local visual artifact may be produced only from approved public fixture geometry and must retain the fixture-data disclaimer above.

Current human Palestine review: `NOT_EXECUTED`. Current recommendation: `NO_PROVIDER_APPROVED_YET`.
