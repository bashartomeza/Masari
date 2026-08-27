class PassengerRequest {
  const PassengerRequest({
    required this.id,
    required this.pickupLabel,
    required this.pickupLat,
    required this.pickupLng,
    required this.destinationLabel,
    required this.destinationLat,
    required this.destinationLng,
    required this.preferredTime,
    required this.passengerCount,
    required this.status,
    required this.createdAt,
  });

  final String id;
  final String pickupLabel;
  final double pickupLat;
  final double pickupLng;
  final String destinationLabel;
  final double destinationLat;
  final double destinationLng;
  final DateTime preferredTime;
  final int passengerCount;
  final String status;
  final DateTime createdAt;

  bool get canCancel => status == 'pending' || status == 'matched';
  bool get canMatch => status == 'pending' || status == 'matched';

  factory PassengerRequest.fromJson(Map<String, dynamic> json) {
    return PassengerRequest(
      id: _string(json, 'id'),
      pickupLabel: _string(json, 'pickup_label'),
      pickupLat: _double(json, 'pickup_lat'),
      pickupLng: _double(json, 'pickup_lng'),
      destinationLabel: _string(json, 'destination_label'),
      destinationLat: _double(json, 'destination_lat'),
      destinationLng: _double(json, 'destination_lng'),
      preferredTime: DateTime.parse(_string(json, 'preferred_time')).toLocal(),
      passengerCount: _int(json, 'passenger_count'),
      status: _string(json, 'status'),
      createdAt: DateTime.parse(_string(json, 'created_at')).toLocal(),
    );
  }
}

class PickupPreset {
  const PickupPreset({
    required this.key,
    required this.label,
    required this.lat,
    required this.lng,
  });

  final String key;
  final String label;
  final double lat;
  final double lng;
}

/// An active driver availability a passenger could still book.
///
/// Mirrors `GET /passenger/available-departures`. The API deliberately exposes
/// only the driver's display name, vehicle type and trust score — there is no
/// fare, rating or completed-trip count in the schema, so those stay absent
/// rather than being invented here.
class AvailableDeparture {
  const AvailableDeparture({
    required this.id,
    required this.routeVersionId,
    required this.originLabel,
    required this.destinationLabel,
    required this.departureAt,
    required this.remainingSeats,
    required this.driverName,
    this.availabilityWindowEnd,
    this.stops = const [],
    this.vehicleType,
    this.trustScore,
  });

  final String id;
  final String routeVersionId;
  final String originLabel;
  final String destinationLabel;
  final DateTime departureAt;
  final DateTime? availabilityWindowEnd;
  final int remainingSeats;
  final String driverName;
  final List<AvailableDepartureStop> stops;
  final String? vehicleType;
  final int? trustScore;

  factory AvailableDeparture.fromJson(Map<String, dynamic> json) {
    final driver = json['driver'];
    final driverMap = driver is Map
        ? driver.map((key, value) => MapEntry(key.toString(), value))
        : const <String, dynamic>{};
    final route = json['route'];
    final routeMap = route is Map
        ? route.map((key, value) => MapEntry(key.toString(), value))
        : const <String, dynamic>{};
    final rawStops = routeMap['stops'];
    return AvailableDeparture(
      id: _string(json, 'id'),
      routeVersionId: _string(json, 'route_version_id'),
      originLabel: _string(json, 'origin_label'),
      destinationLabel: _string(json, 'destination_label'),
      departureAt: DateTime.parse(_string(json, 'departure_at')).toLocal(),
      availabilityWindowEnd: _optionalLocalDateTime(
        json,
        'availability_window_end',
      ),
      remainingSeats: _int(json, 'remaining_seats'),
      driverName: driverMap['name'] as String? ?? '',
      stops: rawStops is List
          ? rawStops
                .whereType<Map>()
                .map(
                  (value) => AvailableDepartureStop.fromJson(
                    value.map((key, value) => MapEntry(key.toString(), value)),
                  ),
                )
                .toList(growable: false)
          : const [],
      vehicleType: driverMap['vehicle_type'] as String?,
      trustScore: (driverMap['trust_score'] as num?)?.toInt(),
    );
  }
}

/// A stop embedded in an available departure response.
///
/// These identifiers are kept so selecting a search result can prefill the
/// existing canonical booking flow instead of starting an unrelated request.
class AvailableDepartureStop {
  const AvailableDepartureStop({
    required this.id,
    required this.nameAr,
    required this.nameEn,
    required this.sequence,
    required this.passengerPickupAllowed,
    required this.passengerDropoffAllowed,
  });

  final String id;
  final String nameAr;
  final String nameEn;
  final int sequence;
  final bool passengerPickupAllowed;
  final bool passengerDropoffAllowed;

  factory AvailableDepartureStop.fromJson(Map<String, dynamic> json) {
    return AvailableDepartureStop(
      id: _string(json, 'id'),
      nameAr: _string(json, 'name_ar'),
      nameEn: _string(json, 'name_en'),
      sequence: _int(json, 'sequence'),
      passengerPickupAllowed: json['passenger_pickup'] == true,
      passengerDropoffAllowed: json['passenger_dropoff'] == true,
    );
  }
}

const lockedPickupPresets = [
  PickupPreset(key: 'ppu', label: 'PPU Main Gate', lat: 31.55, lng: 35.1),
  PickupPreset(
    key: 'bab_al_zawiya',
    label: 'Bab Al-Zawiya',
    lat: 31.5326,
    lng: 35.0998,
  ),
];

const lockedDestinationLabel = 'Bethlehem Center';
const lockedDestinationLat = 31.7054;
const lockedDestinationLng = 35.2024;

String _string(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is String) return value;
  throw FormatException('Missing $key');
}

double _double(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is num) return value.toDouble();
  if (value is String) return double.parse(value);
  throw FormatException('Missing $key');
}

int _int(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is int) return value;
  if (value is num) return value.toInt();
  throw FormatException('Missing $key');
}

DateTime? _optionalLocalDateTime(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value == null) return null;
  if (value is! String) throw FormatException('Invalid $key');
  final parsed = DateTime.tryParse(value);
  if (parsed == null) throw FormatException('Invalid $key');
  return parsed.toLocal();
}
