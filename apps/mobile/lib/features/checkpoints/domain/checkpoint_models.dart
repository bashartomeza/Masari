import '../../canonical_routes/domain/canonical_route_models.dart';

/// AweenRayeh checkpoint data with locally maintained coordinates.
class Checkpoint {
  const Checkpoint({
    required this.id,
    required this.position,
    required this.nameAr,
    required this.city,
    this.enteringStatus,
    this.leavingStatus,
    this.enteringStatusLastUpdated,
    this.leavingStatusLastUpdated,
  });

  final String id;
  final GeoPoint position;
  final String nameAr;
  final String city;
  final String? enteringStatus;
  final String? leavingStatus;
  final DateTime? enteringStatusLastUpdated;
  final DateTime? leavingStatusLastUpdated;

  factory Checkpoint.fromJson(Map<String, dynamic> json, {GeoPoint? position}) {
    final id = json['id'];

    if (id is! String || id.isEmpty) {
      throw const FormatException('Invalid checkpoint id');
    }

    final checkpoint = json['checkpoint'];
    final city = json['city'];

    return Checkpoint(
      id: id,
      position: position ?? const GeoPoint(0, 0),
      nameAr: checkpoint is String ? checkpoint : '',
      city: city is String ? city : '',
      enteringStatus: json['entering_status'] is String
          ? json['entering_status'] as String
          : null,
      leavingStatus: json['leaving_status'] is String
          ? json['leaving_status'] as String
          : null,
      enteringStatusLastUpdated: _parseDateTime(
        json['entering_status_last_updated'],
      ),
      leavingStatusLastUpdated: _parseDateTime(
        json['leaving_status_last_updated'],
      ),
    );
  }

  static DateTime? _parseDateTime(dynamic value) {
    if (value is! String) return null;
    return DateTime.tryParse(value);
  }
}

/// Locally mapped checkpoint coordinates.
/// GeoPoint arguments: latitude, longitude.
const Map<String, GeoPoint> checkpointPositions = {
  // تياسير
  '4d1ae43d39f43111fa7b61f761459615': GeoPoint(32.329087, 35.436267),

  // راس الجورة
  '86a11dfe82cc33a21cb8f914a0d3d115': GeoPoint(31.564492, 35.118423),

  // قلنديا
  '1e4b8812c6cc4442bd2f30d7e729ed35': GeoPoint(31.862713, 35.228312),

  // حزما
  'e6729dea0aa2166b477a96b48d3592e3': GeoPoint(31.828154, 35.252625),

  // الكونتينر
  '02b3915084de3f92e30d2f4bdac09583': GeoPoint(31.743549, 35.289786),

  // بيت إيل DCO
  '26710db52a1dbb26fdfb78d97a333814': GeoPoint(31.924323, 35.226516),

  // برطعة
  '967f17b540c1bb299924b75593f5996e': GeoPoint(32.450837, 35.118205),
};

/// Snapshot returned by the checkpoint feed.
class CheckpointSnapshot {
  const CheckpointSnapshot({required this.checkpoints, this.fetchedAt});

  final List<Checkpoint> checkpoints;
  final DateTime? fetchedAt;

  static const empty = CheckpointSnapshot(checkpoints: <Checkpoint>[]);

  factory CheckpointSnapshot.fromJson(Map<String, dynamic> json) {
    final raw = json['checkpoints'];

    if (raw is! List) {
      throw const FormatException('Invalid checkpoints');
    }

    return CheckpointSnapshot(
      checkpoints: List.unmodifiable(
        raw.map((value) {
          if (value is! Map<String, dynamic>) {
            throw const FormatException('Invalid checkpoint');
          }

          final id = value['id'];
          final position = id is String ? checkpointPositions[id] : null;

          return Checkpoint.fromJson(value, position: position);
        }),
      ),
      fetchedAt: _parseDateTime(json['generatedAt']),
    );
  }

  static DateTime? _parseDateTime(dynamic value) {
    if (value is! String) return null;
    return DateTime.tryParse(value);
  }
}
