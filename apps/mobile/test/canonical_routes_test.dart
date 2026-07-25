import 'dart:async';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:masari_mobile/core/api/api_error.dart';
import 'package:masari_mobile/features/canonical_routes/application/canonical_route_controller.dart';
import 'package:masari_mobile/features/canonical_routes/data/canonical_operation_storage.dart';
import 'package:masari_mobile/features/canonical_routes/domain/canonical_route_models.dart';

void main() {
  group('M7C2 typed capability and route contracts', () {
    test('accepts the exact safe capability response', () {
      final value = MobileCapabilities.fromJson({
        'canonical_route_catalog_available': true,
        'canonical_multi_route_entry_available': true,
        'canonical_matching_available': false,
        'maps_available': false,
        'live_tracking_available': false,
      });
      expect(value.routeCatalogAvailable, isTrue);
      expect(value.multiRouteEntryAvailable, isTrue);
      expect(value.matchingAvailable, isFalse);
      expect(value.mapsAvailable, isFalse);
      expect(value.liveTrackingAvailable, isFalse);
    });

    test('rejects unknown capability fields and non-boolean values', () {
      expect(
        () => MobileCapabilities.fromJson({
          'canonical_route_catalog_available': true,
          'canonical_multi_route_entry_available': true,
          'canonical_matching_available': false,
          'maps_available': false,
          'live_tracking_available': false,
          'environment': 'local',
        }),
        throwsFormatException,
      );
      expect(
        () => MobileCapabilities.fromJson({
          'canonical_route_catalog_available': 'true',
          'canonical_multi_route_entry_available': true,
          'canonical_matching_available': false,
          'maps_available': false,
          'live_tracking_available': false,
        }),
        throwsFormatException,
      );
    });

    test('rejects coordinates in the public stop contract', () {
      expect(
        () => CanonicalStop.fromMembership({
          ...membership(1, pickup: true),
          'stop': {...stop('one'), 'latitude': 31.5},
        }),
        throwsFormatException,
      );
    });

    test('parses every approved route direction and rejects another enum', () {
      for (final direction in ['outbound', 'inbound', 'loop']) {
        expect(route(direction: direction).direction.name, direction);
      }
      expect(() => route(direction: 'sideways'), throwsFormatException);
    });
  });

  group('M7C2 ordered stop eligibility', () {
    final value = route();

    test('passenger pickup uses server permission', () {
      expect(passengerPickupStops(value).map((item) => item.id), [
        'one',
        'three',
      ]);
    });

    test('passenger destination is downstream and permission filtered', () {
      expect(
        downstreamPassengerStops(
          value,
          value.stops.first,
        ).map((item) => item.id),
        ['three'],
      );
      expect(downstreamPassengerStops(value, value.stops.last), isEmpty);
    });

    test('parcel pickup and destination use independent permissions', () {
      expect(parcelPickupStops(value).map((item) => item.id), ['one', 'two']);
      expect(
        downstreamParcelStops(value, value.stops.first).map((item) => item.id),
        ['two', 'three'],
      );
      expect(
        downstreamParcelStops(value, value.stops[1]).map((item) => item.id),
        ['three'],
      );
    });
  });

  group('M7C2 secure idempotent mutation recovery', () {
    test('success clears the in-flight bundle', () async {
      final storage = FakeCanonicalStorage();
      final runner = CanonicalMutationRunner(storage: storage);
      final result = await runner.run(
        operation: 'passenger_route_request_create',
        scope: 'passenger',
        payload: payload('one'),
        send: (bundle) async => bundle.idempotencyKey,
      );
      expect(result, isNotEmpty);
      expect(storage.bundle, isNull);
      expect(storage.saveCount, 1);
      expect(storage.clearCount, 1);
    });

    test('timeout retains the exact key and payload for replay', () async {
      final storage = FakeCanonicalStorage();
      final runner = CanonicalMutationRunner(storage: storage);
      await expectLater(
        runner.run<void>(
          operation: 'merchant_route_order_create',
          scope: 'merchant',
          payload: payload('one'),
          send: (_) async =>
              throw const ApiException(ApiErrorType.timeout, 'request_timeout'),
        ),
        throwsA(isA<ApiException>()),
      );
      final retained = storage.bundle!;
      String? replayKey;
      await runner.run(
        operation: 'merchant_route_order_create',
        scope: 'merchant',
        payload: payload('one'),
        send: (bundle) async {
          replayKey = bundle.idempotencyKey;
          return true;
        },
      );
      expect(replayKey, retained.idempotencyKey);
      expect(storage.bundle, isNull);
    });

    test(
      '502, 503, and retryable transaction conflicts retain bundle',
      () async {
        for (final error in [
          const ApiException(
            ApiErrorType.server,
            'request_failed',
            statusCode: 502,
          ),
          const ApiException(
            ApiErrorType.server,
            'request_failed',
            statusCode: 503,
          ),
          const ApiException(
            ApiErrorType.server,
            'transaction_retry_required',
            statusCode: 409,
          ),
        ]) {
          final storage = FakeCanonicalStorage();
          final runner = CanonicalMutationRunner(storage: storage);
          await expectLater(
            runner.run<void>(
              operation: 'driver_availability_create',
              scope: 'driver',
              payload: payload('one'),
              send: (_) async => throw error,
            ),
            throwsA(isA<ApiException>()),
          );
          expect(storage.bundle, isNotNull);
        }
      },
    );

    test('terminal validation failure clears the bundle', () async {
      final storage = FakeCanonicalStorage();
      final runner = CanonicalMutationRunner(storage: storage);
      await expectLater(
        runner.run<void>(
          operation: 'passenger_route_request_create',
          scope: 'passenger',
          payload: payload('one'),
          send: (_) async => throw const ApiException(
            ApiErrorType.validation,
            'invalid_stop_order',
            statusCode: 400,
          ),
        ),
        throwsA(isA<ApiException>()),
      );
      expect(storage.bundle, isNull);
    });

    test('changed payload creates a new logical key', () async {
      final storage = FakeCanonicalStorage();
      final runner = CanonicalMutationRunner(storage: storage);
      await expectLater(
        runner.run<void>(
          operation: 'passenger_route_request_create',
          scope: 'passenger',
          payload: payload('one'),
          send: (_) async => throw const ApiException(
            ApiErrorType.network,
            'network_unavailable',
          ),
        ),
        throwsA(isA<ApiException>()),
      );
      final firstKey = storage.bundle!.idempotencyKey;
      await expectLater(
        runner.run<void>(
          operation: 'passenger_route_request_create',
          scope: 'passenger',
          payload: payload('two'),
          send: (_) async => throw const ApiException(
            ApiErrorType.network,
            'network_unavailable',
          ),
        ),
        throwsA(isA<ApiException>()),
      );
      expect(storage.bundle!.idempotencyKey, isNot(firstKey));
    });

    test('rapid second submission is synchronously rejected', () async {
      final storage = FakeCanonicalStorage();
      final runner = CanonicalMutationRunner(storage: storage);
      final completer = Completer<void>();
      final first = runner.run<void>(
        operation: 'passenger_route_request_create',
        scope: 'passenger',
        payload: payload('one'),
        send: (_) => completer.future,
      );
      await Future<void>.delayed(Duration.zero);
      await expectLater(
        runner.run<void>(
          operation: 'passenger_route_request_create',
          scope: 'passenger',
          payload: payload('one'),
          send: (_) async {},
        ),
        throwsStateError,
      );
      completer.complete();
      await first;
    });

    test('bundle JSON rejects a changed fingerprint', () {
      final bundle = CanonicalOperationBundle.create(
        operation: 'passenger_route_request_create',
        scope: 'passenger',
        payload: payload('one'),
      );
      final json = bundle.toJson()..['fingerprint'] = 'tampered';
      expect(
        () => CanonicalOperationBundle.fromJson(json),
        throwsFormatException,
      );
    });
  });
}

