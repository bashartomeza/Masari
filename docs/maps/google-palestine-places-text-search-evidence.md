# Google Places Text Search Palestine evidence

Evidence date: 2026-08-08. Classification: `GOOGLE_PLACES_TEXT_SEARCH_EVIDENCE`; fixture classification: `TEST FIXTURE DATA — NOT USER LOCATION DATA`. The Maps Demo Key was used only for bounded prototype evidence and was neither logged nor persisted.

## Result

The exact unchanged 30-concept × Arabic/English corpus was submitted sequentially to Places API (New) Text Search. The complete method and official product review are in [Google Maps product methodology review](google-product-methodology-review.md). Safe normalized results are in [google-palestine-places-text-search-results.json](evidence/google-palestine-places-text-search-results.json), with all 60 review decisions in [google-palestine-places-text-search-adjudication.json](evidence/google-palestine-places-text-search-adjudication.json).

| Score | Arabic | English | Overall | 95% gates |
|---|---:|---:|---:|---|
| Primary top-1 | 25/30 (`83.3%`) | 23/30 (`76.7%`) | 48/60 (`80.0%`) | FAIL / FAIL / FAIL |
| Secondary top-5 | 26/30 (`86.7%`) | 26/30 (`86.7%`) | 52/60 (`86.7%`) | diagnostic only |

Primary acceptance requires the intended public concept at rank 1. Top-5 is separately reported and never substitutes for the primary score. The four correct-but-lower-ranked cases were English PPU, Arabic and English Birzeit University, and English Bab Al-Zawiya. Primary failures total `RANKING_ISSUE=4`, `WRONG_AREA=2`, `WRONG_CAMPUS=3`, `WRONG_LANDMARK=1`, and `WRONG_PUBLIC_PLACE=2`.

All 60 requests returned HTTP success. The first useful request took `3998.3945 ms`; monotonic p50/p95 were `224.7181/277.3053 ms`. These are developer-network observations, not an SLA or direct comparison with localhost services.

`GOOGLE_PLACES_SEARCH_QUALITY=FAIL`. Among all providers on the common primary top-result rule, Nominatim remains the search-quality leader at 85.0% and also fails the required gates. No provider is approved.

## Evidence and production boundary

Only the five requested candidate fields were used during review. Raw Google responses and returned coordinates were not retained. Place IDs appear only in this evidence artifact and the bounded route control; they are not production canonical state. Google Places content storage is `RESTRICTED`; Place ID storage is separately `PERMITTED_WITH_REFRESH_POLICY`. No Google content was added to MySQL, no migration was added, and no provider was enabled.
