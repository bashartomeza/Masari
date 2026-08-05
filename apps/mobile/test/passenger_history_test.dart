import 'package:flutter_test/flutter_test.dart';
import 'package:masari_mobile/features/passenger/application/passenger_history_controller.dart';
import 'package:masari_mobile/features/passenger/data/passenger_models.dart';

/// The "My trips" tab renders one section per bucket, so the bucketing has to
/// be a partition: anything counted twice is a trip the passenger sees twice.
void main() {
  PassengerRequest request({
    required String id,
    required String status,
    Duration preferredIn = const Duration(hours: -1),
  }) {
    return PassengerRequest(
      id: id,
      pickupLabel: 'PPU Main Gate',
      pickupLat: 31.5326,
      pickupLng: 35.0998,
      destinationLabel: 'Bethlehem Center',
      destinationLat: 31.7054,
      destinationLng: 35.2024,
      preferredTime: DateTime.now().add(preferredIn),
      passengerCount: 1,
      status: status,
      createdAt: DateTime.now().subtract(const Duration(days: 1)),
    );
  }

  test('a pending request due later is upcoming, not active', () {
    final state = PassengerHistoryState(
      requests: [
        request(
          id: 'later',
          status: 'pending',
          preferredIn: const Duration(hours: 3),
        ),
      ],
      trips: const [],
    );

    expect(state.upcoming.map((r) => r.id), ['later']);
    expect(state.active, isEmpty);
  });

  test('a pending request already due is active, not upcoming', () {
    final state = PassengerHistoryState(
      requests: [request(id: 'now', status: 'pending')],
      trips: const [],
    );

    expect(state.active.map((r) => r.id), ['now']);
    expect(state.upcoming, isEmpty);
  });

  test('every request lands in exactly one bucket', () {
    final state = PassengerHistoryState(
      requests: [
        request(id: 'due', status: 'pending'),
        request(
          id: 'later',
          status: 'pending',
          preferredIn: const Duration(hours: 5),
        ),
        request(id: 'moving', status: 'in_transit'),
        request(id: 'done', status: 'completed'),
        request(id: 'dropped', status: 'delivered'),
        request(id: 'gone', status: 'cancelled'),
      ],
      trips: const [],
    );

    final placed = [
      ...state.active,
      ...state.upcoming,
      ...state.past,
      ...state.cancelled,
    ].map((r) => r.id).toList();

    expect(placed.toSet(), hasLength(placed.length), reason: 'no duplicates');
    expect(
      placed.toSet(),
      {'due', 'later', 'moving', 'done', 'dropped', 'gone'},
      reason: 'nothing dropped',
    );
  });

  test('buckets are newest first', () {
    final older = PassengerRequest(
      id: 'older',
      pickupLabel: 'PPU Main Gate',
      pickupLat: 31.5326,
      pickupLng: 35.0998,
      destinationLabel: 'Bethlehem Center',
      destinationLat: 31.7054,
      destinationLng: 35.2024,
      preferredTime: DateTime.now(),
      passengerCount: 1,
      status: 'completed',
      createdAt: DateTime(2026, 1, 1),
    );
    final newer = PassengerRequest(
      id: 'newer',
      pickupLabel: 'PPU Main Gate',
      pickupLat: 31.5326,
      pickupLng: 35.0998,
      destinationLabel: 'Bethlehem Center',
      destinationLat: 31.7054,
      destinationLng: 35.2024,
      preferredTime: DateTime.now(),
      passengerCount: 1,
      status: 'completed',
      createdAt: DateTime(2026, 6, 1),
    );

    final state = PassengerHistoryState(
      requests: [older, newer],
      trips: const [],
    );

    expect(state.past.map((r) => r.id), ['newer', 'older']);
  });
}
