import 'package:flutter_test/flutter_test.dart';
import 'package:masari_mobile/features/canonical_routes/domain/canonical_route_models.dart';
import 'package:masari_mobile/features/checkpoints/domain/checkpoint_models.dart';

Map<String, dynamic> _stop(String id, double? lat, double? lng, int sequence) => {
  'sequence': sequence,
  'passenger_pickup_allowed': true,
  'passenger_dropoff_allowed': true,
  'parcel_pickup_allowed': true,
  'parcel_dropoff_allowed': true,
  'stop': {
    'id': id,
    'name_ar': 'محطة $id',
    'name_en': 'Stop $id',
    'latitude': ?lat,
    'longitude': ?lng,
  },
};

Map<String, dynamic> _route({
  Map<String, dynamic>? geometry,
  List<Map<String, dynamic>>? stops,
}) => {
  'id': 'route_1',
  'direction': 'outbound',
  'status': 'active',
  'current_version': {
    'id': 'version_1',
    'version_number': 1,
    'status': 'published',
    'name_ar': 'الخليل إلى بيت لحم',
    'name_en': 'Hebron to Bethlehem',
    'active_from': null,
    'active_until': null,
    'stops':
        stops ??
        [
          _stop('a', 31.5326, 35.0998, 1),
          _stop('b', 31.6200, 35.1450, 2),
          _stop('c', 31.7054, 35.2024, 3),
        ],
    'geometry': ?geometry,
  },
};

void main() {
  group('route geometry', () {
    test('decodes published geometry and prefers it over the stop line', () {
      final route = CanonicalRoute.fromJson(
        _route(
          geometry: {
            'status': 'available',
            'ready': true,
            'encoding': 'demo-json-v1',
            'encoded':
                '[{"lat":31.5326,"lng":35.0998},{"lat":31.55,"lng":35.10},'
                '{"lat":31.7054,"lng":35.2024}]',
            'precision': 6,
            'estimated_distance_m': 21530,
            'estimated_duration_s': null,
          },
        ),
      );
      expect(route.geometry.status, RouteGeometryStatus.available);
      expect(route.geometry.distanceMeters, 21530);
      expect(route.path, hasLength(3));
      expect(route.path[1], const GeoPoint(31.55, 35.10));
    });

    test('falls back to the ordered stops when geometry is not ready', () {
      final route = CanonicalRoute.fromJson(
        _route(geometry: {'status': 'pending', 'ready': false, 'encoded': null, 'encoding': null}),
      );
      expect(route.geometry.hasPoints, isFalse);
      expect(route.path, hasLength(3));
      expect(route.path.first, const GeoPoint(31.5326, 35.0998));
    });

    test('an unknown encoding draws nothing rather than a guessed shape', () {
      final route = CanonicalRoute.fromJson(
        _route(
          geometry: {
            'status': 'available',
            'ready': true,
            'encoding': 'polyline6',
            'encoded': 'gfo}EtohhU',
            'precision': 6,
            'estimated_distance_m': null,
            'estimated_duration_s': null,
          },
        ),
      );
      expect(route.geometry.hasPoints, isFalse);
      // Still drawable, but from the stops the server actually placed.
      expect(route.path, hasLength(3));
    });

    test('a route whose stops carry no coordinates is not drawable', () {
      final route = CanonicalRoute.fromJson(
        _route(
          stops: [_stop('a', null, null, 1), _stop('b', null, null, 2)],
        ),
      );
      expect(route.path, isEmpty);
      expect(route.originStop?.id, 'a');
      expect(route.destinationStop?.id, 'b');
    });
  });

  group('checkpoint snapshot', () {
    test('parses barriers and preserves the stale flag', () {
      final snapshot = CheckpointSnapshot.fromJson({
        'checkpoints': [
          {
            'id': '7',
            'name_ar': 'حاجز الكونتينر',
            'name_en': 'Container',
            'latitude': 31.7054,
            'longitude': 35.2024,
            'status': 'closed',
            'updated_at': '2026-08-01T10:00:00Z',
          },
        ],
        'fetched_at': '2026-08-01T10:05:00Z',
        'stale': true,
      });
      expect(snapshot.stale, isTrue);
      expect(snapshot.checkpoints.single.status, CheckpointStatus.closed);
      expect(snapshot.checkpoints.single.position, const GeoPoint(31.7054, 35.2024));
      expect(snapshot.checkpoints.single.nameAr, 'حاجز الكونتينر');
    });

    test('an unrecognised status degrades to unknown, never to open', () {
      final snapshot = CheckpointSnapshot.fromJson({
        'checkpoints': [
          {
            'id': '9',
            'latitude': 31.6,
            'longitude': 35.1,
            'status': 'partially-something',
          },
        ],
        'stale': false,
      });
      expect(snapshot.checkpoints.single.status, CheckpointStatus.unknown);
      expect(snapshot.checkpoints.single.nameAr, isNull);
    });

    test('rejects a barrier without a usable position', () {
      expect(
        () => CheckpointSnapshot.fromJson({
          'checkpoints': [
            {'id': '9', 'latitude': null, 'longitude': 35.1, 'status': 'open'},
          ],
          'stale': false,
        }),
        throwsFormatException,
      );
    });
  });
}