class FakeCanonicalStorage extends CanonicalOperationStorage {
  FakeCanonicalStorage() : super(const FlutterSecureStorage());

  CanonicalOperationBundle? bundle;
  int saveCount = 0;
  int clearCount = 0;

  @override
  Future<CanonicalOperationBundle?> read() async => bundle;

  @override
  Future<void> save(CanonicalOperationBundle value) async {
    saveCount++;
    bundle = value;
  }

  @override
  Future<void> clear() async {
    clearCount++;
    bundle = null;
  }
}

Map<String, dynamic> payload(String routeId) => {
  'route_version_id': routeId,
  'pickup_stop_id': 'one',
};

CanonicalRoute route({String direction = 'outbound'}) {
  final json = {
    'id': 'route',
    'route_key': 'route-key',
    'route_group_key': 'group',
    'service_region_key': 'region',
    'direction': direction,
    'status': 'active',
    'current_version_id': 'version',
    'current_version': {
      'id': 'version',
      'version_number': 1,
      'status': 'published',
      'name_ar': 'مسار',
      'name_en': 'Route',
      'description_ar': null,
      'description_en': null,
      'active_from': null,
      'active_until': null,
      'geometry': {'status': 'pending', 'ready': false},
      'stop_count': 3,
      'stops': [
        membership(1, pickup: true, parcelPickup: true, id: 'one'),
        membership(2, parcelPickup: true, parcelDropoff: true, id: 'two'),
        membership(
          3,
          pickup: true,
          dropoff: true,
          parcelDropoff: true,
          id: 'three',
        ),
      ],
    },
  };
  return CanonicalRoute.fromJson(json);
}

Map<String, dynamic> membership(
  int sequence, {
  bool pickup = false,
  bool dropoff = false,
  bool parcelPickup = false,
  bool parcelDropoff = false,
  String id = 'one',
}) => {
  'sequence': sequence,
  'passenger_pickup_allowed': pickup,
  'passenger_dropoff_allowed': dropoff,
  'parcel_pickup_allowed': parcelPickup,
  'parcel_dropoff_allowed': parcelDropoff,
  'estimated_offset_seconds': null,
  'dwell_seconds': null,
  'stop': stop(id),
};

Map<String, dynamic> stop(String id) => {
  'id': id,
  'stop_key': '$id-key',
  'service_region_key': 'region',
  'name_ar': 'محطة',
  'name_en': 'Stop',
};
