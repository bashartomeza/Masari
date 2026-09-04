import '../../canonical_routes/domain/canonical_route_models.dart';

/// How passable a barrier is right now, as reported upstream.
///
/// [unknown] is a real answer, not a placeholder: the feed often carries a
/// barrier whose state nobody has confirmed, and showing that honestly matters
/// more than picking a colour that implies it is open.
enum CheckpointStatus { open, congested, closed, unknown }

class Checkpoint {
  const Checkpoint({
    required this.id,
    required this.position,
    required this.status,
    this.nameAr,
    this.nameEn,
    this.updatedAt,
  });

  final String id;
  final GeoPoint position;
  final CheckpointStatus status;
  final String? nameAr;
  final String? nameEn;
  final DateTime? updatedAt;

  factory Checkpoint.fromJson(Map<String, dynamic> json) {
    final latitude = json['latitude'];
    final longitude = json['longitude'];
    if (latitude is! num || longitude is! num) {
      throw const FormatException('Invalid checkpoint position');
    }
    final id = json['id'];
    if (id is! String || id.isEmpty) {
      throw const FormatException('Invalid checkpoint id');
    }
    final updatedAt = json['updated_at'];
    return Checkpoint(
      id: id,
      position: GeoPoint(latitude.toDouble(), longitude.toDouble()),
      status:
          CheckpointStatus.values
              .where((value) => value.name == json['status'])
              .firstOrNull ??
          CheckpointStatus.unknown,
      nameAr: json['name_ar'] is String ? json['name_ar'] as String : null,
      nameEn: json['name_en'] is String ? json['name_en'] as String : null,
      updatedAt: updatedAt is String ? DateTime.tryParse(updatedAt)?.toUtc() : null,
    );
  }
}

/// A read of the barrier feed, carrying whether it came from a live fetch.
///
/// [stale] is surfaced on screen — a rider deciding a route deserves to know
/// the barrier states are the last ones we could confirm, not current ones.
class CheckpointSnapshot {
  const CheckpointSnapshot({
    required this.checkpoints,
    required this.stale,
    this.fetchedAt,
  });

  final List<Checkpoint> checkpoints;
  final bool stale;
  final DateTime? fetchedAt;

  static const empty = CheckpointSnapshot(
    checkpoints: <Checkpoint>[],
    stale: false,
  );

  factory CheckpointSnapshot.fromJson(Map<String, dynamic> json) {
    final raw = json['checkpoints'];
    if (raw is! List) throw const FormatException('Invalid checkpoints');
    final fetchedAt = json['fetched_at'];
    return CheckpointSnapshot(
      checkpoints: List.unmodifiable(
        raw.map((value) {
          if (value is! Map<String, dynamic>) {
            throw const FormatException('Invalid checkpoint');
          }
          return Checkpoint.fromJson(value);
        }),
      ),
      stale: json['stale'] == true,
      fetchedAt: fetchedAt is String
          ? DateTime.tryParse(fetchedAt)?.toUtc()
          : null,
    );
  }
}
