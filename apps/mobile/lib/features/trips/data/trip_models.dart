class PassengerTrip {
  const PassengerTrip({
    required this.id,
    required this.status,
    required this.createdAt,
    required this.routeLabel,
    this.passengerRequestId,
  });

  final String id;
  final String status;
  final DateTime createdAt;
  final String routeLabel;
  final String? passengerRequestId;

  factory PassengerTrip.fromJson(Map<String, dynamic> json) {
    final route = json['driver_route'] as Map<String, dynamic>?;
    final routeLabel = route == null
        ? ''
        : '${route['origin_label'] as String} -> ${route['destination_label'] as String}';
    return PassengerTrip(
      id: _string(json, 'id'),
      status: _string(json, 'status'),
      createdAt: DateTime.parse(_string(json, 'created_at')).toLocal(),
      routeLabel: routeLabel,
      passengerRequestId: json['passenger_request_id'] as String?,
    );
  }
}

class TripLocation {
  const TripLocation({
    required this.lat,
    required this.lng,
    required this.source,
    required this.sequence,
    required this.recordedAt,
  });

  final double lat;
  final double lng;
  final String source;
  final int sequence;
  final DateTime recordedAt;

  factory TripLocation.fromJson(Map<String, dynamic> json) {
    return TripLocation(
      lat: _double(json, 'lat'),
      lng: _double(json, 'lng'),
      source: _string(json, 'source'),
      sequence: _int(json, 'sequence'),
      recordedAt: DateTime.parse(_string(json, 'recorded_at')).toLocal(),
    );
  }
}

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
