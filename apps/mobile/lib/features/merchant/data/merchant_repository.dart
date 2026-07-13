import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../auth/data/token_storage.dart';
import '../../trips/data/trip_models.dart';
import 'merchant_models.dart';

final merchantRepositoryProvider = Provider<MerchantRepository>((ref) {
  return MerchantRepository(
    apiClient: ref.watch(apiClientProvider),
    tokenStorage: ref.watch(tokenStorageProvider),
  );
});

class MerchantRepository {
  const MerchantRepository({
    required this.apiClient,
    required this.tokenStorage,
  });

  final ApiClient apiClient;
  final TokenStorage tokenStorage;

  Future<List<MerchantOrder>> listOrders() async {
    final json = await apiClient.getJson(
      '/merchant/orders',
      token: await _token(),
    );
    return _list<MerchantOrder>(json, 'orders', MerchantOrder.fromJson);
  }

  Future<MerchantOrder> orderDetail(String id) async {
    final json = await apiClient.getJson(
      '/merchant/orders/$id',
      token: await _token(),
    );
    return MerchantOrder.fromJson(json['order'] as Map<String, dynamic>);
  }

  Future<MerchantOrder> createOrder(List<ParcelDraft> parcels) async {
    final json = await apiClient.postJson(
      '/merchant/orders',
      token: await _token(),
      body: {
        'pickup_label': merchantPickupLabel,
        'pickup_lat': merchantPickupLat,
        'pickup_lng': merchantPickupLng,
        'parcels': parcels.map((parcel) => parcel.toJson()).toList(),
      },
    );
    return MerchantOrder.fromJson({
      ...(json['order'] as Map<String, dynamic>),
      'parcel_batches': const [],
    });
  }

  Future<MerchantBatch> createBatch(String orderId) async {
    final json = await apiClient.postJson(
      '/merchant/orders/$orderId/batch',
      token: await _token(),
      body: const {},
    );
    return MerchantBatch.fromJson(json['batch'] as Map<String, dynamic>);
  }

  Future<MerchantMatch> runMatch(String orderId) async {
    final json = await apiClient.postJson(
      '/matches/run',
      token: await _token(),
      body: {'merchantOrderId': orderId},
    );
    final match = json['match'] as Map<String, dynamic>;
    return MerchantMatch.fromJson({
      ...match,
      'scoring_breakdown':
          json['scoringBreakdown'] ?? match['scoring_breakdown'],
    });
  }

  Future<List<MerchantMatch>> listMatches({String? status}) async {
    final suffix = status == null
        ? ''
        : '?status=${Uri.encodeQueryComponent(status)}';
    final json = await apiClient.getJson(
      '/matches$suffix',
      token: await _token(),
    );
    return _list<MerchantMatch>(json, 'matches', MerchantMatch.fromJson);
  }

  Future<MerchantMatch> matchDetail(String id) async {
    final json = await apiClient.getJson('/matches/$id', token: await _token());
    return MerchantMatch.fromJson(json['match'] as Map<String, dynamic>);
  }

  Future<List<MerchantTrip>> listTrips() async {
    final json = await apiClient.getJson('/trips', token: await _token());
    return _list<MerchantTrip>(json, 'trips', MerchantTrip.fromJson);
  }

  Future<MerchantTrip> tripDetail(String id) async {
    final json = await apiClient.getJson('/trips/$id', token: await _token());
    return MerchantTrip.fromJson(json['trip'] as Map<String, dynamic>);
  }

  Future<TripLocation?> latestLocation(String id) async {
    final json = await apiClient.getJson(
      '/trips/$id/location',
      token: await _token(),
    );
    final location = json['location'];
    return location is Map<String, dynamic>
        ? TripLocation.fromJson(location)
        : null;
  }

  Future<String> _token() async => await tokenStorage.readToken() ?? '';

  List<T> _list<T>(
    Map<String, dynamic> json,
    String key,
    T Function(Map<String, dynamic>) parse,
  ) {
    final values = json[key];
    if (values is! List) throw FormatException('Missing $key');
    return values.cast<Map<String, dynamic>>().map(parse).toList();
  }
}
