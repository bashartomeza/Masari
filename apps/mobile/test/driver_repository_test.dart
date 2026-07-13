import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:masari_mobile/core/api/api_client.dart';
import 'package:masari_mobile/features/auth/data/token_storage.dart';
import 'package:masari_mobile/features/driver/data/driver_models.dart';
import 'package:masari_mobile/features/driver/data/driver_repository.dart';

void main() {
  test(
    'route list, active, create payload, and deactivation parsing',
    () async {
      Map<String, dynamic>? createBody;
      var deactivated = false;
      final repository = DriverRepository(
        apiClient: _client((request) async {
          final path = request.url.path;
          if (path.endsWith('/driver/routes/active')) {
            return http.Response('{"routes":[$_routeJson]}', 200);
          }
          if (path.endsWith('/driver/routes') && request.method == 'POST') {
            createBody = jsonDecode(request.body) as Map<String, dynamic>;
            return http.Response('{"route":$_routeJson}', 201);
          }
          if (path.endsWith('/deactivate')) {
            deactivated = true;
            return http.Response(
              '{"route":${_routeJsonWithStatus('inactive')}}',
              200,
            );
          }
          return http.Response('{"routes":[$_routeJson]}', 200);
        }),
        tokenStorage: _TokenStorage(),
      );

      expect((await repository.listRoutes()).single.originLat, 31.5326);
      expect((await repository.activeRoutes()).single.status, 'active');
      final created = await repository.createRoute(
        seatsAvailable: 3,
        parcelCapacityAvailable: 8,
      );
      expect(created.destinationLng, 35.2024);
      expect(createBody, {
        'origin_label': lockedDriverOriginLabel,
        'destination_label': lockedDriverDestinationLabel,
        'corridor_key': lockedDriverCorridorKey,
        'seats_available': 3,
        'parcel_capacity_available': 8,
      });
      expect((await repository.deactivateRoute('route_1')).status, 'inactive');
      expect(deactivated, isTrue);
    },
  );

  test(
    'match inbox, status filter, detail, accept, and reject parsing',
    () async {
      Uri? filteredUri;
      var rejected = false;
      final repository = DriverRepository(
        apiClient: _client((request) async {
          final path = request.url.path;
          if (path.endsWith('/accept')) {
            return http.Response(
              '{"trip":{"id":"trip_1","status":"accepted"},"matchId":"match_1"}',
              201,
            );
          }
          if (path.endsWith('/reject')) {
            rejected = true;
            return http.Response('{"match":{"status":"rejected"}}', 200);
          }
          if (path.endsWith('/matches/match_1')) {
            return http.Response('{"match":$_matchJson}', 200);
          }
          filteredUri = request.url;
          return http.Response('{"matches":[$_matchJson]}', 200);
        }),
        tokenStorage: _TokenStorage(),
      );

      final inbox = await repository.listMatches(status: 'proposed');
      expect(filteredUri?.queryParameters['status'], 'proposed');
      expect(inbox.single.breakdown.finalScore, 0.9317);
      expect(inbox.single.passengerRequest?.passengerCount, 1);
      expect(inbox.single.merchantOrder?.parcelCount, 5);
      expect(inbox.single.parcelBatch?.estimatedDistanceSaved, 86.12);
      expect((await repository.matchDetail('match_1')).id, 'match_1');
      expect((await repository.acceptMatch('match_1')).id, 'trip_1');
      await repository.rejectMatch('match_1');
      expect(rejected, isTrue);
    },
  );

  test(
    'trip list/detail, status, simulation, and location contracts',
    () async {
      Map<String, dynamic>? statusBody;
      var resetCalled = false;
      final repository = DriverRepository(
        apiClient: _client((request) async {
          final path = request.url.path;
          if (path.endsWith('/status')) {
            statusBody = jsonDecode(request.body) as Map<String, dynamic>;
            return http.Response('{"trip":{"status":"pickup_started"}}', 200);
          }
          if (path.endsWith('/simulate/step')) {
            return http.Response('{"location":$_locationJson}', 201);
          }
          if (path.endsWith('/simulate/reset')) {
            resetCalled = true;
            return http.Response('{"ok":true}', 200);
          }
          if (path.endsWith('/location')) {
            return http.Response('{"location":$_locationJson}', 200);
          }
          if (path.endsWith('/trips')) {
            return http.Response('{"trips":[$_tripJson]}', 200);
          }
          return http.Response('{"trip":$_tripJson}', 200);
        }),
        tokenStorage: _TokenStorage(),
      );

      expect(
        (await repository.listTrips()).single.nextStatus,
        'pickup_started',
      );
      expect((await repository.tripDetail('trip_1')).route.status, 'assigned');
      await repository.updateTripStatus('trip_1', 'pickup_started');
      expect(statusBody, {'status': 'pickup_started'});
      expect((await repository.simulateStep('trip_1')).sequence, 0);
      await repository.resetSimulation('trip_1');
      expect(resetCalled, isTrue);
      expect((await repository.latestLocation('trip_1'))?.lat, 31.5326);
    },
  );
}

