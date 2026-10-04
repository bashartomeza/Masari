import '../../canonical_routes/domain/canonical_route_models.dart';

/// Checkpoint data returned by AweenRayeh.
///
/// AweenRayeh can provide the current traffic/status condition
/// separately for entering and leaving the checkpoint.
///
/// Examples of status values may include:
/// - "سالك"
/// - "أزمة"
/// - "أزمة متوسطة"
///
/// The status timestamps indicate when each status was last updated.
/// They do NOT mean that the checkpoint is open or closed.
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

  /// Coordinates are kept locally because AweenRayeh does not
  /// provide checkpoint coordinates in this endpoint.
  final GeoPoint position;

  final String nameAr;
  final String city;

  /// Current status for entering the checkpoint.
  ///
  /// Examples:
  /// "سالك", "أزمة", "أزمة متوسطة"
  final String? enteringStatus;

  /// Current status for leaving the checkpoint.
  ///
  /// Examples:
  /// "سالك", "أزمة", "أزمة متوسطة"
  final String? leavingStatus;

  /// Last time the entering status was updated.
  final DateTime? enteringStatusLastUpdated;

  /// Last time the leaving status was updated.
  final DateTime? leavingStatusLastUpdated;

  factory Checkpoint.fromJson(
    Map<String, dynamic> json, {
    GeoPoint? position,
  }) {
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

      // Current traffic/status condition.
      enteringStatus: json['entering_status'] is String
          ? json['entering_status'] as String
          : null,

      leavingStatus: json['leaving_status'] is String
          ? json['leaving_status'] as String
          : null,

      // Last update timestamps.
      enteringStatusLastUpdated: _parseDateTime(
        json['entering_status_last_updated'],
      ),

      leavingStatusLastUpdated: _parseDateTime(
        json['leaving_status_last_updated'],
      ),
    );
  }

  static DateTime? _parseDateTime(dynamic value) {
    if (value is! String) {
      return null;
    }

    return DateTime.tryParse(value);
  }
}

/// Snapshot returned by the checkpoint feed.
class CheckpointSnapshot {
  const CheckpointSnapshot({
    required this.checkpoints,
    this.fetchedAt,
  });

  final List<Checkpoint> checkpoints;

  final DateTime? fetchedAt;

  static const empty = CheckpointSnapshot(
    checkpoints: <Checkpoint>[],
  );

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

          return Checkpoint.fromJson(value);
        }),
      ),
      fetchedAt: _parseDateTime(json['generatedAt']),
    );
  }

  static DateTime? _parseDateTime(dynamic value) {
    if (value is! String) {
      return null;
    }

    return DateTime.tryParse(value);
  }
}