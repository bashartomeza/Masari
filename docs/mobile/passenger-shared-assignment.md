# Passenger shared assignment

The existing owner-only passenger assignment endpoint remains the source of truth. Its Trip summary now includes a strict Trip-version discriminator and a `shared_trip` boolean that must agree.

For `canonical_shared_trip_v1`, Flutter shows a neutral “assigned to a shared trip” indicator, the passenger's own route request and public Trip summary, and a co-member privacy notice. It does not receive or display aggregate member counts, merchant/order/parcel information, names, phones, coordinates, map state, ETA, or tracking state.

Shared Trip data is omitted by the backend when the shared mobile assignment capability is false. Unknown Trip or vehicle lifecycle values use safe localized unsupported wording and never surface raw enum keys.
