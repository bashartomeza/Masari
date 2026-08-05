# Privacy-safe shared stop events

The shared-offer API serializes an ordered aggregate stop timeline. Flutter renders the sequence received from the server and validates strictly increasing canonical stop order.

Each event contains only:

- public stop ID and bilingual public stop name;
- canonical route sequence;
- passenger pickup count;
- passenger drop-off count;
- parcel pickup count;
- parcel-destination count.

The contract excludes passenger, merchant, recipient, demand, dispatch, order, and parcel identity; phone numbers; parcel descriptions; private notes; fingerprints; reservation identifiers; snapshots; coordinates; scores; and remaining capacity.

Counts are presented as aggregate route events and must not be used to infer membership. Flutter does not reconstruct or fabricate events from client-side assumptions. Invalid negative counts or non-increasing order fail closed.
