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