ApiClient _client(
  Future<http.Response> Function(http.Request request) handler,
) => ApiClient(baseUrl: 'http://api.test', client: MockClient(handler));

class _TokenStorage implements TokenStorage {
  @override
  Future<void> clearToken() async {}
  @override
  Future<String?> readToken() async => 'driver-token';
  @override
  Future<void> saveToken(String token) async {}
}

const _routeJson =
    '{"id":"route_1","origin_label":"Hebron / PPU / Bab Al-Zawiya","origin_lat":"31.532600","origin_lng":"35.099800","destination_label":"Bethlehem","destination_lat":"31.705400","destination_lng":"35.202400","corridor_key":"hebron-ppu-bab-al-zawiya-to-bethlehem","seats_available":2,"parcel_capacity_available":5,"status":"active","activated_at":"2026-07-13T08:00:00.000Z","completed_at":null}';

String _routeJsonWithStatus(String status) =>
    _routeJson.replaceFirst('"status":"active"', '"status":"$status"');

const _matchJson =
    '{"id":"match_1","status":"proposed","score":"0.9317","method":"masari_route_score","explanation":"Safe explanation","scoring_breakdown":{"corridorOverlap":0.95,"pickupDistanceScore":0.82,"timingFit":0.9,"trustScore":0.86,"capacityFit":1,"finalScore":0.9317},"created_at":"2026-07-13T08:10:00.000Z","driver_route":{"id":"route_1","origin_label":"Hebron / PPU / Bab Al-Zawiya","destination_label":"Bethlehem","corridor_key":"hebron-ppu-bab-al-zawiya-to-bethlehem","seats_available":2,"parcel_capacity_available":5,"status":"active","driver":{"vehicle_type":"sedan","verified":true,"trust_score":86}},"passenger_request":{"id":"request_1","pickup_label":"PPU Main Gate","destination_label":"Bethlehem Center","preferred_time":"2026-07-13T09:00:00.000Z","passenger_count":1,"status":"pending","created_at":"2026-07-13T08:00:00.000Z"},"merchant_order":{"id":"order_1","pickup_label":"Hebron Merchant","status":"submitted","parcel_count":5,"created_at":"2026-07-13T08:00:00.000Z"},"parcel_batch":{"id":"batch_1","status":"created","estimated_distance_saved":"86.12","explanation":"Shared route","created_at":"2026-07-13T08:05:00.000Z"}}';

const _tripJson =
    '{"id":"trip_1","status":"accepted","created_at":"2026-07-13T08:20:00.000Z","started_at":"2026-07-13T08:20:00.000Z","completed_at":null,"driver_route":$_routeJsonAssigned,"passenger_request":{"id":"request_1","pickup_label":"PPU Main Gate","destination_label":"Bethlehem Center","passenger_count":1,"status":"accepted"},"merchant_order":{"id":"order_1","pickup_label":"Hebron Merchant","status":"assigned","parcels":[{},{}]},"parcel_batch":{"id":"batch_1","status":"assigned","estimated_distance_saved":"86.12","explanation":"Shared route"}}';

const _routeJsonAssigned =
    '{"id":"route_1","origin_label":"Hebron / PPU / Bab Al-Zawiya","origin_lat":"31.532600","origin_lng":"35.099800","destination_label":"Bethlehem","destination_lat":"31.705400","destination_lng":"35.202400","corridor_key":"hebron-ppu-bab-al-zawiya-to-bethlehem","seats_available":2,"parcel_capacity_available":5,"status":"assigned","activated_at":"2026-07-13T08:00:00.000Z","completed_at":null}';

const _locationJson =
    '{"lat":"31.532600","lng":"35.099800","source":"simulated","sequence":0,"recorded_at":"2026-07-13T08:21:00.000Z"}';
