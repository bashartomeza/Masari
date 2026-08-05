# Passenger request and Trip association

Passenger presentation must use exact persisted provenance. A legacy Trip is associated only by its `passenger_request_id`. A canonical single-demand or shared Trip is associated only through that request's `CanonicalDemandDispatch.assigned_trip_id`; shared membership may establish the assignment, but the owner response remains co-member blind.

The mobile legacy history contract therefore retains the safe request ID returned with an owner-filtered Trip and indexes Trips by that ID. It never chooses the newest Trip, the first Trip for the account, a route match, or a driver match. Request and Trip ordering cannot change the association.

Unassigned, cancelled, or unavailable requests receive no Trip unless their own exact persisted relation points to one. Passenger ownership is applied before serialization. No co-member identity, merchant data, reservation, fingerprint, snapshot, coordinate, or unrelated owner data is added to the response.

Permanent evidence includes focused API serializers, Flutter request-ordering tests, and a repeatable 12-assertion real-MySQL legacy scenario. Canonical single-demand assignment remains covered by the 98-assertion M7C3A harness; shared members all resolving through their own dispatch to one shared Trip remain covered by the 145-assertion M7C3C1 harness.
